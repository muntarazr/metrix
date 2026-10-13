'use client';

import { cn } from '@/lib/utils';

interface MetricBoxProps {
  label: string;
  value: string;
  toneClass?: string;
}

export function MetricBox({ label, value, toneClass }: MetricBoxProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-muted/20 px-1.5 sm:px-2.5 py-2 text-center">
      <div className="truncate text-[10px] font-semibold uppercase tracking-normal sm:tracking-[0.14em] rtl:tracking-normal text-muted-foreground">{label}</div>
      <div className={cn('mt-1 truncate text-xs font-bold tabular-nums text-foreground sm:text-base', toneClass)}>{value}</div>
    </div>
  );
}
