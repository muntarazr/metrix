"use client";

import { useState, type CSSProperties } from "react";
import TaskSkipPopover, { type SkipReason } from "./TaskSkipPopover";
import type { EditableTask } from "./TaskEditDialog";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  Weight,
  ListTodo,
  MoreVertical,
  Palette,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WELL_SURFACE } from "@/lib/surfaces";
import { translations, type Language } from "@/lib/translations";
import { getTaskAccent, type TaskColorKey } from "@/lib/task-colors";
import { type MainTask } from "@/lib/task-hierarchy";
import type {
  DailyFocusHistoryItem,
  DailyFocusSession,
} from "@/lib/daily-focus";
import FullEmojiPicker from "../shared/FullEmojiPicker";
import TaskAppearancePicker from "../shared/TaskAppearancePicker";
import TaskColorPicker from "../shared/TaskColorPicker";
import DailyFocusPanel from "./DailyFocusPanel";

interface FocusTabProps {
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  dailyFocusHistory?: DailyFocusHistoryItem[];
  missedDailyFocusHistory?: DailyFocusHistoryItem[];
  dailyFocusLoading: boolean;
  dailyFocusSubmitting: boolean;
  dailyFocusAddingSuggestionId: string | null;
  dailyFocusError: string | null;
  dailyFocusAnswer: string;
  filteredHierarchy: MainTask[];
  hierarchy: MainTask[];
  loadingTasks: boolean;
  focusStats: { totalSubtasks: number; completedSubtasks: number };
  expandedMains: Set<string>;
  addingMain: boolean;
  addingSubFor: string | null;
  newMainText: string;
  newMainCriteria?: string;
  newMainFreq: "daily" | "weekly";
  newMainWeight: number;
  newMainColor: TaskColorKey | null;
  newMainAccent: ReturnType<typeof getTaskAccent>;
  newSubText: string;
  newSubCriteria?: string;
  newSubFreq: "daily" | "weekly";
  newSubWeight: number;
  editingTaskId: string | null;
  editingText: string;
  isChecked: (taskId: string, frequency: string) => boolean;
  isCompletedToday: (taskId: string) => boolean;
  shouldAnimateTask: (taskId: string) => boolean;
  getSkipReason: (taskId: string, frequency: string) => string | null;
  onSetSkipReason: (
    taskId: string,
    frequency: string,
    reason: SkipReason,
  ) => Promise<void>;
  onClearSkipReason: (taskId: string, frequency: string) => Promise<void>;
  onRequestMini: (taskId: string) => Promise<string | null>;
  onCompleteMini: (taskId: string, frequency: string) => Promise<void>;
  onToggleExpand: (mainId: string) => void;
  onToggleCheckin: (taskId: string, frequency: string) => void;
  onOpenNewMainComposer: () => void;
  onCloseNewMainComposer: () => void;
  onAddMain: () => void;
  onStartAddingSub: (mainId: string) => void;
  onCancelAddingSub: () => void;
  onAddSub: (parentId: string) => void;
  onStartEditingTask: (taskId: string, description: string) => void;
  onCancelEditingTask: () => void;
  onRenameTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskIcon: (taskId: string, icon: string) => void;
  onUpdateTaskColor: (taskId: string, color: TaskColorKey | null) => void;
  onUpdateTaskWeight: (taskId: string, weight: number) => void;
  onOpenTaskEditor: (task: EditableTask) => void;
  onSetDailyFocusAnswer: (text: string) => void;
  onAppendDailyFocusTranscript: (text: string) => void;
  onSubmitDailyFocusAnswer: () => void;
  onAddDailyFocusSuggestion: (suggestionId: string) => void;
  onSetNewMainText: (text: string) => void;
  onSetNewMainCriteria?: (criteria: string) => void;
  onSetNewMainFreq: (freq: "daily" | "weekly") => void;
  onSetNewMainWeight: (weight: number) => void;
  onSetNewMainColor: (color: TaskColorKey | null) => void;
  onSetNewSubText: (text: string) => void;
  onSetNewSubCriteria?: (criteria: string) => void;
  onSetNewSubFreq: (freq: "daily" | "weekly") => void;
  onSetNewSubWeight: (weight: number) => void;
  onSetEditingText: (text: string) => void;
  goalTitle?: string;
  onRefreshTasks?: () => Promise<void>;
}

