"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Trophy,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskFocusModeProps {
  isOpen: boolean;
  task: {
    id: string;
    description: string;
    criteria?: string;
    frequency?: string;
    parentTitle?: string;
    timeRequiredMinutes?: number | null;
    impactWeight?: number;
  } | null;
  isCompleted?: boolean;
  isArabic: boolean;
  onClose: () => void;
  onComplete: (taskId: string, frequency: string) => void;
}

const STORAGE_KEY_TIMER = "metrix_focus_mode_state";
const STORAGE_KEY_ZOOM = "metrix_focus_zoom_level";

// Perfectly graded, harmonious sequential zoom steps (1 -> 2 -> 3 -> 4 -> 5)
const MAX_ZOOM = 4;

const TIMER_FONT_SIZES = [
  "text-3xl sm:text-4xl md:text-5xl",                  // Step 1 (Index 0): Compact
  "text-4xl sm:text-5xl md:text-6xl",                  // Step 2 (Index 1): Standard (Default)
  "text-5xl sm:text-6xl md:text-7xl",                  // Step 3 (Index 2): Medium-Large
  "text-6xl sm:text-7xl md:text-8xl",                  // Step 4 (Index 3): Large
  "text-7xl sm:text-8xl md:text-9xl lg:text-[9.5rem]", // Step 5 (Index 4): Hero Giant
];

const INPUT_WIDTHS = [
  "w-16 sm:w-20 md:w-24",
  "w-20 sm:w-24 md:w-28",
  "w-24 sm:w-28 md:w-36",
  "w-28 sm:w-36 md:w-44",
  "w-36 sm:w-48 md:w-60 lg:w-72",
];

