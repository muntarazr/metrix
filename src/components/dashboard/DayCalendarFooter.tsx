"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { HEAT_SURFACE, HEAT_TIERS } from "./DayCalendarCell";

export interface MonthSummaryItem {
  key: string;
  label: string;
  value: string;
  accent: string;
}

export interface DayCalendarFooterProps {
  monthSummaryItems: MonthSummaryItem[];
  lessLabel: string;
  moreLabel: string;
}

export function DayCalendarFooter({
  monthSummaryItems,
  lessLabel,
  moreLabel,
}: DayCalendarFooterProps) {
  return (
    <div className="mt-auto flex flex-wrap min-[360px]:flex-nowrap items-center justify-between gap-1 border-t border-border/40 pt-1.5 overflow-hidden">
      <div className="min-w-0 shrink flex items-center overflow-x-auto no-scrollbar">
        <div className="inline-flex items-center gap-1 rounded-full bg-muted/25 px-1.5 py-0.5 text-[9.5px] min-[360px]:text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap">
          {monthSummaryItems.map((item, index) => (
            <span key={item.key} className="inline-flex items-center gap-1">
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                <span className={cn("font-bold tabular-nums", item.accent)}>
                  {item.value}
                </span>
                <span className="text-muted-foreground">{item.label}</span>
              </span>
              {index < monthSummaryItems.length - 1 && (
                <span
                  aria-hidden="true"
                  className="h-2 w-px shrink-0 rounded-full bg-border/60"
                />
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="inline-flex shrink-0 items-center justify-end gap-1 text-[9.5px] min-[360px]:text-[10px] sm:text-[11px] text-muted-foreground whitespace-nowrap">
        <span>{lessLabel}</span>
        <div className="inline-flex items-center gap-0.5">
          {HEAT_TIERS.map((tier) => (
            <div
              key={tier}
              className={cn(
                "h-2 w-2 rounded-[2px] border sm:h-2.5 sm:w-2.5",
                HEAT_SURFACE[tier],
              )}
            />
          ))}
        </div>
        <span>{moreLabel}</span>
      </div>
    </div>
  );
}
