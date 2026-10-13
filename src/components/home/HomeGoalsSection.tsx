"use client";

import { useState } from "react";
import {
  Target,
  Bell,
  Pin,
  Clock,
  Calendar,
  ListChecks,
  CheckCheck,
  Flame,
  Snowflake,
  Trophy,
  BarChart3,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Language } from "@/lib/translations";
import type { GoalTaskStats } from "@/app/page";
import type { SmartNotification } from "@/hooks/useSmartNotifications";
import { getIconComponent } from "@/components/goal/IconPicker";
import { getGoalEndDaysChip } from "@/lib/goal-dates";
import GoalProgressBar from "@/components/shared/GoalProgressBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WELL_SURFACE } from "@/lib/surfaces";
import type { Goal } from "./HomeTypes";

interface HomeGoalsSectionProps {
  recentGoals: Goal[];
  taskStatsMap?: Record<string, GoalTaskStats>;
  notifications: SmartNotification[];
  unreadNotificationsCount: number;
  language: Language;
  onSelectGoal: (id: string) => void;
  onQuickLog: (goalId: string) => void;
  onMarkAllNotifsRead?: () => void;
}

export default function HomeGoalsSection({
  recentGoals,
  taskStatsMap = {},
  notifications,
  unreadNotificationsCount,
  language,
  onSelectGoal,
  onQuickLog,
  onMarkAllNotifsRead,
}: HomeGoalsSectionProps) {
  const isArabic = language === "ar";
  const [bottomTab, setBottomTab] = useState<"goals" | "notifications">("goals");

  const isRTLText = (text: string) => {
    const rtlChar = /[\u0591-\u07ff\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    const ltrChar = /[A-Za-z\u00C0-\u024F]/;
    for (const char of text.trim()) {
      if (rtlChar.test(char)) return true;
      if (ltrChar.test(char)) return false;
    }
    return isArabic;
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col overflow-hidden"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Tab Switcher & Actions */}
      <div className="flex flex-wrap shrink-0 items-center justify-between gap-2 mb-2.5 px-0.5">
        <div className="flex min-w-0 max-w-full items-center gap-1 sm:gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/70 shadow-2xs">
          <button
            type="button"
            onClick={() => setBottomTab("goals")}
            className={cn(
              "flex min-w-0 items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] min-[380px]:text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95",
              bottomTab === "goals"
                ? "bg-card text-foreground shadow-xs border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Target className="h-3.5 w-3.5 text-primary opacity-85 shrink-0" />
            <span className="truncate">{isArabic ? "الأهداف الأخيرة" : "Recent Goals"}</span>
            <span className="inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary tabular-nums shrink-0">
              {recentGoals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBottomTab("notifications")}
            className={cn(
              "flex min-w-0 items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] min-[380px]:text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95",
              bottomTab === "notifications"
                ? "bg-card text-foreground shadow-xs border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Bell className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{isArabic ? "الإشعارات" : "Notifications"}</span>
            {unreadNotificationsCount > 0 && (
              <span className="inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded-full bg-destructive text-white px-1.5 text-[10px] font-bold tabular-nums shrink-0">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>

        {bottomTab === "notifications" && notifications.length > 0 && onMarkAllNotifsRead && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMarkAllNotifsRead}
            className="h-7 px-2 sm:px-2.5 text-[11px] text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
          >
            <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>{isArabic ? "تحديد كمقروء" : "Mark all read"}</span>
          </Button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="overflow-hidden flex flex-col flex-1 min-h-0">
        <div
          className={cn(
            "min-h-[200px] max-h-[calc(100dvh-22.5rem)] sm:max-h-none sm:h-[430px] flex-1 overflow-y-auto overscroll-contain rounded-[18px] p-2.5 sm:p-3 scrollbar-thin touch-pan-y [-webkit-overflow-scrolling:touch]",
            WELL_SURFACE
          )}
        >
          {bottomTab === "goals" ? (
            recentGoals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {recentGoals.map((goal) => {
                  const currentPoints = goal.current_points ?? 0;
                  const targetPoints = goal.target_points ?? 0;
                  const progress =
                    targetPoints > 0 ? Math.round((currentPoints / targetPoints) * 100) : 0;
                  const Icon = getIconComponent(goal.icon || "Target");
                  const goalIsRTL = isArabic || isRTLText(goal.title);
                  const daysChip = getGoalEndDaysChip(goal.estimated_completion_date, isArabic);
                  const stats = taskStatsMap[goal.id];
                  const hasStatsBadge = !!stats && stats.total > 0;

                  return (
                    <div
                      key={goal.id}
                      className="group relative w-full min-h-[112px] sm:min-h-[120px] rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 shadow-xs transition-all duration-200 ease-out hover:border-primary/60 hover:shadow-xs active:scale-[0.99] flex flex-col justify-between gap-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectGoal(goal.id)}
                        className="flex h-full w-full cursor-pointer flex-col justify-between gap-2 text-start outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1"
                        dir={goalIsRTL ? "rtl" : "ltr"}
                      >
                        {/* Top: Icon + Title */}
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm sm:text-[15px] font-bold text-foreground transition-colors group-hover:text-primary">
                                {goal.title}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Badges row */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-0.5">
                          {goal.is_pinned && (
                            <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 text-[9.5px] sm:text-[10px] font-semibold text-primary">
                              <Pin className="h-2.5 w-2.5" />
                              {isArabic ? "مثبت" : "Pinned"}
                            </span>
                          )}
                          {daysChip && (
                            <span
                              className={cn(
                                "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[9.5px] sm:text-[10px] font-semibold tabular-nums shadow-2xs transition-colors",
                                daysChip.tone === "soon" &&
                                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
                                daysChip.tone === "today" &&
                                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 animate-pulse",
                                daysChip.tone === "late" &&
                                  "border-destructive/35 bg-destructive/10 text-destructive font-bold",
                                !daysChip.tone &&
                                  "border-border/70 bg-muted/60 text-muted-foreground/85"
                              )}
                              title={daysChip.title}
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {daysChip.text}
                            </span>
                          )}
                          {!daysChip && goal.total_days && goal.total_days > 0 ? (
                            <span
                              className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2 text-[9.5px] sm:text-[10px] font-semibold text-muted-foreground/85"
                              title={
                                isArabic
                                  ? `إجمالي مدة الهدف ${goal.total_days} يوم`
                                  : `Total duration: ${goal.total_days} days`
                              }
                            >
                              <Calendar className="h-2.5 w-2.5" />
                              <span>
                                {goal.total_days} {isArabic ? "يوم" : "d"}
                              </span>
                            </span>
                          ) : null}
                          {hasStatsBadge && (
                            <span
                              className={cn(
                                "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[9.5px] sm:text-[10px] font-semibold tabular-nums",
                                stats.completed >= stats.total
                                  ? "border-primary/25 bg-primary/10 text-primary font-bold"
                                  : "border-border/70 bg-muted/60 text-muted-foreground/85"
                              )}
                              title={
                                isArabic
                                  ? `${stats.completed} من ${stats.total} مهمة منجزة`
                                  : `${stats.completed} of ${stats.total} tasks done`
                              }
                            >
                              <ListChecks className="h-2.5 w-2.5" />
                              <span dir="ltr">
                                {stats.completed}/{stats.total}
                              </span>
                              {stats.completed >= stats.total && (
                                <span className="text-[9px] font-black text-primary">✓</span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Bottom: Progress Bar */}
                        <GoalProgressBar
                          currentPoints={currentPoints}
                          targetPoints={targetPoints}
                          progress={progress}
                          className="h-7 shrink-0 w-full rounded-full"
                          labelClassName="px-2.5 text-xs sm:text-sm font-bold"
                          percentClassName="text-sm sm:text-base font-black text-foreground"
                          targetClassName="text-foreground"
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-[200px] sm:min-h-[360px] flex-col items-center justify-center p-4 sm:p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground/50 shadow-xs mb-3">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  {isArabic ? "لا توجد أهداف بعد" : "No goals yet"}
                </h2>
                <p className="mt-1.5 max-w-[16rem] text-sm text-muted-foreground/75 leading-relaxed">
                  {isArabic
                    ? "ابدأ بإضافة هدفك الأول وسيظهر تقدمه هنا."
                    : "Create your first goal and its progress will appear here."}
                </p>
              </div>
            )
          ) : /* Notifications View */
          notifications.length === 0 ? (
            <div className="flex h-full min-h-[200px] sm:min-h-[360px] flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-card text-emerald-500 shadow-xs mb-3">
                <CheckCheck className="h-6 w-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {isArabic ? "أنت مواكب لكل شيء!" : "You're all caught up!"}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-[240px]">
                {isArabic
                  ? "لا توجد تنبيهات طارئة حالياً، استمر في الحفاظ على زخمك اليومي."
                  : "No urgent alerts right now. Keep up your daily momentum."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {notifications.map((n) => {
                const isHigh = n.priority === "high";
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border bg-card shadow-xs transition-all duration-200 hover:shadow-sm",
                      isHigh
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border hover:border-primary/25"
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border mt-0.5 shadow-2xs",
                          isHigh
                            ? "border-destructive/30 bg-destructive/15 text-destructive"
                            : n.type === "streak_freeze"
                              ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                              : n.type === "deadline_alert"
                                ? "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : n.type === "weekly_review"
                                  ? "border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                  : n.type === "dormant_goal"
                                    ? "border-purple-500/30 bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                    : "border-primary/20 bg-primary/10 text-primary"
                        )}
                      >
                        {n.type === "streak_rescue" ? (
                          <Flame className="h-4 w-4" />
                        ) : n.type === "streak_freeze" ? (
                          <Snowflake className="h-4 w-4" />
                        ) : n.type === "deadline_alert" ? (
                          <Clock className="h-4 w-4" />
                        ) : n.type === "record_streak" ||
                          n.type === "milestone_celebration" ? (
                          <Trophy className="h-4 w-4" />
                        ) : n.type === "weekly_review" ? (
                          <BarChart3 className="h-4 w-4" />
                        ) : n.type === "dormant_goal" ? (
                          <Sparkles className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <span
                            className={cn(
                              "text-xs sm:text-sm font-bold truncate",
                              isHigh ? "text-destructive" : "text-foreground"
                            )}
                          >
                            {n.title}
                          </span>
                          {n.goalTitle && (
                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/60 shrink-0 font-medium truncate max-w-[110px] sm:max-w-[130px]">
                              {n.goalTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 w-full sm:w-auto self-end sm:self-center">
                      {n.goalId && (
                        <Button
                          size="sm"
                          variant={isHigh ? "destructive" : "outline"}
                          onClick={() => {
                            if (n.goalId) {
                              onQuickLog(n.goalId);
                            }
                          }}
                          className="h-8 sm:h-9 rounded-lg px-3 text-xs font-medium shadow-xs gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>{isArabic ? "تسجيل سريع" : "Quick Log"}</span>
                        </Button>
                      )}
                      {n.goalId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSelectGoal(n.goalId!)}
                          className="h-8 sm:h-9 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
                        >
                          <span>{isArabic ? "عرض الهدف" : "View"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
