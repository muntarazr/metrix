import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Language } from "@/lib/translations";
import { apiUrl } from "@/lib/api";
import { getSuggestionsUnlockStatus } from "@/lib/goal-dates";
import {
  buildDailyFocusHistory,
  buildDailyFocusSessionFromRow,
  compactDailyFocusLogs,
  normalizeDailyFocusEntryRow,
  normalizeDailyFocusResult,
  DAILY_FOCUS_REQUIRED_DAYS,
  type DailyFocusEntryRow,
  type DailyFocusGoalContext,
  type DailyFocusSession,
} from "@/lib/daily-focus";
import type { MainTask, TaskRow } from "@/lib/task-hierarchy";
import type { ActivityLog, Goal } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface UseDailyFocusSessionOptions {
  goal: Goal;
  tasks: TaskRow[];
  logs: ActivityLog[];
  logsLoaded: boolean;
  loadingTasks: boolean;
  language: Language;
  isArabic: boolean;
  isActive: boolean;
  showLogModal: boolean;
  todayDateKey: string;
  hierarchy: MainTask[];
  supabase: SupabaseClient;
  fetchTasks: () => Promise<void>;
  setExpandedMains: React.Dispatch<React.SetStateAction<Set<string>>>;
  showSuccessToast: (msg: string) => void;
  onGoalUpdated?: () => void;
}

