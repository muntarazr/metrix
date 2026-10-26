"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Flame,
  Clock,
  ListChecks,
  ArrowDown,
  ArrowUp,
  Check,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
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

  // Animated states
  const [animatedPoints, setAnimatedPoints] = useState(updates.prevPoints);
  const [animatedStreak, setAnimatedStreak] = useState(updates.prevStreak);
  const [animatedDays, setAnimatedDays] = useState(updates.prevDaysRemaining);
  const [animatedTasks, setAnimatedTasks] = useState(updates.prevTasksDone);

  // Subtle luminous highlight states for cards during cascade
  const [streakHighlight, setStreakHighlight] = useState(false);
  const [daysHighlight, setDaysHighlight] = useState(false);
  const [tasksHighlight, setTasksHighlight] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Confetti trigger
  const fireConfetti = useCallback(
    (tier?: string) => {
      if (typeof window === "undefined") return;

      if (tier === "legendary") {
        confetti({
          particleCount: 70,
          spread: 90,
          origin: { y: 0.55 },
          colors: ["#f59e0b", "#fbbf24", "#d97706", "#fef3c7", "#6366f1"],
          scalar: 0.85,
          ticks: 200,
        });
      } else if (isMilestone) {
        confetti({
          particleCount: 50,
          spread: 75,
          origin: { y: 0.6 },
          colors: ["#f59e0b", "#10b981", "#3b82f6", "#fbbf24"],
          scalar: 0.8,
          ticks: 180,
        });
      } else {
        // Refined micro-burst for daily celebration
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.65 },
          colors: ["#0284c7", "#38bdf8", "#10b981", "#6366f1"],
          gravity: 1.1,
          scalar: 0.75,
          ticks: 160,
        });
      }
    },
    [isMilestone],
  );

  const startAnimationSequence = useCallback(() => {
    // Clear any existing timers or frames
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // Reset values to previous
    setAnimatedPoints(updates.prevPoints);
    setAnimatedStreak(updates.prevStreak);
    setAnimatedDays(updates.prevDaysRemaining);
    setAnimatedTasks(updates.prevTasksDone);
    setStreakHighlight(false);
    setDaysHighlight(false);
    setTasksHighlight(false);

    // Initial celebratory confetti
    fireConfetti(updates.milestoneTier);

    // Step 1: Smooth Points Count-Up (requestAnimationFrame with easeOutQuart)
    const tPoints = setTimeout(() => {
      const duration = 850;
      const startTime = performance.now();
      const startPoints = updates.prevPoints;
      const endPoints = updates.newPoints;

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutQuart: silky smooth deceleration
        const ease = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.round(
          startPoints + (endPoints - startPoints) * ease,
        );
        setAnimatedPoints(currentVal);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          setAnimatedPoints(endPoints);
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    }, 150);
    timeoutsRef.current.push(tPoints);

    // Step 2: Streak cascade
    const tStreak = setTimeout(() => {
      if (updates.newStreak !== updates.prevStreak) {
        setStreakHighlight(true);
        setAnimatedStreak(updates.newStreak);
        const t = setTimeout(() => setStreakHighlight(false), 700);
        timeoutsRef.current.push(t);
      }
    }, 350);
    timeoutsRef.current.push(tStreak);

    // Step 3: Days remaining cascade
    const tDays = setTimeout(() => {
      if (
        updates.newDaysRemaining !== null &&
        updates.prevDaysRemaining !== null &&
        updates.newDaysRemaining !== updates.prevDaysRemaining
      ) {
        setDaysHighlight(true);
        setAnimatedDays(updates.newDaysRemaining);
        const t = setTimeout(() => setDaysHighlight(false), 700);
        timeoutsRef.current.push(t);
      }
    }, 500);
    timeoutsRef.current.push(tDays);

    // Step 4: Tasks done cascade
    const tTasks = setTimeout(() => {
      if (updates.newTasksDone !== updates.prevTasksDone) {
        setTasksHighlight(true);
        setAnimatedTasks(updates.newTasksDone);
        const t = setTimeout(() => setTasksHighlight(false), 700);
        timeoutsRef.current.push(t);
      }
    }, 650);
    timeoutsRef.current.push(tTasks);
  }, [updates, fireConfetti]);

  // Run on mount or when updates change
  useEffect(() => {
    startAnimationSequence();
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [startAnimationSequence]);

  // Keyboard shortcut (Enter / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        onDone();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDone]);

  const targetPoints = Math.max(updates.targetPoints, 1);
  const currentPercentage = Math.min(
    100,
    Math.round((animatedPoints / targetPoints) * 100),
  );

  return (
    <div
      className="relative flex flex-col gap-4 sm:gap-5"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Ambient Top Light Beam */}
      <div
        className={`pointer-events-none absolute -top-16 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-35 ${
          isMilestone ? "bg-amber-500/30" : "bg-primary/25"
        }`}
      />

      {/* Header Section */}
      <div className="relative text-center space-y-1.5 pt-0.5">
        {isMilestone ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-xs"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {isArabic
                  ? "محطة إنجاز بارزة"
                  : "Major Milestone Achievement"}
              </span>
            </motion.div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {updates.milestoneTitle ||
                (isArabic ? "إنجاز استثنائي مُسجل!" : "Milestone Recorded!")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-normal max-w-sm mx-auto">
              {isArabic
                ? "حققت خطوة فارقة ومميزة في مسار هدفك استحققت عليها قفزة نوعية"
                : "A monumental milestone achieved! Massive leap towards your goal."}
            </p>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold shadow-xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span>
                {isArabic ? "تحديث التقدم اليومي" : "Daily Progress Recorded"}
              </span>
            </motion.div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {isArabic
                ? "تم تسجيل تقدمك اليومي بنجاح!"
                : "Progress Recorded Successfully!"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-normal">
              {isArabic
                ? "شاهد كيف تقدّمت مؤشرات هدفك وسلسلة التزامك اليوم"
                : "See how your goal metrics and momentum advanced today"}
            </p>
          </>
        )}
      </div>

      {/* Hero Progress Gauge Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-500 ${
          isMilestone
            ? "bg-gradient-to-b from-amber-500/[0.08] via-card to-card border-amber-500/25 shadow-xs"
            : "bg-gradient-to-b from-primary/[0.06] via-card to-card border-border/80 shadow-xs"
        }`}
      >
        {/* Top Header inside Gauge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isArabic ? "شريط التقدم الكلي" : "Overall Goal Progress"}
          </span>
          {updates.deltaPoints > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85, y: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 25 }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums ${
                isMilestone
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
              }`}
            >
              <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              <span>+{formatNumberEn(updates.deltaPoints)} XP</span>
            </motion.span>
          )}
        </div>

        {/* Big Numbers readout */}
        <div className="flex items-baseline justify-between mt-2 mb-3">
          <div className="flex items-baseline gap-1.5" dir="ltr">
            <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight">
              {formatNumberEn(animatedPoints)}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
              / {formatNumberEn(targetPoints)} XP
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black tabular-nums ${
              isMilestone ? "text-amber-500" : "text-primary"
            }`}
            dir="ltr"
          >
            {currentPercentage}%
          </div>
        </div>

        {/* High-Precision Progress Bar Track */}
        <div
          className="relative h-3 sm:h-3.5 w-full overflow-hidden rounded-full border border-border/60 bg-muted/60 p-0.5 shadow-inner"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={currentPercentage}
        >
          <div
            className={`relative h-full rounded-full transition-all duration-300 ease-out shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] ${
              isMilestone
                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                : "bg-gradient-to-r from-primary to-primary-soft"
            }`}
            style={{
              width: `${currentPercentage}%`,
              minWidth: currentPercentage > 0 ? "8px" : "0px",
            }}
          >
            {/* Soft inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10 rounded-full" />
            {/* Luminous beacon tip at current leading edge */}
            {currentPercentage > 1 && (
              <div
                className={`absolute end-0 top-0 bottom-0 w-2 rounded-full bg-white shadow-[0_0_8px_1.5px_rgba(255,255,255,0.8)] ${
                  isMilestone ? "shadow-amber-400/80" : "shadow-primary/80"
                }`}
              />
            )}
          </div>
        </div>

        {/* Track Footnote Bounds */}
        <div
          className="flex items-center justify-between text-[10px] text-muted-foreground/75 font-semibold mt-1.5 px-0.5"
          dir="ltr"
        >
          <span>0 XP</span>
          <span>
            {isArabic ? "الهدف" : "Target"}: {formatNumberEn(targetPoints)} XP
          </span>
        </div>
      </div>

      {/* 3 Metrics Deck (Streak, Days, Tasks) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* 1. Streak Tile */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-300 ${
            streakHighlight
              ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 shadow-xs"
              : "bg-muted/25 border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
              {isArabic ? "سلسلة الأيام" : "Streak"}
            </span>
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0 flex items-center justify-center transition-all duration-300 ${
                animatedStreak > 0
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/25"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              <Flame
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                  animatedStreak > 0 ? "fill-amber-500" : ""
                }`}
              />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1" dir="ltr">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={animatedStreak}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="text-lg sm:text-2xl font-black tabular-nums text-foreground"
                >
                  {formatNumberEn(animatedStreak)}
                </motion.span>
              </AnimatePresence>
              <span className="text-xs font-semibold text-muted-foreground">
                {isArabic ? "يوم" : "d"}
              </span>
            </div>
            {updates.newStreak > updates.prevStreak && (
              <motion.div
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1"
              >
                <span className="inline-flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/25">
                  +1 {isArabic ? "اليوم" : "today"}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* 2. Days Left Tile */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-300 ${
            daysHighlight
              ? "bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/30 shadow-xs"
              : "bg-muted/25 border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
              {isArabic ? "الأيام المتبقية" : "Days Left"}
            </span>
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0 flex items-center justify-center transition-all duration-300 ${
                daysHighlight
                  ? "bg-sky-500/15 text-sky-500 border border-sky-500/25"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1" dir="ltr">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={animatedDays ?? "none"}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="text-lg sm:text-2xl font-black tabular-nums text-foreground"
                >
                  {animatedDays !== null
                    ? formatNumberEn(Math.max(0, animatedDays))
                    : "—"}
                </motion.span>
              </AnimatePresence>
              <span className="text-xs font-semibold text-muted-foreground">
                {isArabic ? "يوم" : "d"}
              </span>
            </div>
            {updates.prevDaysRemaining !== null &&
              updates.newDaysRemaining !== null &&
              updates.newDaysRemaining < updates.prevDaysRemaining && (
                <motion.div
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-1"
                >
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/15 px-1.5 py-0.2 rounded border border-sky-500/25">
                    <ArrowDown className="w-2.5 h-2.5" />
                    -1 {isArabic ? "يوم" : "d"}
                  </span>
                </motion.div>
              )}
          </div>
        </div>

        {/* 3. Tasks Completed Tile */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-300 ${
            tasksHighlight
              ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-xs"
              : "bg-muted/25 border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
              {isArabic ? "مهام اليوم" : "Today's Tasks"}
            </span>
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0 flex items-center justify-center transition-all duration-300 ${
                animatedTasks >= updates.totalTasks && updates.totalTasks > 0
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-0.5" dir="ltr">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={animatedTasks}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="text-lg sm:text-2xl font-black tabular-nums text-foreground"
                >
                  {formatNumberEn(animatedTasks)}
                </motion.span>
              </AnimatePresence>
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                /{formatNumberEn(updates.totalTasks)}
              </span>
            </div>
            {animatedTasks >= updates.totalTasks && updates.totalTasks > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1"
              >
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/25">
                  <Check className="w-2.5 h-2.5" />
                  {isArabic ? "مكتمل" : "Done"}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-0.5 flex flex-row items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={() => startAnimationSequence()}
          className="group w-auto shrink-0 px-3.5 sm:px-4 py-3 sm:py-3.5 bg-muted/40 hover:bg-muted text-foreground border border-border/70 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs"
          title={isArabic ? "إعادة تشغيل الحركة" : "Replay Animation"}
        >
          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground group-hover:-rotate-45 transition-transform duration-300" />
          <span>{isArabic ? "إعادة تشغيل" : "Replay"}</span>
        </button>

        <button
          type="button"
          onClick={onDone}
          className={`flex-1 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
            isMilestone
              ? "bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
              : "bg-primary text-primary-foreground hover:bg-primary/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
          }`}
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>{isArabic ? "تم" : "Done"}</span>
        </button>
      </div>
    </div>
  );
}