export default function TaskFocusMode({
  isOpen,
  task,
  isCompleted = false,
  isArabic,
  onClose,
  onComplete,
}: TaskFocusModeProps) {
  // Zoom level: 0 to 4 (Step 1 to 5, default 1, synchronous lazy init)
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedZoom = localStorage.getItem(STORAGE_KEY_ZOOM);
        if (savedZoom !== null) {
          const parsed = Number(savedZoom);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= MAX_ZOOM) {
            return parsed;
          }
        }
      } catch {}
    }
    return 1;
  });

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

  // Direct editing states (click & type / wheel — no boxes or arrow buttons)
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [hoursInput, setHoursInput] = useState("0");
  const [minutesInput, setMinutesInput] = useState("25");

  const prevTaskIdRef = useRef(task?.id);

  // Synchronize when a different task is opened
  useEffect(() => {
    if (task?.id && task.id !== prevTaskIdRef.current) {
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
  }, [task?.id, defaultMinutes]);

  // Play celebratory two-tone chime via Web Audio API
  const playChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtx();
      const now = audioCtx.currentTime;

      // Note 1: 587.33Hz (D5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Note 2: 880Hz (A5)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.2);
      gain2.gain.setValueAtTime(0.22, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 1.2);
    } catch {
      // ignore audio restrictions
    }
  };

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

  // Countdown interval with finish celebration trigger
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsTimerFinished(true);
            playChime();

            // Request / show system browser notification if allowed
            if (typeof window !== "undefined" && "Notification" in window) {
              if (Notification.permission === "granted") {
                try {
                  new Notification(
                    isArabic
                      ? "انتهت جلسة التركيز بنجاح! 🎉"
                      : "Focus Session Finished! 🎉",
                    {
                      body: isArabic
                        ? `أتممت وقت التركيز على "${task?.description}" وحصلت على +${task?.impactWeight || 5} نقاط!`
                        : `Finished focus on "${task?.description}" and earned +${task?.impactWeight || 5} points!`,
                    },
                  );
                } catch {
                  // ignore
                }
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft, isArabic, task]);

  if (!isOpen || !task) return null;

  // Breakdown of time
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  // Has hours in total duration or current time?
  const hasHours = totalDurationSeconds >= 3600 || hours > 0;
  const MAX_HOURS = 12;
  const earnedPoints = task.impactWeight || 5;

  // Sequential zoom handlers (Graded smoothly 0 through MAX_ZOOM)
  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const next = Math.min(MAX_ZOOM, prev + 1);
      try {
        localStorage.setItem(STORAGE_KEY_ZOOM, String(next));
      } catch {}
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(0, prev - 1);
      try {
        localStorage.setItem(STORAGE_KEY_ZOOM, String(next));
      } catch {}
      return next;
    });
  };

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
    onClose();
  };

  const handleComplete = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_TIMER);
    } catch {
      // ignore
    }
    onComplete(task.id, task.frequency || "daily");
    onClose();
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsTimerFinished(false);
    setSecondsLeft(totalDurationSeconds);
  };

  const currentFontSize = TIMER_FONT_SIZES[zoomLevel] || TIMER_FONT_SIZES[1];
  const currentInputWidth = INPUT_WIDTHS[zoomLevel] || INPUT_WIDTHS[1];

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-between rounded-xl border border-primary/30 bg-card/98 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto shadow-sm"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Top Bar: Clean Action Group (Zoom Out, Zoom Level Indicator, Zoom In, Close) */}
      <div className="flex w-full items-center justify-end gap-1.5 shrink-0 pb-1">
        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 0}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-xs"
          title={isArabic ? "تصغير الحجم" : "Zoom Out"}
          aria-label={isArabic ? "تصغير الحجم" : "Zoom Out"}
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoomLevel >= MAX_ZOOM}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-xs"
          title={isArabic ? "تكبير الحجم" : "Zoom In"}
          aria-label={isArabic ? "تكبير الحجم" : "Zoom In"}
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer shadow-xs"
          title={isArabic ? "إغلاق" : "Close"}
          aria-label={isArabic ? "إغلاق وضع التركيز" : "Close focus mode"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Focus Area: Either Completed Notification OR Zen Clock */}
      {isTimerFinished ? (
        /* Timer Completed Notification */
        <div className="my-auto flex flex-col items-center text-center py-4 px-2 max-w-sm mx-auto w-full animate-in zoom-in-95 fade-in duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-3 border border-primary/25 shadow-sm">
            <Trophy className="h-7 w-7" />
          </div>

          <h3 className="text-lg sm:text-xl font-black text-foreground">
            {isArabic
              ? "🎉 انتهت جلسة التركيز!"
              : "🎉 Focus Session Finished!"}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-muted-foreground/90 leading-relaxed max-w-xs">
            {isArabic
              ? `أتممت وقت التركيز المحدد على "${task.description}". وثّق ما قمت به في المراجعة اليومية ليتم تقييم أدائك وكسب نقاطك.`
              : `Completed full focus time on "${task.description}". Log what you achieved in your daily review to get evaluated and earn points.`}
          </p>

          {/* Quick Actions */}
          <div className="mt-5 flex w-full items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground text-background font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer active:scale-95 hover:opacity-90"
            >
              <span>
                {isArabic ? "إنهاء والعودة" : "Done & Return"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-11 px-3.5 items-center justify-center rounded-xl border border-border/80 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-bold transition-all cursor-pointer active:scale-95"
              title={isArabic ? "جلسة أخرى" : "Restart"}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Regular Zen Focus Display: Sequential smooth scaling, floating typography */
        <div className="my-auto flex flex-col items-center text-center pt-4 sm:pt-6 pb-2 sm:pb-3 max-w-2xl 2xl:max-w-4xl mx-auto w-full translate-y-1 sm:translate-y-2">
          {/* Minimalist Digital Clock Display (Sequential Harmonious Scaling) */}
          <div
            className="flex flex-col items-center select-none w-full"
            dir="ltr"
          >
            {isRunning ? (
              /* Running Mode: Peaceful countdown with ticking seconds (Pure typography without boxes) */
              <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap">
                {hasHours && (
                  <>
                    <span
                      className={cn(
                        "font-mono font-black text-foreground tabular-nums tracking-tighter select-none transition-all duration-300",
                        currentFontSize,
                      )}
                    >
                      {String(hours).padStart(2, "0")}
                    </span>

                    <span
                      className={cn(
                        "font-mono font-black text-foreground/30 select-none transition-all duration-300",
                        currentFontSize,
                      )}
                    >
                      :
                    </span>
                  </>
                )}

                {/* Minutes Column */}
                <span
                  className={cn(
                    "font-mono font-black text-foreground tabular-nums tracking-tighter select-none transition-all duration-300",
                    currentFontSize,
                  )}
                >
                  {String(minutes).padStart(2, "0")}
                </span>

                <span
                  className={cn(
                    "font-mono font-black text-foreground/30 select-none transition-all duration-300",
                    currentFontSize,
                  )}
                >
                  :
                </span>

                {/* Seconds Column */}
                <span
                  className={cn(
                    "font-mono font-black text-foreground tabular-nums tracking-tighter select-none transition-all duration-300",
                    currentFontSize,
                  )}
                >
                  {String(seconds).padStart(2, "0")}
                </span>
              </div>
            ) : (
              /* Setup / Idle Mode: Pure digital numbers without background box, click to edit or scroll */
              <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap">
                {/* Hours Column (0 to 12 hours) */}
                <div
                  onClick={() => {
                    setHoursInput(String(hours));
                    setIsEditingHours(true);
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    handleIncrementHours(e.deltaY < 0 ? 1 : -1);
                  }}
                  className="relative flex items-center justify-center cursor-pointer select-none"
                  title={
                    isArabic
                      ? `انقر لكتابة الساعات (0-${MAX_HOURS})، أو مرّر بعجلة الفأرة`
                      : `Click to type hours (0-${MAX_HOURS}), or scroll with mouse wheel`
                  }
                >
                  {isEditingHours ? (
                    <input
                      type="number"
                      min="0"
                      max={MAX_HOURS}
                      value={hoursInput}
                      onChange={(e) => setHoursInput(e.target.value)}
                      onBlur={() => handleCommitHours(hoursInput)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitHours(hoursInput);
                        if (e.key === "Escape") setIsEditingHours(false);
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHoursInput((prev) =>
                            String(
                              Math.min(
                                MAX_HOURS,
                                (parseInt(prev, 10) || 0) + 1,
                              ),
                            ),
                          );
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHoursInput((prev) =>
                            String(
                              Math.max(0, (parseInt(prev, 10) || 0) - 1),
                            ),
                          );
                        }
                      }}
                      autoFocus
                      className={cn(
                        "text-center bg-transparent font-mono font-black text-foreground outline-none border-b-2 border-primary transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                        currentFontSize,
                        currentInputWidth,
                      )}
                    />
                  ) : (
                    <span
                      className={cn(
                        "font-mono font-black text-foreground tabular-nums tracking-tighter hover:text-primary transition-all duration-300",
                        currentFontSize,
                      )}
                    >
                      {String(hours).padStart(2, "0")}
                    </span>
                  )}
                </div>

                {/* Static Separator */}
                <span
                  className={cn(
                    "font-mono font-black text-foreground/30 select-none transition-all duration-300",
                    currentFontSize,
                  )}
                >
                  :
                </span>

                {/* Minutes Column (0 to 59 minutes) */}
                <div
                  onClick={() => {
                    setMinutesInput(String(minutes));
                    setIsEditingMinutes(true);
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    handleIncrementMinutes(e.deltaY < 0 ? 5 : -5);
                  }}
                  className="relative flex items-center justify-center cursor-pointer select-none"
                  title={
                    isArabic
                      ? "انقر لكتابة الدقائق (0-59)، أو مرّر بعجلة الفأرة"
                      : "Click to type minutes (0-59), or scroll with mouse wheel"
                  }
                >
                  {isEditingMinutes ? (
                    <input
                      type="number"
                      min="0"
                      max={59}
                      value={minutesInput}
                      onChange={(e) => setMinutesInput(e.target.value)}
                      onBlur={() => handleCommitMinutes(minutesInput)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleCommitMinutes(minutesInput);
                        if (e.key === "Escape") setIsEditingMinutes(false);
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setMinutesInput((prev) =>
                            String(
                              Math.min(
                                59,
                                (parseInt(prev, 10) || 0) + 1,
                              ),
                            ),
                          );
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setMinutesInput((prev) =>
                            String(
                              Math.max(0, (parseInt(prev, 10) || 0) - 1),
                            ),
                          );
                        }
                      }}
                      autoFocus
                      className={cn(
                        "text-center bg-transparent font-mono font-black text-foreground outline-none border-b-2 border-primary transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                        currentFontSize,
                        currentInputWidth,
                      )}
                    />
                  ) : (
                    <span
                      className={cn(
                        "font-mono font-black text-foreground tabular-nums tracking-tighter hover:text-primary transition-all duration-300",
                        currentFontSize,
                      )}
                    >
                      {String(minutes).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Clean Controls: Primary Start/Pause and Reset (Directly below Clock) */}
            <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "inline-flex h-11 sm:h-12 w-36 sm:w-40 items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer",
                  isRunning
                    ? "bg-muted text-foreground hover:bg-muted/80 border border-border/70"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]",
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4 fill-current" />
                    <span>{isArabic ? "إيقاف مؤقت" : "Pause"}</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>{isArabic ? "بدء التركيز" : "Start Focus"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="flex h-11 sm:h-12 w-11 sm:w-12 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer shadow-xs"
                title={isArabic ? "إعادة ضبط" : "Reset timer"}
                aria-label={isArabic ? "إعادة ضبط الوقت" : "Reset timer"}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Task Name (Positioned directly UNDER Start Focus in small, clean font, slightly larger than criteria) */}
            <div className="mt-4 sm:mt-5 text-center max-w-[280px] sm:max-w-[340px] w-full px-2">
              {task.parentTitle && (
                <span className="text-[11px] font-medium text-muted-foreground/60 block mb-0.5">
                  {task.parentTitle}
                </span>
              )}
              <h2 className="text-sm sm:text-base font-bold text-foreground/90 leading-snug tracking-tight">
                {task.description}
              </h2>
            </div>

            {/* Completion Criteria (Positioned below Task Name, matching width without heavy background) */}
            {task.criteria && (
              <div className="mt-2 sm:mt-2.5 max-w-[280px] sm:max-w-[340px] w-full text-center px-1">
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  <span className="font-bold text-foreground/90">
                    {isArabic ? "معيار الإنجاز: " : "Criteria: "}
                  </span>
                  <span>{task.criteria}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
