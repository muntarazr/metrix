"use client";

import React from "react";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/reui/sortable";
import {
  Save,
  X,
  Target,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MainTask, SubTask } from "@/lib/task-hierarchy";
import type { EditableTask } from "./TaskEditDialog";
import TaskProgressRing from "./TaskProgressRing";
import { getGoalIcon } from "@/components/goal/IconPicker";
import { SubTaskItem, type TaskProgressInfo } from "./SubTaskItem";
import { MainTaskCardMenu } from "./MainTaskCardMenu";
import TaskAppearancePicker from "@/components/shared/TaskAppearancePicker";
import type { TaskColorKey } from "@/lib/task-colors";

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
  getTaskProgress?: (taskId: string, frequency?: string) => TaskProgressInfo;
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
  setAddModalConfig?: React.Dispatch<
    React.SetStateAction<any>
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
  onUpdateTaskIcon?: (taskId: string, icon: string) => void;
  onUpdateTaskColor?: (taskId: string, color: TaskColorKey | null) => void;
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
  getTaskProgress,
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
  onUpdateTaskIcon,
  onUpdateTaskColor,
}: MainTaskCardProps) {
  const totalSubs = main.subtasks.length;
  let mainCompletion = 0;
  let mainDone = false;
  let completedSubs = 0;

  if (totalSubs > 0) {
    const subProgresses = main.subtasks.map((sub) =>
      getTaskProgress
        ? getTaskProgress(sub.id, sub.frequency)
        : {
            points: isChecked(sub.id, sub.frequency) ? (Number(sub.impact_weight) || 1) : 0,
            maxPoints: Number(sub.impact_weight) || 1,
            progress: isChecked(sub.id, sub.frequency) ? 100 : 0,
            isCompleted: isChecked(sub.id, sub.frequency),
            status: isChecked(sub.id, sub.frequency) ? ("done" as const) : ("idle" as const),
          }
    );
    completedSubs = subProgresses.filter((p) => p.isCompleted).length;
    mainDone = completedSubs === totalSubs;

    const totalWeight = main.subtasks.reduce(
      (sum, s) => sum + (Number(s.impact_weight) || 1),
      0
    );
    const totalEarned = subProgresses.reduce(
      (sum, p) => sum + (p.isCompleted ? p.maxPoints : (p.points || 0)),
      0
    );
    mainCompletion = Math.round((totalEarned / Math.max(1, totalWeight)) * 100);
    if (mainDone && mainCompletion < 100) mainCompletion = 100;
  } else {
    const isSelfChecked = isChecked(main.id, main.frequency);
    const selfProgress = getTaskProgress
      ? getTaskProgress(main.id, main.frequency)
      : {
          points: isSelfChecked ? (Number(main.impact_weight) || 1) : 0,
          maxPoints: Number(main.impact_weight) || 1,
          progress: isSelfChecked ? 100 : 0,
          isCompleted: isSelfChecked,
          status: isSelfChecked ? ("done" as const) : ("idle" as const),
        };
    mainDone = selfProgress.isCompleted;
    mainCompletion = selfProgress.progress;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs transition-shadow duration-200 select-none",
        animatingId === main.id &&
          "ring-2 ring-primary/50 shadow-md border-primary bg-primary/5",
      )}
    >
      <div className="ps-1 pe-2 py-1.5 min-[360px]:ps-1.5 min-[360px]:pe-2.5 min-[360px]:py-1.5 sm:ps-2 sm:pe-3 sm:py-2">
        <div className="flex flex-col">
          {/* Main task row */}
          <div
            className={cn(
              "gap-1 sm:gap-2",
              editingTaskId === main.id
                ? "flex flex-col"
                : "flex items-center justify-between gap-1 sm:gap-2",
            )}
          >
            {editingTaskId === main.id ? (
              <div className="space-y-2">
                <input
                  value={editingText}
                  onChange={(e) => onSetEditingText(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base sm:text-sm"
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
                <SortableItemHandle className="text-muted-foreground/35 hover:text-foreground transition-colors p-1 sm:p-1 shrink-0 cursor-grab active:cursor-grabbing -ms-0.5 touch-none select-none">
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
                    <TaskAppearancePicker
                    value={main.accent_color}
                    seed={main.task_description}
                    currentEmoji={main.icon || "📝"}
                    language={isArabic ? "ar" : "en"}
                    onEmojiSelect={(icon) => onUpdateTaskIcon?.(main.id, icon)}
                    onColorSelect={(color) => onUpdateTaskColor?.(main.id, color)}
                  >
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      title={isArabic ? "تعديل المظهر" : "Edit appearance"}
                    >
                      <div className="block min-[360px]:hidden">
                        <TaskProgressRing
                          progress={mainCompletion}
                          isCompleted={mainDone}
                          size={30}
                          strokeWidth={3}
                          icon={
                            main.icon ? (
                              <span className="h-3.5 w-3.5 flex items-center justify-center text-foreground text-xs">
                                {getGoalIcon(main.icon)}
                              </span>
                            ) : undefined
                          }
                        />
                      </div>
                      <div className="hidden min-[360px]:block">
                        <TaskProgressRing
                          progress={mainCompletion}
                          isCompleted={mainDone}
                          size={36}
                          strokeWidth={3.5}
                          icon={
                            main.icon ? (
                              <span className="h-4 w-4 flex items-center justify-center text-foreground">
                                {getGoalIcon(main.icon)}
                              </span>
                            ) : undefined
                          }
                        />
                      </div>
                    </button>
                  </TaskAppearancePicker>

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
                      <span className="line-clamp-1 text-[10px] min-[360px]:text-[10.5px] text-muted-foreground/75 font-normal mt-0.5" title={main.completion_criteria}>
                        {main.completion_criteria}
                      </span>
                    )}
                  </div>

                  {totalSubs > 0 && (
                    <span className="shrink-0 text-[10.5px] min-[360px]:text-[11px] font-bold text-muted-foreground/75 tabular-nums">
                      {completedSubs}/{totalSubs}
                    </span>
                  )}
                </div>

                {/* Task Actions: Quick Focus Mode + 3-dots Menu */}
                <div className="shrink-0 flex items-center gap-1 sm:gap-1.5">
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
                    className="inline-flex h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 items-center justify-center rounded-lg min-[360px]:rounded-xl border border-primary/30 bg-primary/10 text-primary transition-all duration-150 hover:bg-primary/20 hover:border-primary/50 active:scale-95 shadow-xs cursor-pointer touch-manipulation"
                    title={isArabic ? "بدء جلسة تركيز" : "Start Focus Session"}
                  >
                    <Target className="h-3.5 w-3.5 min-[360px]:h-4 min-[360px]:w-4" />
                  </button>

                  <MainTaskCardMenu
                    main={main}
                    mainIdx={mainIdx}
                    totalMains={totalMains}
                    isArabic={isArabic}
                    t={t}
                    setCriteriaDialogTask={setCriteriaDialogTask}
                    onUpdateTaskScheduleDays={onUpdateTaskScheduleDays}
                    onMoveMain={onMoveMain}
                    onStartEditingTask={onStartEditingTask}
                    onOpenTaskEditor={onOpenTaskEditor}
                    onUpdateTaskWeight={onUpdateTaskWeight}
                    onUpdateTaskIcon={onUpdateTaskIcon}
                    setTaskToDelete={setTaskToDelete}
                  />
                </div>
              </>
            )}
          </div>

          {/* Expanded subtasks panel (legacy subtasks if present) */}
          {main.subtasks && main.subtasks.length > 0 && (
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{
                gridTemplateRows: isExpanded ? "1fr" : "0fr",
              }}
            >
              <div className="overflow-hidden">
                <div className="pt-2.5">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-2 sm:p-2.5">
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
                            getTaskProgress={getTaskProgress}
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
                            onUpdateTaskIcon={onUpdateTaskIcon}
                          />
                        </SortableItem>
                      ))}
                    </Sortable>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
