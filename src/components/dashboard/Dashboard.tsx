"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, BarChart3, ListTodo, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { buildTaskHierarchy, calculateDailyCap } from "@/lib/task-hierarchy";
import { WELL_SURFACE } from "@/lib/surfaces";
import GrowthChart from "./GrowthChart";
import DayCalendarGrid from "./DayCalendarGrid";
import ChallengeTab from "../challenge";
import TaskInsights from "./TaskInsights";
import DashboardHeader from "./DashboardHeader";
import FocusTab from "./FocusTab";
import DashboardDialogs from "./DashboardDialogs";
import { useDashboardData } from "./useDashboardData";
import { useTaskOperations } from "./useTaskOperations";
import { useDailyFocusSession } from "./useDailyFocusSession";
import type { DashboardProps, DashboardTab } from "./types";

export type { Goal, TaskCheckin, ActivityLog, DashboardProps, DashboardTab } from "./types";

export default function Dashboard({
  goal,
  language = "ar",
  onGoalUpdated,
  onLogModalChange,
  isActive = true,
}: DashboardProps) {
  const t = translations[language];
  const isArabic = language === "ar";
  const [activeTab, setActiveTab] = useState<DashboardTab>("focus");

  // Global toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const showSuccessToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  // 1. Data synchronization & queries
  const data = useDashboardData({
    goalId: goal.id,
    isArabic,
    onGoalUpdated,
    showSuccessToast,
  });

  // 2. Task operations, check-ins, inline mutations & modal states
  const ops = useTaskOperations({
    goal,
    tasks: data.tasks,
    setTasks: data.setTasks,
    checkins: data.checkins,
    setCheckins: data.setCheckins,
    fetchTasks: data.fetchTasks,
    fetchCheckins: data.fetchCheckins,
    fetchChartData: data.fetchChartData,
    language,
    isArabic,
    onGoalUpdated,
    supabase: data.supabase,
    showSuccessToast,
    findCheckin: data.findCheckin,
  });

  // Sync log modal state with parent component
  useEffect(() => {
    onLogModalChange?.(ops.showLogModal);
    return () => {
      onLogModalChange?.(false);
    };
  }, [onLogModalChange, ops.showLogModal]);

  // Task hierarchy
  const hierarchy = useMemo(() => buildTaskHierarchy(data.tasks), [data.tasks]);
  const filteredHierarchy = hierarchy;

  // 3. Daily focus sessions, questions & coaching
  const focus = useDailyFocusSession({
    goal,
    tasks: data.tasks,
    logs: data.logs,
    logsLoaded: data.logsLoaded,
    loadingTasks: data.loadingTasks,
    language,
    isArabic,
    isActive,
    showLogModal: ops.showLogModal,
    todayDateKey: data.todayDateKey,
    hierarchy,
    supabase: data.supabase,
    fetchTasks: data.fetchTasks,
    setExpandedMains: ops.setExpandedMains,
    showSuccessToast,
    onGoalUpdated,
  });

  // Derived statistics
  const focusStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const main of filteredHierarchy) {
      if (main.subtasks.length > 0) {
        total += main.subtasks.length;
        completed += main.subtasks.filter((sub) =>
          data.isChecked(sub.id, sub.frequency),
        ).length;
      } else {
        total += 1;
        if (data.isChecked(main.id, main.frequency)) {
          completed += 1;
        }
      }
    }
    return { totalSubtasks: total, completedSubtasks: completed };
  }, [filteredHierarchy, data.isChecked]);

  const progress =
    goal.target_points > 0
      ? Math.min(
          100,
          Math.round((goal.current_points / goal.target_points) * 100),
        )
      : 0;

  const taskCount = useMemo(() => {
    let count = 0;
    for (const m of hierarchy) {
      if (m.subtasks.length > 0) {
        count += m.subtasks.length;
      } else {
        count += 1;
      }
    }
    return count;
  }, [hierarchy]);

  const completedTaskCount = useMemo(() => {
    let count = 0;
    for (const m of hierarchy) {
      if (m.subtasks.length > 0) {
        count += m.subtasks.filter((sub) =>
          data.isChecked(sub.id, sub.frequency),
        ).length;
      } else {
        if (data.isChecked(m.id, m.frequency)) count += 1;
      }
    }
    return count;
  }, [hierarchy, data.isChecked]);

  // Tab definitions
  const tabItems: {
    key: DashboardTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "focus",
      label: t.dailyFocus,
      icon: <ListTodo className="w-4 h-4" />,
    },
    {
      key: "chart",
      label: t.growthTrajectory,
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      key: "challenge",
      label: t.challengeTab,
      icon: <Swords className="w-4 h-4" />,
    },
  ];

  const activeIndex = tabItems.findIndex((tab) => tab.key === activeTab);

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-4xl lg:max-w-[1041px] flex-col gap-2 sm:gap-3 overflow-hidden"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* ===== Header Card ===== */}
      <div className="shrink-0">
        <DashboardHeader
          goal={goal}
          progress={progress}
          streak={data.streak}
          taskCount={taskCount}
          completedTaskCount={completedTaskCount}
          language={language}
          showGoalDetails={ops.showGoalDetails}
          freezableDate={data.freezableDate}
          freezing={data.freezing}
          onUseStreakFreeze={data.handleUseStreakFreeze}
          onToggleDetails={() => ops.setShowGoalDetails(!ops.showGoalDetails)}
          onTogglePin={ops.handleTogglePin}
          onEditGoal={() => ops.setShowGoalEditDialog(true)}
          onDeleteGoal={ops.handleDeleteGoal}
          onUpdateIcon={ops.handleUpdateIcon}
          onExportGoal={ops.handleExportGoal}
          isExportingGoal={ops.isExportingGoal}
        />
      </div>

      {/* ===== Unified Navigation Bar with Log Progress Action ===== */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Primary Log Progress Action Button (At start: Right in RTL, Left in LTR) */}
        <button
          onClick={() => {
            focus.setShowDailyFocusPrompt(false);
            ops.setShowLogModal(true);
          }}
          title={t.logProgressButton}
          aria-label={t.logProgressButton}
          className="log-progress-btn-animated flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary h-9 min-[360px]:h-10 sm:h-11 px-2.5 min-[360px]:px-3 sm:px-3.5 text-xs min-[360px]:text-sm font-semibold text-primary-foreground shadow-xs shadow-primary/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] hover:bg-primary/90 active:scale-[0.96] transition-all cursor-pointer select-none touch-manipulation"
        >
          <Flame className="log-progress-flame w-4 h-4 min-[360px]:w-[18px] min-[360px]:h-[18px] sm:w-5 sm:h-5 fill-current shrink-0" />
          <span className="hidden min-[420px]:inline whitespace-nowrap">
            {t.logProgressButton}
          </span>
        </button>

        {/* Navigation Tabs */}
        <div className="relative flex min-w-0 flex-1 gap-0.5 sm:gap-1 overflow-hidden rounded-xl border border-border/70 bg-muted/60 p-0.5 sm:p-1 h-9 min-[360px]:h-10 sm:h-11 shadow-xs select-none">
          {/* Sliding active background indicator */}
          <div
            className="absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 rounded-lg bg-card border border-border/70 shadow-xs"
            style={{
              width: "calc((100% - 16px) / 3)",
              left: isArabic
                ? "auto"
                : `calc(4px + ${activeIndex} * ((100% - 16px) / 3 + 4px))`,
              right: isArabic
                ? `calc(4px + ${activeIndex} * ((100% - 16px) / 3 + 4px))`
                : "auto",
              transition: "all 300ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          />
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative z-10 flex-1 min-w-0 flex items-center justify-center gap-1 min-[360px]:gap-1.5 sm:gap-2 py-1 px-1 min-[360px]:px-1.5 sm:px-2 rounded-lg text-[11px] min-[360px]:text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-95 touch-manipulation select-none",
                activeTab === tab.key
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="[&_svg]:h-3.5 [&_svg]:w-3.5 sm:[&_svg]:h-4 sm:[&_svg]:w-4 opacity-90">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== Error Banner ===== */}
      {data.fetchError && (
        <div className="shrink-0 rounded-xl border border-destructive/15 bg-destructive/12 px-4 py-3 text-sm text-destructive shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/12">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1 break-words font-semibold text-xs sm:text-sm">{data.fetchError}</span>
            <button
              onClick={() => {
                data.setFetchError(null);
                data.fetchTasks();
              }}
              className="ms-auto shrink-0 whitespace-nowrap rounded-xl bg-destructive/12 px-3 py-1.5 text-xs font-bold hover:bg-destructive/20 transition-colors active:scale-95 touch-manipulation"
            >
              {isArabic ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </div>
      )}

      {/* ===== Tab Content ===== */}
      <div
        className={cn(
          "min-h-0 flex-1",
          activeTab === "chart"
            ? cn(
                "rounded-2xl p-1.5 min-[360px]:p-2 sm:p-3 scrollbar-hide relative z-0 touch-pan-y overflow-y-scroll overscroll-contain pb-20 [-webkit-overflow-scrolling:touch] sm:pb-3",
                WELL_SURFACE,
              )
            : activeTab === "challenge"
              ? cn("rounded-2xl p-1.5 min-[360px]:p-2 sm:p-3 overflow-hidden", WELL_SURFACE)
              : "overflow-hidden",
        )}
      >
        {/* Focus Tab (Persistent to preserve active focus session without remount delay or flicker) */}
        <div
          className={cn(
            "h-full min-h-0",
            activeTab !== "focus" && "hidden",
          )}
        >
          <FocusTab
            language={language}
            isArabic={isArabic}
            dailyFocus={focus.dailyFocus}
            dailyFocusHistory={focus.dailyFocusHistory}
            missedDailyFocusHistory={focus.missedDailyFocusHistory}
            dailyFocusLoading={focus.dailyFocusLoading}
            dailyFocusSubmitting={focus.dailyFocusSubmitting}
            dailyFocusAddingSuggestionId={focus.addingSuggestionId}
            dailyFocusError={focus.dailyFocusError}
            dailyFocusAnswer={focus.dailyFocusAnswer}
            isSuggestionsLocked={focus.suggestionsUnlockStatus.isLocked}
            daysUntilSuggestionsUnlock={focus.suggestionsUnlockStatus.daysRemaining}
            daysPassedSinceGoalCreation={focus.suggestionsUnlockStatus.daysPassed}
            filteredHierarchy={filteredHierarchy}
            hierarchy={hierarchy}
            loadingTasks={data.loadingTasks}
            focusStats={focusStats}
            expandedMains={ops.expandedMains}
            addingMain={ops.addingMain}
            addingSubFor={ops.addingSubFor}
            newMainText={ops.newMainText}
            newMainCriteria={ops.newMainCriteria}
            newMainFreq={ops.newMainFreq}
            newMainWeight={ops.newMainWeight}
            newMainColor={ops.newMainColor}
            newMainAccent={ops.newMainAccent}
            newSubText={ops.newSubText}
            newSubCriteria={ops.newSubCriteria}
            newSubFreq={ops.newSubFreq}
            newSubWeight={ops.newSubWeight}
            editingTaskId={ops.editingTaskId}
            editingText={ops.editingText}
            isChecked={data.isChecked}
            getTaskProgress={data.getTaskProgress}
            isCompletedToday={data.isCompletedToday}
            getSkipReason={data.getSkipReason}
            onSetSkipReason={ops.handleSetSkipReason}
            onClearSkipReason={ops.handleClearSkipReason}
            onRequestMini={ops.handleRequestMini}
            onCompleteMini={ops.handleCompleteMini}
            shouldAnimateTask={data.shouldAnimateTask}
            onToggleExpand={ops.toggleExpand}
            onToggleCheckin={ops.toggleCheckin}
            onOpenNewMainComposer={ops.openNewMainComposer}
            onCloseNewMainComposer={ops.closeNewMainComposer}
            onAddMain={ops.handleAddMain}
            onStartAddingSub={ops.handleStartAddingSub}
            onCancelAddingSub={() => {
              ops.setAddingSubFor(null);
              ops.setNewSubText("");
              ops.setNewSubCriteria("");
            }}
            onAddSub={ops.handleAddSub}
            onStartEditingTask={ops.handleStartEditingTask}
            onCancelEditingTask={() => ops.setEditingTaskId(null)}
            onRenameTask={ops.handleRenameTask}
            onDeleteTask={ops.handleDeleteTask}
            onUpdateTaskIcon={ops.handleUpdateTaskIcon}
            onUpdateTaskColor={ops.handleUpdateTaskColor}
            onUpdateTaskWeight={ops.handleUpdateTaskWeight}
            onOpenTaskEditor={ops.handleOpenTaskEditor}
            onSetDailyFocusAnswer={focus.handleDailyFocusAnswerChange}
            onAppendDailyFocusTranscript={focus.handleAppendDailyFocusTranscript}
            onSubmitDailyFocusAnswer={focus.handleSubmitDailyFocusAnswer}
            onAddDailyFocusSuggestion={focus.handleAddDailyFocusSuggestion}
            onRejectDailyFocusSuggestion={focus.handleRejectDailyFocusSuggestion}
            onUndoRejectDailyFocusSuggestion={focus.handleUndoRejectSuggestion}
            onSetNewMainText={ops.setNewMainText}
            onSetNewMainCriteria={ops.setNewMainCriteria}
            onSetNewMainFreq={ops.setNewMainFreq}
            onSetNewMainWeight={ops.setNewMainWeight}
            onSetNewMainColor={ops.setNewMainColor}
            onSetNewSubText={ops.setNewSubText}
            onSetNewSubCriteria={ops.setNewSubCriteria}
            onSetNewSubFreq={ops.setNewSubFreq}
            onSetNewSubWeight={ops.setNewSubWeight}
            onSetEditingText={ops.setEditingText}
            goalTitle={goal.title}
            goalId={goal.id}
            manualTaskOrder={goal.manual_task_order}
            onGoalUpdated={onGoalUpdated}
            supabase={data.supabase}
            onRefreshTasks={data.fetchTasks}
            onUpdateTaskScheduleDays={ops.handleUpdateTaskScheduleDays}
          />
        </div>

        {/* Growth Trajectory Tab */}
        <div
          className={cn(
            "md:h-full min-h-0",
            activeTab !== "chart" && "hidden",
          )}
        >
          <div className="scrollbar-thin md:min-h-full space-y-2 sm:space-y-2.5">
            <div className="grid gap-1.5 min-[360px]:gap-2 sm:gap-2.5 md:grid-cols-[minmax(0,1fr)_19.5rem] lg:grid-cols-[minmax(0,1fr)_21.5rem] xl:grid-cols-[minmax(0,1fr)_22.5rem] md:items-stretch">
              <div className="w-full min-w-0 md:flex md:min-h-0">
                <GrowthChart
                  data={data.chartData}
                  language={language}
                  fillHeight
                  className="w-full"
                />
              </div>
              <div className="w-full min-w-0 md:flex md:min-h-0">
                <DayCalendarGrid
                  logs={data.logs}
                  goalStartDate={goal.created_at}
                  dailyCap={calculateDailyCap(data.tasks)}
                  language={language}
                  loading={!data.logsLoaded}
                  streakFreezes={data.streakFreezes}
                  className="h-full"
                />
              </div>
            </div>
            <TaskInsights goalId={goal.id} tasks={data.tasks} language={language} />
          </div>
        </div>

        {/* Challenge Tab */}
        <div
          className={cn(
            "h-full min-h-0 overflow-hidden",
            activeTab !== "challenge" && "hidden",
          )}
        >
          <ChallengeTab
            goalId={goal.id}
            currentPoints={goal.current_points}
            targetPoints={goal.target_points}
            language={language}
          />
        </div>
      </div>

      {/* ===== Modals, Dialogs & Notifications ===== */}
      <DashboardDialogs
        goal={goal}
        language={language}
        isArabic={isArabic}
        onGoalUpdated={onGoalUpdated}
        refreshAll={data.refreshAll}
        showSuccessToast={showSuccessToast}
        showGoalEditDialog={ops.showGoalEditDialog}
        setShowGoalEditDialog={ops.setShowGoalEditDialog}
        showDailyFocusPrompt={focus.showDailyFocusPrompt}
        setShowDailyFocusPrompt={focus.setShowDailyFocusPrompt}
        setDailyFocusPromptDismissed={focus.setDailyFocusPromptDismissed}
        dailyFocusPromptStorageKey={focus.dailyFocusPromptStorageKey}
        dailyFocus={focus.dailyFocus}
        dailyFocusLoading={focus.dailyFocusLoading}
        dailyFocusSubmitting={focus.dailyFocusSubmitting}
        dailyFocusError={focus.dailyFocusError}
        dailyFocusAnswer={focus.dailyFocusAnswer}
        onDailyFocusAnswerChange={focus.handleDailyFocusAnswerChange}
        onAppendDailyFocusTranscript={focus.handleAppendDailyFocusTranscript}
        onSubmitDailyFocusAnswer={focus.handleSubmitDailyFocusAnswer}
        showLogModal={ops.showLogModal}
        setShowLogModal={ops.setShowLogModal}
        tasks={data.tasks}
        editingTask={ops.editingTask}
        taskEditorOpen={ops.taskEditorOpen}
        setTaskEditorOpen={ops.setTaskEditorOpen}
        handleUpdateTask={ops.handleUpdateTask}
        confirmModal={ops.confirmModal}
        setConfirmModal={ops.setConfirmModal}
        viewingLog={ops.viewingLog}
        setViewingLog={ops.setViewingLog}
        streak={data.streak}
        showToast={showToast}
        toastMessage={toastMessage}
      />
    </div>
  );
}
