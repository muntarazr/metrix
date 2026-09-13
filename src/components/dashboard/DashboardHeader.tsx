"use client";

import {
  Clock,
  Edit2,
  Flame,
  Info,
  ListChecks,
  MoreVertical,
  Pin,
  PinOff,
  Snowflake,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  cn,
  formatNumberEn,
  localeWithEnglishDigits,
  textDirectionFor,
} from "@/lib/utils";
import { getGoalEndDaysChip } from "@/lib/goal-dates";
import {
  computeGoalProjection,
  formatProjectionCopy,
} from "@/lib/goal-projection";
import { translations, type Language } from "@/lib/translations";
import { getGoalIcon, GoalIconPicker } from "../goal/IconPicker";
import GoalProgressBar from "@/components/shared/GoalProgressBar";
import NotificationBellPopover from "@/components/notifications/NotificationBellPopover";
import { useSmartNotifications } from "@/hooks/useSmartNotifications";

interface Goal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  status: string;
  created_at: string;
  estimated_completion_date: string;
  total_days: number;
  ai_summary: string;
  icon?: string;
  is_pinned?: boolean;
}

interface DashboardHeaderProps {
  goal: Goal;
  progress: number;
  streak: number;
  taskCount: number;
  completedTaskCount: number;
  language?: Language;
  showGoalDetails: boolean;
  /** Set when a rest day would rescue the streak; null hides the offer. */
  freezableDate: string | null;
  freezing: boolean;
  onUseStreakFreeze: () => void;
  onToggleDetails: () => void;
  onTogglePin: () => void;
  onEditGoal: () => void;
  onDeleteGoal: () => void;
  onUpdateIcon: (icon: string) => void;
}

