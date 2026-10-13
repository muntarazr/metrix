"use client";

import React from "react";
import { formatNumberEn } from "@/lib/utils";
import type { DayCalendarTooltipData } from "./day-calendar-helpers";

export interface DayCalendarTooltipProps {
  tooltip: DayCalendarTooltipData | null;
  dailyCap: number;
  labels: {
    beforeStart: string;
    futureDay: string;
    noActivity: string;
    logs: string;
    points: string;
  };
}

export function DayCalendarTooltip({
  tooltip,
  dailyCap,
  labels,
}: DayCalendarTooltipProps) {
  if (!tooltip) return null;

  return (
    <div
      className="pointer-events-none fixed z-[200] hidden [@media(hover:hover)_and_(pointer:fine)]:block max-w-[calc(100vw-1rem)] whitespace-nowrap rounded-xl border border-border/70 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg shadow-black/10"
      style={{
        left: `clamp(6.5rem, ${tooltip.x}px, calc(100vw - 6.5rem))`,
        top: tooltip.y,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
    >
      {tooltip.state === "before-start"
        ? `${labels.beforeStart} — ${tooltip.date}`
        : tooltip.state === "future"
          ? `${labels.futureDay} — ${tooltip.date}`
          : tooltip.count > 0
            ? `${formatNumberEn(tooltip.count)} ${labels.logs} · ${formatNumberEn(tooltip.pts)}/${formatNumberEn(dailyCap)} ${labels.points}${tooltip.badgeLabel ? ` · ${tooltip.badgeLabel}` : ""} — ${tooltip.date}`
            : `${labels.noActivity} — ${tooltip.date}`}
    </div>
  );
}
