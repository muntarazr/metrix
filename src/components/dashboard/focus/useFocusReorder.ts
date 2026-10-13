"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MainTask, SubTask } from "@/lib/task-hierarchy";
import { createClient } from "@/utils/supabase/client";

interface UseFocusReorderProps {
  goalId?: string;
  initialManualOrder?: boolean;
  filteredHierarchy: MainTask[];
  isChecked: (taskId: string, frequency: string) => boolean;
  onRefreshTasks?: () => Promise<void>;
  onGoalUpdated?: () => void;
  supabase?: any;
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
  goalId,
  initialManualOrder,
  filteredHierarchy,
  isChecked,
  onRefreshTasks,
  onGoalUpdated,
  supabase: injectedSupabase,
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

  // Manual order state: true when the user explicitly rearranged tasks
  const [manualOrder, setManualOrder] = useState<boolean>(() => {
    if (initialManualOrder !== undefined) return Boolean(initialManualOrder);
    if (typeof window !== "undefined" && goalId) {
      try {
        const stored = localStorage.getItem(`metrix_manual_order_${goalId}`);
        if (stored !== null) return stored === "true";
      } catch {}
    }
    return false;
  });

  useEffect(() => {
    if (initialManualOrder !== undefined) {
      setManualOrder(Boolean(initialManualOrder));
      if (typeof window !== "undefined" && goalId) {
        try {
          localStorage.setItem(
            `metrix_manual_order_${goalId}`,
            String(Boolean(initialManualOrder)),
          );
        } catch {}
      }
    }
  }, [initialManualOrder, goalId]);

  // Local reorderable list state:
  // If user has custom manual order, strictly follow filteredHierarchy (based on sort_order);
  // otherwise, sink completed items automatically.
  const [tasksList, setTasksList] = useState<MainTask[]>(() =>
    manualOrder ? filteredHierarchy : sinkCompleted(filteredHierarchy, isMainDone),
  );
  const tasksListRef = useRef(tasksList);
  tasksListRef.current = tasksList;

  // Track recently moved task for smooth highlight animation
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with incoming hierarchy changes
  useEffect(() => {
    if (manualOrder) {
      setTasksList(filteredHierarchy);
    } else {
      setTasksList(sinkCompleted(filteredHierarchy, isMainDone));
    }
  }, [filteredHierarchy, isMainDone, manualOrder]);

  // Helper to mark manual order active and persist it
  const markManualOrderActive = useCallback(async () => {
    setManualOrder(true);
    if (typeof window !== "undefined" && goalId) {
      try {
        localStorage.setItem(`metrix_manual_order_${goalId}`, "true");
      } catch {}
    }
    if (goalId) {
      try {
        const client = injectedSupabase || createClient();
        await client
          .from("goals")
          .update({ manual_task_order: true })
          .eq("id", goalId);
        onGoalUpdated?.();
      } catch (err: any) {
        console.error(
          "Failed to update goal manual_task_order:",
          err?.message || err,
        );
      }
    }
  }, [goalId, injectedSupabase, onGoalUpdated]);

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
      const validItems = list.filter(
        (item) => item?.id && !String(item.id).startsWith("orphan-"),
      );
      if (validItems.length === 0) return;

      // Lock in manual user order so auto-sink does not undo the user's explicit order
      await markManualOrderActive();

