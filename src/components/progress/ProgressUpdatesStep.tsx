"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Flame, Clock, ListChecks, ArrowDown, ArrowUp, Sparkles, Check, Trophy, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";
import GoalProgressBar from "@/components/shared/GoalProgressBar";
import { formatNumberEn } from "@/lib/utils";
import { type Language } from "@/lib/translations";

export interface ProgressUpdatesData {
  // Mode / Log Type
  logType?: "daily" | "milestone";
  milestoneTitle?: string;
  milestoneTier?: "minor" | "major" | "legendary";

  // Points
  prevPoints: number;
  newPoints: number;
  targetPoints: number;
  deltaPoints: number;

  // Streak
  prevStreak: number;
  newStreak: number;

  // Days remaining
  prevDaysRemaining: number | null;
  newDaysRemaining: number | null;

  // Tasks completed today
  prevTasksDone: number;
  newTasksDone: number;
  totalTasks: number;
}

interface ProgressUpdatesStepProps {
  updates: ProgressUpdatesData;
  language?: Language;
  onDone: () => void;
}

export default function ProgressUpdatesStep({
  updates,
  language = "ar",
  onDone,
}: ProgressUpdatesStepProps) {
  const isArabic = language === "ar";
  const isMilestone = updates.logType === "milestone";

  // Animation phase states
  // 0 = Initial state (showing previous values)
  // 1 = Animate Tube (ProgressBar) & points count up
  // 2 = Animate Streak (+1)
  // 3 = Animate Days remaining (-1)
  // 4 = Animate Tasks completed
  // 5 = Ready / Complete
  const [phase, setPhase] = useState<number>(0);
  const [replayCount, setReplayCount] = useState<number>(0);

  // Animated values
  const [animatedPoints, setAnimatedPoints] = useState(updates.prevPoints);
  const [animatedStreak, setAnimatedStreak] = useState(updates.prevStreak);
  const [animatedDays, setAnimatedDays] = useState(updates.prevDaysRemaining);
  const [animatedTasks, setAnimatedTasks] = useState(updates.prevTasksDone);

  // Flash / Highlight states for the cards
  const [streakHighlight, setStreakHighlight] = useState(false);
  const [daysHighlight, setDaysHighlight] = useState(false);
  const [tasksHighlight, setTasksHighlight] = useState(false);
  const [barHighlight, setBarHighlight] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Trigger celebration confetti via canvas-confetti
  const fireConfetti = useCallback((tier?: string) => {
    if (typeof window === "undefined") return;

    if (tier === "legendary") {
      // Golden explosion
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#fbbf24", "#d97706", "#fef3c7", "#6366f1"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#f59e0b", "#fbbf24", "#d97706"],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#f59e0b", "#fbbf24", "#d97706"],
        });
      }, 250);
    } else if (isMilestone) {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.65 },
        colors: ["#f59e0b", "#10b981", "#3b82f6", "#fcd34d"],
      });
    } else {
      // Subtle sparkle confetti for daily success
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#0284c7", "#38bdf8", "#10b981"],
        gravity: 1.2,
        scalar: 0.8,
      });
    }
  }, [isMilestone]);

  // Run the staged animations sequentially
  useEffect(() => {
    // Stage 1: Animate Liquid Bar and Points count-up (starts after 300ms)
    const t1 = setTimeout(() => {
      setPhase(1);

      const duration = 1200; // ms
      const startTime = performance.now();
      const startPoints = updates.prevPoints;
      const endPoints = updates.newPoints;

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.round(startPoints + (endPoints - startPoints) * ease);
        setAnimatedPoints(currentVal);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setAnimatedPoints(endPoints);
        }
      };

      requestAnimationFrame(step);
    }, 350);

    // Stage 2: Animate Streak (fire flame boost)
    const t2 = setTimeout(() => {
      setPhase(2);
      if (updates.newStreak !== updates.prevStreak) {
        setStreakHighlight(true);
        setAnimatedStreak(updates.newStreak);
        setTimeout(() => setStreakHighlight(false), 900);
      }
    }, 1500);

    // Stage 3: Animate Days Remaining (decreasing count down)
    const t3 = setTimeout(() => {
      setPhase(3);
      if (
        updates.newDaysRemaining !== null &&
        updates.prevDaysRemaining !== null &&
        updates.newDaysRemaining !== updates.prevDaysRemaining
      ) {
        setDaysHighlight(true);
        setAnimatedDays(updates.newDaysRemaining);
        setTimeout(() => setDaysHighlight(false), 900);
      }
    }, 2200);

    // Stage 4: Animate Tasks Completed Today
    const t4 = setTimeout(() => {
      setPhase(4);
      if (updates.newTasksDone !== updates.prevTasksDone) {
        setTasksHighlight(true);
        setAnimatedTasks(updates.newTasksDone);
        setTimeout(() => setTasksHighlight(false), 900);
      }
    }, 2800);

    // Stage 5: Done with all animations
    const t5 = setTimeout(() => {
      setPhase(5);
    }, 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [updates]);

  const targetPoints = Math.max(updates.targetPoints, 1);
  const currentPercentage = Math.min(100, Math.round((animatedPoints / targetPoints) * 100));

  return (
    <div
      className="space-y-6 animate-in fade-in zoom-in-95 duration-300"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header Banner: Differentiated for Milestone vs Daily Log */}
      <div className="text-center space-y-2 pt-2">
        {isMilestone ? (
          <>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black shadow-sm animate-bounce">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>
                {isArabic
                  ? "إنجاز كبير استثنائي (Milestone)"
                  : "Major Milestone Achievement"}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center justify-center gap-2">
              <span>
                {updates.milestoneTitle ||
                  (isArabic ? "إنجاز استثنائي مُسجل!" : "Milestone Recorded!")}
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-sm mx-auto">
              {isArabic
                ? "حققت خطوة فارقة ومميزة في مسار هدفك استحققت عليها قفزة نوعية!"
                : "A monumental milestone achieved! Massive leap towards your goal."}
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "4s" }} />
              <span>{isArabic ? "تحديث التقدم اليومي" : "Daily Progress Updates"}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {isArabic ? "تم تسجيل تقدمك اليومي بنجاح!" : "Progress Recorded Successfully!"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {isArabic
                ? "شاهد كيف تقدّمت مؤشرات هدفك وسلسلة التزامك اليوم"
                : "See how your goal metrics and momentum advanced today"}
            </p>
          </>
        )}
      </div>

      {/* Main Liquid Progress Tube Card */}
      <div
        className={`rounded-2xl border-2 p-5 space-y-3.5 shadow-sm transition-all duration-500 ${
          isMilestone
            ? "border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card to-card shadow-amber-500/10"
            : "border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card"
        } ${barHighlight ? "ring-2 ring-primary/40 scale-[1.01]" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              {isArabic ? "شريط التقدم الكلي" : "Total Goal Progress"}
            </span>
            {updates.deltaPoints > 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold animate-bounce ${
                  isMilestone
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                }`}
              >
                <ArrowUp className="w-3 h-3" />
                +{formatNumberEn(updates.deltaPoints)}
              </span>
            )}
          </div>
          <span
            className={`text-sm font-extrabold tabular-nums ${
              isMilestone ? "text-amber-500" : "text-primary"
            }`}
          >
            {currentPercentage}%
          </span>
        </div>

        {/* Liquid Progress Bar Component */}
        <div className="transition-transform duration-300 hover:scale-[1.01]">
          <GoalProgressBar
            currentPoints={animatedPoints}
            targetPoints={targetPoints}
            progress={currentPercentage}
            showXpLabel={true}
            className="h-10 sm:h-11 shadow-md"
          />
        </div>
      </div>

      {/* Grid of Key Updating Metrics: Streak, Days Remaining, Tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Streak Card */}
        <div
          className={`rounded-2xl p-4 border transition-all duration-500 flex flex-col justify-between relative overflow-hidden ${
            streakHighlight
              ? "bg-amber-500/20 border-amber-500/50 shadow-lg shadow-amber-500/15 scale-105"
              : "bg-muted/30 border-border/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">
              {isArabic ? "سلسلة الأيام" : "Streak"}
            </span>
            <div
              className={`p-2 rounded-xl border transition-all duration-300 ${
                animatedStreak > 0
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                  : "bg-muted text-muted-foreground border-border"
              } ${streakHighlight ? "scale-125 rotate-6" : ""}`}
            >
              <Flame className={`w-4 h-4 ${animatedStreak > 0 ? "fill-amber-500" : ""}`} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black tabular-nums transition-all duration-300 ${
                streakHighlight ? "text-amber-600 dark:text-amber-400 scale-110" : "text-foreground"
              }`}
            >
              {formatNumberEn(animatedStreak)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {isArabic ? "يوم" : "days"}
            </span>
            {updates.newStreak > updates.prevStreak && (
              <span className="ms-auto inline-flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md border border-amber-500/25">
                +1
              </span>
            )}
          </div>
        </div>

        {/* 2. Days Remaining Card (Decreasing) */}
        <div
          className={`rounded-2xl p-4 border transition-all duration-500 flex flex-col justify-between relative overflow-hidden ${
            daysHighlight
              ? "bg-sky-500/20 border-sky-500/50 shadow-lg shadow-sky-500/15 scale-105"
              : "bg-muted/30 border-border/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">
              {isArabic ? "الأيام المتبقية" : "Days Left"}
            </span>
            <div
              className={`p-2 rounded-xl border transition-all duration-300 ${
                daysHighlight
                  ? "bg-sky-500/25 border-sky-500/40 text-sky-600 dark:text-sky-400 scale-125 -rotate-6"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black tabular-nums transition-all duration-300 ${
                daysHighlight ? "text-sky-600 dark:text-sky-400 scale-110" : "text-foreground"
              }`}
            >
              {animatedDays !== null ? formatNumberEn(Math.max(0, animatedDays)) : "—"}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {isArabic ? "يوم" : "days"}
            </span>
            {updates.prevDaysRemaining !== null &&
              updates.newDaysRemaining !== null &&
              updates.newDaysRemaining < updates.prevDaysRemaining && (
                <span className="ms-auto inline-flex items-center text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded-md border border-sky-500/25">
                  <ArrowDown className="w-2.5 h-2.5 me-0.5" />
                  -1
                </span>
              )}
          </div>
        </div>

        {/* 3. Tasks Completed Today Card */}
        <div
          className={`rounded-2xl p-4 border transition-all duration-500 flex flex-col justify-between relative overflow-hidden ${
            tasksHighlight
              ? "bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/15 scale-105"
              : "bg-muted/30 border-border/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">
              {isArabic ? "مهام اليوم" : "Today's Tasks"}
            </span>
            <div
              className={`p-2 rounded-xl border transition-all duration-300 ${
                animatedTasks >= updates.totalTasks && updates.totalTasks > 0
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground border-border"
              } ${tasksHighlight ? "scale-125 rotate-6" : ""}`}
            >
              <ListChecks className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black tabular-nums transition-all duration-300 ${
                tasksHighlight ? "text-emerald-600 dark:text-emerald-400 scale-110" : "text-foreground"
              }`}
              dir="ltr"
            >
              {formatNumberEn(animatedTasks)}/{formatNumberEn(updates.totalTasks)}
            </span>
            {animatedTasks >= updates.totalTasks && updates.totalTasks > 0 && (
              <span className="ms-auto inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md border border-emerald-500/25">
                <Check className="w-2.5 h-2.5 me-0.5" />
                {isArabic ? "مكتمل" : "Done"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Replay Animation & Done */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            // Trigger confetti again and replay
            fireConfetti();
            setAnimatedPoints(updates.prevPoints);
            setAnimatedStreak(updates.prevStreak);
            setAnimatedDays(updates.prevDaysRemaining);
            setAnimatedTasks(updates.prevTasksDone);
            setPhase(0);
            setTimeout(() => setPhase(1), 100);
          }}
          className="w-full sm:w-auto px-5 py-3.5 bg-muted/60 hover:bg-muted text-foreground border border-border/70 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          title={isArabic ? "إعادة تشغيل الحركة" : "Replay Animation"}
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
          <span>{isArabic ? "إعادة تشغيل" : "Replay"}</span>
        </button>

        <button
          type="button"
          onClick={onDone}
          className={`w-full flex-1 py-3.5 rounded-2xl font-black text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
            isMilestone
              ? "bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-amber-500/25"
              : "bg-primary text-primary-foreground shadow-primary/20"
          }`}
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          <span>{isArabic ? "تم" : "Done"}</span>
        </button>
      </div>
    </div>
  );
}
