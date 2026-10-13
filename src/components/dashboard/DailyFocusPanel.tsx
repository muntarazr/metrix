"use client";

import type { Language } from "@/lib/translations";
import type {
  DailyFocusHistoryItem,
  DailyFocusSession,
} from "@/lib/daily-focus";
import {
  DailyFocusSuggestionsList,
  DailyFocusQuestionSection,
  DailyFocusHistorySection,
} from "./daily-focus";

interface DailyFocusPanelProps {
  mode?: "suggestions" | "questions";
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  dailyFocusHistory?: DailyFocusHistoryItem[];
  missedDailyFocusHistory?: DailyFocusHistoryItem[];
  loading: boolean;
  submitting: boolean;
  tasks?: Array<{
    id: string;
    task_description: string;
    completion_criteria?: string | null;
    time_required_minutes?: number | null;
    frequency?: string | null;
    impact_weight?: number | null;
    schedule_days?: number[] | null;
  }>;
  addingSuggestionId: string | null;
  error: string | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  onAnswerSubmit: () => void;
  onAppendTranscript: (text: string) => void;
  onAddSuggestion: (suggestionId: string) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
  onUndoRejectSuggestion?: (suggestionId: string) => void;
  onNavigateToSection?: (section: "tasks" | "suggestions" | "questions") => void;
  isSuggestionsLocked?: boolean;
  daysUntilSuggestionsUnlock?: number;
  daysPassedSinceGoalCreation?: number;
}

export default function DailyFocusPanel({
  mode = "suggestions",
  language = "ar",
  isArabic,
  dailyFocus,
  dailyFocusHistory = [],
  missedDailyFocusHistory = [],
  loading,
  submitting,
  tasks = [],
  addingSuggestionId,
  error,
  answer,
  onAnswerChange,
  onAnswerSubmit,
  onAppendTranscript,
  onAddSuggestion,
  onRejectSuggestion,
  onUndoRejectSuggestion,
  onNavigateToSection,
  isSuggestionsLocked = false,
  daysUntilSuggestionsUnlock = 0,
  daysPassedSinceGoalCreation = 0,
}: DailyFocusPanelProps) {
  if (mode === "suggestions") {
    return (
      <DailyFocusSuggestionsList
        language={language}
        isArabic={isArabic}
        dailyFocus={dailyFocus}
        tasks={tasks}
        addingSuggestionId={addingSuggestionId}
        onAddSuggestion={onAddSuggestion}
        onRejectSuggestion={onRejectSuggestion}
        onUndoRejectSuggestion={onUndoRejectSuggestion}
        onNavigateToSection={onNavigateToSection}
        isSuggestionsLocked={isSuggestionsLocked}
        daysUntilSuggestionsUnlock={daysUntilSuggestionsUnlock}
        daysPassedSinceGoalCreation={daysPassedSinceGoalCreation}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" dir={isArabic ? "rtl" : "ltr"}>
      <DailyFocusQuestionSection
        language={language}
        isArabic={isArabic}
        dailyFocus={dailyFocus}
        loading={loading}
        submitting={submitting}
        error={error}
        answer={answer}
        onAnswerChange={onAnswerChange}
        onAnswerSubmit={onAnswerSubmit}
        onAppendTranscript={onAppendTranscript}
      />

      <DailyFocusHistorySection
        language={language}
        isArabic={isArabic}
        dailyFocusHistory={dailyFocusHistory}
        missedDailyFocusHistory={missedDailyFocusHistory}
      />
    </div>
  );
}
