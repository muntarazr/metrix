"use client";

import React from "react";
import TaskFocusMode from "../TaskFocusMode";
import TaskAddModal from "../TaskAddModal";
import TaskCriteriaDialog from "../TaskCriteriaDialog";
import TaskDeleteConfirmDialog from "../TaskDeleteConfirmDialog";
import type { FocusModeTaskData } from "./useFocusModeState";

export interface FocusModalsProps {
  isArabic: boolean;
  goalTitle: string;
  focusModeTask: FocusModeTaskData | null;
  onCloseFocusMode: () => void;
  isChecked: (taskId: string, frequency: string) => boolean;
  onToggleCheckin: (taskId: string, frequency: string) => void;

  addModalConfig: {
    isOpen: boolean;
    type: "main" | "sub";
    parentId?: string;
    parentTitle?: string;
  };
  setAddModalConfig: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      type: "main" | "sub";
      parentId?: string;
      parentTitle?: string;
    }>
  >;

  onSetNewMainText: (text: string) => void;
  onSetNewMainCriteria?: (criteria: string) => void;
  onSetNewMainFreq: (freq: "daily" | "weekly") => void;
  onSetNewMainWeight?: (weight: number) => void;
  onAddMain: () => void;

  onSetNewSubText: (text: string) => void;
  onSetNewSubCriteria?: (criteria: string) => void;
  onSetNewSubFreq: (freq: "daily" | "weekly") => void;
  onSetNewSubWeight?: (weight: number) => void;
  onAddSub: (parentId: string) => void;

  criteriaDialogTask: {
    id: string;
    description: string;
    criteria?: string;
    taskType: "main" | "sub";
  } | null;
  setCriteriaDialogTask: React.Dispatch<
    React.SetStateAction<{
      id: string;
      description: string;
      criteria?: string;
      taskType: "main" | "sub";
    } | null>
  >;
  onRefreshTasks?: () => Promise<void>;

  taskToDelete: {
    id: string;
    description: string;
  } | null;
  setTaskToDelete: React.Dispatch<
    React.SetStateAction<{
      id: string;
      description: string;
    } | null>
  >;
  onDeleteTask: (taskId: string) => void;
}

export function FocusModals({
  isArabic,
  goalTitle,
  focusModeTask,
  onCloseFocusMode,
  isChecked,
  onToggleCheckin,
  addModalConfig,
  setAddModalConfig,
  onSetNewMainText,
  onSetNewMainCriteria,
  onSetNewMainFreq,
  onSetNewMainWeight,
  onAddMain,
  onSetNewSubText,
  onSetNewSubCriteria,
  onSetNewSubFreq,
  onSetNewSubWeight,
  onAddSub,
  criteriaDialogTask,
  setCriteriaDialogTask,
  onRefreshTasks,
  taskToDelete,
  setTaskToDelete,
  onDeleteTask,
}: FocusModalsProps) {
  const handleAddSubmit = async (data: {
    title: string;
    criteria: string;
    frequency: "daily" | "weekly";
    weight: number;
  }) => {
    if (addModalConfig.type === "main") {
      onSetNewMainText(data.title);
      onSetNewMainCriteria?.(data.criteria);
      onSetNewMainFreq(data.frequency);
      if (onSetNewMainWeight) onSetNewMainWeight(data.weight);
      // Execute creation
      setTimeout(() => {
        onAddMain();
      }, 50);
    } else if (addModalConfig.parentId) {
      onSetNewSubText(data.title);
      onSetNewSubCriteria?.(data.criteria);
      onSetNewSubFreq(data.frequency);
      if (onSetNewSubWeight) onSetNewSubWeight(data.weight);
      // Execute creation
      setTimeout(() => {
        onAddSub(addModalConfig.parentId!);
      }, 50);
    }
  };

  const handleSaveCriteria = async (newCrit: string) => {
    if (!criteriaDialogTask) return;
    try {
      await fetch("/api/goal/task-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: criteriaDialogTask.id,
          criteria: newCrit,
        }),
      });
      if (onRefreshTasks) await onRefreshTasks();
    } catch (err) {
      console.error("Failed to save task completion criteria:", err);
    }
  };

  return (
    <>
      {/* Focus Mode Overlay (A10: local to section container, absolute inset-0) */}
      <TaskFocusMode
        isOpen={Boolean(focusModeTask)}
        task={focusModeTask}
        isCompleted={
          focusModeTask
            ? isChecked(focusModeTask.id, focusModeTask.frequency || "daily")
            : false
        }
        isArabic={isArabic}
        onClose={onCloseFocusMode}
        onComplete={(taskId, freq) => {
          onToggleCheckin(taskId, freq);
        }}
      />

      {/* Add Task Modal (A5) */}
      <TaskAddModal
        isOpen={addModalConfig.isOpen}
        type={addModalConfig.type}
        parentTitle={addModalConfig.parentTitle}
        isArabic={isArabic}
        onClose={() =>
          setAddModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
        onAdd={handleAddSubmit}
      />

      {/* Completion Criteria Dialog (A4) */}
      <TaskCriteriaDialog
        isOpen={Boolean(criteriaDialogTask)}
        taskTitle={criteriaDialogTask?.description || ""}
        initialCriteria={criteriaDialogTask?.criteria || ""}
        isArabic={isArabic}
        goalTitle={goalTitle}
        onClose={() => setCriteriaDialogTask(null)}
        onSave={handleSaveCriteria}
      />

      {/* Task Delete Confirmation Dialog (A7) */}
      <TaskDeleteConfirmDialog
        isOpen={Boolean(taskToDelete)}
        taskTitle={taskToDelete?.description || ""}
        isArabic={isArabic}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
      />
    </>
  );
}
