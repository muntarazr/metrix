"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Language } from "@/lib/translations";
import type { GoalTaskStats } from "@/app/page";
import { BrandLockup } from "@/components/brand/Logo";
import { createClient } from "@/utils/supabase/client";
import { useSmartNotifications } from "@/hooks/useSmartNotifications";
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
}: HomePageProps) {
  const [goalInput, setGoalInput] = useState("");
  const isArabic = language === "ar";
  const safeRecentGoalsLimit = Math.max(1, recentGoalsLimit);
  const recentGoals = useMemo(
    () => goals.slice(0, safeRecentGoalsLimit),
    [goals, safeRecentGoalsLimit]
  );

  /* ---- Dual-mode box state ---- */
  const [boxModePref, setBoxModePref] = useState<"new" | "log" | null>(null);
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

  const { notifications, unreadNotifications, markAllAsRead } = useSmartNotifications({
    goals,
    language: isArabic ? "ar" : "en",
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
      className="mx-auto flex flex-1 min-h-0 w-full max-w-4xl 2xl:max-w-5xl flex-col gap-3 sm:gap-6 md:gap-7 px-1 min-[380px]:px-2 sm:px-4 pt-1.5 sm:pt-8 md:pt-14 pb-3 sm:pb-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Upper Focus Group: Header with Logo + Dual Mode Input */}
      <div className="flex shrink-0 flex-col gap-2.5 sm:gap-4">
        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 sm:gap-2 text-center px-1">
          <BrandLockup className="h-auto w-[145px] min-[400px]:w-[165px] sm:w-[205px] md:w-[230px] text-foreground transition-transform duration-300 hover:scale-[1.02]" />
          <p
            className="max-w-[18rem] text-xs font-semibold leading-relaxed text-muted-foreground/75 tracking-tight sm:max-w-[26rem] sm:text-sm text-balance"
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
          onBoxModeChange={setBoxModePref}
          goalInput={goalInput}
          onGoalInputChange={setGoalInput}
          selectedLogGoalIds={selectedLogGoalIds}
          onToggleGoalSelection={toggleGoalSelection}
          onToggleSelectAllGoals={toggleSelectAllGoals}
          onNavigateToCreate={onNavigateToCreate}
          onDailyLogSubmit={() => handleLogSubmit()}
          logTasksLoading={logTasksLoading}
          language={language}
        />
      </div>

      {/* Lower Section: Tabs Container (Recent Goals & Notifications) */}
      <HomeGoalsSection
        recentGoals={recentGoals}
        taskStatsMap={taskStatsMap}
        notifications={notifications}
        unreadNotificationsCount={unreadNotifications.length}
        language={language}
        onSelectGoal={onSelectGoal}
        onQuickLog={(goalId) => handleLogSubmit(goalId)}
        onMarkAllNotifsRead={markAllAsRead}
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
