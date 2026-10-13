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
    <div className="shrink-0 px-2.5 py-2 sm:px-4 sm:py-2.5 border-b border-border/50 bg-card/30 backdrop-blur-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {/* Sub-navigation Switcher: Tasks, Suggestions, Questions */}
        <div className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex items-center rounded-xl border border-border/70 bg-muted/50 p-1 shadow-xs">
          {sectionTabs.map((tab) => {
            const isActive = focusSection === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectSection(tab.key)}
                className={cn(
                  "inline-flex h-8 sm:h-9 items-center justify-center gap-1 sm:gap-2 rounded-lg px-1 min-[360px]:px-2 sm:px-3.5 min-w-0 sm:min-w-[88px] font-medium transition-all duration-150 cursor-pointer active:scale-95",
                  isActive
                    ? "bg-card text-foreground border border-border/70 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.key === "tasks" ? (
                  <ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-85" />
                ) : tab.key === "suggestions" ? (
                  isSuggestionsLocked ? (
                    <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-70 text-muted-foreground" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-85" />
                  )
                ) : (
                  <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-85" />
                )}
                <span className="truncate text-[11px] min-[360px]:text-xs">
                  {tab.label}
                </span>
                {tab.key === "suggestions" && isSuggestionsLocked && daysUntilSuggestionsUnlock > 0 && (
                  <span className="hidden min-[380px]:inline-flex shrink-0 items-center justify-center rounded-full bg-muted/80 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground tabular-nums border border-border/60">
                    {daysUntilSuggestionsUnlock}d
                  </span>
                )}
                {tab.key === "questions" && !dailyFocus?.answered_at && (
                  <span className="shrink-0 size-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Actions & Status */}
        <div className="flex flex-wrap min-[380px]:flex-nowrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
          {focusSection === "tasks" && manualOrder && onResetToAutoOrder && (
            <button
              type="button"
              onClick={onResetToAutoOrder}
              className="inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/70 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer active:scale-95 shadow-xs touch-manipulation"
              title={t.autoOrderTooltip}
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="hidden min-[380px]:inline whitespace-nowrap">
                {t.autoOrder}
              </span>
            </button>
          )}

          <div className="inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg border border-border/70 bg-muted/50 px-2 sm:px-3 text-xs font-medium text-muted-foreground shadow-xs">
            <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="tabular-nums font-semibold text-foreground">
              {focusStats.completedSubtasks} / {focusStats.totalSubtasks}
            </span>
            <span className="hidden min-[360px]:inline text-[11px] text-muted-foreground/80 font-medium whitespace-nowrap">
              {isArabic ? "مكتمل" : "done"}
            </span>
          </div>

          {focusSection === "tasks" ? (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex h-8 sm:h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 min-[360px]:px-3 sm:px-3.5 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95 bg-primary text-primary-foreground shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:bg-primary/90"
              aria-label={isArabic ? "إضافة مهمة" : "Add Task"}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="whitespace-nowrap">
                {isArabic ? "إضافة مهمة" : "Add Task"}
              </span>
            </button>
          ) : focusSection === "suggestions" ? (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80 sm:hidden">
              {isSuggestionsLocked ? (
                <>
                  <Lock className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="whitespace-nowrap">
                    {daysUntilSuggestionsUnlock > 0
                      ? isArabic
                        ? `${daysUntilSuggestionsUnlock} أيام متبقية`
                        : `${daysUntilSuggestionsUnlock}d remaining`
                      : isArabic
                        ? "قيد المعايرة"
                        : "Calibrating"}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 shrink-0 text-primary opacity-85" />
                  <span className="whitespace-nowrap">
                    {isArabic ? "اقتراحات ذكية" : "Smart suggestions"}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium sm:hidden">
              {dailyFocus?.answered_at ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  <CheckSquare className="h-3 w-3 shrink-0" />
                  <span>{isArabic ? "تمت الإجابة" : "Answered"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground/80 whitespace-nowrap">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  <span>{isArabic ? "سؤال اليوم" : "Today's check-in"}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
