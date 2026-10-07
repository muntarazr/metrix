"use client";

import { useState } from "react";
import type { EditableTask } from "./TaskEditDialog";
import { cn } from "@/lib/utils";
import { WELL_SURFACE } from "@/lib/surfaces";
import { translations, type Language } from "@/lib/translations";
import { type TaskColorKey } from "@/lib/task-colors";
import { type MainTask } from "@/lib/task-hierarchy";
import type {
  DailyFocusHistoryItem,
  DailyFocusSession,
} from "@/lib/daily-focus";
import DailyFocusPanel from "./DailyFocusPanel";
import { FocusTabHeader } from "./focus/FocusTabHeader";
import { FocusTaskList } from "./focus/FocusTaskList";
import { FocusModals } from "./focus/FocusModals";
import { useFocusModeState } from "./focus/useFocusModeState";
import { useFocusReorder } from "./focus/useFocusReorder";

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
  isSuggestionsLocked?: boolean;
  daysUntilSuggestionsUnlock?: number;
  daysPassedSinceGoalCreation?: number;
  filteredHierarchy: MainTask[];
  hierarchy: MainTask[];
  loadingTasks: boolean;
  focusStats: { totalSubtasks: number; completedSubtasks: number };
  expandedMains: Set<string>;
  addingMain?: boolean;
  addingSubFor?: string | null;
  newMainText?: string;
  newMainCriteria?: string;
  newMainFreq?: "daily" | "weekly";
  newMainWeight?: number;
  newMainColor?: TaskColorKey | null;
  newMainAccent?: unknown;
  newSubText?: string;
  newSubCriteria?: string;
  newSubFreq?: "daily" | "weekly";
  newSubWeight?: number;
  editingTaskId: string | null;
  editingText: string;
  isChecked: (taskId: string, frequency: string) => boolean;
  isCompletedToday?: (taskId: string) => boolean;
  shouldAnimateTask?: (taskId: string) => boolean;
  getSkipReason?: (taskId: string, frequency: string) => string | null;
  onSetSkipReason?: (
    taskId: string,
    frequency: string,
    reason: any,
  ) => Promise<void>;
  onClearSkipReason?: (taskId: string, frequency: string) => Promise<void>;
  onRequestMini?: (taskId: string) => Promise<string | null>;
  onCompleteMini?: (taskId: string, frequency: string) => Promise<void>;
  onToggleExpand: (mainId: string) => void;
  onToggleCheckin: (taskId: string, frequency: string) => void;
  onOpenNewMainComposer?: () => void;
  onCloseNewMainComposer?: () => void;
  onAddMain: () => void;
  onStartAddingSub?: (mainId: string) => void;
  onCancelAddingSub?: () => void;
  onAddSub: (parentId: string) => void;
  onStartEditingTask: (taskId: string, description: string) => void;
  onCancelEditingTask: () => void;
  onRenameTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskIcon?: (taskId: string, icon: string) => void;
  onUpdateTaskColor?: (taskId: string, color: TaskColorKey | null) => void;
  onUpdateTaskWeight: (taskId: string, weight: number) => void;
  onOpenTaskEditor: (task: EditableTask) => void;
  onSetDailyFocusAnswer: (text: string) => void;
  onAppendDailyFocusTranscript: (text: string) => void;
  onSubmitDailyFocusAnswer: () => void;
  onAddDailyFocusSuggestion: (suggestionId: string) => void;
  onSetNewMainText: (text: string) => void;
  onSetNewMainCriteria?: (criteria: string) => void;
  onSetNewMainFreq: (freq: "daily" | "weekly") => void;
  onSetNewMainWeight?: (weight: number) => void;
  onSetNewMainColor?: (color: TaskColorKey | null) => void;
  onSetNewSubText: (text: string) => void;
  onSetNewSubCriteria?: (criteria: string) => void;
  onSetNewSubFreq: (freq: "daily" | "weekly") => void;
  onSetNewSubWeight?: (weight: number) => void;
  onSetEditingText: (text: string) => void;
  goalTitle?: string;
  onRefreshTasks?: () => Promise<void>;
  onUpdateTaskScheduleDays?: (taskId: string, days: number[] | null) => Promise<void> | void;
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
  isSuggestionsLocked = false,
  daysUntilSuggestionsUnlock = 0,
  daysPassedSinceGoalCreation = 0,
  filteredHierarchy,
  hierarchy,
  loadingTasks,
  focusStats,
  expandedMains,
  editingTaskId,
  editingText,
  isChecked,
  onToggleExpand,
  onToggleCheckin,
  onAddMain,
  onAddSub,
  onStartEditingTask,
  onCancelEditingTask,
  onRenameTask,
  onDeleteTask,
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
  onSetNewSubText,
  onSetNewSubCriteria,
  onSetNewSubFreq,
  onSetNewSubWeight,
  onSetEditingText,
  goalTitle = "",
  onRefreshTasks,
  onUpdateTaskScheduleDays,
}: FocusTabProps) {
  const t = translations[language];
  const [focusSection, setFocusSection] = useState<
    "tasks" | "suggestions" | "questions"
  >("tasks");

  // Focus mode & long-press management hook
  const {
    focusModeTask,
    handleOpenFocusMode,
    handleCloseFocusMode,
    startLongPress,
    cancelLongPress,
    isLongPressTriggeredRef,
  } = useFocusModeState();

  // Task reorder and hierarchy state hook
  const {
    tasksList,
    animatingId,
    handleReorderMains,
    handleReorderSubs,
    handlePersistMainOrder,
    handlePersistSubOrder,
    handleMoveMain,
    handleMoveSub,
    sinkCompleted,
    isMainDone,
  } = useFocusReorder({
    filteredHierarchy,
    isChecked,
    onRefreshTasks,
  });

  // Modal dialog states
  const [addModalConfig, setAddModalConfig] = useState<{
    isOpen: boolean;
    type: "main" | "sub";
    parentId?: string;
    parentTitle?: string;
  }>({
    isOpen: false,
    type: "main",
  });

  const [criteriaDialogTask, setCriteriaDialogTask] = useState<{
    id: string;
    description: string;
    criteria?: string;
    taskType: "main" | "sub";
  } | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<{
    id: string;
    description: string;
  } | null>(null);

  return (
    <div className="flex h-full min-h-0 w-full flex-col pb-0">
      <section
        className={cn(
          WELL_SURFACE,
          "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl shadow-xs",
        )}
      >
        {/* Navigation & Stats Header */}
        <FocusTabHeader
          focusSection={focusSection}
          onSelectSection={setFocusSection}
          focusStats={focusStats}
          dailyFocus={dailyFocus}
          isArabic={isArabic}
          t={t}
          isSuggestionsLocked={isSuggestionsLocked}
          daysUntilSuggestionsUnlock={daysUntilSuggestionsUnlock}
          onOpenAddModal={() =>
            setAddModalConfig({ isOpen: true, type: "main" })
          }
        />

        {/* Section Body */}
        <div className="flex min-h-0 flex-1 w-full flex-col ps-3 pe-2 pt-2.5 pb-3 sm:ps-4 sm:pe-3 sm:pt-3 sm:pb-3.5">
          {focusSection === "suggestions" ? (
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                isSuggestionsLocked={isSuggestionsLocked}
                daysUntilSuggestionsUnlock={daysUntilSuggestionsUnlock}
                daysPassedSinceGoalCreation={daysPassedSinceGoalCreation}
              />
            </div>
          ) : focusSection === "questions" ? (
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
          ) : (
            <FocusTaskList
              loadingTasks={loadingTasks}
              hierarchyLength={hierarchy.length}
              tasksList={tasksList}
              expandedMains={expandedMains}
              onToggleExpand={onToggleExpand}
              animatingId={animatingId}
              isArabic={isArabic}
              t={t}
              editingTaskId={editingTaskId}
              editingText={editingText}
              isChecked={isChecked}
              isMainDone={isMainDone}
              sinkCompleted={sinkCompleted}
              handleReorderMains={handleReorderMains}
              handlePersistMainOrder={handlePersistMainOrder}
              handleMoveMain={handleMoveMain}
              handleMoveSub={handleMoveSub}
              handleReorderSubs={handleReorderSubs}
              handlePersistSubOrder={handlePersistSubOrder}
              startLongPress={startLongPress}
              cancelLongPress={cancelLongPress}
              isLongPressTriggeredRef={isLongPressTriggeredRef}
              onOpenFocusMode={handleOpenFocusMode}
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
          )}
        </div>

        {/* Dialogs & Overlays */}
        <FocusModals
          isArabic={isArabic}
          goalTitle={goalTitle}
          focusModeTask={focusModeTask}
          onCloseFocusMode={handleCloseFocusMode}
          isChecked={isChecked}
          onToggleCheckin={onToggleCheckin}
          addModalConfig={addModalConfig}
          setAddModalConfig={setAddModalConfig}
          onSetNewMainText={onSetNewMainText}
          onSetNewMainCriteria={onSetNewMainCriteria}
          onSetNewMainFreq={onSetNewMainFreq}
          onSetNewMainWeight={onSetNewMainWeight}
          onAddMain={onAddMain}
          onSetNewSubText={onSetNewSubText}
          onSetNewSubCriteria={onSetNewSubCriteria}
          onSetNewSubFreq={onSetNewSubFreq}
          onSetNewSubWeight={onSetNewSubWeight}
          onAddSub={onAddSub}
          criteriaDialogTask={criteriaDialogTask}
          setCriteriaDialogTask={setCriteriaDialogTask}
          onRefreshTasks={onRefreshTasks}
          taskToDelete={taskToDelete}
          setTaskToDelete={setTaskToDelete}
          onDeleteTask={onDeleteTask}
        />
      </section>
    </div>
  );
}
