"use client";

import React from "react";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/reui/sortable";
import {
  Check,
  Square,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Target,
  Plus,
  FileText,
  Edit2,
  SlidersHorizontal,
  Trash2,
  GripVertical,
  CalendarDays,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MainTask, SubTask } from "@/lib/task-hierarchy";
import type { EditableTask } from "./TaskEditDialog";
import TaskProgressRing from "./TaskProgressRing";
import TaskScheduleDaysPicker from "./TaskScheduleDaysPicker";

export interface SubTaskItemProps {
  sub: SubTask;
  subIdx: number;
  totalSubs: number;
  mainId: string;
  mainDescription: string;
  isArabic: boolean;
  t: any;
  animatingId: string | null;
  editingTaskId: string | null;
  editingText: string;
  orderedSubtasks: SubTask[];
  isChecked: (taskId: string, frequency: string) => boolean;
  onMoveSub: (
    mainId: string,
    subId: string,
    subtasks: SubTask[],
    direction: "up" | "down",
  ) => void;
  startLongPress: (task: {
    id: string;
    description: string;
    criteria?: string;
    frequency?: string;
    parentTitle?: string;
    timeRequiredMinutes?: number | null;
    impactWeight?: number;
  }) => void;
  cancelLongPress: () => void;
  onOpenFocusMode: (task: {
    id: string;
    description: string;
    criteria?: string;
    frequency?: string;
    parentTitle?: string;
    timeRequiredMinutes?: number | null;
    impactWeight?: number;
  }) => void;
  onStartEditingTask: (taskId: string, description: string) => void;
  onCancelEditingTask: () => void;
  onRenameTask: (taskId: string) => void;
  onSetEditingText: (text: string) => void;
  onToggleCheckin: (taskId: string, frequency: string) => void;
  onUpdateTaskWeight: (taskId: string, weight: number) => void;
  onOpenTaskEditor: (task: EditableTask) => void;
  setCriteriaDialogTask: React.Dispatch<
    React.SetStateAction<{
      id: string;
      description: string;
      criteria?: string;
      taskType: "main" | "sub";
    } | null>
  >;
  setTaskToDelete: React.Dispatch<
    React.SetStateAction<{
      id: string;
      description: string;
    } | null>
  >;
  onUpdateTaskScheduleDays?: (taskId: string, days: number[] | null) => Promise<void> | void;
}

