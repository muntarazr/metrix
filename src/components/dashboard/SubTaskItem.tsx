"use client";

import React from "react";
import { SortableItemHandle } from "@/components/reui/sortable";
import {
  Save,
  X,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Target,
  FileText,
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
import type { SubTask } from "@/lib/task-hierarchy";
import type { EditableTask } from "./TaskEditDialog";
import TaskProgressRing from "./TaskProgressRing";
import TaskScheduleDaysPicker from "./TaskScheduleDaysPicker";
import { getGoalIcon } from "@/components/goal/IconPicker";

export interface TaskProgressInfo {
  points: number;
  maxPoints: number;
  progress: number;
  isCompleted: boolean;
  status: "done" | "partial" | "missed" | "idle";
}

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
  getTaskProgress?: (taskId: string, frequency?: string) => TaskProgressInfo;
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
  getTaskProgress,
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
  const subProg = getTaskProgress
    ? getTaskProgress(sub.id, sub.frequency)
    : {
        points: checked ? (Number(sub.impact_weight) || 1) : 0,
        maxPoints: Number(sub.impact_weight) || 1,
        progress: checked ? 100 : 0,
        isCompleted: checked,
        status: checked ? ("done" as const) : ("idle" as const),
      };

  return (
    <div
      className={cn(
        "group/sub flex items-center gap-1.5 sm:gap-2 rounded-xl border ps-1.5 pe-2.5 py-1.5 sm:ps-2 sm:pe-3 sm:py-2 transition-all duration-200 select-none",
        subProg.isCompleted
          ? "border-border/40 bg-muted/30"
          : "border-border/80 bg-card hover:border-border",
        animatingId === sub.id &&
          "ring-2 ring-primary/50 border-primary bg-primary/5 shadow-xs",
      )}
    >
      {/* ReUI Sortable Item Handle - Clean Grip handle from c-sortable-1 */}
      <SortableItemHandle className="text-muted-foreground/35 hover:text-foreground transition-colors p-1 sm:p-0.5 shrink-0 cursor-grab active:cursor-grabbing -ms-0.5 touch-none select-none">
        <GripVertical className="h-3.5 w-3" />
      </SortableItemHandle>

      <TaskProgressRing
        progress={subProg.progress}
        isCompleted={subProg.isCompleted}
        size={24}
        strokeWidth={2.5}
        icon={
          sub.icon ? (
            <span className="h-2.5 w-2.5 flex items-center justify-center text-foreground">
              {getGoalIcon(sub.icon)}
            </span>
          ) : undefined
        }
      />

      <div className="min-w-0 flex-1">
        {editingTaskId === sub.id ? (
          <div className="space-y-1.5">
            <input
              value={editingText}
              onChange={(e) => onSetEditingText(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1 text-base sm:text-xs shadow-xs"
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
          <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 sm:h-6.5 sm:w-6.5 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-muted/60 active:scale-95 shadow-xs touch-manipulation"
                title={isArabic ? "المزيد" : "More"}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isArabic ? "start" : "end"}
              className="w-60 sm:w-48 max-w-[calc(100vw-1.5rem)]"
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
                <>
                  <div className="sm:hidden border-t border-border/60 my-1 pt-1">
                    <TaskScheduleDaysPicker
                      taskId={sub.id}
                      scheduleDays={sub.schedule_days}
                      isArabic={isArabic}
                      onUpdateScheduleDays={onUpdateTaskScheduleDays}
                    />
                  </div>
                  <div className="hidden sm:block">
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
                  </div>
                </>
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
                  onOpenTaskEditor({
                    id: sub.id,
                    task_description: sub.task_description,
                    task_type: "sub",
                    frequency: sub.frequency,
                    impact_weight: sub.impact_weight,
                    time_required_minutes: sub.time_required_minutes,
                    completion_criteria: sub.completion_criteria,
                    icon: sub.icon,
                  })
                }
                className="cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>
                  {isArabic ? "تعديل المهمة" : "Edit task"}
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
