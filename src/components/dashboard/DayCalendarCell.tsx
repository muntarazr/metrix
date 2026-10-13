"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/translations";
import {
  heatTier,
  getDayBadgeLabel,
  HEAT_SURFACE,
  HEAT_TEXT,
  HEAT_TODAY_RING,
  type CalendarCell,
  type DayCalendarTooltipData,
} from "./day-calendar-helpers";

export * from "./day-calendar-helpers";

export interface DayCalendarCellProps {
  day: CalendarCell | null;
  index: number;
  selectedDate: string | null;
  dailyCap: number;
  language?: Language;
  isArabic: boolean;
  logsLabel: string;
  noActivityLabel: string;
  onSelectDate: (date: string | null) => void;
  onSetTooltip: (tooltip: DayCalendarTooltipData) => void;
  onClearTooltip: () => void;
}

export function DayCalendarCell({
  day,
  index,
  selectedDate,
  dailyCap,
  language = "ar",
  isArabic,
  logsLabel,
  noActivityLabel,
  onSelectDate,
  onSetTooltip,
  onClearTooltip,
}: DayCalendarCellProps) {
  if (!day) {
    return (
      <div
        key={`blank-${index}`}
        className="h-8 min-[400px]:h-8.5 sm:h-8 md:h-full w-full rounded-md sm:rounded-lg bg-transparent"
        aria-hidden="true"
      />
    );
  }

  const isSelectable = !day.isBeforeStart && !day.isAfterToday;
  const isSelected = selectedDate === day.date;
  const tier = heatTier(day.totalPoints, dailyCap, day.hasLogs);
  const state = day.isBeforeStart
    ? "before-start"
    : day.isAfterToday
      ? "future"
      : "active";
  const badgeLabel = getDayBadgeLabel(day.badge, language);

  return (
    <button
      key={day.date}
      type="button"
      onClick={() =>
        isSelectable &&
        onSelectDate(isSelected ? null : day.date)
      }
      onMouseEnter={(event) => {
        if (
          typeof window !== "undefined" &&
          !window.matchMedia("(hover: hover) and (pointer: fine)").matches
        ) {
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        onSetTooltip({
          date: day.date,
          count: day.logCount,
          pts: day.totalPoints,
          x: rect.left + rect.width / 2,
          y: rect.top,
          state,
          badgeLabel: day.isFrozen
            ? isArabic
              ? "❄️ يوم راحة تكتيكي"
              : "❄️ Tactical Rest Day"
            : badgeLabel,
        });
      }}
      onMouseLeave={onClearTooltip}
      className={cn(
        "group relative flex h-8 min-[400px]:h-8.5 sm:h-8 md:h-full w-full flex-col items-center justify-center rounded-md sm:rounded-lg border transition-all duration-200 select-none touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
        day.isFrozen
          ? "border-sky-400/50 bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-400/30"
          : day.isBeforeStart || day.isAfterToday
            ? "border-border/30 bg-muted/10 text-muted-foreground/40 cursor-default"
            : HEAT_SURFACE[tier],
        day.isToday &&
          !isSelected &&
          !day.isBeforeStart &&
          cn(HEAT_TODAY_RING[tier], "shadow-xs font-bold"),
        isSelectable &&
          "hover:scale-[1.05] hover:shadow-xs hover:z-10 active:scale-95 cursor-pointer",
        isSelected &&
          "scale-[1.04] ring-2 ring-primary ring-offset-1 ring-offset-card z-10 shadow-sm",
        day.badge === "strong" &&
          !day.isBeforeStart &&
          !day.isAfterToday &&
          "shadow-xs shadow-chart-2/25",
        day.badge === "exceptional" &&
          !day.isBeforeStart &&
          !day.isAfterToday &&
          "shadow-sm shadow-primary/30",
      )}
      aria-label={`${day.date} ${day.isFrozen ? "Tactical Rest Day" : day.logCount > 0 ? `${day.logCount} ${logsLabel}` : noActivityLabel}${badgeLabel ? ` ${badgeLabel}` : ""}`}
    >
      <span
        className={cn(
          "text-xs font-semibold tabular-nums leading-none min-[400px]:text-sm sm:text-base",
          day.isFrozen
            ? "text-sky-700 dark:text-sky-300 font-extrabold"
            : day.isBeforeStart || day.isAfterToday
              ? "text-muted-foreground/40 font-normal"
              : HEAT_TEXT[tier],
          day.isToday && "text-primary font-bold",
        )}
      >
        {day.dayNum}
      </span>
    </button>
  );
}
