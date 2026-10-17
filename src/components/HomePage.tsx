"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Language } from "@/lib/translations";
import type { GoalTaskStats } from "@/app/page";
import { BrandLockup } from "@/components/brand/Logo";
import { createClient } from "@/utils/supabase/client";
import { useHomeDailyFocus } from "@/hooks/useHomeDailyFocus";
import ProgressLogDialog from "./progress/ProgressLogDialog";
import type { TaskRow } from "@/lib/task-hierarchy";
import HomeInputSection from "./home/HomeInputSection";
import HomeGoalsSection from "./home/HomeGoalsSection";
import type { Goal, HomePageProps } from "./home/HomeTypes";

export type { Goal, HomePageProps };

/* ------------------------------------------------------------------ */
/*  HomePage component                                                 */
/* ------------------------------------------------------------------ */

export default function HomePage({
  goals,
  taskStatsMap = {},
  onSelectGoal,
  onNavigateToCreate,
  onGoalUpdated,
  language = "ar",
  recentGoalsLimit = 6,
  activeBoxMode,
  onBoxModeChange,
  focusInputSignal,
}: HomePageProps) {
  const [goalInput, setGoalInput] = useState("");
  const isArabic = language === "ar";
  const safeRecentGoalsLimit = Math.max(1, recentGoalsLimit);
  const recentGoals = useMemo(
    () => goals.slice(0, safeRecentGoalsLimit),
    [goals, safeRecentGoalsLimit]
  );

  /* ---- Dual-mode box state ---- */
  const [boxModePref, setBoxModePref] = useState<"new" | "log" | null>(activeBoxMode ?? null);

  useEffect(() => {
    if (activeBoxMode) {
      setBoxModePref(activeBoxMode);
    }
  }, [activeBoxMode, focusInputSignal]);

  const handleBoxModeChange = useCallback((mode: "new" | "log") => {
    setBoxModePref(mode);
    onBoxModeChange?.(mode);
  }, [onBoxModeChange]);

  const boxMode: "new" | "log" =
    goals.length === 0 ? "new" : (boxModePref ?? "log");

  const [selectedLogGoalId, setSelectedLogGoalId] = useState<string | null>(null);
  const [selectedLogGoalIds, setSelectedLogGoalIds] = useState<string[]>([]);

  const selectedLogGoals = useMemo(
    () => goals.filter((g) => selectedLogGoalIds.includes(g.id)),
    [goals, selectedLogGoalIds]
  );

  const selectedLogGoal = useMemo(
    () => goals.find((g) => g.id === selectedLogGoalId) || null,
    [goals, selectedLogGoalId]
  );

  const toggleGoalSelection = useCallback((goalId: string) => {
    setSelectedLogGoalIds((prev) => {
      const isAlreadySelected = prev.includes(goalId);
      const next = isAlreadySelected
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId];
      if (next.length === 1) {
        setSelectedLogGoalId(next[0]);
      } else if (next.length === 0) {
        setSelectedLogGoalId(null);
      } else {
        setSelectedLogGoalId(next[0]);
      }
      return next;
    });
  }, []);

  const toggleSelectAllGoals = useCallback(() => {
    if (selectedLogGoalIds.length === goals.length) {
      setSelectedLogGoalIds([]);
      setSelectedLogGoalId(null);
    } else {
      setSelectedLogGoalIds(goals.map((g) => g.id));
      setSelectedLogGoalId(goals[0]?.id || null);
    }
  }, [goals, selectedLogGoalIds.length]);

  useEffect(() => {
    if (goals.length > 0 && selectedLogGoalIds.length === 0 && !selectedLogGoalId) {
      setSelectedLogGoalIds([goals[0].id]);
      setSelectedLogGoalId(goals[0].id);
    }
  }, [goals, selectedLogGoalIds.length, selectedLogGoalId]);

  const [logTasks, setLogTasks] = useState<TaskRow[]>([]);
  const [logTasksLoading, setLogTasksLoading] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const {
    activeGoal: activeFocusGoal,
    activeGoalId: activeFocusGoalId,
    setActiveGoalId: setActiveFocusGoalId,
    dailyFocus,
    dailyFocusAnswer,
    setDailyFocusAnswer,
    loading: focusLoading,
    submitting: focusSubmitting,
    error: focusError,
    generateFocusQuestion,
    handleAnswerSubmit: handleFocusAnswerSubmit,
    handleAppendTranscript: handleFocusAppendTranscript,
  } = useHomeDailyFocus({
    goals,
    supabase,
    language,
  });

  /* ---- Log mode: fetch tasks and open progress dialog ---- */
  const handleLogSubmit = useCallback(
    async (customGoalId?: string) => {
      const targetGoalId =
        customGoalId || selectedLogGoalId || selectedLogGoalIds[0];
      if (!targetGoalId) return;

      if (customGoalId && customGoalId !== selectedLogGoalId) {
        setSelectedLogGoalId(customGoalId);
        setSelectedLogGoalIds([customGoalId]);
      }

      setLogTasksLoading(true);
      try {
        const targetIds = customGoalId
          ? [customGoalId]
          : selectedLogGoalIds.length > 0
            ? selectedLogGoalIds
            : [targetGoalId];

        const { data, error } = await supabase
          .from("sub_layers")
          .select("*")
          .in("goal_id", targetIds)
          .order("sort_order", { ascending: true });

        if (error) {
          console.error("Failed to fetch tasks for log mode:", error);
          return;
        }

        setLogTasks((data as TaskRow[]) || []);
        setShowProgressDialog(true);
      } catch (err) {
        console.error("Log mode fetch tasks error:", err);
      } finally {
        setLogTasksLoading(false);
      }
    },
    [selectedLogGoalId, selectedLogGoalIds, supabase]
  );

  const handleProgressDialogClose = useCallback(() => {
    setShowProgressDialog(false);
    setLogTasks([]);
  }, []);

  const handleProgressDialogSuccess = useCallback(() => {
    handleProgressDialogClose();
    if (onGoalUpdated) {
      onGoalUpdated();
    }
  }, [handleProgressDialogClose, onGoalUpdated]);

  return (
    <div
      className="mx-auto flex flex-1 min-h-0 h-full w-full max-w-4xl lg:max-w-[1041px] flex-col gap-2.5 sm:gap-3 md:gap-3.5 px-0.5 sm:px-1 pt-6 sm:pt-10 md:pt-14 pb-0.5 sm:pb-1"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Upper Focus Group: Header with Logo + Dual Mode Input */}
      <div className="flex shrink-0 flex-col gap-2 sm:gap-3">
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 sm:gap-1.5 text-center px-1">
          <BrandLockup className="h-auto w-[135px] min-[400px]:w-[155px] sm:w-[185px] md:w-[200px] text-foreground transition-transform duration-300 hover:scale-[1.02]" />
          <p
            className="max-w-[18rem] text-xs sm:text-[13px] font-semibold leading-normal sm:leading-relaxed text-muted-foreground/75 tracking-tight sm:max-w-[26rem] text-balance"
            dir={isArabic ? "rtl" : "ltr"}
            lang={isArabic ? "ar" : "en"}
          >
            {isArabic
              ? "الالتزام بالمسار اليومي هو سر الوصول إلى غايتك"
              : "Daily consistency is the secret to reaching your ambition"}
          </p>
        </div>

        <HomeInputSection
          goals={goals}
          boxMode={boxMode}
          onBoxModeChange={handleBoxModeChange}
          goalInput={goalInput}
          onGoalInputChange={setGoalInput}
          selectedLogGoalIds={selectedLogGoalIds}
          onToggleGoalSelection={toggleGoalSelection}
          onToggleSelectAllGoals={toggleSelectAllGoals}
          onNavigateToCreate={onNavigateToCreate}
          onDailyLogSubmit={() => handleLogSubmit()}
          logTasksLoading={logTasksLoading}
          language={language}
          focusInputSignal={focusInputSignal}
        />
      </div>

      {/* Lower Section: Tabs Container (Recent Goals & Today's Question) */}
      <HomeGoalsSection
        recentGoals={recentGoals}
        taskStatsMap={taskStatsMap}
        language={language}
        onSelectGoal={onSelectGoal}
        activeFocusGoal={activeFocusGoal}
        activeFocusGoalId={activeFocusGoalId}
        onSelectFocusGoal={setActiveFocusGoalId}
        dailyFocus={dailyFocus}
        dailyFocusAnswer={dailyFocusAnswer}
        onAnswerChange={setDailyFocusAnswer}
        onAnswerSubmit={handleFocusAnswerSubmit}
        onAppendTranscript={handleFocusAppendTranscript}
        onRefreshQuestion={generateFocusQuestion}
        focusLoading={focusLoading}
        focusSubmitting={focusSubmitting}
        focusError={focusError}
      />

      {/* Progress Log Dialog (opened from daily-log mode) */}
      {showProgressDialog && (selectedLogGoal || selectedLogGoals.length > 0) && (
        <ProgressLogDialog
          goal={{
            id: (selectedLogGoal || selectedLogGoals[0]).id,
            title: (selectedLogGoal || selectedLogGoals[0]).title,
            ai_summary: (selectedLogGoal || selectedLogGoals[0]).ai_summary || "",
            created_at: (selectedLogGoal || selectedLogGoals[0]).created_at,
            estimated_completion_date:
              (selectedLogGoal || selectedLogGoals[0]).estimated_completion_date,
            current_points: (selectedLogGoal || selectedLogGoals[0]).current_points,
            target_points: (selectedLogGoal || selectedLogGoals[0]).target_points,
          }}
          goals={selectedLogGoals.map((g) => ({
            id: g.id,
            title: g.title,
            ai_summary: g.ai_summary || "",
            created_at: g.created_at,
            estimated_completion_date: g.estimated_completion_date,
            current_points: g.current_points,
            target_points: g.target_points,
          }))}
          tasks={logTasks}
          initialMode={selectedLogGoals.length > 1 ? "ai" : "select"}
          onClose={handleProgressDialogClose}
          onSuccess={handleProgressDialogSuccess}
          language={language}
        />
      )}
    </div>
  );
}