export function SubTaskItem({
  sub,
  subIdx,
  totalSubs,
  mainId,
  mainDescription,
  isArabic,
  t,
  animatingId,
  editingTaskId,
  editingText,
  orderedSubtasks,
  isChecked,
  onMoveSub,
  startLongPress,
  cancelLongPress,
  onOpenFocusMode,
  onStartEditingTask,
  onCancelEditingTask,
  onRenameTask,
  onSetEditingText,
  onToggleCheckin,
  onUpdateTaskWeight,
  onOpenTaskEditor,
  setCriteriaDialogTask,
  setTaskToDelete,
  onUpdateTaskScheduleDays,
}: SubTaskItemProps) {
  const checked = isChecked(sub.id, sub.frequency);

  return (
    <div
      className={cn(
        "group/sub flex items-center gap-1.5 sm:gap-2 rounded-xl border ps-1.5 pe-2.5 py-1.5 sm:ps-2 sm:pe-3 sm:py-2 transition-all duration-200 select-none",
        checked
          ? "border-border/40 bg-muted/30"
          : "border-border/80 bg-card hover:border-border",
        animatingId === sub.id &&
          "ring-2 ring-primary/50 border-primary bg-primary/5 shadow-xs",
      )}
    >
      {/* ReUI Sortable Item Handle - Clean Grip handle from c-sortable-1 */}
      <SortableItemHandle className="text-muted-foreground/35 hover:text-foreground transition-colors p-0.5 shrink-0 cursor-grab active:cursor-grabbing -ms-0.5">
        <GripVertical className="h-3.5 w-3" />
      </SortableItemHandle>

      <TaskProgressRing
        progress={checked ? 100 : 0}
        isCompleted={checked}
        size={24}
        strokeWidth={2.5}
      />

      <div className="min-w-0 flex-1">
        {editingTaskId === sub.id ? (
          <div className="space-y-1.5">
            <input
              value={editingText}
              onChange={(e) => onSetEditingText(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1 text-xs shadow-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameTask(sub.id);
                if (e.key === "Escape") onCancelEditingTask();
              }}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onRenameTask(sub.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-xs hover:opacity-90 active:scale-95"
              >
                <Save className="h-3 w-3" />
                {isArabic ? "حفظ" : "Save"}
              </button>
              <button
                type="button"
                onClick={onCancelEditingTask}
                className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/60"
              >
                <X className="h-3 w-3" />
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div
            onMouseDown={() =>
              startLongPress({
                id: sub.id,
                description: sub.task_description,
                criteria: sub.completion_criteria || undefined,
                frequency: sub.frequency,
                parentTitle: mainDescription,
                timeRequiredMinutes: sub.time_required_minutes,
                impactWeight: sub.impact_weight,
              })
            }
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={() =>
              startLongPress({
                id: sub.id,
                description: sub.task_description,
                criteria: sub.completion_criteria || undefined,
                frequency: sub.frequency,
                parentTitle: mainDescription,
                timeRequiredMinutes: sub.time_required_minutes,
                impactWeight: sub.impact_weight,
              })
            }
            onTouchEnd={cancelLongPress}
            onTouchCancel={cancelLongPress}
            className="flex min-w-0 items-center gap-2 cursor-pointer select-none"
          >
            <span
              className={cn(
                "min-w-0 flex-1 break-words text-xs font-semibold leading-snug text-foreground transition-opacity",
                checked && "line-through text-muted-foreground/60 opacity-60",
              )}
              title={sub.task_description}
            >
              {sub.task_description}
            </span>

            {sub.frequency === "weekly" && (
              <span className="shrink-0 text-[10px] font-bold text-muted-foreground/75 px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/50">
                {isArabic ? "أسبوعي" : "Weekly"}
              </span>
            )}
          </div>
        )}
      </div>

      {editingTaskId !== sub.id && (
        <div className="shrink-0 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-muted/60 active:scale-95 shadow-xs"
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
                  onOpenFocusMode({
                    id: sub.id,
                    description: sub.task_description,
                    criteria: sub.completion_criteria || undefined,
                    frequency: sub.frequency,
                    parentTitle: mainDescription,
                    timeRequiredMinutes: sub.time_required_minutes,
                    impactWeight: sub.impact_weight,
                  })
                }
                className="cursor-pointer font-bold text-primary"
              >
                <Target className="h-4 w-4 text-primary" />
                <span>{isArabic ? "وضع التركيز" : "Focus Mode"}</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  setCriteriaDialogTask({
                    id: sub.id,
                    description: sub.task_description,
                    criteria: sub.completion_criteria || undefined,
                    taskType: "sub",
                  })
                }
                className="cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>
                  {isArabic ? "معيار الإنجاز" : "Completion criteria"}
                </span>
              </DropdownMenuItem>

              {onUpdateTaskScheduleDays && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{isArabic ? "أيام التكرار" : "Repeat Days"}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="p-1 w-68 bg-card border border-border/80 shadow-xl rounded-xl">
                    <TaskScheduleDaysPicker
                      taskId={sub.id}
                      scheduleDays={sub.schedule_days}
                      isArabic={isArabic}
                      onUpdateScheduleDays={onUpdateTaskScheduleDays}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() =>
                  onMoveSub(mainId, sub.id, orderedSubtasks, "up")
                }
                disabled={subIdx === 0}
                className="cursor-pointer"
              >
                <ChevronUp className="h-4 w-4" />
                <span>{isArabic ? "تحريك للأعلى" : "Move up"}</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  onMoveSub(mainId, sub.id, orderedSubtasks, "down")
                }
                disabled={subIdx === totalSubs - 1}
                className="cursor-pointer"
              >
                <ChevronDown className="h-4 w-4" />
                <span>{isArabic ? "تحريك للأسفل" : "Move down"}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() =>
                  onStartEditingTask(sub.id, sub.task_description)
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
                    task_description: sub.task_description,
                    task_type: "sub",
                    frequency: sub.frequency,
                    impact_weight: sub.impact_weight,
                    time_required_minutes: sub.time_required_minutes,
                    completion_criteria: sub.completion_criteria,
                  })
                }
                className="cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>
                  {isArabic ? "تعديل المهمة كاملة" : "Edit full task"}
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                {isArabic ? "الأهمية / الوزن:" : "Weight:"}
              </div>
              <div className="scrollbar-thin flex gap-1 px-2 pb-1 overflow-x-auto">
                {[1, 2, 3, 4, 5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onUpdateTaskWeight(sub.id, w)}
                    className={cn(
                      "h-6 w-6 shrink-0 rounded text-[11px] font-bold transition-colors",
                      sub.impact_weight === w
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() =>
                  setTaskToDelete({
                    id: sub.id,
                    description: sub.task_description,
                  })
                }
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t.deleteTask}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export interface MainTaskCardProps {
  main: MainTask;
  mainIdx: number;
  totalMains: number;
  isExpanded: boolean;
  isArabic: boolean;
  t: any;
  animatingId: string | null;
  editingTaskId: string | null;
  editingText: string;
  orderedSubtasks: SubTask[];
  isChecked: (taskId: string, frequency: string) => boolean;
  onToggleExpand: (mainId: string, currentDone: boolean) => void;
  onMoveMain: (mainId: string, direction: "up" | "down") => void;
  onMoveSub: (
    mainId: string,
    subId: string,
    subtasks: SubTask[],
    direction: "up" | "down",
  ) => void;
  onReorderSubs: (mainId: string, newSubs: SubTask[]) => void;
  onPersistSubs: (mainId: string, newSubs: SubTask[]) => void;
  startLongPress: (task: {
    id: string;
    description: string;
    criteria?: string;
    frequency?: string;
    parentTitle?: string;
    timeRequiredMinutes?: number | null;
    impactWeight?: number;
  }) => void;
  cancelLongPress: () => void;
  isLongPressTriggeredRef: React.MutableRefObject<boolean>;
  onOpenFocusMode: (task: {
    id: string;
    description: string;
    criteria?: string;
    frequency?: string;
    parentTitle?: string;
    timeRequiredMinutes?: number | null;
    impactWeight?: number;
  }) => void;
  onStartEditingTask: (taskId: string, description: string) => void;
  onCancelEditingTask: () => void;
  onRenameTask: (taskId: string) => void;
  onSetEditingText: (text: string) => void;
  onUpdateTaskWeight: (taskId: string, weight: number) => void;
  onOpenTaskEditor: (task: EditableTask) => void;
  onToggleCheckin: (taskId: string, frequency: string) => void;
  setAddModalConfig: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      type: "main" | "sub";
      parentId?: string;
      parentTitle?: string;
    }>
  >;
  setCriteriaDialogTask: React.Dispatch<
    React.SetStateAction<{
      id: string;
      description: string;
      criteria?: string;
      taskType: "main" | "sub";
    } | null>
  >;
  setTaskToDelete: React.Dispatch<
    React.SetStateAction<{
      id: string;
      description: string;
    } | null>
  >;
  onUpdateTaskScheduleDays?: (taskId: string, days: number[] | null) => Promise<void> | void;
}