export default function DashboardHeader({
  goal,
  progress,
  streak,
  taskCount,
  completedTaskCount,
  language = "ar",
  showGoalDetails,
  freezableDate,
  freezing,
  onUseStreakFreeze,
  onToggleDetails,
  onTogglePin,
  onEditGoal,
  onDeleteGoal,
  onUpdateIcon,
}: DashboardHeaderProps) {
  const t = translations[language];
  const isArabic = language === "ar";
  const goalEndDaysChip = getGoalEndDaysChip(
    goal.estimated_completion_date,
    isArabic,
  );
  const titleDir = textDirectionFor(goal.title);
  const dateLocale = localeWithEnglishDigits(language);

  // The stored end date never moves; this is the one the current pace lands on.
  const projection = computeGoalProjection({
    currentPoints: goal.current_points,
    targetPoints: goal.target_points,
    createdAt: goal.created_at,
    plannedEndDate: goal.estimated_completion_date,
  });
  const projectionCopy = projection
    ? formatProjectionCopy(projection, isArabic)
    : null;

  const {
    notifications,
    unreadNotifications,
    highPriorityCount,
    markAllAsRead,
  } = useSmartNotifications({
    goals: [goal],
    language: isArabic ? "ar" : "en",
  });

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div
          className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <GoalIconPicker
            currentIconName={goal.icon || "Target"}
            onSelect={onUpdateIcon}
          >
            <button className="h-11 w-11 sm:h-12 sm:w-12 p-2.5 shrink-0 bg-primary/12 text-primary hover:bg-primary/12 active:scale-95 transition-all duration-200 rounded-xl flex items-center justify-center cursor-pointer border border-primary/15 ring-2 ring-transparent hover:ring-primary/15 shadow-sm">
              <span className="transition-transform duration-200 hover:scale-110">
                {getGoalIcon(goal.icon)}
              </span>
            </button>
          </GoalIconPicker>
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "text-base sm:text-[17px] font-extrabold text-foreground line-clamp-2 tracking-tight leading-snug",
                titleDir === "rtl" ? "text-right" : "text-left",
              )}
              dir={titleDir}
            >
              {goal.title}
            </h1>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              {goal.is_pinned && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary border border-primary/20 shadow-2xs">
                  <Pin className="w-3 h-3" />
                  <span>{isArabic ? "مثبت" : "Pinned"}</span>
                </span>
              )}

              {/* Time to deadline badge with dynamic state colors */}
              {goalEndDaysChip && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums border shadow-2xs transition-colors",
                    goalEndDaysChip.tone === "soon" &&
                      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
                    goalEndDaysChip.tone === "today" &&
                      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 animate-pulse",
                    goalEndDaysChip.tone === "late" &&
                      "bg-destructive/10 text-destructive border-destructive/25",
                  )}
                  title={goalEndDaysChip.title}
                >
                  <Clock className="w-3 h-3 shrink-0" aria-hidden />
                  <span>{goalEndDaysChip.text}</span>
                </span>
              )}

              {/* Streak badge with fire fill and warm state color */}
              {streak > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-2xs">
                  <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{formatNumberEn(streak)} {isArabic ? "يوم" : "d"}</span>
                </span>
              )}

              {/* Rest day / Freeze streak option */}
              {freezableDate && (
                <button
                  onClick={onUseStreakFreeze}
                  disabled={freezing}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/25 shadow-2xs transition-all hover:bg-sky-500/15 active:scale-95 disabled:opacity-50 cursor-pointer"
                  title={
                    isArabic
                      ? "يوم راحة واحد بالأسبوع يحمي السلسلة من الانكسار"
                      : "One rest day a week keeps the streak alive"
                  }
                >
                  <Snowflake className="w-3 h-3 shrink-0" aria-hidden />
                  <span>{isArabic ? "يوم راحة" : "Rest day"}</span>
                </button>
              )}

              {/* Task completion counter with finished state distinction */}
              {taskCount > 0 && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums border shadow-2xs transition-colors",
                    completedTaskCount >= taskCount
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-muted/60 text-muted-foreground border-border/70",
                  )}
                  title={
                    isArabic
                      ? `${completedTaskCount} من ${taskCount} مهمة منجزة اليوم`
                      : `${completedTaskCount} of ${taskCount} tasks done today`
                  }
                >
                  <ListChecks className="w-3 h-3 shrink-0" aria-hidden />
                  <span dir="ltr">
                    {formatNumberEn(completedTaskCount)}/{formatNumberEn(taskCount)}
                  </span>
                  {completedTaskCount >= taskCount && (
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      ✓
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationBellPopover
            notifications={notifications}
            unreadCount={unreadNotifications.length}
            highPriorityCount={highPriorityCount}
            isArabic={isArabic}
            onMarkAllAsRead={markAllAsRead}
          />

          <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2.5 rounded-xl hover:bg-muted/60 text-muted-foreground/75 hover:text-foreground transition-all duration-200 border border-border/45 hover:border-border hover:shadow-sm active:scale-95"
                title={isArabic ? "خيارات الهدف" : "Goal Options"}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isArabic ? "start" : "end"}
              className={cn("w-52", isArabic && "text-right")}
            >
              <DropdownMenuItem
                onClick={onTogglePin}
                className="cursor-pointer"
              >
                {goal.is_pinned ? (
                  <>
                    <PinOff className="w-4 h-4" />
                    <span>{isArabic ? "إلغاء التثبيت" : "Unpin Goal"}</span>
                  </>
                ) : (
                  <>
                    <Pin className="w-4 h-4" />
                    <span>{isArabic ? "تثبيت الهدف" : "Pin Goal"}</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEditGoal} className="cursor-pointer">
                <Edit2 className="w-4 h-4" />
                <span>{t.editGoal}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onToggleDetails}
                className="cursor-pointer"
              >
                <Info className="w-4 h-4" />
                <span>
                  {showGoalDetails
                    ? isArabic
                      ? "إخفاء التفاصيل"
                      : "Hide Details"
                    : isArabic
                      ? "عرض التفاصيل"
                      : "Show Details"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDeleteGoal}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isArabic ? "حذف الهدف" : "Delete Goal"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Goal Details (collapsible) */}
      {showGoalDetails && (
        <div
          className="pt-4 border-t border-border/70 animate-in fade-in slide-in-from-top-3 duration-300"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="bg-muted/40 rounded-xl p-3 border border-border/70 hover:border-border transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "تاريخ البدء" : "Start Date"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {new Date(goal.created_at).toLocaleDateString(dateLocale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border border-border/70 hover:border-border transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "تاريخ الانتهاء" : "End Date"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {new Date(goal.estimated_completion_date).toLocaleDateString(
                  dateLocale,
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border border-border/70 hover:border-border transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "إجمالي الأيام" : "Total Days"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {formatNumberEn(goal.total_days)} {isArabic ? "يوم" : "days"}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border border-border/70 hover:border-border transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "النقاط الحالية" : "Current Points"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {formatNumberEn(goal.current_points)}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border border-border/70 hover:border-border transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "النقاط المستهدفة" : "Target Points"}
              </p>
              <p className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                {formatNumberEn(goal.target_points)}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border border-border/70 hover:border-border transition-colors duration-200 group">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <p className="text-xs font-extrabold text-foreground capitalize group-hover:text-primary transition-colors">
                {goal.status}
              </p>
            </div>
          </div>
          {goal.ai_summary && (
            <div className="mt-4 bg-primary/12 rounded-xl p-3 border border-primary/20 hover:border-primary/30 transition-colors duration-200">
              <p className="text-[10px] text-primary/75 font-bold mb-1.5 uppercase tracking-wider">
                {t.goalDescription}
              </p>
              <p className="text-xs text-foreground/75 leading-relaxed">
                {goal.ai_summary}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <GoalProgressBar
          currentPoints={goal.current_points}
          targetPoints={goal.target_points}
          progress={progress}
        />
        {projectionCopy && (
          <p
            className={cn(
              "flex items-center gap-1.5 px-0.5 text-[11px] font-semibold leading-none",
              projectionCopy.tone === "behind" && "text-foreground",
              projectionCopy.tone === "ahead" && "text-primary",
              projectionCopy.tone === "on-track" && "text-muted-foreground/75",
              projectionCopy.tone === "stalled" && "text-muted-foreground/75",
            )}
            title={
              isArabic
                ? "محسوب من سرعتك الفعلية، مو من الخطة الأصلية"
                : "Derived from your actual pace, not the original plan"
            }
          >
            {projectionCopy.tone === "behind" ? (
              <TrendingDown className="h-3 w-3 shrink-0" aria-hidden />
            ) : (
              <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
            )}
            <span className="truncate">{projectionCopy.text}</span>
          </p>
        )}
      </div>
    </div>
  );
}
