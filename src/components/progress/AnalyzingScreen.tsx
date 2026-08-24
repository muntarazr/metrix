"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/translations";

/**
 * The screen shown while a log is being evaluated.
 *
 * Every line here is composed locally from numbers the client already has —
 * the word count of what was typed, the size of the plan, how many days of
 * history exist. Nothing is generated, nothing is fetched: this costs zero
 * Gemini quota and adds zero latency to the single evaluate call already in
 * flight. It is narration over real work, not a second round trip.
 *
 * The final step never reports success on a timer. It keeps spinning until the
 * request actually resolves and the parent unmounts this screen, so the UI can
 * never claim a verdict that has not arrived.
 */

/** How long each completed step lingers before the next one starts. */
const STEP_DURATION_MS = 850;

interface AnalyzingScreenProps {
  language: Language;
  /** What the user typed — only its length is used. */
  logText: string;
  /** Scorable tasks in the plan. */
  taskCount: number;
  /**
   * Distinct days already logged for this goal, or null while that is still
   * being fetched. Null renders a neutral line — the screen must never claim
   * "this is your first measurement" to someone with a week of history just
   * because the count has not landed yet.
   */
  historyDays: number | null;
  variant?: "log" | "milestone";
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function AnalyzingScreen({
  language,
  logText,
  taskCount,
  historyDays,
  variant = "log",
}: AnalyzingScreenProps) {
  const isArabic = language === "ar";

  const steps = useMemo(() => {
    const words = countWords(logText);

    if (variant === "milestone") {
      return isArabic
        ? [
            `نقرا وصف الإنجاز — ${words} كلمة`,
            "نقيس وزنه مقابل حجم هدفك",
            "نحدد مستوى الإنجاز",
            "نجهّز البطاقة",
          ]
        : [
            `Reading the milestone — ${words} words`,
            "Weighing it against the size of your goal",
            "Deciding the milestone tier",
            "Preparing the card",
          ];
    }

    const comparison =
      historyDays === null
        ? isArabic
          ? "نقارن مع سجلك السابق"
          : "Comparing against your history"
        : historyDays > 0
          ? isArabic
            ? `نقارن مع آخر ${historyDays} أيام مسجّلة`
            : `Comparing against your last ${historyDays} logged days`
          : isArabic
            ? "نبني خط الأساس مالتك — هذا أول قياس"
            : "Building your baseline — this is the first measurement";

    return isArabic
      ? [
          `نقرا سجلك — ${words} كلمة`,
          `نطابقه مع ${taskCount} مهمة بخطتك`,
          "نوزّع النقاط حسب وزن كل مهمة",
          comparison,
          "نجهّز النتيجة",
        ]
      : [
          `Reading your log — ${words} words`,
          `Matching it against ${taskCount} tasks in your plan`,
          "Weighting the points task by task",
          comparison,
          "Preparing the verdict",
        ];
  }, [historyDays, isArabic, logText, taskCount, variant]);

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Stop on the last step and hold there — the parent unmounts this screen
    // when the real response lands.
    if (activeStep >= steps.length - 1) return;

    const timer = window.setTimeout(
      () => setActiveStep((current) => current + 1),
      STEP_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [activeStep, steps.length]);

  return (
    <div
      className="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary/8 motion-safe:animate-ping" />
          <span className="absolute inset-0 rounded-full border border-primary/15" />
          <Loader2 className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none" />
        </div>
        <p className="mt-4 text-base font-extrabold tracking-tight text-foreground">
          {variant === "milestone"
            ? isArabic
              ? "نقيّم الإنجاز"
              : "Evaluating the milestone"
            : isArabic
              ? "نحلل يومك"
              : "Analysing your day"}
        </p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground/75">
          {isArabic ? "ثوانٍ معدودة" : "This takes a few seconds"}
        </p>
      </div>

      <ol className="space-y-2.5">
        {steps.map((step, index) => {
          const isDone = index < activeStep;
          const isActive = index === activeStep;

          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-300",
                isDone && "border-border/70 bg-muted/20",
                isActive && "border-primary/25 bg-primary/12 shadow-sm",
                !isDone && !isActive && "border-transparent",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                  isDone && "border-primary/25 bg-primary/12 text-primary",
                  isActive && "border-primary/25 bg-primary/12 text-primary",
                  !isDone && !isActive && "border-border/70 text-muted-foreground/50",
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>

              <span
                className={cn(
                  "min-w-0 flex-1 text-[13px] font-semibold leading-snug transition-colors duration-300",
                  isDone && "text-muted-foreground/75",
                  isActive && "text-foreground",
                  !isDone && !isActive && "text-muted-foreground/50",
                )}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
