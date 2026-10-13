"use client";

import { Check, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskProgressRingProps {
  progress: number; // 0 to 100
  size?: number; // px, default 36
  strokeWidth?: number; // px, default 3.5
  isCompleted?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export default function TaskProgressRing({
  progress,
  size = 36,
  strokeWidth = 3.5,
  isCompleted = false,
  className,
  icon,
}: TaskProgressRingProps) {
  const isOverachiever = progress > 100;
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const completed = isCompleted || progress >= 100;

  // 4-segment dashed ring geometry
  const SEGMENTS_COUNT = 4;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const quadrant = circumference / SEGMENTS_COUNT;
  const gap = Math.max(2.2, strokeWidth * 0.85);
  const visualSegmentLength = quadrant - gap;
  const strokeDashLength = Math.max(0.001, visualSegmentLength - strokeWidth);

  const segmentOffsets = [0, 1, 2, 3].map((i) => {
    const visualStart = i * quadrant + gap / 2;
    return visualStart + strokeWidth / 2;
  });

  const progressColorClass = isOverachiever
    ? "text-purple-500"
    : completed
      ? "text-emerald-500"
      : normalizedProgress >= 65
        ? "text-primary"
        : normalizedProgress >= 35
          ? "text-sky-500"
          : "text-amber-500";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center select-none rounded-full transition-all duration-300",
        isOverachiever &&
          "ring-2 ring-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.45)] animate-pulse",
        className,
      )}
      style={{ width: size, height: size }}
      title={
        completed
          ? "100%"
          : `${Math.round(normalizedProgress)}%`
      }
      aria-label={
        completed
          ? "Progress: 100%"
          : `Progress: ${Math.round(normalizedProgress)}%`
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90 pointer-events-none"
      >
        {/* Track segments (4 parts) */}
        {segmentOffsets.map((offset, i) => (
          <circle
            key={`track-${i}`}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${strokeDashLength} ${circumference - strokeDashLength}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            className="text-muted/40 dark:text-muted/20"
          />
        ))}

        {/* Progress segments (4 parts) */}
        {(completed || normalizedProgress > 0) &&
          segmentOffsets.map((offset, i) => {
            const segMin = i * 25;
            const segMax = (i + 1) * 25;
            const effectiveVal = completed ? 100 : normalizedProgress;
            const fraction =
              effectiveVal >= segMax
                ? 1
                : effectiveVal <= segMin
                  ? 0
                  : (effectiveVal - segMin) / 25;

            if (fraction <= 0) return null;

            const fillVisual = fraction * visualSegmentLength;
            const fillDash = Math.max(0.001, fillVisual - strokeWidth);

            return (
              <circle
                key={`progress-${i}`}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={`${fillDash} ${circumference - fillDash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-300 ease-out",
                  progressColorClass,
                )}
              />
            );
          })}
      </svg>

      {/* Centered Icon or Content */}
      <div className="relative z-10 flex items-center justify-center">
        {completed ? (
          <Check
            className={cn(
              "stroke-[2.5]",
              size >= 34 ? "h-3.5 w-3.5" : "h-2.5 w-2.5",
              isOverachiever ? "text-purple-500" : "text-emerald-500",
            )}
          />
        ) : icon ? (
          icon
        ) : (
          <ListTodo
            className={cn(
              "text-muted-foreground/70 stroke-[2]",
              size >= 34 ? "h-3.5 w-3.5" : "h-2.5 w-2.5",
            )}
          />
        )}
      </div>
    </div>
  );
}
