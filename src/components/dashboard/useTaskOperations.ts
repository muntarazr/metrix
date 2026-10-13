import { useMemo, useState } from "react";
import type { Language } from "@/lib/translations";
import {
  getPeriodStart,
  getPeriodTypeFromFrequency,
} from "@/lib/task-periods";
import { getTaskAccent, type TaskColorKey } from "@/lib/task-colors";
import { exportGoalMarkdownDirect } from "@/lib/goal-exporter";
import { apiUrl, getAuthHeaders } from "@/lib/api";
import type { TaskRow } from "@/lib/task-hierarchy";
import type { EditableTask, TaskPatch } from "./TaskEditDialog";
import type { SkipReason } from "./TaskSkipPopover";
import type { LogItem } from "../progress/LogEvaluationModal";
import type { Goal, TaskCheckin } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface UseTaskOperationsOptions {
  goal: Goal;
  tasks: TaskRow[];
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
  checkins: TaskCheckin[];
  setCheckins: React.Dispatch<React.SetStateAction<TaskCheckin[]>>;
  fetchTasks: () => Promise<void>;
  fetchCheckins: () => Promise<void>;
  fetchChartData: () => Promise<void>;
  language: Language;
  isArabic: boolean;
  onGoalUpdated?: () => void;
  supabase: SupabaseClient;
  showSuccessToast: (msg: string) => void;
  findCheckin: (taskId: string, frequency: string) => TaskCheckin | undefined;
}

