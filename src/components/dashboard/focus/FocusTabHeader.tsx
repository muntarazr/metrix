"use client";

import React from "react";
import {
  ListTodo,
  Sparkles,
  HelpCircle,
  CheckSquare,
  Plus,
  Lock,
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
}: FocusTabHeaderProps) {
  const sectionTabs = [
    { key: "tasks" as const, label: t.focusTasksTab },
    { key: "suggestions" as const, label: t.focusSuggestionsTab },
    { key: "questions" as const, label: t.focusQuestionsTab },
  ];

  return (
    <div className="shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 border-b border-border/50 bg-card/30 backdrop-blur-xs">
      <div className="flex items-center justify-between gap-2 sm:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Sub-navigation Switcher: Tasks, Suggestions, Questions */}
        <div className="inline-flex shrink-0 items-center rounded-xl border border-border/70 bg-muted/50 p-1 shadow-xs">
          {sectionTabs.map((tab) => {
            const isActive = focusSection === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectSection(tab.key)}
                className={cn(
                  "inline-flex h-8 sm:h-9 items-center justify-center gap-1 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 min-w-[72px] sm:min-w-[96px] text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95",
                  isActive
                    ? "bg-card text-foreground border border-border/70 shadow-xs"
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
                <span>{tab.label}</span>
                {tab.key === "suggestions" && isSuggestionsLocked && daysUntilSuggestionsUnlock > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-muted/80 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground tabular-nums border border-border/60">
                    {daysUntilSuggestionsUnlock}d
                  </span>
                )}
                {tab.key === "questions" && !dailyFocus?.answered_at && (
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg border border-border/70 bg-muted/50 px-2.5 sm:px-3 text-xs font-medium text-muted-foreground shadow-xs">
            <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="tabular-nums font-semibold text-foreground">
              {focusStats.completedSubtasks} / {focusStats.totalSubtasks}
            </span>
            <span className="hidden md:inline text-[11px] text-muted-foreground/80 font-medium">
              {isArabic ? "مكتمل" : "done"}
            </span>
          </div>

          {focusSection === "tasks" && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex h-8 sm:h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 sm:px-3.5 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95 bg-primary text-primary-foreground shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:bg-primary/90"
              aria-label={isArabic ? "إضافة مهمة" : "Add Task"}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">
                {isArabic ? "إضافة مهمة" : "Add Task"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