export function MainTaskCard({
  main,
  mainIdx,
  totalMains,
  isExpanded,
  isArabic,
  t,
  animatingId,
  editingTaskId,
  editingText,
  orderedSubtasks,
  isChecked,
  onToggleExpand,
  onMoveMain,
  onMoveSub,
  onReorderSubs,
  onPersistSubs,
  startLongPress,
  cancelLongPress,
  isLongPressTriggeredRef,
  onOpenFocusMode,
  onStartEditingTask,
  onCancelEditingTask,
  onRenameTask,
  onSetEditingText,
  onUpdateTaskWeight,
  onOpenTaskEditor,
  onToggleCheckin,
  setAddModalConfig,
  setCriteriaDialogTask,
  setTaskToDelete,
  onUpdateTaskScheduleDays,
}: MainTaskCardProps) {
  const totalSubs = main.subtasks.length;
  const completedSubs = main.subtasks.filter((sub) =>
    isChecked(sub.id, sub.frequency),
  ).length;
  const isSelfChecked = isChecked(main.id, main.frequency);

  const mainDone =
    totalSubs > 0 ? completedSubs === totalSubs : isSelfChecked;

  const mainCompletion =
    totalSubs > 0
      ? Math.round((completedSubs / totalSubs) * 100)
      : isSelfChecked
        ? 100
        : 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs transition-shadow duration-200 select-none",
        animatingId === main.id &&
          "ring-2 ring-primary/50 shadow-md border-primary bg-primary/5",
      )}
    >
      <div className="ps-1.5 pe-3 py-2 sm:ps-2 sm:pe-3.5 sm:py-2.5">
        <div className="flex flex-col">
          {/* Main task row */}
          <div
            className={cn(
              "gap-2",
              editingTaskId === main.id
                ? "flex flex-col"
                : "flex items-center justify-between gap-1.5 sm:gap-2",
            )}
          >
            {editingTaskId === main.id ? (
              <div className="space-y-2">
                <input
                  value={editingText}
                  onChange={(e) => onSetEditingText(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRenameTask(main.id);
                    if (e.key === "Escape") onCancelEditingTask();
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRenameTask(main.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 active:scale-95"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isArabic ? "حفظ" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEditingTask}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:opacity-90"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ReUI Sortable Item Handle - Clean Grip handle from c-sortable-1 */}
                <SortableItemHandle className="text-muted-foreground/35 hover:text-foreground transition-colors p-0.5 sm:p-1 shrink-0 cursor-grab active:cursor-grabbing -ms-0.5">
                  <GripVertical className="h-4 w-3.5 sm:w-4" />
                </SortableItemHandle>

                {/* Clickable Area with Long-Press Support */}
                <div
                  onMouseDown={() =>
                    startLongPress({
                      id: main.id,
                      description: main.task_description,
                      criteria: main.completion_criteria || undefined,
                      frequency: main.frequency,
                      timeRequiredMinutes: main.time_required_minutes,
                      impactWeight: main.impact_weight,
                    })
                  }
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() =>
                    startLongPress({
                      id: main.id,
                      description: main.task_description,
                      criteria: main.completion_criteria || undefined,
                      frequency: main.frequency,
                      timeRequiredMinutes: main.time_required_minutes,
                      impactWeight: main.impact_weight,
                    })
                  }
                  onTouchEnd={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  onClick={() => {
                    if (isLongPressTriggeredRef.current) {
                      isLongPressTriggeredRef.current = false;
                      return;
                    }
                    if (totalSubs > 0) {
                      onToggleExpand(main.id, mainDone);
                    }
                  }}
                  className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 select-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (totalSubs > 0) {
                        onToggleExpand(main.id, mainDone);
                      }
                    }
                  }}
                >
                  <TaskProgressRing
                    progress={mainCompletion}
                    isCompleted={mainDone}
                    size={36}
                    strokeWidth={3.5}
                  />

                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <span
                      className={cn(
                        "line-clamp-2 break-words text-xs sm:text-sm font-black leading-snug text-foreground transition-opacity",
                        mainDone &&
                          "line-through text-muted-foreground/60 opacity-60",
                      )}
                      title={main.task_description}
                    >
                      {main.task_description}
                    </span>
                    {main.completion_criteria && (
                      <span className="line-clamp-1 text-[10.5px] text-muted-foreground/75 font-normal mt-0.5" title={main.completion_criteria}>
                        {main.completion_criteria}
                      </span>
                    )}
                  </div>

                  {totalSubs > 0 && (
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground/75 tabular-nums">
                      {completedSubs}/{totalSubs}
                    </span>
                  )}
                </div>

                {/* Task Actions: Quick Focus Mode + 3-dots Menu */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFocusMode({
                        id: main.id,
                        description: main.task_description,
                        criteria: main.completion_criteria || undefined,
                        frequency: main.frequency,
                        timeRequiredMinutes: main.time_required_minutes,
                        impactWeight: main.impact_weight,
                      });
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-all duration-150 hover:bg-primary/20 hover:border-primary/50 active:scale-95 shadow-xs cursor-pointer"
                    title={isArabic ? "بدء جلسة تركيز" : "Start Focus Session"}
                  >
                    <Target className="h-4 w-4" />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-muted/60 active:scale-95 shadow-xs cursor-pointer"
                        title={isArabic ? "خيارات المهمة" : "Task Options"}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align={isArabic ? "start" : "end"}
                      className="w-52"
                    >

                      <DropdownMenuItem
                        onClick={() =>
                          onOpenFocusMode({
                            id: main.id,
                            description: main.task_description,
                            criteria: main.completion_criteria || undefined,
                            frequency: main.frequency,
                            timeRequiredMinutes: main.time_required_minutes,
                            impactWeight: main.impact_weight,
                          })
                        }
                        className="cursor-pointer font-bold text-primary"
                      >
                        <Target className="h-4 w-4 text-primary" />
                        <span>{isArabic ? "وضع التركيز" : "Focus Mode"}</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => {
                          setAddModalConfig({
                            isOpen: true,
                            type: "sub",
                            parentId: main.id,
                            parentTitle: main.task_description,
                          });
                          if (!isExpanded) onToggleExpand(main.id, mainDone);
                        }}
                        className="cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>
                          {isArabic ? "إضافة مهمة فرعية" : "Add subtask"}
                        </span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() =>
                          setCriteriaDialogTask({
                            id: main.id,
                            description: main.task_description,
                            criteria: main.completion_criteria || undefined,
                            taskType: "main",
                          })
                        }
                        className="cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                        <span>
                          {isArabic ? "معيار الإنجاز" : "Completion criteria"}
                        </span>
                      </DropdownMenuItem>

                      {onUpdateTaskScheduleDays && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>{isArabic ? "أيام التكرار" : "Repeat Days"}</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="p-1 w-68 bg-card border border-border/80 shadow-xl rounded-xl">
                            <TaskScheduleDaysPicker
                              taskId={main.id}
                              scheduleDays={main.schedule_days}
                              isArabic={isArabic}
                              onUpdateScheduleDays={onUpdateTaskScheduleDays}
                            />
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => onMoveMain(main.id, "up")}
                        disabled={mainIdx === 0}
                        className="cursor-pointer"
                      >
                        <ChevronUp className="h-4 w-4" />
                        <span>{isArabic ? "تحريك للأعلى" : "Move up"}</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onMoveMain(main.id, "down")}
                        disabled={mainIdx === totalMains - 1}
                        className="cursor-pointer"
                      >
                        <ChevronDown className="h-4 w-4" />
                        <span>{isArabic ? "تحريك للأسفل" : "Move down"}</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() =>
                          onStartEditingTask(main.id, main.task_description)
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
                            time_required_minutes: main.time_required_minutes,
                            completion_criteria: main.completion_criteria,
                          })
                        }
                        className="cursor-pointer"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>
                          {isArabic ? "تعديل المهمة كاملة" : "Edit full task"}
                        </span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                        {isArabic ? "الأهمية / الوزن:" : "Weight:"}
                      </div>
                      <div className="scrollbar-thin flex gap-1 px-2 pb-1 overflow-x-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => onUpdateTaskWeight(main.id, w)}
                            className={cn(
                              "h-7 w-7 shrink-0 rounded-lg text-xs font-bold transition-colors",
                              main.impact_weight === w
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {w}
                          </button>
                        ))}
                      </div>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() =>
                          setTaskToDelete({
                            id: main.id,
                            description: main.task_description,
                          })
                        }
                        variant="destructive"
                        className="cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{t.deleteTask}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>

          {/* Expanded subtasks panel */}
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{
              gridTemplateRows: isExpanded ? "1fr" : "0fr",
            }}
          >
            <div className="overflow-hidden">
              <div className="pt-2.5">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-2 sm:p-2.5">
                  {main.subtasks.length > 0 ? (
                    <Sortable
                      value={orderedSubtasks}
                      onValueChange={(newSubs) => onReorderSubs(main.id, newSubs)}
                      onValueCommit={(newSubs) => onPersistSubs(main.id, newSubs)}
                      getItemValue={(sub) => sub.id}
                      strategy="vertical"
                      className="space-y-1.5"
                    >
                      {orderedSubtasks.map((sub, subIdx) => (
                        <SortableItem key={sub.id} value={sub.id}>
                          <SubTaskItem
                            sub={sub}
                            subIdx={subIdx}
                            totalSubs={orderedSubtasks.length}
                            mainId={main.id}
                            mainDescription={main.task_description}
                            isArabic={isArabic}
                            t={t}
                            animatingId={animatingId}
                            editingTaskId={editingTaskId}
                            editingText={editingText}
                            orderedSubtasks={orderedSubtasks}
                            isChecked={isChecked}
                            onMoveSub={onMoveSub}
                            startLongPress={startLongPress}
                            cancelLongPress={cancelLongPress}
                            onOpenFocusMode={onOpenFocusMode}
                            onStartEditingTask={onStartEditingTask}
                            onCancelEditingTask={onCancelEditingTask}
                            onRenameTask={onRenameTask}
                            onSetEditingText={onSetEditingText}
                            onToggleCheckin={onToggleCheckin}
                            onUpdateTaskWeight={onUpdateTaskWeight}
                            onOpenTaskEditor={onOpenTaskEditor}
                            setCriteriaDialogTask={setCriteriaDialogTask}
                            setTaskToDelete={setTaskToDelete}
                            onUpdateTaskScheduleDays={onUpdateTaskScheduleDays}
                          />
                        </SortableItem>
                      ))}
                    </Sortable>
                  ) : (
                    <div className="py-2 text-center text-xs text-muted-foreground/80">
                      {isArabic
                        ? "لا توجد خطوات فرعية بعد."
                        : "No subtasks yet."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
