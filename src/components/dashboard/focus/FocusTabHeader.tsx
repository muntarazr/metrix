"use client";

import React from "react";
import {
  ListTodo,
  Sparkles,
  HelpCircle,
  CheckSquare,
  Plus,
  Lock,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyFocusSession } from "@/lib/daily-focus";
import { AiChipIcon } from "@/components/ui/AiChipIcon";

export interface FocusTabHeaderProps {
  focusSection: "tasks" | "suggestions" | "questions";
  onSelectSection: (section: "tasks" | "suggestions" | "questions") => void;
  focusStats: { totalSubtasks: number; completedSubtasks: number };
  dailyFocus: DailyFocusSession | null;
  isArabic: boolean;
  t: any;
  onOpenAddModal: () => void;
  isSuggestionsLocked?: boolean;
  daysUntilSuggestionsUnlock?: number;
  manualOrder?: boolean;
  onResetToAutoOrder?: () => void;
}

export function FocusTabHeader({
  focusSection,
  onSelectSection,
  focusStats,
  dailyFocus,
  isArabic,
  t,
  onOpenAddModal,
  isSuggestionsLocked = false,
  daysUntilSuggestionsUnlock = 0,
  manualOrder = false,
  onResetToAutoOrder,
}: FocusTabHeaderProps) {
  const sectionTabs = [
    { key: "tasks" as const, label: t.focusTasksTab },
    { key: "suggestions" as const, label: t.focusSuggestionsTab },
    { key: "questions" as const, label: t.focusQuestionsTab },
  ];

  return (
    <div className="shrink-0 px-2 py-1 min-[360px]:px-2.5 min-[360px]:py-1.5 sm:px-4 sm:py-2 border-b border-border/50 bg-card/30 backdrop-blur-xs">
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Sub-navigation Switcher: Tasks, Suggestions, Questions */}
        <div className="flex-1 min-w-0 sm:flex-initial inline-flex items-center rounded-lg sm:rounded-xl border border-border/50 bg-background/60 p-0.5 sm:p-1 gap-1 shadow-xs backdrop-blur-sm">
          {sectionTabs.map((tab) => {
            const isActive = focusSection === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectSection(tab.key)}
                className={cn(
                  "inline-flex flex-1 sm:flex-initial h-6.5 min-[360px]:h-7 sm:h-7.5 items-center justify-center gap-1 sm:gap-1.5 rounded-md sm:rounded-lg px-2 sm:px-2.5 min-w-0 font-medium text-[10.5px] min-[360px]:text-[11px] sm:text-xs transition-all duration-200 cursor-pointer select-none active:scale-95 touch-manipulation",
                  isActive
                    ? tab.key === "tasks"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20"
                      : tab.key === "suggestions"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30 shadow-xs"
                      : "bg-sky-500/15 text-sky-700 dark:text-sky-400 font-semibold border border-sky-500/30 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
                )}
              >
                {tab.key === "tasks" ? (
                  <ListTodo className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 transition-transform", isActive && "scale-105")} />
                ) : tab.key === "suggestions" ? (
                  isSuggestionsLocked ? (
                    <AiChipIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 opacity-80" />
                  ) : (
                    <Sparkles className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 transition-transform", isActive ? "text-amber-500 scale-105" : "opacity-80")} />
                  )
                ) : (
                  <HelpCircle className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 transition-transform", isActive ? "text-sky-500 scale-105" : "opacity-80")} />
                )}
                <span className="truncate">
                  {tab.label}
                </span>
                {tab.key === "suggestions" && isSuggestionsLocked && daysUntilSuggestionsUnlock > 0 && (
                  <span className="hidden min-[420px]:inline-flex shrink-0 items-center justify-center rounded-full bg-muted/80 px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground tabular-nums border border-border/60">
                    {daysUntilSuggestionsUnlock}d
                  </span>
                )}
                {tab.key === "questions" && !dailyFocus?.answered_at && (
                  <span className={cn("shrink-0 size-1.5 rounded-full animate-pulse", isActive ? "bg-sky-400" : "bg-primary")} />
                )}
              </button>
            );
          })}
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2 shrink-0">
          {focusSection === "tasks" && manualOrder && onResetToAutoOrder && (
            <button
              type="button"
              onClick={onResetToAutoOrder}
              className="inline-flex h-6.5 min-[360px]:h-7 sm:h-8 shrink-0 items-center justify-center gap-1 rounded-md sm:rounded-lg border border-border/70 bg-card/60 hover:bg-muted/70 px-1.5 min-[360px]:px-2 sm:px-2.5 text-[10px] min-[360px]:text-[10.5px] sm:text-[11.5px] font-semibold text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer active:scale-95 shadow-xs touch-manipulation"
              title={t.autoOrderTooltip}
            >
              <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">
                {t.autoOrder}
              </span>
            </button>
          )}

          <div
            className="inline-flex h-6.5 min-[360px]:h-7 sm:h-8 shrink-0 items-center gap-1 rounded-md sm:rounded-lg border border-border/70 bg-muted/50 px-1.5 min-[360px]:px-2 sm:px-2.5 text-[10.5px] min-[360px]:text-[11px] sm:text-xs font-medium text-muted-foreground shadow-xs"
            title={isArabic ? `${focusStats.completedSubtasks} من ${focusStats.totalSubtasks} مكتمل` : `${focusStats.completedSubtasks} / ${focusStats.totalSubtasks} completed`}
          >
            <CheckSquare className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
            <span className="tabular-nums font-semibold text-foreground text-[10px] min-[360px]:text-[11px] sm:text-xs">
              {focusStats.completedSubtasks}/{focusStats.totalSubtasks}
            </span>
            <span className="hidden min-[480px]:inline text-[10.5px] sm:text-[11px] text-muted-foreground/80 font-medium whitespace-nowrap">
              {isArabic ? "مكتمل" : "done"}
            </span>
          </div>

          {focusSection === "tasks" ? (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex h-6.5 w-6.5 min-[360px]:h-7 min-[360px]:w-7 sm:h-8 sm:w-auto shrink-0 items-center justify-center sm:gap-1.5 rounded-md sm:rounded-lg sm:px-2.5 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95 bg-primary text-primary-foreground shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:bg-primary/90"
              aria-label={isArabic ? "إضافة مهمة" : "Add Task"}
              title={isArabic ? "إضافة مهمة" : "Add Task"}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">
                {isArabic ? "إضافة مهمة" : "Add Task"}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
