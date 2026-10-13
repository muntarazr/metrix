"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PANEL_SURFACE, WELL_SURFACE } from "@/lib/surfaces";

export function DayCalendarSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-2xl p-2 sm:p-2.5 md:p-3",
        PANEL_SURFACE,
        className,
      )}
    >
      <div className={cn("rounded-lg p-0.5 sm:p-1", WELL_SURFACE)}>
        <div className="flex items-center gap-1" dir="ltr">
          <div className="h-6.5 w-6.5 shrink-0 rounded-md bg-muted/60 animate-pulse" />
          <div className="mx-auto h-4 w-20 rounded-md bg-muted/60 animate-pulse" />
          <div className="h-6.5 w-6.5 shrink-0 rounded-md bg-muted/60 animate-pulse" />
        </div>
      </div>
      <div className="mt-1 flex flex-1 flex-col min-h-0 sm:mt-1.5">
        <div className="mb-1 grid grid-cols-7 gap-0.5 rounded-lg border border-border/45 bg-muted/12 p-0.5 sm:mb-1.5 sm:gap-1 sm:p-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-5 rounded-md bg-muted/20 animate-pulse sm:h-6"
            />
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-0.5 min-h-0 sm:gap-1 md:h-full">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="h-6.5 min-[400px]:h-7 sm:h-7.5 md:h-full w-full rounded-md sm:rounded-lg bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
