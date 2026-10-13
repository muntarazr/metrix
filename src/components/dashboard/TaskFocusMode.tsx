"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STORAGE_KEY_ZOOM,
  MAX_ZOOM,
  TIMER_FONT_SIZES,
  INPUT_WIDTHS,
} from "./focus-mode/focus-constants";
import { useFocusTimer } from "./focus-mode/useFocusTimer";
import { FocusClockDisplay } from "./focus-mode/FocusClockDisplay";
import { FocusFinishedView } from "./focus-mode/FocusFinishedView";

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

export default function TaskFocusMode({
  isOpen,
  task,
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

  const [showCriteria, setShowCriteria] = useState(false);
  const [prevTaskId, setPrevTaskId] = useState<string | null>(null);

  const currentTaskId = isOpen && task ? task.id : null;
  if (currentTaskId !== prevTaskId) {
    setPrevTaskId(currentTaskId);
    if (showCriteria) {
      setShowCriteria(false);
    }
  }

  const timer = useFocusTimer({
    isOpen,
    task,
    isArabic,
    onClose,
    onComplete,
  });

  if (!isOpen || !task) return null;

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

  const currentFontSize = TIMER_FONT_SIZES[zoomLevel] || TIMER_FONT_SIZES[1];
  const currentInputWidth = INPUT_WIDTHS[zoomLevel] || INPUT_WIDTHS[1];

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-between rounded-xl border border-primary/30 bg-card/98 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overscroll-contain shadow-sm"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Top Bar: Clean Action Group (Zoom Out, Zoom In, Close) */}
      <div className="flex w-full items-center justify-end gap-1.5 shrink-0 pb-1">
        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 0}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-xs touch-manipulation"
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
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-xs touch-manipulation"
          title={isArabic ? "تكبير الحجم" : "Zoom In"}
          aria-label={isArabic ? "تكبير الحجم" : "Zoom In"}
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={timer.handleClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer shadow-xs touch-manipulation"
          title={isArabic ? "إغلاق" : "Close"}
          aria-label={isArabic ? "إغلاق وضع التركيز" : "Close focus mode"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Focus Area: Either Completed Notification OR Zen Clock */}
      {timer.isTimerFinished ? (
        <FocusFinishedView
          isArabic={isArabic}
          taskDescription={task.description}
          onClose={timer.handleClose}
          onReset={timer.handleReset}
        />
      ) : (
        /* Regular Zen Focus Display: Sequential smooth scaling, floating typography */
        <div className="my-auto flex flex-col items-center text-center pt-1.5 sm:pt-6 pb-1 sm:pb-3 max-w-2xl 2xl:max-w-4xl mx-auto w-full translate-y-0 sm:translate-y-2">
          <FocusClockDisplay
            isRunning={timer.isRunning}
            hasHours={timer.hasHours}
            hours={timer.hours}
            minutes={timer.minutes}
            seconds={timer.seconds}
            currentFontSize={currentFontSize}
            currentInputWidth={currentInputWidth}
            isArabic={isArabic}
            isEditingHours={timer.isEditingHours}
            isEditingMinutes={timer.isEditingMinutes}
            hoursInput={timer.hoursInput}
            minutesInput={timer.minutesInput}
            setHoursInput={timer.setHoursInput}
            setMinutesInput={timer.setMinutesInput}
            setIsEditingHours={timer.setIsEditingHours}
            setIsEditingMinutes={timer.setIsEditingMinutes}
            handleIncrementHours={timer.handleIncrementHours}
            handleIncrementMinutes={timer.handleIncrementMinutes}
            handleCommitHours={timer.handleCommitHours}
            handleCommitMinutes={timer.handleCommitMinutes}
          />

          {/* Clean Controls: Primary Start/Pause and Reset (Directly below Clock) */}
          <div className="mt-3.5 sm:mt-8 flex items-center justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => timer.setIsRunning(!timer.isRunning)}
              className={cn(
                "inline-flex h-10 sm:h-12 w-32 sm:w-40 items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer touch-manipulation",
                timer.isRunning
                  ? "bg-muted text-foreground hover:bg-muted/80 border border-border/70"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]",
              )}
            >
              {timer.isRunning ? (
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
              onClick={timer.handleReset}
              className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer shadow-xs touch-manipulation"
              title={isArabic ? "إعادة ضبط" : "Reset timer"}
              aria-label={isArabic ? "إعادة ضبط الوقت" : "Reset timer"}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Task Name (Positioned directly UNDER Start Focus in small, clean font, slightly larger than criteria) */}
          <div className="mt-2.5 sm:mt-5 text-center max-w-[280px] sm:max-w-[340px] w-full px-2">
            {task.parentTitle && (
              <span className="text-[11px] font-medium text-muted-foreground/60 block mb-0.5">
                {task.parentTitle}
              </span>
            )}
            <h2
              onClick={() => {
                if (task.criteria) {
                  setShowCriteria((prev) => !prev);
                }
              }}
              className={cn(
                "text-sm sm:text-base font-bold text-foreground/90 leading-snug tracking-tight",
                task.criteria &&
                  "cursor-pointer select-none transition-colors hover:text-primary active:scale-[0.99]",
              )}
              title={
                task.criteria
                  ? isArabic
                    ? showCriteria
                      ? "إخفاء معيار الإنجاز"
                      : "إظهار معيار الإنجاز"
                    : showCriteria
                      ? "Hide completion criteria"
                      : "Show completion criteria"
                  : undefined
              }
            >
              {task.description}
            </h2>
          </div>

          {/* Completion Criteria (Hidden by default, shown when clicking Task Name) */}
          {task.criteria && showCriteria && (
            <div className="mt-1.5 sm:mt-2.5 max-w-[280px] sm:max-w-[340px] w-full text-center px-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                <span className="font-bold text-foreground/90">
                  {isArabic ? "معيار الإنجاز: " : "Criteria: "}
                </span>
                <span>{task.criteria}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
