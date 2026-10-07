"use client";

import { Check, Target, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskProgressRingProps {
  progress: number; // 0 to 100
  size?: number; // px, default 34
  strokeWidth?: number; // px, default 3
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
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (normalizedProgress / 100) * circumference;
  const completed = isCompleted || progress >= 100;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center select-none rounded-full transition-all duration-300",
        isOverachiever && "ring-2 ring-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.45)] animate-pulse",
        className,
      )}
      style={{ width: size, height: size }}
      title={`${Math.round(progress)}%`}
      aria-label={`Progress: ${Math.round(progress)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90 pointer-events-none"
      >
        {/* Track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40 dark:text-muted/20"
        />
        {/* Progress arc */}
        {normalizedProgress > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-300 ease-out",
              isOverachiever
                ? "text-purple-500"
                : completed
                  ? "text-emerald-500"
                  : "text-primary",
            )}
          />
        )}
      </svg>
      {/* Centered Icon or Content */}
      <div className="relative z-10 flex items-center justify-center">
        {completed ? (
          <Check className={cn(
            "h-3.5 w-3.5 stroke-[2.5]",
            isOverachiever ? "text-purple-500" : "text-emerald-500"
          )} />
        ) : icon ? (
          icon
        ) : normalizedProgress > 0 ? (
          <span className="text-[10px] font-black tabular-nums text-foreground">
            {Math.round(normalizedProgress)}%
          </span>
        ) : (
          <ListTodo className="h-3.5 w-3.5 text-muted-foreground/70 stroke-[2]" />
        )}
      </div>
    </div>
  );
}