function hexToRgbChannels(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "16, 185, 129";

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

export default function FocusTab({
  language = "ar",
  isArabic,
  dailyFocus,
  dailyFocusHistory = [],
  missedDailyFocusHistory = [],
  dailyFocusLoading,
  dailyFocusSubmitting,
  dailyFocusAddingSuggestionId,
  dailyFocusError,
  dailyFocusAnswer,
  filteredHierarchy,
  hierarchy,
  loadingTasks,
  focusStats,
  expandedMains,
  addingMain,
  addingSubFor,
  newMainText,
  newMainCriteria = "",
  newMainFreq,
  newMainWeight,
  newMainColor,
  newMainAccent,
  newSubText,
  newSubCriteria = "",
  newSubFreq,
  newSubWeight,
  editingTaskId,
  editingText,
  isChecked,
  isCompletedToday,
  shouldAnimateTask,
  getSkipReason,
  onSetSkipReason,
  onClearSkipReason,
  onRequestMini,
  onCompleteMini,
  onToggleExpand,
  onToggleCheckin,
  onOpenNewMainComposer,
  onCloseNewMainComposer,
  onAddMain,
  onStartAddingSub,
  onCancelAddingSub,
  onAddSub,
  onStartEditingTask,
  onCancelEditingTask,
  onRenameTask,
  onDeleteTask,
  onUpdateTaskIcon,
  onUpdateTaskColor,
  onUpdateTaskWeight,
  onOpenTaskEditor,
  onSetDailyFocusAnswer,
  onAppendDailyFocusTranscript,
  onSubmitDailyFocusAnswer,
  onAddDailyFocusSuggestion,
  onSetNewMainText,
  onSetNewMainCriteria,
  onSetNewMainFreq,
  onSetNewMainWeight,
  onSetNewMainColor,
  onSetNewSubText,
  onSetNewSubCriteria,
  onSetNewSubFreq,
  onSetNewSubWeight,
  onSetEditingText,
  goalTitle = "",
  onRefreshTasks,
}: FocusTabProps) {
  const t = translations[language];
  const [focusSection, setFocusSection] = useState<
    "tasks" | "suggestions" | "questions"
  >("tasks");
  const [generatingCriteriaTaskId, setGeneratingCriteriaTaskId] = useState<
    string | null
  >(null);
  const [isGeneratingDraftCriteria, setIsGeneratingDraftCriteria] = useState(false);

  const handleGenerateDraftCriteria = async (
    description: string,
    taskType: "main" | "sub",
    onSuccess: (criteria: string) => void,
  ) => {
    if (!description.trim()) return;
    setIsGeneratingDraftCriteria(true);
    try {
      const res = await fetch("/api/goal/task-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskDescription: description.trim(),
          goalTitle: goalTitle || undefined,
          taskType,
          language,
          force: true,
        }),
      });
      const data = await res.json();
      if (data.criteria) {
        onSuccess(data.criteria);
      }
    } catch (err) {
      console.error("Failed to generate criteria:", err);
    } finally {
      setIsGeneratingDraftCriteria(false);
    }
  };

  const handleGenerateCriteriaForTask = async (
    taskId: string,
    description: string,
    taskType: "main" | "sub",
  ) => {
    setGeneratingCriteriaTaskId(taskId);
    try {
      const res = await fetch("/api/goal/task-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          taskDescription: description,
          goalTitle: goalTitle || undefined,
          taskType,
          language,
          force: true,
        }),
      });
      const data = await res.json();
      if (data.criteria && onRefreshTasks) {
        await onRefreshTasks();
      }
    } catch (err) {
      console.error("Failed to generate criteria for task:", err);
    } finally {
      setGeneratingCriteriaTaskId(null);
    }
  };

  const sectionTabs = [
    { key: "tasks" as const, label: t.focusTasksTab },
    { key: "suggestions" as const, label: t.focusSuggestionsTab },
    { key: "questions" as const, label: t.focusQuestionsTab },
  ];

  // Finished work sinks to the bottom, open work stays on top. The partition is
  // stable, so the order the user arranged is preserved inside each group, and
  // the original array is returned untouched when there is nothing to move.
  const sinkCompleted = <T,>(items: T[], isDone: (item: T) => boolean): T[] => {
    const open: T[] = [];
    const done: T[] = [];
    for (const item of items) (isDone(item) ? done : open).push(item);
    return open.length > 0 && done.length > 0 ? [...open, ...done] : items;
  };

  // A main track counts as finished only once every subtask under it is checked.
  const isMainDone = (main: MainTask) =>
    main.subtasks.length > 0 &&
    main.subtasks.every((sub) => isChecked(sub.id, sub.frequency));

  const orderedHierarchy = sinkCompleted(filteredHierarchy, isMainDone);

  return (
    <div className="flex h-full min-h-0 flex-col pb-0">
      <section className={cn(WELL_SURFACE, "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl")}>
        {/* Filter bar — seamlessly integrated with the container */}
        <div className="shrink-0 px-3 pt-3 pb-1.5 sm:px-4 sm:pt-4 sm:pb-2">
          <div className="flex items-center justify-between gap-2 sm:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Sub-navigation Switcher: Tasks & Suggestions */}
            <div className="inline-flex shrink-0 items-center rounded-2xl border-2 border-border/80 bg-muted/70 p-1 shadow-xs">
              {sectionTabs.map((tab) => {
                const isActive = focusSection === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFocusSection(tab.key)}
                    className={cn(
                      "inline-flex h-7 sm:h-8 items-center justify-center gap-1 sm:gap-2 rounded-xl px-2.5 sm:px-4 min-w-[70px] sm:min-w-[100px] text-[11px] sm:text-xs font-extrabold transition-all duration-150 cursor-pointer active:translate-y-[1px]",
                      isActive
                        ? "bg-card text-foreground border-2 border-border/80 shadow-[0_2px_0_0_var(--border)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.key === "tasks" ? (
                      <ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-85" />
                    ) : tab.key === "suggestions" ? (
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-85" />
                    ) : (
                      <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-85" />
                    )}
                    <span>{tab.label}</span>
                    {tab.key === "questions" && !dailyFocus?.answered_at && (
                      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions & Status (Left side in RTL) */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex h-7 sm:h-8 shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl border-2 border-border/80 bg-muted/60 px-2.5 sm:px-3 text-xs font-bold text-muted-foreground shadow-xs">
                <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="tabular-nums font-black text-foreground">
                  {focusStats.completedSubtasks} / {focusStats.totalSubtasks}
                </span>
                <span className="hidden md:inline text-[11px] text-muted-foreground/80 font-bold">
                  {isArabic ? "مكتمل" : "done"}
                </span>
              </div>

              {focusSection === "tasks" ? (
                <button
                  onClick={
                    addingMain ? onCloseNewMainComposer : onOpenNewMainComposer
                  }
                  className={cn(
                    "inline-flex h-7 sm:h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 text-xs font-extrabold transition-all duration-150 cursor-pointer",
                    addingMain
                      ? "border-2 border-border/80 bg-card text-foreground shadow-[0_2px_0_0_var(--border)] active:translate-y-[1px] active:shadow-none"
                      : "bg-primary text-primary-foreground shadow-[0_3px_0_0_color-mix(in_oklch,var(--primary)_70%,black)] hover:brightness-105 active:translate-y-[2px] active:shadow-none",
                  )}
                  aria-label={
                    addingMain
                      ? isArabic
                        ? "إلغاء"
                        : "Cancel"
                      : isArabic
                        ? "إضافة مهمة"
                        : "Add Task"
                  }
                >
                  {addingMain ? (
                    <>
                      <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="hidden sm:inline">
                        {isArabic ? "إلغاء" : "Cancel"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="hidden sm:inline">
                        {isArabic ? "إضافة مهمة" : "Add Task"}
                      </span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Task list body */}
        <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
          {focusSection === "suggestions" ? (
            <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <DailyFocusPanel
                mode="suggestions"
                language={language}
                isArabic={isArabic}
                dailyFocus={dailyFocus}
                dailyFocusHistory={dailyFocusHistory}
                missedDailyFocusHistory={missedDailyFocusHistory}
                loading={dailyFocusLoading}
                submitting={dailyFocusSubmitting}
                addingSuggestionId={dailyFocusAddingSuggestionId}
                error={dailyFocusError}
                answer={dailyFocusAnswer}
                onAnswerChange={onSetDailyFocusAnswer}
                onAnswerSubmit={onSubmitDailyFocusAnswer}
                onAppendTranscript={onAppendDailyFocusTranscript}
                onAddSuggestion={onAddDailyFocusSuggestion}
                onNavigateToSection={setFocusSection}
              />
            </div>
          ) : focusSection === "questions" ? (
            <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <DailyFocusPanel
                mode="questions"
                language={language}
                isArabic={isArabic}
                dailyFocus={dailyFocus}
                dailyFocusHistory={dailyFocusHistory}
                missedDailyFocusHistory={missedDailyFocusHistory}
                loading={dailyFocusLoading}
                submitting={dailyFocusSubmitting}
                addingSuggestionId={dailyFocusAddingSuggestionId}
                error={dailyFocusError}
                answer={dailyFocusAnswer}
                onAnswerChange={onSetDailyFocusAnswer}
                onAnswerSubmit={onSubmitDailyFocusAnswer}
                onAppendTranscript={onAppendDailyFocusTranscript}
                onAddSuggestion={onAddDailyFocusSuggestion}
                onNavigateToSection={setFocusSection}
              />
            </div>
          ) : loadingTasks ? (
            <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-6 sm:pb-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-28 rounded-full bg-muted" />
                      <div className="h-3 w-2/3 rounded-full bg-muted/60" />
                    </div>
                    <div className="h-8 w-20 rounded-xl bg-muted" />
                  </div>
                  <div className="mt-3 h-12 rounded-xl bg-muted/60" />
                </div>
              ))}
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/12 px-4 py-10 text-center sm:px-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/15 shadow-sm shadow-primary/12">
                <ListTodo className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-[15px] font-extrabold tracking-tight text-foreground">
                {isArabic
                  ? "ابدأ أول مسار رئيسي لهذا الهدف"
                  : "Start the first main track for this goal"}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground/75 sm:text-sm max-w-xs mx-auto">
                {isArabic
                  ? "أضف مساراً رئيسياً واضحاً ثم قسّمه إلى خطوات فرعية حتى تصبح المتابعة اليومية أسهل."
                  : "Add a clear main track, then break it into subtasks so the day-to-day follow-up feels lighter."}
              </p>
              <button
                onClick={onOpenNewMainComposer}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/12 transition-all duration-200 hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                {isArabic ? "إضافة مهمة رئيسية" : "Add main task"}
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "scrollbar-thin min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain",
              )}
            >
              {orderedHierarchy.map((main) => {
                const isExpanded = expandedMains.has(main.id);
                const completedSubs = main.subtasks.filter((sub) =>
                  isChecked(sub.id, sub.frequency),
                ).length;
                const totalSubs = main.subtasks.length;
                const mainCompletion =
                  totalSubs > 0
                    ? Math.round((completedSubs / totalSubs) * 100)
                    : 0;
                const mainDone = totalSubs > 0 && completedSubs === totalSubs;
                const orderedSubtasks = sinkCompleted(main.subtasks, (sub) =>
                  isChecked(sub.id, sub.frequency),
                );
                const mainAccent = getTaskAccent(main.id, main.accent_color);
                const composerVisible = addingSubFor === main.id;
                const accentRgb = hexToRgbChannels(mainAccent.fill);
                const mainCompletedToday =
                  isCompletedToday(main.id) ||
                  main.subtasks.some((sub) => isCompletedToday(sub.id));
                const mainShouldAnimate =
                  shouldAnimateTask(main.id) ||
                  main.subtasks.some((sub) => shouldAnimateTask(sub.id));
                const completionStyle = mainCompletedToday
                  ? ({
                      "--focus-accent-rgb": accentRgb,
                      boxShadow: `0 0 0 1px rgba(${accentRgb}, 0.16), 0 18px 32px -26px rgba(${accentRgb}, 0.48)`,
                    } as CSSProperties)
                  : undefined;

                return (
                  <div
                    key={main.id}
                    className={cn(
                      "group/main overflow-hidden rounded-2xl border-2 border-border/80 bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-border",
                      mainAccent.borderClass,
                      mainCompletedToday && "focus-task-completed-today",
                    )}
                    data-fresh={mainShouldAnimate ? "true" : undefined}
                    style={completionStyle}
                  >
                    <div className="px-2.5 py-1.5 sm:px-3 sm:py-2">
                      <div className="flex flex-col">
                        {/* Main task row */}
                        <div
                          className={cn(
                            "gap-2",
                            editingTaskId === main.id
                              ? "flex flex-col"
                              : "flex items-center gap-1.5 sm:gap-2",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {editingTaskId === main.id ? (
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm shadow-sm",
                                  mainAccent.softClass,
                                  mainAccent.borderClass,
                                )}
                              >
                                <span>{main.icon || "📝"}</span>
                              </div>
                            ) : (
                              <TaskAppearancePicker
                                value={main.accent_color}
                                seed={main.id}
                                currentEmoji={main.icon || "📝"}
                                language={language}
                                onEmojiSelect={(icon) =>
                                  onUpdateTaskIcon(main.id, icon)
                                }
                                onColorSelect={(color) =>
                                  onUpdateTaskColor(main.id, color)
                                }
                              >
                                <button
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm transition-all duration-200 hover:bg-muted/60 hover:scale-105 active:scale-95 shadow-sm",
                                    mainAccent.softClass,
                                    mainAccent.borderClass,
                                  )}
                                  title={
                                    isArabic
                                      ? "تعديل المظهر"
                                      : "Edit appearance"
                                  }
                                >
                                  {main.icon || "📝"}
                                </button>
                              </TaskAppearancePicker>
                            )}

                            <div className="min-w-0 flex-1 self-center">
                              {editingTaskId === main.id ? (
                                <div className="space-y-2">
                                  <input
                                    value={editingText}
                                    onChange={(e) =>
                                      onSetEditingText(e.target.value)
                                    }
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        onRenameTask(main.id);
                                      if (e.key === "Escape")
                                        onCancelEditingTask();
                                    }}
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => onRenameTask(main.id)}
                                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]"
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                      {isArabic ? "حفظ" : "Save"}
                                    </button>
                                    <button
                                      onClick={onCancelEditingTask}
                                      className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:opacity-90"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      {t.cancel}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onToggleExpand(main.id)}
                                  className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg text-start transition-colors hover:bg-muted/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 px-1 -mx-1"
                                  aria-expanded={isExpanded}
                                  title={main.task_description}
                                >
                                  {/* Task name — always visible, prominent */}
                                  <span
                                    className={cn(
                                      "line-clamp-2 min-w-0 flex-1 break-words text-xs font-extrabold leading-snug text-foreground sm:text-sm",
                                      mainCompletedToday &&
                                        "text-foreground/75",
                                      mainDone &&
                                        "line-through text-muted-foreground/75",
                                    )}
                                  >
                                    {main.task_description}
                                  </span>

                                  {/* Inline meta — slim indicators always, full pills on hover (desktop) */}
                                  {totalSubs > 0 && (
                                    <div className="flex shrink-0 items-center gap-2">
                                      {/* Thin progress bar, always visible */}
                                      <div className="h-2 w-14 overflow-hidden rounded-full bg-muted/20 sm:w-20">
                                        <div
                                          className={cn(
                                            "h-full rounded-full transition-all duration-700 ease-out",
                                            mainAccent.swatchClass,
                                          )}
                                          style={{
                                            width: `${Math.max(mainCompletion, completedSubs !== 0 ? 10 : 0)}%`,
                                          }}
                                        />
                                      </div>
                                      {/* Detailed pills — appear on hover (desktop only), or stay visible while the task is expanded */}
                                      <div className={cn("hidden items-center gap-1.5 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/main:opacity-100 [@media(hover:hover)]:flex", isExpanded && "opacity-100")}>
                                        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2.5 text-[11px] font-bold text-muted-foreground border border-border/45">
                                          {completedSubs}/{totalSubs}
                                        </span>
                                        <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-border/70 bg-background px-2.5 text-[11px] font-semibold text-muted-foreground dark:bg-background/20">
                                          {isArabic
                                            ? `${mainCompletion}%`
                                            : `${mainCompletion}%`}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {editingTaskId !== main.id && (
                            <div
                              className={cn(
                                "ms-auto flex shrink-0 items-center gap-1 ps-0.5 sm:gap-1.5 sm:ps-1",
                                isArabic &&
                                  "flex-row-reverse ps-0 pe-0.5 sm:pe-1",
                              )}
                            >
                              <button
                                onClick={() => onToggleExpand(main.id)}
                                className={cn(
                                  "hidden h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:text-foreground hover:bg-muted/60 hover:border-border active:scale-95 dark:bg-card/20 sm:inline-flex",
                                  // Reveal on hover (desktop) — stays visible while expanded.
                                  "opacity-0 group-hover/main:opacity-100",
                                  isExpanded &&
                                    "opacity-100 text-foreground bg-muted/60 border-border",
                                )}
                                title={
                                  isExpanded
                                    ? isArabic
                                      ? "طي"
                                      : "Collapse"
                                    : isArabic
                                      ? "تفاصيل"
                                      : "Details"
                                }
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                                )}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className={cn(
                                      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:text-foreground hover:bg-muted/60 hover:border-border active:scale-95 dark:bg-card/20",
                                      // Always accessible on touch screens; reveal on hover on desktop
                                      "opacity-100 pointer-events-auto sm:opacity-0 sm:pointer-events-none sm:group-hover/main:opacity-100 sm:group-hover/main:pointer-events-auto data-[state=open]:pointer-events-auto data-[state=open]:opacity-100",
                                      isExpanded && "sm:pointer-events-auto sm:opacity-100",
                                    )}
                                    title={isArabic ? "المزيد" : "More"}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align={isArabic ? "start" : "end"}
                                  className="w-48"
                                >
                                  <DropdownMenuItem
                                    onClick={() => onStartAddingSub(main.id)}
                                    className="cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                    <span>
                                      {isArabic
                                        ? "إضافة مهمة فرعية"
                                        : "Add subtask"}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onStartEditingTask(
                                        main.id,
                                        main.task_description,
                                      )
                                    }
                                    className="cursor-pointer"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    <span>{t.renameTask}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onOpenTaskEditor({
                                        id: main.id,
                                        task_description: main.task_description,
                                        task_type: "main",
                                        frequency: main.frequency,
                                        impact_weight: main.impact_weight,
                                        time_required_minutes:
                                          main.time_required_minutes,
                                        completion_criteria:
                                          main.completion_criteria,
                                      })
                                    }
                                    className="cursor-pointer"
                                  >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    <span>
                                      {isArabic
                                        ? "تعديل المهمة كاملة"
                                        : "Edit full task"}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {isArabic ? "الوزن:" : "Weight:"}
                                  </div>
                                  <div className="scrollbar-thin flex gap-1 px-2 pb-1 overflow-x-auto">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                      (w) => (
                                        <button
                                          key={w}
                                          onClick={() =>
                                            onUpdateTaskWeight(main.id, w)
                                          }
                                          className={cn(
                                            "h-8 w-8 shrink-0 rounded-lg text-xs font-bold transition-colors",
                                            main.impact_weight === w
                                              ? "bg-primary text-primary-foreground shadow-sm"
                                              : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
                                          )}
                                        >
                                          {w}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onDeleteTask(main.id)}
                                    variant="destructive"
                                    className="cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>{t.deleteTask}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {mainCompletedToday && (
                                <span
                                  className={cn(
                                    "focus-task-completed-pill hidden h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold opacity-0 transition-all duration-200 sm:inline-flex sm:pointer-events-none sm:group-hover/main:pointer-events-auto sm:group-hover/main:opacity-100 shadow-sm",
                                    mainAccent.softClass,
                                    mainAccent.borderClass,
                                    mainAccent.textClass,
                                  )}
                                  data-fresh={
                                    mainShouldAnimate ? "true" : undefined
                                  }
                                  title={t.completedToday}
                                >
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">{t.completedToday}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded subtasks panel with grid transition */}
                        <div
                          className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                          style={{
                            gridTemplateRows: isExpanded ? "1fr" : "0fr"
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="pt-3">
                              <div className="rounded-2xl border-2 border-border/80 bg-muted/40 p-3.5 dark:bg-card/20 shadow-inner">
                                {composerVisible && (
                                  <div className="mb-3 rounded-xl border border-dashed border-border/70 bg-card p-3 dark:bg-card/12 animate-in fade-in slide-in-from-top-2 duration-200 ease-out-quart">
                                    <div className="flex flex-col gap-2.5">
                                      <input
                                        placeholder={
                                          isArabic
                                            ? "أدخل وصف الخطوة الفرعية..."
                                            : "Enter subtask description..."
                                        }
                                        value={newSubText}
                                        onChange={(e) =>
                                          onSetNewSubText(e.target.value)
                                        }
                                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            onAddSub(main.id);
                                          if (e.key === "Escape")
                                            onCancelAddingSub();
                                        }}
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          placeholder={
                                            isArabic
                                              ? "معيار الإنجاز (اختياري)..."
                                              : "Completion criteria (optional)..."
                                          }
                                          value={newSubCriteria}
                                          onChange={(e) =>
                                            onSetNewSubCriteria?.(e.target.value)
                                          }
                                          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px]"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleGenerateDraftCriteria(
                                              newSubText,
                                              "sub",
                                              (crit) =>
                                                onSetNewSubCriteria?.(crit),
                                            )
                                          }
                                          disabled={
                                            !newSubText.trim() ||
                                            isGeneratingDraftCriteria
                                          }
                                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 active:scale-95 disabled:opacity-40"
                                          title={
                                            isArabic
                                              ? "توليد بالذكاء الاصطناعي"
                                              : "Generate with AI"
                                          }
                                        >
                                          {isGeneratingDraftCriteria ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Sparkles className="h-3 w-3" />
                                          )}
                                          <span>
                                            {isArabic
                                              ? "توليد بالذكاء"
                                              : "Generate"}
                                          </span>
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex rounded-lg border border-border bg-card p-0.5 text-[11px] font-semibold">
                                          <button
                                            onClick={() =>
                                              onSetNewSubFreq("daily")
                                            }
                                            className={cn(
                                              "rounded-md px-2 py-1 transition-colors",
                                              newSubFreq === "daily"
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground",
                                            )}
                                          >
                                            {isArabic ? "يومي" : "Daily"}
                                          </button>
                                          <button
                                            onClick={() =>
                                              onSetNewSubFreq("weekly")
                                            }
                                            className={cn(
                                              "rounded-md px-2 py-1 transition-colors",
                                              newSubFreq === "weekly"
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground",
                                            )}
                                          >
                                            {isArabic ? "أسبوعي" : "Weekly"}
                                          </button>
                                        </div>

                                        <button
                                          onClick={() => onAddSub(main.id)}
                                          className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                          {isArabic ? "إضافة" : "Add"}
                                        </button>
                                        <button
                                          onClick={onCancelAddingSub}
                                          className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:opacity-90"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                          {t.cancel}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                            {main.subtasks.length > 0 ? (
                              <div className="space-y-2">
                                {orderedSubtasks.map((sub) => {
                                  const checked = isChecked(
                                    sub.id,
                                    sub.frequency,
                                  );
                                  const completedToday = isCompletedToday(
                                    sub.id,
                                  );
                                  const animateCompletion = shouldAnimateTask(
                                    sub.id,
                                  );
                                  const subCompletionStyle = completedToday
                                    ? ({
                                        "--focus-accent-rgb": accentRgb,
                                        boxShadow: `0 14px 24px -24px rgba(${accentRgb}, 0.44)`,
                                      } as CSSProperties)
                                    : undefined;
                                  return (
                                    <div
                                      key={sub.id}
                                      className={cn(
                                        "group/sub flex items-center gap-2.5 rounded-2xl border-2 px-3 py-2 transition-all duration-200 sm:gap-3 sm:px-3.5 sm:py-2.5",
                                        checked
                                          ? cn(
                                              mainAccent.softClass,
                                              mainAccent.borderClass,
                                              "shadow-xs",
                                            )
                                          : "border-border/80 bg-card hover:border-border shadow-xs hover:shadow-sm",
                                        completedToday &&
                                          "focus-task-completed-today",
                                      )}
                                      data-fresh={
                                        animateCompletion ? "true" : undefined
                                      }
                                      style={subCompletionStyle}
                                    >
                                      <button
                                        onClick={() =>
                                          onToggleCheckin(sub.id, sub.frequency)
                                        }
                                        className={cn(
                                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-150 cursor-pointer active:translate-y-[1px]",
                                          checked
                                            ? "border-primary bg-primary text-primary-foreground shadow-[0_2px_0_0_color-mix(in_oklch,var(--primary)_70%,black)]"
                                            : "border-border/80 bg-background hover:bg-muted/60 shadow-[0_2px_0_0_var(--border)] active:shadow-none dark:bg-background/60",
                                        )}
                                      >
                                        {checked ? (
                                          <CheckSquare
                                            className="h-4 w-4 transition-transform duration-200 animate-check-pop"
                                          />
                                        ) : (
                                          <Square className="h-4 w-4 text-muted-foreground/50 transition-all duration-150 active:scale-95" />
                                        )}
                                      </button>

                                      <div className="min-w-0 flex-1">
                                        {editingTaskId === sub.id ? (
                                          <div className="space-y-2">
                                            <input
                                              value={editingText}
                                              onChange={(e) =>
                                                onSetEditingText(e.target.value)
                                              }
                                              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                  onRenameTask(sub.id);
                                                if (e.key === "Escape")
                                                  onCancelEditingTask();
                                              }}
                                            />
                                            <div className="flex flex-wrap items-center gap-2">
                                              <button
                                                onClick={() =>
                                                  onRenameTask(sub.id)
                                                }
                                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
                                              >
                                                <Save className="h-3.5 w-3.5" />
                                                {isArabic ? "حفظ" : "Save"}
                                              </button>
                                              <button
                                                onClick={onCancelEditingTask}
                                                className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/60 active:scale-95 transition-all"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                                {t.cancel}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex min-w-0 items-start gap-2">
                                            <FullEmojiPicker
                                              value={sub.icon}
                                              language={language}
                                              onSelect={(icon) =>
                                                onUpdateTaskIcon(sub.id, icon)
                                              }
                                            >
                                              <button
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-all duration-200 hover:bg-muted/60 hover:scale-110 active:scale-90 mt-0.5"
                                                title={
                                                  isArabic
                                                    ? "تغيير الأيقونة"
                                                    : "Change icon"
                                                }
                                              >
                                                {sub.icon || "🔹"}
                                              </button>
                                            </FullEmojiPicker>
                                            <div className="min-w-0 flex-1 flex flex-col text-start">
                                              <span
                                                className={cn(
                                                  "min-w-0 break-words text-xs font-semibold leading-snug text-foreground sm:text-sm",
                                                  checked &&
                                                    "line-through text-muted-foreground/75",
                                                )}
                                                title={sub.task_description}
                                              >
                                                {sub.task_description}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex shrink-0 items-center gap-1.5">
                                        {/* Didn't happen? — only while the task is still open */}
                                        {!checked && (
                                          <TaskSkipPopover
                                            isArabic={isArabic}
                                            skipReason={getSkipReason(
                                              sub.id,
                                              sub.frequency,
                                            )}
                                            miniVersion={sub.mini_version ?? null}
                                            onSelectReason={(reason) =>
                                              onSetSkipReason(
                                                sub.id,
                                                sub.frequency,
                                                reason,
                                              )
                                            }
                                            onClearReason={() =>
                                              onClearSkipReason(
                                                sub.id,
                                                sub.frequency,
                                              )
                                            }
                                            onRequestMini={() =>
                                              onRequestMini(sub.id)
                                            }
                                            onCompleteMini={() =>
                                              onCompleteMini(
                                                sub.id,
                                                sub.frequency,
                                              )
                                            }
                                          />
                                        )}

                                        {/* Subtask menu — full edit, weight, delete */}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors duration-200 hover:text-foreground hover:bg-muted/60 hover:border-border active:scale-95 dark:bg-card/20 shadow-sm"
                                              title={isArabic ? "المزيد" : "More"}
                                            >
                                              <MoreVertical className="h-3.5 w-3.5" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent
                                            align={isArabic ? "start" : "end"}
                                            className="w-48"
                                          >
                                            <DropdownMenuItem
                                              onClick={() =>
                                                onStartEditingTask(
                                                  sub.id,
                                                  sub.task_description,
                                                )
                                              }
                                              className="cursor-pointer"
                                            >
                                              <Edit2 className="h-4 w-4" />
                                              <span>{t.renameTask}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                onOpenTaskEditor({
                                                  id: sub.id,
                                                  task_description:
                                                    sub.task_description,
                                                  task_type: "sub",
                                                  frequency: sub.frequency,
                                                  impact_weight:
                                                    sub.impact_weight,
                                                  time_required_minutes:
                                                    sub.time_required_minutes,
                                                  completion_criteria:
                                                    sub.completion_criteria,
                                                })
                                              }
                                              className="cursor-pointer"
                                            >
                                              <SlidersHorizontal className="h-4 w-4" />
                                              <span>
                                                {isArabic
                                                  ? "تعديل المهمة كاملة"
                                                  : "Edit full task"}
                                              </span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <div className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                                              {isArabic ? "الوزن:" : "Weight:"}
                                            </div>
                                            <div className="scrollbar-thin flex gap-1 px-2 pb-1 overflow-x-auto">
                                              {[1, 2, 3, 4, 5].map((w) => (
                                                <button
                                                  key={w}
                                                  onClick={() =>
                                                    onUpdateTaskWeight(sub.id, w)
                                                  }
                                                  className={cn(
                                                    "h-8 w-8 shrink-0 rounded-lg text-xs font-bold transition-colors",
                                                    sub.impact_weight === w
                                                      ? "bg-primary text-primary-foreground shadow-sm"
                                                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
                                                  )}
                                                >
                                                  {w}
                                                </button>
                                              ))}
                                            </div>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={() => onDeleteTask(sub.id)}
                                              variant="destructive"
                                              className="cursor-pointer"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                              <span>{t.deleteTask}</span>
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>

                                        {/* Cadence dot — always visible, tiny */}
                                        <span
                                          className={cn(
                                            "h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background",
                                            sub.frequency === "daily"
                                              ? "bg-primary shadow-sm shadow-primary/20"
                                              : "bg-foreground shadow-sm shadow-foreground/20",
                                          )}
                                          title={
                                            sub.frequency === "daily"
                                              ? isArabic
                                                ? "يومي"
                                                : "Daily"
                                              : isArabic
                                                ? "أسبوعي"
                                                : "Weekly"
                                          }
                                          aria-label={
                                            sub.frequency === "daily"
                                              ? isArabic
                                                ? "يومي"
                                                : "Daily"
                                              : isArabic
                                                ? "أسبوعي"
                                                : "Weekly"
                                          }
                                        />

                                        {/* Detailed pills — only on hover (desktop) */}
                                        <div className="hidden items-center gap-1.5 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sub:opacity-100 [@media(hover:hover)]:flex">
                                          {completedToday && (
                                            <span
                                              className={cn(
                                                "focus-task-completed-pill inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm",
                                                mainAccent.softClass,
                                                mainAccent.borderClass,
                                                mainAccent.textClass,
                                              )}
                                              data-fresh={
                                                animateCompletion
                                                  ? "true"
                                                  : undefined
                                              }
                                              title={t.completedToday}
                                            >
                                              <CheckSquare className="h-3.5 w-3.5" />
                                            </span>
                                          )}
                                          <span
                                            className={cn(
                                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border",
                                              sub.frequency === "daily"
                                                ? "bg-primary/12 text-primary border-primary/15"
                                                : "bg-foreground/12 text-foreground border-foreground/15",
                                            )}
                                          >
                                            {sub.frequency === "daily"
                                              ? isArabic
                                                ? "يومي"
                                                : "Daily"
                                              : isArabic
                                                ? "أسبوعي"
                                                : "Weekly"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="py-6 text-center text-xs text-muted-foreground/75 flex flex-col items-center gap-2.5">
                                <span>
                                  {isArabic
                                    ? "لا توجد خطوات فرعية بعد."
                                    : "No subtasks yet."}
                                </span>
                                {!composerVisible && (
                                  <button
                                    type="button"
                                    onClick={() => onStartAddingSub(main.id)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/10 active:scale-95"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>
                                      {isArabic
                                        ? "إضافة خطوة فرعية"
                                        : "Add subtask"}
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}

                            {main.subtasks.length > 0 && !composerVisible && (
                              <button
                                type="button"
                                onClick={() => onStartAddingSub(main.id)}
                                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 bg-card/40 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:border-border active:scale-[0.99]"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>
                                  {isArabic
                                    ? "إضافة خطوة فرعية"
                                    : "Add subtask"}
                                </span>
                              </button>
                            )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Task Composer Inline */}
          {addingMain && (
            <div className="shrink-0 border-t border-border/70 bg-muted/12 p-4 animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out-quart">
              <div className="rounded-2xl border border-primary/25 bg-card/60 p-4 shadow-sm backdrop-blur-sm dark:bg-card/12">
                <div className="flex flex-col gap-3.5">
                  <input
                    placeholder={
                      isArabic
                        ? "ما هو المسار الرئيسي الجديد الذي تريد التركيز عليه؟"
                        : "What main track do you want to focus on?"
                    }
                    value={newMainText}
                    onChange={(e) => onSetNewMainText(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onAddMain();
                      if (e.key === "Escape") onCloseNewMainComposer();
                    }}
                  />

                  <div className="flex items-center gap-2">
                    <input
                      placeholder={
                        isArabic
                          ? "معيار إنجاز المسار (اختياري)..."
                          : "Track completion criteria (optional)..."
                      }
                      value={newMainCriteria}
                      onChange={(e) => onSetNewMainCriteria?.(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleGenerateDraftCriteria(
                          newMainText,
                          "main",
                          (crit) => onSetNewMainCriteria?.(crit),
                        )
                      }
                      disabled={!newMainText.trim() || isGeneratingDraftCriteria}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 active:scale-95 disabled:opacity-40"
                      title={isArabic ? "توليد بالذكاء الاصطناعي" : "Generate with AI"}
                    >
                      {isGeneratingDraftCriteria ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isArabic ? "توليد بالذكاء" : "Generate with AI"}
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex rounded-lg border border-border bg-card p-0.5 text-[11px] font-bold">
                      <button
                        onClick={() => onSetNewMainFreq("daily")}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 transition-colors",
                          newMainFreq === "daily"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {isArabic ? "يومي" : "Daily"}
                      </button>
                      <button
                        onClick={() => onSetNewMainFreq("weekly")}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 transition-colors",
                          newMainFreq === "weekly"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {isArabic ? "أسبوعي" : "Weekly"}
                      </button>
                    </div>

                    <TaskColorPicker
                      value={newMainColor}
                      onSelect={onSetNewMainColor}
                      language={language}
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
                      >
                        <Palette className="h-3.5 w-3.5" />
                        {newMainColor ? (isArabic ? 'تغيير اللون' : 'Change Color') : (isArabic ? 'اختر لوناً' : 'Choose Color')}
                      </button>
                    </TaskColorPicker>

                    <button
                      onClick={onAddMain}
                      className="ms-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/12 hover:opacity-90 active:scale-95 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      {isArabic ? "إضافة المسار" : "Add Track"}
                    </button>
                    <button
                      onClick={onCloseNewMainComposer}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/60 active:scale-95 transition-all duration-200"
                    >
                      <X className="h-4 w-4" />
                      {t.cancel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