      try {
        const client = injectedSupabase || createClient();
        const results = await Promise.all(
          validItems.map((item, idx) =>
            client
              .from("sub_layers")
              .update({ sort_order: idx })
              .eq("id", item.id),
          ),
        );
        const errorResult = results.find((r) => r?.error);
        if (errorResult?.error) {
          const err = errorResult.error;
          console.error(
            "Failed to reorder main tasks:",
            err.message || err.details || err.hint || err.code || err,
          );
        }
        if (onRefreshTasks) {
          try {
            await onRefreshTasks();
          } catch (refreshErr: any) {
            console.error(
              "onRefreshTasks error:",
              refreshErr?.message || refreshErr,
            );
          }
        }
      } catch (err: any) {
        console.error("Failed to reorder main tasks:", err?.message || err);
      }
    },
    [injectedSupabase, markManualOrderActive, onRefreshTasks],
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
      const validSubs = subs.filter(
        (item) => item?.id && !String(item.id).startsWith("orphan-"),
      );
      if (validSubs.length === 0) return;

      // Lock in manual user order so auto-sink does not undo the user's explicit order
      await markManualOrderActive();

      try {
        const client = injectedSupabase || createClient();
        const results = await Promise.all(
          validSubs.map((item, idx) =>
            client
              .from("sub_layers")
              .update({ sort_order: idx })
              .eq("id", item.id),
          ),
        );
        const errorResult = results.find((r) => r?.error);
        if (errorResult?.error) {
          const err = errorResult.error;
          console.error(
            "Failed to reorder subtasks:",
            err.message || err.details || err.hint || err.code || err,
          );
        }
        if (onRefreshTasks) {
          try {
            await onRefreshTasks();
          } catch (refreshErr: any) {
            console.error(
              "onRefreshTasks error:",
              refreshErr?.message || refreshErr,
            );
          }
        }
      } catch (err: any) {
        console.error("Failed to reorder subtasks:", err?.message || err);
      }
    },
    [injectedSupabase, markManualOrderActive, onRefreshTasks],
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

      // Lock in manual user order
      await markManualOrderActive();

      const validSubs = nextSubs.filter(
        (item) => item?.id && !String(item.id).startsWith("orphan-"),
      );

      try {
        const client = injectedSupabase || createClient();
        const results = await Promise.all(
          validSubs.map((item, idx) =>
            client
              .from("sub_layers")
              .update({ sort_order: idx })
              .eq("id", item.id),
          ),
        );
        const errorResult = results.find((r) => r?.error);
        if (errorResult?.error) {
          const err = errorResult.error;
          console.error(
            "Failed to reorder subtasks:",
            err.message || err.details || err.hint || err.code || err,
          );
        }
        if (onRefreshTasks) {
          try {
            await onRefreshTasks();
          } catch (refreshErr: any) {
            console.error(
              "onRefreshTasks error:",
              refreshErr?.message || refreshErr,
            );
          }
        }
      } catch (err: any) {
        console.error("Failed to reorder subtasks:", err?.message || err);
      }
    },
    [injectedSupabase, markManualOrderActive, onRefreshTasks, triggerAnimation],
  );

  // Reset tasks order back to automatic (sinking completed tasks)
  const handleResetToAutoOrder = useCallback(async () => {
    setManualOrder(false);
    if (typeof window !== "undefined" && goalId) {
      try {
        localStorage.setItem(`metrix_manual_order_${goalId}`, "false");
      } catch {}
    }
    const autoOrdered = sinkCompleted(filteredHierarchy, isMainDone);
    setTasksList(autoOrdered);

    const client = injectedSupabase || createClient();
    try {
      if (goalId) {
        await client
          .from("goals")
          .update({ manual_task_order: false })
          .eq("id", goalId);
        onGoalUpdated?.();
      }
      const validItems = autoOrdered.filter(
        (item) => item?.id && !String(item.id).startsWith("orphan-"),
      );
      if (validItems.length > 0) {
        await Promise.all(
          validItems.map((item, idx) =>
            client
              .from("sub_layers")
              .update({ sort_order: idx })
              .eq("id", item.id),
          ),
        );
      }
      if (onRefreshTasks) {
        await onRefreshTasks();
      }
    } catch (err: any) {
      console.error("Failed to reset to auto order:", err?.message || err);
    }
  }, [
    filteredHierarchy,
    goalId,
    injectedSupabase,
    isMainDone,
    onGoalUpdated,
    onRefreshTasks,
  ]);

  return {
    tasksList,
    animatingId,
    manualOrder,
    handleReorderMains,
    handleReorderSubs,
    handlePersistMainOrder,
    handlePersistSubOrder,
    handleMoveMain,
    handleMoveSub,
    handleResetToAutoOrder,
    sinkCompleted,
    isMainDone,
  };
}
