"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MainTask, SubTask } from "@/lib/task-hierarchy";
import { createClient } from "@/utils/supabase/client";

interface UseFocusReorderProps {
  filteredHierarchy: MainTask[];
  isChecked: (taskId: string, frequency: string) => boolean;
  onRefreshTasks?: () => Promise<void>;
}

// Sinks completed items to the bottom of the list while maintaining order
export const sinkCompleted = <T,>(
  items: T[],
  isDone: (item: T) => boolean,
): T[] => {
  const open: T[] = [];
  const done: T[] = [];
  for (const item of items) {
    if (isDone(item)) {
      done.push(item);
    } else {
      open.push(item);
    }
  }
  return open.length > 0 && done.length > 0 ? [...open, ...done] : items;
};

export function useFocusReorder({
  filteredHierarchy,
  isChecked,
  onRefreshTasks,
}: UseFocusReorderProps) {
  const isMainDone = useCallback(
    (main: MainTask) => {
      if (main.subtasks.length > 0) {
        return main.subtasks.every((sub) => isChecked(sub.id, sub.frequency));
      }
      return isChecked(main.id, main.frequency);
    },
    [isChecked],
  );

  // Local reorderable list state
  const [tasksList, setTasksList] = useState<MainTask[]>(() =>
    sinkCompleted(filteredHierarchy, isMainDone),
  );
  const tasksListRef = useRef(tasksList);
  tasksListRef.current = tasksList;

  // Track recently moved task for smooth highlight animation
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with incoming hierarchy changes
  useEffect(() => {
    setTasksList(sinkCompleted(filteredHierarchy, isMainDone));
  }, [filteredHierarchy, isMainDone]);

  // Cleanup highlight animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current);
      }
    };
  }, []);

  const triggerAnimation = useCallback((id: string) => {
    setAnimatingId(id);
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current);
    }
    animTimeoutRef.current = setTimeout(() => {
      setAnimatingId((curr) => (curr === id ? null : curr));
    }, 500);
  }, []);

  // Persist reordered main tasks to Supabase
  const handlePersistMainOrder = useCallback(
    async (listToPersist?: MainTask[]) => {
      const list = listToPersist || tasksListRef.current;
      try {
        const supabase = createClient();
        await Promise.all(
          list.map((item, idx) =>
            supabase
              .from("sub_layers")
              .update({ sort_order: idx })
              .eq("id", item.id),
          ),
        );
        if (onRefreshTasks) await onRefreshTasks();
      } catch (err) {
        console.error("Failed to reorder main tasks:", err);
      }
    },
    [onRefreshTasks],
  );

  // Reorder Main Tasks live while dragging
  const handleReorderMains = useCallback((newOrder: MainTask[]) => {
    setTasksList(newOrder);
  }, []);

  // Reorder Subtasks live while dragging
  const handleReorderSubs = useCallback(
    (mainId: string, newSubs: SubTask[]) => {
      setTasksList((prev) =>
        prev.map((m) => (m.id === mainId ? { ...m, subtasks: newSubs } : m)),
      );
    },
    [],
  );

  // Persist reordered subtasks to Supabase
  const handlePersistSubOrder = useCallback(
    async (mainId: string, subsToPersist?: SubTask[]) => {
      const currentMain = tasksListRef.current.find((m) => m.id === mainId);
      const subs = subsToPersist || currentMain?.subtasks;
      if (!subs) return;
      try {
        const supabase = createClient();
        await Promise.all(
          subs.map((item, idx) =>
            supabase
              .from("sub_layers")
              .update({ sort_order: idx })
              .eq("id", item.id),
          ),
        );
        if (onRefreshTasks) await onRefreshTasks();
      } catch (err) {
        console.error("Failed to reorder subtasks:", err);
      }
    },
    [onRefreshTasks],
  );

  // Move Main Task Up or Down with smooth transition
  const handleMoveMain = useCallback(
    async (mainId: string, direction: "up" | "down") => {
      const currentList = tasksListRef.current;
      const currentIndex = currentList.findIndex((m) => m.id === mainId);
      if (currentIndex < 0) return;
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= currentList.length) return;

      triggerAnimation(mainId);
      const next = [...currentList];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      setTasksList(next);

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(25);
        } catch {
          // vibration API unavailable
        }
      }

      await handlePersistMainOrder(next);
    },
    [handlePersistMainOrder, triggerAnimation],
  );

  // Move Subtask Up or Down with smooth transition
  const handleMoveSub = useCallback(
    async (
      mainId: string,
      subId: string,
      subtasks: SubTask[],
      direction: "up" | "down",
    ) => {
      const currentIndex = subtasks.findIndex((s) => s.id === subId);
      if (currentIndex < 0) return;
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= subtasks.length) return;

      triggerAnimation(subId);
      const nextSubs = [...subtasks];
      const [moved] = nextSubs.splice(currentIndex, 1);
      nextSubs.splice(targetIndex, 0, moved);

      setTasksList((prev) =>
        prev.map((m) => (m.id === mainId ? { ...m, subtasks: nextSubs } : m)),
      );

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          // vibration API unavailable
        }
      }

      try {
        const supabase = createClient();
        await Promise.all(
          nextSubs.map((item, idx) =>
            supabase
              .from("sub_layers")
              .update({ sort_order: idx })
              .eq("id", item.id),
          ),
        );
        if (onRefreshTasks) await onRefreshTasks();
      } catch (err) {
        console.error("Failed to reorder subtasks:", err);
      }
    },
    [onRefreshTasks, triggerAnimation],
  );

  return {
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
  };
}
