"use client";

import { cn } from "@/lib/utils";
import type { AICoachInsight } from "@/hooks/useSmartNotifications";

interface AICoachBannerProps {
  insight: AICoachInsight | null;
  isArabic?: boolean;
  onActionClick?: () => void;
  className?: string;
}

export default function AICoachBanner({
  insight,
  isArabic = true,
  className,
}: AICoachBannerProps) {
  if (!insight) return null;

  const isUrgent = insight.tone === "urgent";
  const isCelebratory = insight.tone === "celebratory";

  return (
    <div
      className={cn(
        "relative flex items-center gap-2.5 overflow-hidden rounded-xl border px-3.5 py-2 transition-all duration-300 shadow-2xs backdrop-blur-sm",
        isUrgent
          ? "border-destructive/30 bg-destructive/8 text-destructive-foreground dark:border-destructive/40"
          : isCelebratory
            ? "border-primary/25 bg-primary/6 text-foreground"
            : "border-border/70 bg-card/60 text-foreground",
        className
      )}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Category Tag / Badge */}
      <span
        className={cn(
          "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-tight border",
          isUrgent
            ? "border-destructive/30 bg-destructive/15 text-destructive"
            : isCelebratory
              ? "border-primary/30 bg-primary/15 text-primary"
              : "border-border/80 bg-muted/60 text-muted-foreground"
        )}
      >
        {insight.authorOrTag}
      </span>

      {/* Single-line text */}
      <p className="flex-1 min-w-0 truncate text-xs sm:text-sm font-medium text-foreground/90 leading-normal">
        {insight.quote}
      </p>
    </div>
  );
}