export function useTaskOperations({
  goal,
  tasks,
  setTasks,
  checkins,
  setCheckins,
  fetchTasks,
  fetchCheckins,
  fetchChartData,
  language,
  isArabic,
  onGoalUpdated,
  supabase,
  showSuccessToast,
  findCheckin,
}: UseTaskOperationsOptions) {
  // Inline editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubText, setNewSubText] = useState("");
  const [newSubCriteria, setNewSubCriteria] = useState("");
  const [newSubFreq, setNewSubFreq] = useState<"daily" | "weekly">("daily");
  const [newSubWeight, setNewSubWeight] = useState(3);
  const [addingMain, setAddingMain] = useState(false);
  const [newMainText, setNewMainText] = useState("");
  const [newMainCriteria, setNewMainCriteria] = useState("");
  const [newMainFreq, setNewMainFreq] = useState<"daily" | "weekly">("weekly");
  const [newMainWeight, setNewMainWeight] = useState(6);
  const [newMainColor, setNewMainColor] = useState<TaskColorKey | null>(null);

  const [expandedMains, setExpandedMains] = useState<Set<string>>(
    () => new Set<string>(),
  );

  // Modals & UI State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [showGoalDetails, setShowGoalDetails] = useState(false);
  const [showGoalEditDialog, setShowGoalEditDialog] = useState(false);
  const [isExportingGoal, setIsExportingGoal] = useState(false);
  const [editingTask, setEditingTask] = useState<EditableTask | null>(null);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [viewingLog, setViewingLog] = useState<LogItem | null>(null);

  const newMainAccent = useMemo(
    () =>
      getTaskAccent(newMainText.trim() || "main-task-preview", newMainColor),
    [newMainColor, newMainText],
  );

  const isSchemaOutdated = (error: { code?: string } | null) =>
    error?.code === "42703" || error?.code === "PGRST204";

  const schemaToast = () =>
    showSuccessToast(
      isArabic
        ? "شغّل supabase/migrations/0006_adaptive.sql أول"
        : "Run supabase/migrations/0006_adaptive.sql first",
    );

  const toggleExpand = (mainId: string) => {
    setExpandedMains((prev) => {
      const next = new Set(prev);
      if (next.has(mainId)) next.delete(mainId);
      else next.add(mainId);
      return next;
    });
  };

  const handleStartAddingSub = (mainId: string) => {
    setAddingSubFor(mainId);
    setNewSubText("");
    setNewSubWeight(3);
    setNewSubFreq("daily");
    setExpandedMains((prev) => {
      const next = new Set(prev);
      next.add(mainId);
      return next;
    });
  };

  const handleStartEditingTask = (taskId: string, taskDescription: string) => {
    setEditingTaskId(taskId);
    setEditingText(taskDescription);
  };

  const openNewMainComposer = () => {
    setAddingMain(true);
    setNewMainText("");
    setNewMainWeight(6);
    setNewMainFreq("weekly");
    setNewMainColor(null);
  };

  const closeNewMainComposer = () => {
    setAddingMain(false);
    setNewMainText("");
    setNewMainCriteria("");
    setNewMainWeight(6);
    setNewMainFreq("weekly");
    setNewMainColor(null);
  };

  // --- Check-in Toggle ---
  const toggleCheckin = async (taskId: string, frequency: string) => {
    const periodType = getPeriodTypeFromFrequency(frequency);
    const periodStart = getPeriodStart(frequency);

    const existing = checkins.find(
      (c) =>
        c.task_id === taskId &&
        c.period_type === periodType &&
        c.period_start === periodStart,
    );

    if (existing) {
      if (existing.completed) {
        // Uncheck
        const { error } = await supabase
          .from("task_checkins")
          .delete()
          .eq("id", existing.id);
        if (error) {
          showSuccessToast(
            isArabic ? "تعذر حذف الإنجاز" : "Could not remove check-in",
          );
          return;
        }
        setCheckins((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        // Mark complete
        const { error } = await supabase
          .from("task_checkins")
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) {
          showSuccessToast(
            isArabic ? "تعذر حفظ الإنجاز" : "Could not save check-in",
          );
          return;
        }
        setCheckins((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  completed: true,
                  completed_at: new Date().toISOString(),
                }
              : c,
          ),
        );
        showSuccessToast(isArabic ? "✓ تم إنجاز المهمة" : "✓ Task completed");
      }
      if (onGoalUpdated) onGoalUpdated();
      fetchChartData();
    } else {
      // Create new checkin
      const { data, error } = await supabase
        .from("task_checkins")
        .insert({
          goal_id: goal.id,
          task_id: taskId,
          period_type: periodType,
          period_start: periodStart,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !data) {
        showSuccessToast(
          isArabic ? "تعذر حفظ الإنجاز" : "Could not save check-in",
        );
        return;
      }

      setCheckins((prev) => [...prev, data]);
      showSuccessToast(isArabic ? "✓ تم إنجاز المهمة" : "✓ Task completed");
      if (onGoalUpdated) onGoalUpdated();
      fetchChartData();
    }
  };

  // --- Skip reason ---
  const handleSetSkipReason = async (
    taskId: string,
    frequency: string,
    reason: SkipReason,
  ) => {
    const existing = findCheckin(taskId, frequency);

    if (existing) {
      const { error } = await supabase
        .from("task_checkins")
        .update({
          completed: false,
          completed_at: null,
          completed_mode: null,
          skip_reason: reason,
        })
        .eq("id", existing.id);
      if (error) {
        if (isSchemaOutdated(error)) schemaToast();
        return;
      }
      setCheckins((prev) =>
        prev.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                completed: false,
                completed_at: null,
                completed_mode: null,
                skip_reason: reason,
              }
            : c,
        ),
      );
      return;
    }

    const { data, error } = await supabase
      .from("task_checkins")
      .insert({
        goal_id: goal.id,
        task_id: taskId,
        period_type: getPeriodTypeFromFrequency(frequency),
        period_start: getPeriodStart(frequency),
        completed: false,
        skip_reason: reason,
      })
      .select()
      .single();

    if (error || !data) {
      if (isSchemaOutdated(error)) schemaToast();
      return;
    }
    setCheckins((prev) => [...prev, data]);
  };

  const handleClearSkipReason = async (taskId: string, frequency: string) => {
    const existing = findCheckin(taskId, frequency);
    if (!existing || existing.completed) return;

    const { error } = await supabase
      .from("task_checkins")
      .delete()
      .eq("id", existing.id);
    if (error) return;
    setCheckins((prev) => prev.filter((c) => c.id !== existing.id));
  };

  // --- Mini version ---
  const handleRequestMini = async (taskId: string): Promise<string | null> => {
    try {
      const response = await fetch(apiUrl("/api/goal/task-mini"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ taskId, language }),
      });
      const data = await response.json();
      if (!response.ok || !data?.miniVersion) {
        if (data?.error === "schema_outdated") schemaToast();
        return null;
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, mini_version: data.miniVersion }
            : task,
        ),
      );
      return data.miniVersion as string;
    } catch (error) {
      console.error("handleRequestMini error:", error);
      return null;
    }
  };

  const handleCompleteMini = async (taskId: string, frequency: string) => {
    const existing = findCheckin(taskId, frequency);
    const completedAt = new Date().toISOString();

    if (existing) {
      const { error } = await supabase
        .from("task_checkins")
        .update({
          completed: true,
          completed_at: completedAt,
          completed_mode: "mini",
        })
        .eq("id", existing.id);
      if (error) {
        if (isSchemaOutdated(error)) schemaToast();
        return;
      }
      setCheckins((prev) =>
        prev.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                completed: true,
                completed_at: completedAt,
                completed_mode: "mini",
              }
            : c,
        ),
      );
    } else {
      const { data, error } = await supabase
        .from("task_checkins")
        .insert({
          goal_id: goal.id,
          task_id: taskId,
          period_type: getPeriodTypeFromFrequency(frequency),
          period_start: getPeriodStart(frequency),
          completed: true,
          completed_at: completedAt,
          completed_mode: "mini",
        })
        .select()
        .single();
      if (error || !data) {
        if (isSchemaOutdated(error)) schemaToast();
        return;
      }
      setCheckins((prev) => [...prev, data]);
    }

    showSuccessToast(
      isArabic
        ? "✓ المصغرة تحسب — السلسلة محفوظة"
        : "✓ Mini counts — streak kept",
    );
    if (onGoalUpdated) onGoalUpdated();
    fetchChartData();
  };

  // --- Task CRUD ---
  const handleAddMain = async () => {
    if (!newMainText.trim()) return;
    const maxSort = tasks.filter((t) => t.task_type === "main").length;
    const mainInsert = {
      goal_id: goal.id,
      task_description: newMainText.trim(),
      frequency: newMainFreq,
      impact_weight: Math.max(1, Math.min(10, newMainWeight)),
      task_type: "main" as const,
      parent_task_id: null,
      sort_order: maxSort,
      time_required_minutes: 0,
      completion_criteria: newMainCriteria.trim() || null,
      ...(newMainColor ? { accent_color: newMainColor } : {}),
    };
    const { data, error } = await supabase
      .from("sub_layers")
      .insert(mainInsert)
      .select()
      .single();

    if (error) {
      const needsColorMigration = error.message?.includes("accent_color");
      showSuccessToast(
        needsColorMigration
          ? isArabic
            ? "فعّل migration اللون أولًا ثم أعد المحاولة"
            : "Apply the color migration first, then try again"
          : isArabic
            ? "تعذر حفظ المهمة الرئيسية"
            : "Could not save main task",
      );
      return;
    }

    if (!error && data) {
      await fetchTasks();
      setNewMainText("");
      setNewMainCriteria("");
      setNewMainWeight(6);
      setNewMainColor(null);
      setAddingMain(false);
    }
  };

  const handleAddSub = async (parentId: string) => {
    if (!newSubText.trim()) return;
    const siblingsCount = tasks.filter(
      (t) => t.parent_task_id === parentId,
    ).length;
    const { error } = await supabase.from("sub_layers").insert({
      goal_id: goal.id,
      task_description: newSubText.trim(),
      frequency: newSubFreq,
      impact_weight: Math.max(1, Math.min(5, newSubWeight)),
      task_type: "sub",
      parent_task_id: parentId,
      sort_order: siblingsCount,
      time_required_minutes: 0,
      completion_criteria: newSubCriteria.trim() || null,
    });

    if (!error) {
      await fetchTasks();
      setNewSubText("");
      setNewSubCriteria("");
      setNewSubWeight(3);
      setAddingSubFor(null);
    }
  };

  const handleOpenTaskEditor = (task: EditableTask) => {
    setEditingTask(task);
    setTaskEditorOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    const title = isArabic ? "حذف المهمة" : "Delete Task";
    const message = isArabic
      ? "هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء."
      : "Are you sure you want to delete this task? This cannot be undone.";

    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await supabase.from("sub_layers").delete().eq("id", taskId);
        await fetchTasks();
        await fetchCheckins();
      },
    });
  };

  const handleRenameTask = async (taskId: string) => {
    if (!editingText.trim()) return;
    await supabase
      .from("sub_layers")
      .update({ task_description: editingText.trim() })
      .eq("id", taskId);
    setEditingTaskId(null);
    setEditingText("");
    await fetchTasks();
  };

  const handleUpdateTaskIcon = async (taskId: string, newIcon: string) => {
    await supabase
      .from("sub_layers")
      .update({ icon: newIcon })
      .eq("id", taskId);
    await fetchTasks();
  };

  const handleUpdateTaskColor = async (
    taskId: string,
    color: TaskColorKey | null,
  ) => {
    const { error } = await supabase
      .from("sub_layers")
      .update({ accent_color: color })
      .eq("id", taskId);
    if (error) {
      const needsColorMigration = error.message?.includes("accent_color");
      showSuccessToast(
        needsColorMigration
          ? isArabic
            ? "فعّل migration اللون أولًا ثم أعد المحاولة"
            : "Apply the color migration first, then try again"
          : isArabic
            ? "تعذر حفظ اللون"
            : "Could not save color",
      );
      return;
    }
    await fetchTasks();
    showSuccessToast(isArabic ? "تم تحديث اللون" : "Color updated");
  };

  const handleUpdateTask = async (taskId: string, patch: TaskPatch) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              task_description: patch.task_description,
              frequency: patch.frequency,
              impact_weight: patch.impact_weight,
              time_required_minutes: patch.time_required_minutes,
              completion_criteria: patch.completion_criteria,
              icon: patch.icon ?? null,
            }
          : t,
      ),
    );

    const { error } = await supabase
      .from("sub_layers")
      .update({
        task_description: patch.task_description,
        frequency: patch.frequency,
        impact_weight: patch.impact_weight,
        time_required_minutes: patch.time_required_minutes,
        completion_criteria: patch.completion_criteria,
        icon: patch.icon ?? null,
      })
      .eq("id", taskId);

    if (error) {
      await fetchTasks();
      throw error;
    }

    await fetchTasks();
    showSuccessToast(isArabic ? "تم تحديث المهمة" : "Task updated");
  };

  const handleUpdateTaskWeight = async (
    taskId: string,
    newWeight: number,
  ) => {
    const { error } = await supabase
      .from("sub_layers")
      .update({ impact_weight: newWeight })
      .eq("id", taskId);
    if (error) {
      showSuccessToast(isArabic ? "تعذر حفظ الوزن" : "Could not save weight");
      return;
    }
    await fetchTasks();
    showSuccessToast(isArabic ? "تم تحديث الوزن" : "Weight updated");
  };

  const handleUpdateTaskScheduleDays = async (
    taskId: string,
    scheduleDays: number[] | null,
  ) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, schedule_days: scheduleDays } : t,
      ),
    );

    try {
      if (scheduleDays && scheduleDays.length > 0) {
        localStorage.setItem(
          `metrix:task_schedule:${taskId}`,
          JSON.stringify(scheduleDays),
        );
      } else {
        localStorage.removeItem(`metrix:task_schedule:${taskId}`);
      }
    } catch {}

    try {
      const { error } = await supabase
        .from("sub_layers")
        .update({ schedule_days: scheduleDays })
        .eq("id", taskId);

      if (error) {
        const isMissingCol =
          (error.message || "").includes("schedule_days") ||
          (error as { code?: string }).code === "42703";
        if (isMissingCol) {
          showSuccessToast(
            isArabic ? "تم حفظ أيام التكرار" : "Repeat days saved",
          );
          return;
        }
        throw error;
      }
      showSuccessToast(
        isArabic ? "تم حفظ أيام التكرار" : "Repeat days saved",
      );
    } catch (err) {
      console.warn("Schedule days remote update notice:", err);
      showSuccessToast(
        isArabic ? "تم حفظ أيام التكرار" : "Repeat days saved",
      );
    }
  };

  // --- Goal Actions ---
  const handleTogglePin = async () => {
    await supabase
      .from("goals")
      .update({ is_pinned: !goal.is_pinned })
      .eq("id", goal.id);
    if (onGoalUpdated) onGoalUpdated();
  };

  const handleDeleteGoal = () => {
    const title = isArabic ? "حذف الهدف" : "Delete Goal";
    const message = isArabic
      ? `هل أنت متأكد من حذف الهدف "${goal.title}"؟ سيتم حذف جميع المهام والسجلات المرتبطة به. لا يمكن التراجع.`
      : `Are you sure you want to delete "${goal.title}"? All associated tasks and logs will be deleted. This cannot be undone.`;

    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("goals")
            .delete()
            .eq("id", goal.id);
          if (error) throw error;
          if (onGoalUpdated) onGoalUpdated();
          window.location.href = "/";
        } catch (err: unknown) {
          const errMessage = err instanceof Error ? err.message : "";
          console.error("Error deleting goal:", err);
          showSuccessToast(
            (isArabic ? "فشل حذف الهدف: " : "Failed to delete goal: ") +
              errMessage,
          );
        }
      },
    });
  };

  const handleUpdateIcon = async (newIcon: string) => {
    await supabase.from("goals").update({ icon: newIcon }).eq("id", goal.id);
    if (onGoalUpdated) onGoalUpdated();
  };

  const handleExportGoal = async () => {
    if (!goal || isExportingGoal) return;
    try {
      setIsExportingGoal(true);
      showSuccessToast(
        isArabic ? "جارٍ تصدير ملف الهدف..." : "Exporting goal dossier...",
      );
      await exportGoalMarkdownDirect(supabase, goal, isArabic);
      showSuccessToast(
        isArabic
          ? "تم تصدير ملف الهدف بنجاح!"
          : "Goal dossier exported successfully!",
      );
    } catch (err) {
      console.error("Error exporting goal:", err);
      showSuccessToast(
        isArabic ? "فشل تصدير الهدف" : "Failed to export goal",
      );
    } finally {
      setIsExportingGoal(false);
    }
  };

  return {
    editingTaskId,
    setEditingTaskId,
    editingText,
    setEditingText,
    addingSubFor,
    setAddingSubFor,
    newSubText,
    setNewSubText,
    newSubCriteria,
    setNewSubCriteria,
    newSubFreq,
    setNewSubFreq,
    newSubWeight,
    setNewSubWeight,
    addingMain,
    setAddingMain,
    newMainText,
    setNewMainText,
    newMainCriteria,
    setNewMainCriteria,
    newMainFreq,
    setNewMainFreq,
    newMainWeight,
    setNewMainWeight,
    newMainColor,
    setNewMainColor,
    newMainAccent,
    expandedMains,
    setExpandedMains,
    confirmModal,
    setConfirmModal,
    showGoalDetails,
    setShowGoalDetails,
    showGoalEditDialog,
    setShowGoalEditDialog,
    isExportingGoal,
    editingTask,
    setEditingTask,
    taskEditorOpen,
    setTaskEditorOpen,
    showLogModal,
    setShowLogModal,
    viewingLog,
    setViewingLog,
    toggleExpand,
    handleStartAddingSub,
    handleStartEditingTask,
    openNewMainComposer,
    closeNewMainComposer,
    toggleCheckin,
    handleSetSkipReason,
    handleClearSkipReason,
    handleRequestMini,
    handleCompleteMini,
    handleAddMain,
    handleAddSub,
    handleOpenTaskEditor,
    handleDeleteTask,
    handleRenameTask,
    handleUpdateTaskIcon,
    handleUpdateTaskColor,
    handleUpdateTask,
    handleUpdateTaskWeight,
    handleUpdateTaskScheduleDays,
    handleTogglePin,
    handleDeleteGoal,
    handleUpdateIcon,
    handleExportGoal,
  };
}