export function useDailyFocusSession({
  goal,
  tasks,
  logs,
  logsLoaded,
  loadingTasks,
  language,
  isArabic,
  isActive,
  showLogModal,
  todayDateKey,
  hierarchy,
  supabase,
  fetchTasks,
  setExpandedMains,
  showSuccessToast,
  onGoalUpdated,
}: UseDailyFocusSessionOptions) {
  const [dailyFocusRows, setDailyFocusRows] = useState<DailyFocusEntryRow[]>(
    [],
  );
  const [dailyFocusRowsLoaded, setDailyFocusRowsLoaded] = useState(false);
  const [dailyFocus, setDailyFocus] = useState<DailyFocusSession | null>(null);
  const dailyFocusRef = useRef<DailyFocusSession | null>(dailyFocus);
  useEffect(() => {
    dailyFocusRef.current = dailyFocus;
  }, [dailyFocus]);
  const generatedForDateRef = useRef<string | null>(null);

  const [dailyFocusAnswer, setDailyFocusAnswer] = useState("");
  const [dailyFocusLoading, setDailyFocusLoading] = useState(false);
  const [dailyFocusSubmitting, setDailyFocusSubmitting] = useState(false);
  const [dailyFocusError, setDailyFocusError] = useState<string | null>(null);
  const [addingSuggestionId, setAddingSuggestionId] = useState<string | null>(
    null,
  );
  const [showDailyFocusPrompt, setShowDailyFocusPrompt] = useState(false);
  const [dailyFocusPromptDismissed, setDailyFocusPromptDismissed] =
    useState(false);

  const dailyFocusPromptStorageKey = `metrix:daily-focus-prompt:${goal.id}:${todayDateKey}`;

  const dailyFocusGoal = useMemo<DailyFocusGoalContext>(
    () => ({
      id: goal.id,
      title: goal.title,
      ai_summary: goal.ai_summary || "",
      created_at: goal.created_at,
      current_points: goal.current_points,
      target_points: goal.target_points,
    }),
    [
      goal.ai_summary,
      goal.created_at,
      goal.current_points,
      goal.id,
      goal.target_points,
      goal.title,
    ],
  );

  const suggestionsUnlockStatus = useMemo(
    () => getSuggestionsUnlockStatus(goal.created_at),
    [goal.created_at],
  );

  const recentFocusLogs = useMemo(() => compactDailyFocusLogs(logs), [logs]);

  const answeredDailyFocusRows = useMemo(
    () =>
      dailyFocusRows.filter((row) =>
        Boolean((row.answer || "").trim() && row.answered_at),
      ),
    [dailyFocusRows],
  );

  const answeredDailyFocusCount = answeredDailyFocusRows.length;

  const todayDailyFocusRow = useMemo(
    () =>
      dailyFocusRows.find((row) => row.prompt_date === todayDateKey) || null,
    [dailyFocusRows, todayDateKey],
  );

  const dailyFocusHistory = useMemo(
    () =>
      buildDailyFocusHistory(
        dailyFocusRows.filter((row) => row.prompt_date !== todayDateKey),
      ),
    [dailyFocusRows, todayDateKey],
  );

  const missedDailyFocusHistory = useMemo(
    () =>
      dailyFocusRows
        .filter(
          (row) =>
            row.prompt_date !== todayDateKey &&
            !(row.answer && row.answered_at),
        )
        .map((row) => ({
          prompt_date: row.prompt_date,
          question: row.question,
          answer: row.answer || "",
          answer_coaching: null,
          answered_at: null,
        })),
    [dailyFocusRows, todayDateKey],
  );

  const fetchDailyFocusRows = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_focus_answers")
      .select(
        "id, goal_id, user_id, prompt_date, angle_label, question, question_why, answer, answer_coaching, suggestions, created_at, updated_at, answered_at",
      )
      .eq("goal_id", goal.id)
      .order("prompt_date", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Failed to fetch daily focus history:", error);
      setDailyFocusRows([]);
      setDailyFocusRowsLoaded(true);
      return;
    }

    setDailyFocusRows(
      (data || [])
        .map((row) => normalizeDailyFocusEntryRow(row))
        .filter((row): row is DailyFocusEntryRow => Boolean(row)),
    );
    setDailyFocusRowsLoaded(true);
  }, [goal.id, supabase]);

  const upsertDailyFocusRow = useCallback(
    async (payload: {
      angle_label: string;
      question: string;
      question_why: string;
      answer?: string;
      answer_coaching?: string;
      suggestions?: unknown[];
      quick_options?: string[];
      answered_at?: string | null;
    }) => {
      let existingApplied: string[] = [];
      let existingRejected: string[] = [];
      if (todayDailyFocusRow && typeof todayDailyFocusRow.suggestions === "object" && todayDailyFocusRow.suggestions !== null) {
        const s = todayDailyFocusRow.suggestions as any;
        if (Array.isArray(s.applied_ids)) existingApplied = s.applied_ids;
        else if (Array.isArray(s.addedSuggestionIds)) existingApplied = s.addedSuggestionIds;
        if (Array.isArray(s.rejected_ids)) existingRejected = s.rejected_ids;
      }

      const suggestionsPayload = {
        items: payload.suggestions || [],
        quick_options: payload.quick_options || [],
        applied_ids: existingApplied,
        rejected_ids: existingRejected,
      };

      const { data, error } = await supabase
        .from("daily_focus_answers")
        .upsert(
          {
            goal_id: goal.id,
            prompt_date: todayDateKey,
            angle_label: payload.angle_label,
            question: payload.question,
            question_why: payload.question_why,
            answer: payload.answer || null,
            answer_coaching: payload.answer_coaching || null,
            suggestions: suggestionsPayload,
            answered_at: payload.answered_at || null,
          },
          { onConflict: "goal_id,prompt_date" },
        )
        .select(
          "id, goal_id, user_id, prompt_date, angle_label, question, question_why, answer, answer_coaching, suggestions, created_at, updated_at, answered_at",
        )
        .single();

      if (error) throw error;

      const normalizedRow = normalizeDailyFocusEntryRow(data);
      if (!normalizedRow) {
        throw new Error(
          language === "ar"
            ? "تعذر حفظ سجل أسئلة الخطة."
            : "Could not save the plan feedback entry.",
        );
      }

      setDailyFocusRows((currentRows) => {
        const nextRows = currentRows.filter(
          (row) => row.prompt_date !== normalizedRow.prompt_date,
        );
        return [normalizedRow, ...nextRows].sort((a, b) =>
          b.prompt_date.localeCompare(a.prompt_date),
        );
      });

      return normalizedRow;
    },
    [goal.id, language, supabase, todayDailyFocusRow, todayDateKey],
  );

  const generateDailyFocus = useCallback(
    async (options?: {
      answer?: string;
      existingQuestion?: string;
      force?: boolean;
    }) => {
      const submittedAnswer = options?.answer?.trim() || "";
      const isSubmittingAnswer = submittedAnswer.length > 0;

      setDailyFocusError(null);
      if (isSubmittingAnswer) {
        setDailyFocusSubmitting(true);
      } else {
        setDailyFocusLoading(true);
      }

      try {
        const answeredCountWithoutToday = dailyFocusRows.filter(
          (row) =>
            row.prompt_date !== todayDateKey &&
            Boolean((row.answer || "").trim() && row.answered_at),
        ).length;
        const rejectedSuggestionsHistory = dailyFocusRows.flatMap((row) => {
          if (
            row.suggestions &&
            typeof row.suggestions === "object" &&
            Array.isArray((row.suggestions as any).rejected_ids) &&
            Array.isArray((row.suggestions as any).items)
          ) {
            const rejectedIds: string[] = (row.suggestions as any).rejected_ids;
            return (row.suggestions as any).items
              .filter((item: any) => rejectedIds.includes(item?.id))
              .map((item: any) => ({
                title: item?.title,
                action_summary: item?.action_summary,
                reason: item?.reason,
              }));
          }
          return [];
        });

        const response = await fetch(apiUrl("/api/goal/daily-focus"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: dailyFocusGoal,
            tasks,
            logs: recentFocusLogs,
            history: dailyFocusHistory,
            rejectedSuggestions: rejectedSuggestionsHistory,
            answer: submittedAnswer || undefined,
            existingQuestion:
              options?.existingQuestion ||
              todayDailyFocusRow?.question ||
              undefined,
            date: todayDateKey,
            language,
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            data?.error === "quota_exceeded"
              ? language === "ar"
                ? data?.message_ar
                : data?.message_en
              : language === "ar"
                ? "تعذر توليد سؤال اليوم حالياً."
                : "Could not generate today's question right now.";
          throw new Error(message);
        }

        const normalized = normalizeDailyFocusResult(data, todayDateKey);
        if (!normalized) {
          throw new Error(
            language === "ar"
              ? "صيغة سؤال اليوم غير صالحة."
              : "Invalid daily focus response.",
          );
        }

        if (normalized.status === "refused") {
          throw new Error(
            normalized.safe_redirection?.message ||
              (language === "ar"
                ? "لا يمكن توليد هذا السؤال حالياً."
                : "This question cannot be generated right now."),
          );
        }

        const answeredAt = submittedAnswer
          ? new Date().toISOString()
          : todayDailyFocusRow?.answered_at || null;
        const savedRow = await upsertDailyFocusRow({
          angle_label: normalized.angle_label,
          question: normalized.question,
          question_why: normalized.question_why,
          answer: submittedAnswer || todayDailyFocusRow?.answer || "",
          answer_coaching: normalized.answer_coaching,
          suggestions: normalized.suggestions,
          quick_options:
            normalized.quick_options && normalized.quick_options.length > 0
              ? normalized.quick_options
              : dailyFocusRef.current?.quick_options || [],
          answered_at: answeredAt,
        });

        const computedAnsweredDaysCount = submittedAnswer
          ? answeredCountWithoutToday + 1
          : answeredCountWithoutToday +
            (savedRow.answer && savedRow.answered_at ? 1 : 0);
        const nextSession = buildDailyFocusSessionFromRow(savedRow, {
          answeredDaysCount: computedAnsweredDaysCount,
          requiredAnswerDays: normalized.required_answer_days,
        });

        nextSession.answer_coaching = normalized.answer_coaching;
        nextSession.suggestions = normalized.suggestions;
        nextSession.suggestions_unlocked = normalized.suggestions_unlocked;
        nextSession.answered_days_count = normalized.answered_days_count;
        nextSession.required_answer_days = normalized.required_answer_days;
        if (normalized.quick_options && normalized.quick_options.length > 0) {
          nextSession.quick_options = normalized.quick_options;
        }

        setDailyFocus(nextSession);
        setDailyFocusAnswer(nextSession.answer || "");
        return nextSession;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : language === "ar"
              ? "تعذر توليد سؤال اليوم حالياً."
              : "Could not generate today's question right now.";
        setDailyFocusError(message);

        return null;
      } finally {
        setDailyFocusLoading(false);
        setDailyFocusSubmitting(false);
      }
    },
    [
      dailyFocusGoal,
      dailyFocusHistory,
      dailyFocusRows,
      language,
      recentFocusLogs,
      tasks,
      todayDailyFocusRow,
      todayDateKey,
      upsertDailyFocusRow,
    ],
  );

  useEffect(() => {
    generatedForDateRef.current = null;
    setDailyFocusRowsLoaded(false);
    setDailyFocusRows([]);
    setDailyFocus(null);
    setDailyFocusAnswer("");
    setDailyFocusError(null);
    setAddingSuggestionId(null);
    setShowDailyFocusPrompt(false);
    setDailyFocusPromptDismissed(false);
  }, [goal.id, todayDateKey]);

  useEffect(() => {
    fetchDailyFocusRows();
  }, [fetchDailyFocusRows]);

  useEffect(() => {
    if (loadingTasks || !logsLoaded || !dailyFocusRowsLoaded) return;

    if (todayDailyFocusRow) {
      setDailyFocus((prev) => {
        if (
          prev &&
          prev.date === todayDailyFocusRow.prompt_date &&
          prev.question === todayDailyFocusRow.question &&
          prev.answer === (todayDailyFocusRow.answer || "") &&
          prev.answered_at === todayDailyFocusRow.answered_at
        ) {
          return prev;
        }
        return buildDailyFocusSessionFromRow(todayDailyFocusRow, {
          answeredDaysCount: answeredDailyFocusCount,
          requiredAnswerDays: DAILY_FOCUS_REQUIRED_DAYS,
        });
      });
      setDailyFocusAnswer((prev) => (prev ? prev : todayDailyFocusRow.answer || ""));
      setDailyFocusError(null);
      return;
    }

    if (dailyFocusLoading || dailyFocusSubmitting) return;
    if (generatedForDateRef.current === todayDateKey) return;
    generatedForDateRef.current = todayDateKey;

    generateDailyFocus();
  }, [
    answeredDailyFocusCount,
    dailyFocusRowsLoaded,
    generateDailyFocus,
    loadingTasks,
    logsLoaded,
    todayDailyFocusRow,
    todayDateKey,
    dailyFocusLoading,
    dailyFocusSubmitting,
  ]);

  useEffect(() => {
    if (!isActive) {
      setShowDailyFocusPrompt(false);
      return;
    }

    if (!dailyFocus || dailyFocus.answered_at || dailyFocusPromptDismissed)
      return;

    const alreadySeenToday =
      typeof window !== "undefined" &&
      window.localStorage.getItem(dailyFocusPromptStorageKey) === "seen";

    if (alreadySeenToday) {
      setDailyFocusPromptDismissed(true);
      return;
    }

    if (!showLogModal) {
      setShowDailyFocusPrompt(true);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(dailyFocusPromptStorageKey, "seen");
    }
  }, [
    isActive,
    dailyFocus,
    dailyFocusPromptDismissed,
    dailyFocusPromptStorageKey,
    showLogModal,
  ]);

  useEffect(() => {
    if (!dailyFocus?.answered_at) return;
    setShowDailyFocusPrompt(false);
    setDailyFocusPromptDismissed(true);
  }, [dailyFocus?.answered_at]);

  const updateDailyFocusSession = useCallback(
    (updater: (current: DailyFocusSession) => DailyFocusSession) => {
      setDailyFocus((current) => {
        if (!current) return current;
        return updater(current);
      });
    },
    [],
  );

  const handleDailyFocusAnswerChange = useCallback(
    (text: string) => {
      setDailyFocusAnswer(text);
      updateDailyFocusSession((current) => ({ ...current, answer: text }));
    },
    [updateDailyFocusSession],
  );

  const handleAppendDailyFocusTranscript = useCallback(
    (transcript: string) => {
      setDailyFocusAnswer((currentAnswer) => {
        const nextAnswer = currentAnswer
          ? `${currentAnswer} ${transcript}`.replace(/\s+/g, " ").trim()
          : transcript.trim();
        updateDailyFocusSession((current) => ({
          ...current,
          answer: nextAnswer,
        }));
        return nextAnswer;
      });
    },
    [updateDailyFocusSession],
  );

  const handleSubmitDailyFocusAnswer = useCallback(async () => {
    if (!dailyFocus || !dailyFocusAnswer.trim()) return;

    const nextSession = await generateDailyFocus({
      answer: dailyFocusAnswer,
      existingQuestion: dailyFocus.question,
      force: true,
    });

    if (nextSession) {
      showSuccessToast(
        isArabic ? "تم حفظ جواب اليوم" : "Today's answer was saved",
      );
      await supabase.rpc("increment_goal_points", {
        goal_uuid: goal.id,
        points_to_add: 2,
      });
      onGoalUpdated?.();
    }
  }, [
    dailyFocus,
    dailyFocusAnswer,
    generateDailyFocus,
    isArabic,
    supabase,
    goal.id,
    onGoalUpdated,
    showSuccessToast,
  ]);

  const handleAddDailyFocusSuggestion = useCallback(
    async (suggestionId: string) => {
      const suggestion = dailyFocus?.suggestions.find(
        (item) => item.id === suggestionId,
      );
      if (!suggestion) return;
      if (dailyFocus?.addedSuggestionIds.includes(suggestionId)) return;
      if (
        suggestion.support_type !== "task_adjustment" &&
        tasks.some(
          (task) =>
            task.task_description.trim().toLowerCase() ===
            suggestion.title.trim().toLowerCase(),
        )
      ) {
        showSuccessToast(
          isArabic ? "هذه المهمة موجودة أصلًا" : "This task already exists",
        );
        return;
      }

      setAddingSuggestionId(suggestionId);

      try {
        const isModification =
          suggestion.change_type === "modify_task" ||
          suggestion.support_type === "task_adjustment";

        if (isModification && suggestion.target_task_id) {
          const targetTask = tasks.find(
            (t) => t.id === suggestion.target_task_id,
          );
          const patch: Record<string, any> = {};

          if (
            suggestion.changes?.completion_criteria !== undefined &&
            suggestion.changes.completion_criteria !== null
          ) {
            patch.completion_criteria = suggestion.changes.completion_criteria;
          } else if (suggestion.completion_criteria) {
            patch.completion_criteria = suggestion.completion_criteria;
          }

          if (
            suggestion.changes?.time_required_minutes !== undefined &&
            suggestion.changes.time_required_minutes !== null
          ) {
            patch.time_required_minutes =
              suggestion.changes.time_required_minutes;
          } else if (
            suggestion.adjusted_time_required !== null &&
            suggestion.adjusted_time_required !== undefined
          ) {
            patch.time_required_minutes = suggestion.adjusted_time_required;
          }

          if (suggestion.changes?.frequency) {
            patch.frequency = suggestion.changes.frequency;
          }

          if (suggestion.changes?.schedule_days !== undefined) {
            patch.schedule_days = suggestion.changes.schedule_days;
          }

          if (
            suggestion.changes?.impact_weight !== undefined &&
            suggestion.changes.impact_weight !== null
          ) {
            patch.impact_weight = suggestion.changes.impact_weight;
          }

          // Preserve the original task description - never replace it with an action title
          if (targetTask) {
            patch.task_description = targetTask.task_description;
          }

          const { error } = await supabase
            .from("sub_layers")
            .update(patch)
            .eq("id", suggestion.target_task_id);

          if (error) throw error;

          const appliedIds = Array.from(
            new Set([
              ...(dailyFocus?.appliedSuggestionIds || []),
              ...(dailyFocus?.addedSuggestionIds || []),
              suggestionId,
            ]),
          );
          const rejectedIds = (
            dailyFocus?.rejectedSuggestionIds || []
          ).filter((id) => id !== suggestionId);

          const currentSuggestions = todayDailyFocusRow?.suggestions;
          let rawItems: any[] = [];
          let quickOptions: any[] = [];
          if (currentSuggestions && typeof currentSuggestions === "object") {
            rawItems = Array.isArray((currentSuggestions as any).items)
              ? (currentSuggestions as any).items
              : [];
            quickOptions = Array.isArray(
              (currentSuggestions as any).quick_options,
            )
              ? (currentSuggestions as any).quick_options
              : [];
          } else if (Array.isArray(currentSuggestions)) {
            rawItems = currentSuggestions;
          }

          await supabase
            .from("daily_focus_answers")
            .update({
              suggestions: {
                items: rawItems,
                quick_options: quickOptions,
                applied_ids: appliedIds,
                rejected_ids: rejectedIds,
              },
            })
            .eq("goal_id", goal.id)
            .eq("prompt_date", todayDateKey);

          await fetchTasks();
          updateDailyFocusSession((current) => ({
            ...current,
            addedSuggestionIds: appliedIds,
            appliedSuggestionIds: appliedIds,
            rejectedSuggestionIds: rejectedIds,
            suggestions: current.suggestions.map((s) =>
              s.id === suggestionId ? { ...s, status: "applied" } : s,
            ),
          }));
          showSuccessToast(
            isArabic
              ? "تم تطبيق التعديل على المهمة بنجاح"
              : "Task adjustment applied successfully",
          );
          return;
        }

        const preferredParentId =
          suggestion.target_type === "sub" &&
          hierarchy.some((main) => main.id === suggestion.parent_task_id)
            ? suggestion.parent_task_id
            : hierarchy[0]?.id || null;

        if (suggestion.target_type === "sub" && preferredParentId) {
          const siblingsCount = tasks.filter(
            (task) => task.parent_task_id === preferredParentId,
          ).length;

          const { error } = await supabase.from("sub_layers").insert({
            goal_id: goal.id,
            task_description: suggestion.title.trim(),
            frequency: suggestion.frequency,
            impact_weight: Math.max(1, Math.min(5, suggestion.impact_weight)),
            task_type: "sub",
            parent_task_id: preferredParentId,
            sort_order: siblingsCount,
            time_required_minutes:
              suggestion.time_required_minutes ||
              suggestion.adjusted_time_required ||
              0,
            completion_criteria:
              suggestion.completion_criteria || suggestion.reason || null,
          });

          if (error) throw error;

          setExpandedMains((current) => {
            const next = new Set(current);
            next.add(preferredParentId);
            return next;
          });
        } else {
          const mainCount = tasks.filter(
            (task) => (task.task_type || "main") === "main",
          ).length;

          const { error } = await supabase.from("sub_layers").insert({
            goal_id: goal.id,
            task_description: suggestion.title.trim(),
            frequency: suggestion.frequency,
            impact_weight: Math.max(1, Math.min(10, suggestion.impact_weight)),
            task_type: "main",
            parent_task_id: null,
            sort_order: mainCount,
            time_required_minutes:
              suggestion.time_required_minutes ||
              suggestion.adjusted_time_required ||
              0,
            completion_criteria:
              suggestion.completion_criteria || suggestion.reason || null,
          });

          if (error) throw error;
        }

        const appliedIds = Array.from(
          new Set([
            ...(dailyFocus?.appliedSuggestionIds || []),
            ...(dailyFocus?.addedSuggestionIds || []),
            suggestionId,
          ]),
        );
        const rejectedIds = (
          dailyFocus?.rejectedSuggestionIds || []
        ).filter((id) => id !== suggestionId);

        const currentSuggestions = todayDailyFocusRow?.suggestions;
        let rawItems: any[] = [];
        let quickOptions: any[] = [];
        if (currentSuggestions && typeof currentSuggestions === "object") {
          rawItems = Array.isArray((currentSuggestions as any).items)
            ? (currentSuggestions as any).items
            : [];
          quickOptions = Array.isArray((currentSuggestions as any).quick_options)
            ? (currentSuggestions as any).quick_options
            : [];
        } else if (Array.isArray(currentSuggestions)) {
          rawItems = currentSuggestions;
        }

        await supabase
          .from("daily_focus_answers")
          .update({
            suggestions: {
              items: rawItems,
              quick_options: quickOptions,
              applied_ids: appliedIds,
              rejected_ids: rejectedIds,
            },
          })
          .eq("goal_id", goal.id)
          .eq("prompt_date", todayDateKey);

        await fetchTasks();
        updateDailyFocusSession((current) => ({
          ...current,
          addedSuggestionIds: appliedIds,
          appliedSuggestionIds: appliedIds,
          rejectedSuggestionIds: rejectedIds,
          suggestions: current.suggestions.map((s) =>
            s.id === suggestionId ? { ...s, status: "applied" } : s,
          ),
        }));
        showSuccessToast(
          isArabic
            ? "تمت إضافة الاقتراح إلى مهامك"
            : "Suggestion added to your tasks",
        );
      } catch (error) {
        console.error("Failed to add daily focus suggestion:", error);
        showSuccessToast(
          isArabic
            ? "تعذر إضافة هذا الاقتراح"
            : "Could not add this suggestion",
        );
      } finally {
        setAddingSuggestionId(null);
      }
    },
    [
      dailyFocus,
      fetchTasks,
      goal.id,
      hierarchy,
      isArabic,
      setExpandedMains,
      showSuccessToast,
      supabase,
      tasks,
      todayDailyFocusRow,
      todayDateKey,
      updateDailyFocusSession,
    ],
  );

  const handleRejectDailyFocusSuggestion = useCallback(
    async (suggestionId: string) => {
      const appliedIds = (
        dailyFocus?.appliedSuggestionIds ||
        dailyFocus?.addedSuggestionIds ||
        []
      ).filter((id) => id !== suggestionId);
      const rejectedIds = Array.from(
        new Set([
          ...(dailyFocus?.rejectedSuggestionIds || []),
          suggestionId,
        ]),
      );

      const currentSuggestions = todayDailyFocusRow?.suggestions;
      let rawItems: any[] = [];
      let quickOptions: any[] = [];
      if (currentSuggestions && typeof currentSuggestions === "object") {
        rawItems = Array.isArray((currentSuggestions as any).items)
          ? (currentSuggestions as any).items
          : [];
        quickOptions = Array.isArray((currentSuggestions as any).quick_options)
          ? (currentSuggestions as any).quick_options
          : [];
      } else if (Array.isArray(currentSuggestions)) {
        rawItems = currentSuggestions;
      }

      await supabase
        .from("daily_focus_answers")
        .update({
          suggestions: {
            items: rawItems,
            quick_options: quickOptions,
            applied_ids: appliedIds,
            rejected_ids: rejectedIds,
          },
        })
        .eq("goal_id", goal.id)
        .eq("prompt_date", todayDateKey);

      updateDailyFocusSession((current) => ({
        ...current,
        addedSuggestionIds: appliedIds,
        appliedSuggestionIds: appliedIds,
        rejectedSuggestionIds: rejectedIds,
        suggestions: current.suggestions.map((s) =>
          s.id === suggestionId ? { ...s, status: "rejected" } : s,
        ),
      }));

      showSuccessToast(
        isArabic ? "تم رفض الاقتراح" : "Suggestion rejected",
      );
    },
    [
      dailyFocus,
      goal.id,
      isArabic,
      showSuccessToast,
      supabase,
      todayDailyFocusRow,
      todayDateKey,
      updateDailyFocusSession,
    ],
  );

  const handleUndoRejectSuggestion = useCallback(
    async (suggestionId: string) => {
      const rejectedIds = (dailyFocus?.rejectedSuggestionIds || []).filter(
        (id) => id !== suggestionId,
      );
      const appliedIds =
        dailyFocus?.appliedSuggestionIds ||
        dailyFocus?.addedSuggestionIds ||
        [];

      const currentSuggestions = todayDailyFocusRow?.suggestions;
      let rawItems: any[] = [];
      let quickOptions: any[] = [];
      if (currentSuggestions && typeof currentSuggestions === "object") {
        rawItems = Array.isArray((currentSuggestions as any).items)
          ? (currentSuggestions as any).items
          : [];
        quickOptions = Array.isArray((currentSuggestions as any).quick_options)
          ? (currentSuggestions as any).quick_options
          : [];
      } else if (Array.isArray(currentSuggestions)) {
        rawItems = currentSuggestions;
      }

      await supabase
        .from("daily_focus_answers")
        .update({
          suggestions: {
            items: rawItems,
            quick_options: quickOptions,
            applied_ids: appliedIds,
            rejected_ids: rejectedIds,
          },
        })
        .eq("goal_id", goal.id)
        .eq("prompt_date", todayDateKey);

      updateDailyFocusSession((current) => ({
        ...current,
        rejectedSuggestionIds: rejectedIds,
        suggestions: current.suggestions.map((s) =>
          s.id === suggestionId ? { ...s, status: "pending" } : s,
        ),
      }));
    },
    [
      dailyFocus,
      goal.id,
      supabase,
      todayDailyFocusRow,
      todayDateKey,
      updateDailyFocusSession,
    ],
  );

  return {
    dailyFocusRows,
    dailyFocusRowsLoaded,
    dailyFocus,
    dailyFocusAnswer,
    dailyFocusLoading,
    dailyFocusSubmitting,
    dailyFocusError,
    addingSuggestionId,
    showDailyFocusPrompt,
    setShowDailyFocusPrompt,
    dailyFocusPromptDismissed,
    setDailyFocusPromptDismissed,
    dailyFocusPromptStorageKey,
    suggestionsUnlockStatus,
    answeredDailyFocusCount,
    dailyFocusHistory,
    missedDailyFocusHistory,
    fetchDailyFocusRows,
    generateDailyFocus,
    handleDailyFocusAnswerChange,
    handleAppendDailyFocusTranscript,
    handleSubmitDailyFocusAnswer,
    handleAddDailyFocusSuggestion,
    handleRejectDailyFocusSuggestion,
    handleUndoRejectSuggestion,
  };
}
