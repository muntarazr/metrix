"use client";

import { useState, useEffect, useRef } from "react";
import { STORAGE_KEY_TIMER, MAX_HOURS } from "./focus-constants";
import { playFocusChime } from "./focus-audio";

interface FocusTask {
  id: string;
  description: string;
  criteria?: string;
  frequency?: string;
  parentTitle?: string;
  timeRequiredMinutes?: number | null;
  impactWeight?: number;
}

interface UseFocusTimerProps {
  isOpen: boolean;
  task: FocusTask | null;
  isArabic: boolean;
  onClose: () => void;
  onComplete: (taskId: string, frequency: string) => void;
}

export function useFocusTimer({
  isOpen,
  task,
  isArabic,
  onClose,
  onComplete,
}: UseFocusTimerProps) {
  // Default minutes from task if exists, otherwise 25
  const defaultMinutes =
    task?.timeRequiredMinutes && task.timeRequiredMinutes > 0
      ? task.timeRequiredMinutes
      : 25;

  // Synchronous initial timer state from localStorage
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(() => {
    const def = defaultMinutes * 60;
    if (typeof window !== "undefined" && task) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TIMER);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.taskId === task.id && parsed.totalDurationSeconds) {
            return parsed.totalDurationSeconds;
          }
        }
      } catch {}
    }
    return def;
  });

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const def = defaultMinutes * 60;
    if (typeof window !== "undefined" && task) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TIMER);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.taskId === task.id) {
            if (parsed.isRunning && parsed.targetEndTime) {
              const remaining = Math.max(
                0,
                Math.round((parsed.targetEndTime - Date.now()) / 1000),
              );
              return remaining;
            }
            if (typeof parsed.secondsLeft === "number") {
              return Math.max(0, parsed.secondsLeft);
            }
          }
        }
      } catch {}
    }
    return def;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    if (typeof window !== "undefined" && task) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TIMER);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.taskId === task.id && parsed.isRunning) {
            if (parsed.targetEndTime) {
              return parsed.targetEndTime > Date.now();
            }
            return true;
          }
        }
      } catch {}
    }
    return false;
  });

  const [isTimerFinished, setIsTimerFinished] = useState<boolean>(() => {
    if (typeof window !== "undefined" && task) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TIMER);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.taskId === task.id) {
            if (parsed.isRunning && parsed.targetEndTime) {
              return parsed.targetEndTime <= Date.now();
            }
            return parsed.secondsLeft === 0;
          }
        }
      } catch {}
    }
    return false;
  });

  // Direct editing states (click & type / wheel)
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [hoursInput, setHoursInput] = useState("0");
  const [minutesInput, setMinutesInput] = useState("25");

  const prevTaskIdRef = useRef<string | undefined>(task?.id);
  const prevIsOpenRef = useRef<boolean>(isOpen);

  // Synchronize when modal is opened or a different task is selected
  useEffect(() => {
    if (!isOpen || !task) {
      prevIsOpenRef.current = isOpen;
      return;
    }

    const isNewlyOpened = !prevIsOpenRef.current && isOpen;
    const isDifferentTask = task.id !== prevTaskIdRef.current;
    prevIsOpenRef.current = isOpen;

    if (isNewlyOpened || isDifferentTask) {
      prevTaskIdRef.current = task.id;
      const def = defaultMinutes * 60;
      let loaded = false;
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TIMER);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.taskId === task.id) {
            const tot = parsed.totalDurationSeconds || def;
            setTotalDurationSeconds(tot);
            if (parsed.isRunning && parsed.targetEndTime) {
              const remaining = Math.max(
                0,
                Math.round((parsed.targetEndTime - Date.now()) / 1000),
              );
              setSecondsLeft(remaining);
              setIsRunning(remaining > 0);
              setIsTimerFinished(remaining === 0);
            } else {
              setSecondsLeft(
                typeof parsed.secondsLeft === "number"
                  ? Math.max(0, parsed.secondsLeft)
                  : tot,
              );
              setIsRunning(Boolean(parsed.isRunning));
              setIsTimerFinished(parsed.secondsLeft === 0);
            }
            loaded = true;
          }
        }
      } catch {}
      if (!loaded) {
        setTotalDurationSeconds(def);
        setSecondsLeft(def);
        setIsRunning(false);
        setIsTimerFinished(false);
      }
    }
  }, [isOpen, task?.id, defaultMinutes]);

  // Persist timer state to localStorage with targetEndTime
  useEffect(() => {
    if (isOpen && task) {
      try {
        const targetEndTime = isRunning
          ? Date.now() + secondsLeft * 1000
          : null;
        localStorage.setItem(
          STORAGE_KEY_TIMER,
          JSON.stringify({
            taskId: task.id,
            secondsLeft,
            totalDurationSeconds,
            isRunning,
            targetEndTime,
            lastSavedAt: Date.now(),
          }),
        );
      } catch {
        // ignore
      }
    }
  }, [isOpen, task, secondsLeft, totalDurationSeconds, isRunning]);

  // Countdown interval with stable 1s cadence (independent of secondsLeft drift)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsTimerFinished(true);
            playFocusChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isArabic, task]);

  // Breakdown of time
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const hasHours = totalDurationSeconds >= 3600 || hours > 0;

  // Adjust Hours via wheel or direct edit (0 to 12h)
  const handleIncrementHours = (delta: number) => {
    if (isRunning) return;
    setIsTimerFinished(false);
    const curH = Math.floor(secondsLeft / 3600);
    const curM = Math.floor((secondsLeft % 3600) / 60);
    let nextH = Math.max(0, Math.min(MAX_HOURS, curH + delta));
    let nextM = curM;

    if (nextH === MAX_HOURS) nextM = 0;
    if (nextH === 0 && nextM < 5) nextM = 5;

    const newTotal = nextH * 3600 + nextM * 60;
    setTotalDurationSeconds(newTotal);
    setSecondsLeft(newTotal);
  };

  // Adjust Minutes via wheel or direct edit
  const handleIncrementMinutes = (delta: number) => {
    if (isRunning) return;
    setIsTimerFinished(false);
    const curH = Math.floor(secondsLeft / 3600);
    const curM = Math.floor((secondsLeft % 3600) / 60);
    let nextM = curM + delta;
    let nextH = curH;

    if (nextH === MAX_HOURS) {
      if (delta < 0) {
        nextH = MAX_HOURS - 1;
        nextM = 55;
      } else {
        return;
      }
    } else if (nextM >= 60) {
      if (nextH < MAX_HOURS) {
        nextH += 1;
        nextM = 0;
      } else {
        nextM = 55;
      }
    } else if (nextM < 0) {
      if (nextH > 0) {
        nextH -= 1;
        nextM = 55;
      } else {
        nextM = 5;
      }
    }

    if (nextH === 0 && nextM < 5) {
      nextM = 5;
    }

    const newTotal = nextH * 3600 + nextM * 60;
    setTotalDurationSeconds(newTotal);
    setSecondsLeft(newTotal);
  };

  // Direct edit commit for Hours
  const handleCommitHours = (val: string) => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      const clampedH = Math.max(0, Math.min(MAX_HOURS, parsed));
      const curM = Math.floor((secondsLeft % 3600) / 60);
      const nextM =
        clampedH === MAX_HOURS
          ? 0
          : clampedH === 0 && curM < 5
            ? 5
            : curM;
      const newTotal = clampedH * 3600 + nextM * 60;
      setTotalDurationSeconds(newTotal);
      setSecondsLeft(newTotal);
      setIsTimerFinished(false);
    }
    setIsEditingHours(false);
  };

  // Direct edit commit for Minutes
  const handleCommitMinutes = (val: string) => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      const curH = Math.floor(secondsLeft / 3600);
      let clampedM = Math.max(0, Math.min(59, parsed));
      if (curH === MAX_HOURS) clampedM = 0;
      if (curH === 0 && clampedM < 5) clampedM = 5;
      const newTotal = curH * 3600 + clampedM * 60;
      setTotalDurationSeconds(newTotal);
      setSecondsLeft(newTotal);
      setIsTimerFinished(false);
    }
    setIsEditingMinutes(false);
  };

  const handleClose = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_TIMER);
    } catch {
      // ignore
    }
    setIsRunning(false);
    setIsTimerFinished(false);
    setIsEditingHours(false);
    setIsEditingMinutes(false);
    const def = defaultMinutes * 60;
    setSecondsLeft(def);
    setTotalDurationSeconds(def);
    prevTaskIdRef.current = undefined;
    onClose();
  };

  const handleComplete = () => {
    if (!task) return;
    try {
      localStorage.removeItem(STORAGE_KEY_TIMER);
    } catch {
      // ignore
    }
    setIsRunning(false);
    setIsTimerFinished(false);
    setIsEditingHours(false);
    setIsEditingMinutes(false);
    const def = defaultMinutes * 60;
    setSecondsLeft(def);
    setTotalDurationSeconds(def);
    prevTaskIdRef.current = undefined;
    onComplete(task.id, task.frequency || "daily");
    onClose();
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsTimerFinished(false);
    setIsEditingHours(false);
    setIsEditingMinutes(false);
    setSecondsLeft(totalDurationSeconds);
  };

  return {
    hours,
    minutes,
    seconds,
    hasHours,
    secondsLeft,
    totalDurationSeconds,
    isRunning,
    setIsRunning,
    isTimerFinished,
    setIsTimerFinished,
    isEditingHours,
    setIsEditingHours,
    isEditingMinutes,
    setIsEditingMinutes,
    hoursInput,
    setHoursInput,
    minutesInput,
    setMinutesInput,
    handleIncrementHours,
    handleIncrementMinutes,
    handleCommitHours,
    handleCommitMinutes,
    handleClose,
    handleComplete,
    handleReset,
  };
}
