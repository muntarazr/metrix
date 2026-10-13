"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThoughtLineProps {
  label?: string;
  doneLabel?: string;
  renderLabel?: (text: string, working: boolean) => ReactNode;
  glyph?: "sparkle" | "dot" | "none" | ReactNode;
  steps?: string[];
  activeStepIndex?: number;
  collapsible?: boolean;
  collapseOnSettle?: boolean;
  color?: string;
  glyphColor?: string;
  fontSize?: number;
  breathPeriod?: number;
  breathDepth?: number;
  shimmer?: boolean;
  shimmerDuration?: number;
  settleDuration?: number;
  settleBlur?: number;
  working?: boolean;
  settleAfter?: number;
  elapsed?: number;
  showTimer?: boolean;
  onSettle?: (seconds: number) => void;
  className?: string;
  style?: CSSProperties;
  language?: "ar" | "en";
}

export default function ThoughtLine({
  label = "جاري التحليل...",
  doneLabel,
  renderLabel,
  glyph = "sparkle",
  steps = [],
  activeStepIndex,
  color = "currentColor",
  glyphColor = "var(--primary)",
  fontSize = 13,
  shimmer = true,
  working = true,
  settleAfter = 0,
  elapsed,
  showTimer = true,
  onSettle,
  className = "",
  style,
  language = "ar",
}: ThoughtLineProps) {
  const isArabic = language === "ar";
  const [seconds, setSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (elapsed != null) {
      setSeconds(elapsed);
      return undefined;
    }
    if (!working) {
      onSettle?.(seconds);
      return undefined;
    }

    startTimeRef.current = performance.now();
    const interval = setInterval(() => {
      if (startTimeRef.current !== null) {
        const diff = (performance.now() - startTimeRef.current) / 1000;
        setSeconds(diff);
        if (settleAfter > 0 && diff >= settleAfter) {
          clearInterval(interval);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [working, elapsed, settleAfter, onSettle]);

  // Derive step index and progress percentage
  const currentStep =
    activeStepIndex ?? (steps.length > 0 ? steps.indexOf(label) : -1);
  const totalSteps = steps.length;
  const progressPercent =
    totalSteps > 0
      ? Math.min(
          100,
          Math.round(((Math.max(0, currentStep) + 1) / totalSteps) * 100)
        )
      : working
        ? Math.min(95, Math.round(seconds * 12))
        : 100;

  const defaultDoneText =
    doneLabel || (isArabic ? "اكتمل التحليل" : "Analysis Complete");

  const renderGlyph = () => {
    if (glyph === "none") return null;
    if (glyph === "dot") {
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </span>
      );
    }
    if (glyph === "sparkle") {
      return (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary shadow-2xs">
          {working ? (
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary stroke-[2.2]" />
          ) : (
            <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
          )}
        </span>
      );
    }
    return glyph;
  };

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/75 bg-card/90 dark:bg-card/70 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-2xs relative overflow-hidden flex items-center justify-between gap-2.5 text-start transition-all",
        className
      )}
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        fontSize: `${fontSize}px`,
        ...style,
      }}
    >
      {/* Icon & Active Step Thought */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {renderGlyph()}
        <div className="min-w-0 flex-1">
          {working ? (
            <span
              key={label}
              className={cn(
                "block text-xs font-semibold text-foreground tracking-tight line-clamp-2 sm:truncate whitespace-normal sm:whitespace-nowrap animate-in fade-in duration-200 select-none",
                shimmer &&
                  "bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text"
              )}
            >
              {renderLabel ? renderLabel(label, true) : label}
            </span>
          ) : (
            <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
              {renderLabel
                ? renderLabel(defaultDoneText, false)
                : defaultDoneText}
            </span>
          )}
        </div>
      </div>

      {/* Timer & Step Badge */}
      {showTimer && (
        <div className="shrink-0 flex items-center gap-1.5">
          {totalSteps > 0 && currentStep >= 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums hidden min-[380px]:inline">
              {isArabic
                ? `${currentStep + 1}/${totalSteps}`
                : `${currentStep + 1}/${totalSteps}`}
            </span>
          )}
          <span className="text-[10px] font-bold text-muted-foreground tabular-nums px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 shadow-2xs">
            {seconds.toFixed(1)}
            {isArabic ? "ث" : "s"}
          </span>
        </div>
      )}

      {/* Slim Progress Rail along Bottom Edge */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-muted/60 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            working
              ? "bg-primary shadow-xs shadow-primary/30"
              : "bg-emerald-500"
          )}
          style={{
            width: `${progressPercent}%`,
          }}
        />
      </div>
    </div>
  );
}
