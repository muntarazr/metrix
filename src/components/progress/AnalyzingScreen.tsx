"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/translations";
import ThoughtLine from "@/components/shared/ThoughtLine";

interface AnalyzingScreenProps {
  language: Language;
  /** What the user typed — only its length is used. */
  logText: string;
  /** Scorable tasks in the plan. */
  taskCount: number;
  /**
   * Distinct days already logged for this goal, or null while that is still
   * being fetched.
   */
  historyDays: number | null;
  variant?: "log" | "milestone";
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Pacing duration (ms) for each step before advancing to next thought */
const STEP_PACING_MS = 1250;

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
            `قراءة وصف الإنجاز (${words} كلمة)...`,
            "قياس الوزن مقابل حجم الهدف...",
            "تحديد مستوى وتأثير الإنجاز...",
            "صياغة التقييم وبطاقة النتيجة...",
          ]
        : [
            `Reading milestone description (${words} words)...`,
            "Weighing it against goal size...",
            "Deciding milestone tier and impact...",
            "Preparing evaluation card...",
          ];
    }

    const comparison =
      historyDays === null
        ? isArabic
          ? "مقارنة الأداء مع السجل السابق..."
          : "Comparing against your history..."
        : historyDays > 0
          ? isArabic
            ? `مقارنة الأداء مع آخر ${historyDays} أيام...`
            : `Comparing against last ${historyDays} logged days...`
          : isArabic
            ? "بناء خط الأساس الأولي لهدفك..."
            : "Building initial baseline...";

    return isArabic
      ? [
          `قراءة وتحليل مدخلاتك (${words} كلمة)...`,
          `مطابقة الأنشطة مع ${taskCount} مهمة بخطتك...`,
          "تقييم الأثر واحتساب النقاط المستحقة...",
          comparison,
          "تجهيز التقرير والنتيجة النهائية...",
        ]
      : [
          `Reading your check-in (${words} words)...`,
          `Matching activities with ${taskCount} tasks...`,
          "Evaluating impact and scoring tasks...",
          comparison,
          "Preparing verdict and feedback...",
        ];
  }, [historyDays, isArabic, logText, taskCount, variant]);

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Hold on the last step until the parent unmounts this screen
    if (activeStep >= steps.length - 1) return;

    const timer = window.setTimeout(() => {
      setActiveStep((current) => Math.min(current + 1, steps.length - 1));
    }, STEP_PACING_MS);

    return () => window.clearTimeout(timer);
  }, [activeStep, steps.length]);

  const currentLabel = steps[activeStep] || steps[0];

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-6 sm:py-8 text-center"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Ambient Glowing Orb */}
      <div className="relative mb-3 flex h-12 w-12 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg animate-pulse" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 shadow-sm shadow-primary/10">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </div>
      </div>

      {/* Heading */}
      <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
        {variant === "milestone"
          ? isArabic
            ? "تقييم الإنجاز الاستثنائي"
            : "Evaluating Milestone"
          : isArabic
            ? "جاري التحليل بالذكاء الاصطناعي"
            : "Analyzing with AI"}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground/80 font-medium">
        {isArabic
          ? "يتم الآن فحص ما حققته وتحديث أثر خطتك..."
          : "Processing your log and calculating impact..."}
      </p>

      {/* Compact Cohesive AI ThoughtLine */}
      <div className="mt-4 w-full max-w-sm sm:max-w-md">
        <ThoughtLine
          working={true}
          label={currentLabel}
          steps={steps}
          activeStepIndex={activeStep}
          language={language}
          glyph="sparkle"
          glyphColor="var(--primary)"
          fontSize={13}
          shimmer={true}
          showTimer={true}
        />
      </div>
    </div>
  );
}
