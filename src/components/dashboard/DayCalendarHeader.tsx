"use client";

import React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatNumberEn } from "@/lib/utils";
import { WELL_SURFACE } from "@/lib/surfaces";

export interface MonthPickerItem {
  monthIndex: number;
  label: string;
  isActive: boolean;
}

export interface DayCalendarHeaderProps {
  viewDate: Date;
  today: Date;
  isArabic: boolean;
  monthLabel: string;
  pickerYear: number;
  isMonthPickerOpen: boolean;
  monthPickerItems: MonthPickerItem[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenChange: (open: boolean) => void;
  onPickerYearChange: (updater: (prev: number) => number) => void;
  onSelectMonth: (monthIndex: number) => void;
  onResetToToday?: () => void;
}

export function DayCalendarHeader({
  viewDate,
  today,
  isArabic,
  monthLabel,
  pickerYear,
  isMonthPickerOpen,
  monthPickerItems,
  onPrevMonth,
  onNextMonth,
  onOpenChange,
  onPickerYearChange,
  onSelectMonth,
  onResetToToday,
}: DayCalendarHeaderProps) {
  const isCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  return (
    <div className={cn("rounded-lg p-0.5 sm:p-1", WELL_SURFACE)}>
      <div className="flex items-center gap-1" dir="ltr">
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-8 w-8 md:h-6.5 md:w-6.5 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card text-foreground shadow-xs transition-all hover:bg-muted/80 active:scale-95 cursor-pointer touch-manipulation select-none"
          aria-label={isArabic ? "الشهر السابق" : "Previous month"}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <Popover open={isMonthPickerOpen} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="group flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-center transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-1 focus-visible:ring-offset-card cursor-pointer"
              aria-label={isArabic ? "اختيار شهر" : "Choose month"}
            >
              <span className="truncate text-xs font-semibold tracking-tight text-foreground sm:text-[13px]">
                {monthLabel}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="center"
            className="w-[min(17rem,calc(100vw-1.5rem))] rounded-xl border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onPickerYearChange((current) => current - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
                  aria-label={isArabic ? "السنة السابقة" : "Previous year"}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {formatNumberEn(pickerYear, { useGrouping: false })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onPickerYearChange((current) => current + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
                  aria-label={isArabic ? "السنة التالية" : "Next year"}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {monthPickerItems.map((item) => (
                  <button
                    key={`${pickerYear}-${item.monthIndex}`}
                    type="button"
                    onClick={() => onSelectMonth(item.monthIndex)}
                    className={cn(
                      "min-h-9 rounded-lg px-2 text-[11px] font-medium transition-colors cursor-pointer",
                      item.isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                        : "border border-border bg-muted/20 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {!isCurrentMonth && onResetToToday && (
          <button
            type="button"
            onClick={onResetToToday}
            className="inline-flex h-7 md:h-6.5 shrink-0 items-center rounded-md border border-primary/30 bg-primary/10 px-2 md:px-1.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-all cursor-pointer touch-manipulation select-none"
          >
            {isArabic ? "اليوم" : "Today"}
          </button>
        )}

        <button
          type="button"
          onClick={onNextMonth}
          disabled={isCurrentMonth}
          className="flex h-8 w-8 md:h-6.5 md:w-6.5 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card text-foreground shadow-xs transition-all hover:bg-muted/80 active:scale-95 disabled:pointer-events-none disabled:opacity-30 cursor-pointer touch-manipulation select-none"
          aria-label={isArabic ? "الشهر التالي" : "Next month"}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
