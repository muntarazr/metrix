'use client';

import { cn, formatNumberEn } from '@/lib/utils';

interface GoalProgressBarProps {
  currentPoints: number;
  targetPoints: number;
  progress: number;
  className?: string;
  labelClassName?: string;
  currentClassName?: string;
  percentClassName?: string;
  targetClassName?: string;
  showXpLabel?: boolean;
}

export default function GoalProgressBar({
  currentPoints,
  targetPoints,
  progress,
  className,
  labelClassName = 'px-2 sm:px-5 text-[10px] sm:text-sm',
  currentClassName,
  percentClassName = 'text-xs sm:text-base',
  targetClassName,
  showXpLabel = false,
}: GoalProgressBarProps) {
  const fillWidth = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={cn(
        'relative h-9 sm:h-10 w-full overflow-hidden rounded-full border-2 border-border/80 bg-muted/50 shadow-inner',
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fillWidth)}
      aria-label={`${formatNumberEn(currentPoints)} of ${formatNumberEn(targetPoints)}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[40%] bg-gradient-to-b from-white/20 to-transparent"
      />
      <div
        className="relative h-full rounded-full bg-gradient-to-r from-primary/80 via-primary to-primary transition-all duration-700 ease-out shadow-[0_2px_0_0_rgba(255,255,255,0.2)_inset]"
        style={{ width: `${fillWidth}%` }}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/[0.18] via-white/[0.05] to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[url('/patterns/waves.svg')] bg-center bg-repeat-x bg-[length:120px_28px] opacity-[0.28]"
        />
        <div
          aria-hidden
          className="absolute end-0 top-0 bottom-0 w-[2px] bg-white/30 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
        />
      </div>

      <div
        className={cn(
          'absolute inset-0 z-20 flex items-center justify-between font-semibold tracking-wide',
          labelClassName
        )}
        dir="ltr"
      >
        <span
          className={cn(
            'text-foreground/90 tabular-nums flex min-w-0 max-w-[32%] items-center gap-1 text-xs sm:text-sm',
            currentClassName
          )}
        >
          <span className="truncate">{formatNumberEn(currentPoints)}</span>
          {showXpLabel && (
            <span className="shrink-0 text-[9px] sm:text-[10px] font-medium opacity-60">XP</span>
          )}
        </span>
        <span
          className={cn(
            'shrink-0 font-bold text-foreground/90 tabular-nums',
            percentClassName
          )}
        >
          {progress}%
        </span>
        <span
          className={cn(
            'text-foreground/90 tabular-nums flex min-w-0 max-w-[32%] items-center justify-end text-xs sm:text-sm',
            targetClassName
          )}
        >
          <span className="truncate">{formatNumberEn(targetPoints)}</span>
        </span>
      </div>
    </div>
  );
}
