"use client";

import React from "react";
import type { Language } from "@/lib/translations";
import type { DailyFocusSession } from "@/lib/daily-focus";
import type { TaskRow } from "@/lib/task-hierarchy";
import ProgressLogDialog from "../progress/ProgressLogDialog";
import ConfirmModal from "../shared/ConfirmModal";
import GoalEditDialog from "../goal/GoalEditDialog";
import LogEvaluationModal, { type LogItem } from "../progress/LogEvaluationModal";
import TaskEditDialog, {
  type EditableTask,
  type TaskPatch,
} from "./TaskEditDialog";
import ToastNotification from "./ToastNotification";
import DailyFocusQuestionDialog from "./DailyFocusQuestionDialog";
import type { Goal } from "./types";

interface DashboardDialogsProps {
  goal: Goal;
  language: Language;
  isArabic: boolean;
  onGoalUpdated?: () => void;
  refreshAll: () => Promise<void>;
  showSuccessToast: (msg: string) => void;

  // Goal edit dialog
  showGoalEditDialog: boolean;
  setShowGoalEditDialog: (open: boolean) => void;

  // Daily focus prompt
  showDailyFocusPrompt: boolean;
  setShowDailyFocusPrompt: (open: boolean) => void;
  setDailyFocusPromptDismissed: (dismissed: boolean) => void;
  dailyFocusPromptStorageKey: string;
  dailyFocus: DailyFocusSession | null;
  dailyFocusLoading: boolean;
  dailyFocusSubmitting: boolean;
  dailyFocusError: string | null;
  dailyFocusAnswer: string;
  onDailyFocusAnswerChange: (text: string) => void;
  onAppendDailyFocusTranscript: (transcript: string) => void;
  onSubmitDailyFocusAnswer: () => void;

  // Progress log dialog
  showLogModal: boolean;
  setShowLogModal: (open: boolean) => void;
  tasks: TaskRow[];

  // Task edit dialog
  editingTask: EditableTask | null;
  taskEditorOpen: boolean;
  setTaskEditorOpen: (open: boolean) => void;
  handleUpdateTask: (taskId: string, patch: TaskPatch) => Promise<void>;

  // Confirm modal
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };
  setConfirmModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
    }>
  >;

  // Log evaluation modal
  viewingLog: LogItem | null;
  setViewingLog: (log: LogItem | null) => void;
  streak: number;

  // Toast
  showToast: boolean;
  toastMessage: string;
}

export default function DashboardDialogs({
  goal,
  language,
  isArabic,
  onGoalUpdated,
  refreshAll,
  showSuccessToast,
  showGoalEditDialog,
  setShowGoalEditDialog,
  showDailyFocusPrompt,
  setShowDailyFocusPrompt,
  setDailyFocusPromptDismissed,
  dailyFocusPromptStorageKey,
  dailyFocus,
  dailyFocusLoading,
  dailyFocusSubmitting,
  dailyFocusError,
  dailyFocusAnswer,
  onDailyFocusAnswerChange,
  onAppendDailyFocusTranscript,
  onSubmitDailyFocusAnswer,
  showLogModal,
  setShowLogModal,
  tasks,
  editingTask,
  taskEditorOpen,
  setTaskEditorOpen,
  handleUpdateTask,
  confirmModal,
  setConfirmModal,
  viewingLog,
  setViewingLog,
  streak,
  showToast,
  toastMessage,
}: DashboardDialogsProps) {
  return (
    <>
      <GoalEditDialog
        goal={goal}
        open={showGoalEditDialog}
        onOpenChange={setShowGoalEditDialog}
        language={language}
        onSaved={async () => {
          if (onGoalUpdated) await onGoalUpdated();
          await refreshAll();
          showSuccessToast(isArabic ? "تم تحديث الهدف" : "Goal updated");
        }}
      />

      <DailyFocusQuestionDialog
        open={showDailyFocusPrompt}
        onOpenChange={(open) => {
          setShowDailyFocusPrompt(open);
          if (!open) {
            setDailyFocusPromptDismissed(true);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(dailyFocusPromptStorageKey, "seen");
            }
          }
        }}
        language={language}
        isArabic={isArabic}
        dailyFocus={dailyFocus}
        loading={dailyFocusLoading}
        submitting={dailyFocusSubmitting}
        error={dailyFocusError}
        answer={dailyFocusAnswer}
        onAnswerChange={onDailyFocusAnswerChange}
        onAppendTranscript={onAppendDailyFocusTranscript}
        onSubmit={onSubmitDailyFocusAnswer}
      />

      {showLogModal && (
        <ProgressLogDialog
          goal={goal}
          tasks={tasks}
          initialMode="select"
          onClose={() => setShowLogModal(false)}
          onSuccess={() => {
            refreshAll();
            if (onGoalUpdated) onGoalUpdated();
          }}
          language={language}
        />
      )}

      <TaskEditDialog
        task={editingTask}
        open={taskEditorOpen}
        onOpenChange={setTaskEditorOpen}
        onSave={handleUpdateTask}
        language={language}
        goalTitle={goal.title}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        language={language}
      />

      {viewingLog && (
        <LogEvaluationModal
          log={viewingLog}
          goal={{
            id: goal.id,
            title: goal.title,
            current_points: goal.current_points,
            target_points: goal.target_points,
          }}
          streak={streak}
          language={language}
          onClose={() => setViewingLog(null)}
        />
      )}

      <ToastNotification visible={showToast} message={toastMessage} />
    </>
  );
}
