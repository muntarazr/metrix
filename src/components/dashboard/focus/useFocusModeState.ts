"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface FocusModeTaskData {
  id: string;
  description: string;
  criteria?: string;
  frequency?: string;
  parentTitle?: string;
  timeRequiredMinutes?: number | null;
  impactWeight?: number;
}

export function useFocusModeState() {
  // Focus Mode state with synchronous LocalStorage persistence (A10, A19)
  const [focusModeTask, setFocusModeTask] = useState<FocusModeTaskData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("metrix_active_focus_task");
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // ignore JSON parse errors
      }
    }
    return null;
  });

  const handleOpenFocusMode = useCallback((task: FocusModeTaskData) => {
    setFocusModeTask(task);
    try {
      localStorage.setItem("metrix_active_focus_task", JSON.stringify(task));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleCloseFocusMode = useCallback(() => {
    setFocusModeTask(null);
    try {
      localStorage.removeItem("metrix_active_focus_task");
      localStorage.removeItem("metrix_focus_mode_state");
    } catch {
      // ignore storage errors
    }
  }, []);

  // Long-press handling (A2: 1.8s hold triggers Focus Mode)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const startLongPress = useCallback(
    (taskToFocus: FocusModeTaskData) => {
      isLongPressTriggeredRef.current = false;
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      longPressTimeoutRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        handleOpenFocusMode(taskToFocus);
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(60);
          } catch {
            // vibration API unavailable
          }
        }
      }, 1800);
    },
    [handleOpenFocusMode],
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount to prevent memory leaks and unmounted state updates
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return {
    focusModeTask,
    handleOpenFocusMode,
    handleCloseFocusMode,
    startLongPress,
    cancelLongPress,
    isLongPressTriggeredRef,
  };
}
