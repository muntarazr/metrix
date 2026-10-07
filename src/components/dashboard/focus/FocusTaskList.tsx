"use client";

import React, { useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import { Sortable, SortableItem } from "@/components/reui/sortable";
import { MainTaskCard } from "../ReorderableTaskCards";
import type { MainTask, SubTask } from "@/lib/task-hierarchy";
import type { EditableTask } from "../TaskEditDialog";

export interface FocusTaskListProps {
  loadingTasks: boolean;
  hierarchyLength: number;
  tasksList: MainTask[];
  expandedMains: Set<string>;
  onToggleExpand: (mainId: string) => void;
  animatingId: string | null;
  isArabic: boolean;
  t: any;
  editingTaskId: string | null;
  editingText: string;
  isChecked: (taskId: string, frequency: string) => boolean;
  isMainDone: (main: MainTask) => boolean;
  sinkCompleted: <T>(items: T[], isDone: (item: T) => boolean) => T[];
  handleReorderMains: (newOrder: MainTask[]) => void;
  handlePersistMainOrder: (newMains: MainTask[]) => Promise<void>;
  handleMoveMain: (mainId: string, direction: "up" | "down") => void;
  handleMoveSub: (
    mainId: string,
    subId: string,
    subtasks: SubTask[],
    direction: "up" | "down",
  ) => void;
  handleReorderSubs: (mainId: string, newSubs: SubTask[]) => void;
  handlePersistSubOrder: (
    mainId: string,
    newSubs?: SubTask[],
  ) => Promise<void>;
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

export function FocusTaskList({
  loadingTasks,
  hierarchyLength,
  tasksList,
  expandedMains,
  onToggleExpand,
  animatingId,
  isArabic,
  t,
  editingTaskId,
  editingText,
  isChecked,
  isMainDone,
  sinkCompleted,
  handleReorderMains,
  handlePersistMainOrder,
  handleMoveMain,
  handleMoveSub,
  handleReorderSubs,
  handlePersistSubOrder,
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
}: FocusTaskListProps) {
  // User manual expansion tracking
  const [userToggledMains, setUserToggledMains] = useState<Map<string, boolean>>(
    new Map(),
  );

  const handleToggle = (mainId: string, currentDone: boolean) => {
    setUserToggledMains((prev) => {
      const next = new Map(prev);
      const currentlyOpen = next.has(mainId)
        ? next.get(mainId)!
        : expandedMains.has(mainId) || !currentDone;
      next.set(mainId, !currentlyOpen);
      return next;
    });
    onToggleExpand(mainId);
  };

  if (loadingTasks) {
    return (
      <div className="scrollbar-thin min-h-0 flex-1 w-full space-y-2 overflow-y-auto overscroll-contain pb-2">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="animate-pulse rounded-2xl border border-border/70 bg-muted/20 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded-full bg-muted" />
                <div className="h-2.5 w-1/2 rounded-full bg-muted/60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hierarchyLength === 0) {
    return (
      <div className="my-auto rounded-2xl border border-dashed border-border/70 bg-muted/12 p-[320px] text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
          <ListTodo className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-sm font-extrabold tracking-tight text-foreground">
          {isArabic
            ? "ابدأ بتحديد مهامك التنفيذية لهذا الهدف"
            : "Define actionable tasks for this goal"}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground/75 max-w-xs mx-auto">
          {isArabic
            ? "أضف مهاماً يومية أو أسبوعية ذات معايير إنجاز واضحة ليتم تقييمها واحتساب نقاطها عبر المراجعة اليومية."
            : "Add daily or weekly tasks with measurable completion criteria to be evaluated via daily review."}
        </p>
        <button
          type="button"
          onClick={() => setAddModalConfig({ isOpen: true, type: "main" })}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {isArabic ? "إضافة مهمة جديدة" : "Add Task"}
        </button>
      </div>
    );
  }

  const currentWeekday = new Date().getDay();
  const allTasks = tasksList.flatMap(m => [m, ...(m.subtasks || [])]);
  const hasExplicitSchedule = allTasks.some(t => t.schedule_days && t.schedule_days.length > 0);
  const isRestDayToday = hasExplicitSchedule && !allTasks.some(t => {
    if (!t.schedule_days || t.schedule_days.length === 0) return true;
    return t.schedule_days.includes(currentWeekday);
  });

  return (
    <div className="flex min-h-0 flex-1 w-full flex-col space-y-2">
      {isRestDayToday && (
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3.5 text-center space-y-1 animate-in fade-in">
          <p className="text-xs font-bold text-foreground">
            {isArabic ? "لا توجد مهام مجدولة لليوم، وقت راحة فقط." : "No tasks scheduled for today, time to rest."}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isArabic ? "استمتع باستراحتك، أو اضبط أيام التكرار للمهام عبر خيارات المهمة." : "Enjoy your rest, or adjust repeat days via task options."}
          </p>
        </div>
      )}

      <Sortable
        value={tasksList}
        onValueChange={handleReorderMains}
        onValueCommit={(newMains) => handlePersistMainOrder(newMains)}
        getItemValue={(main) => main.id}
        strategy="vertical"
        className="scrollbar-thin min-h-0 flex-1 w-full space-y-2 overflow-y-auto overscroll-contain pb-2"
      >
      {tasksList.map((main, mainIdx) => {
        const orderedSubtasks = sinkCompleted(
          main.subtasks,
          (sub) => isChecked(sub.id, sub.frequency),
        );
        const isExpanded = userToggledMains.has(main.id)
          ? userToggledMains.get(main.id)!
          : main.subtasks.length > 0
            ? expandedMains.has(main.id) || !isMainDone(main)
            : Boolean(expandedMains.has(main.id));

        return (
          <SortableItem key={main.id} value={main.id}>
            <MainTaskCard
              main={main}
              mainIdx={mainIdx}
              totalMains={tasksList.length}
              isExpanded={isExpanded}
              isArabic={isArabic}
              t={t}
              animatingId={animatingId}
              editingTaskId={editingTaskId}
              editingText={editingText}
              orderedSubtasks={orderedSubtasks}
              isChecked={isChecked}
              onToggleExpand={handleToggle}
              onMoveMain={handleMoveMain}
              onMoveSub={handleMoveSub}
              onReorderSubs={handleReorderSubs}
              onPersistSubs={handlePersistSubOrder}
              startLongPress={startLongPress}
              cancelLongPress={cancelLongPress}
              isLongPressTriggeredRef={isLongPressTriggeredRef}
              onOpenFocusMode={onOpenFocusMode}
              onStartEditingTask={onStartEditingTask}
              onCancelEditingTask={onCancelEditingTask}
              onRenameTask={onRenameTask}
              onSetEditingText={onSetEditingText}
              onUpdateTaskWeight={onUpdateTaskWeight}
              onOpenTaskEditor={onOpenTaskEditor}
              onToggleCheckin={onToggleCheckin}
              setAddModalConfig={setAddModalConfig}
              setCriteriaDialogTask={setCriteriaDialogTask}
              setTaskToDelete={setTaskToDelete}
              onUpdateTaskScheduleDays={onUpdateTaskScheduleDays}
            />
          </SortableItem>
        );
      })}
      </Sortable>
    </div>
  );
}
