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
  Download,
  Loader2,
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
import { getGoalEndDaysChip, calendarDaysUntilGoalEnd } from "@/lib/goal-dates";
import {
  computeGoalProjection,
  formatProjectionCopy,
} from "@/lib/goal-projection";
import { translations, type Language } from "@/lib/translations";
import { getGoalIcon, GoalIconPicker } from "../goal/IconPicker";
import GoalProgressBar from "@/components/shared/GoalProgressBar";

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
  onExportGoal?: () => void;
  isExportingGoal?: boolean;
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
  onExportGoal,
  isExportingGoal = false,
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

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs flex flex-col transition-all duration-200 gap-2.5 sm:gap-3",
        showGoalDetails && "gap-3 sm:gap-4",
      )}
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
        <div
          className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <GoalIconPicker
            currentIconName={goal.icon || "Target"}
            onSelect={onUpdateIcon}
          >
            <button
              aria-label={isArabic ? "تغيير أيقونة الهدف" : "Change goal icon"}
              className="h-9 w-9 sm:h-10 sm:w-10 p-2 shrink-0 bg-muted/40 text-foreground hover:bg-muted/70 transition-all duration-150 rounded-xl flex items-center justify-center cursor-pointer border border-border/80 shadow-xs active:scale-95"
            >
              <span className="transition-transform duration-200 hover:scale-110">
                {getGoalIcon(goal.icon)}
              </span>
            </button>
          </GoalIconPicker>
          <div className="min-w-0 flex-1">
            <h1
              className="text-sm sm:text-base font-black text-foreground truncate tracking-tight leading-snug text-start"
              dir={titleDir}
              title={goal.title}
            >
              {goal.title}
            </h1>
            <div className="mt-1 sm:mt-1.5 flex min-w-0 items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
              {goal.is_pinned && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium text-primary border border-primary/20 shadow-xs">
                  <Pin className="w-3 h-3" />
                  <span>{isArabic ? "مثبت" : "Pinned"}</span>
                </span>
              )}

              {/* Time to deadline badge with dynamic state colors */}
              {goalEndDaysChip && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium tabular-nums border shadow-xs transition-colors",
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
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-xs">
                  <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{formatNumberEn(streak)} {isArabic ? "يوم" : "d"}</span>
                </span>
              )}

              {/* Rest day / Freeze streak option */}
              {freezableDate && (
                <button
                  onClick={onUseStreakFreeze}
                  disabled={freezing}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium text-sky-600 dark:text-sky-400 border border-sky-500/25 hover:bg-sky-500/15 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
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
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium tabular-nums border shadow-xs transition-colors",
                    completedTaskCount >= taskCount
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-muted/50 text-muted-foreground border-border/60",
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
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ✓
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <button
                className="h-9 w-9 rounded-lg bg-card hover:bg-accent text-foreground transition-all duration-150 border border-border/70 shadow-xs flex items-center justify-center cursor-pointer active:scale-95 touch-manipulation select-none"
                title={isArabic ? "خيارات الهدف" : "Goal Options"}
                aria-label={isArabic ? "خيارات الهدف" : "Goal Options"}
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
              {onExportGoal && (
                <DropdownMenuItem
                  onClick={onExportGoal}
                  disabled={isExportingGoal}
                  className="cursor-pointer"
                >
                  {isExportingGoal ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>
                    {isExportingGoal
                      ? (isArabic ? "جارٍ التصدير..." : "Exporting...")
                      : (isArabic ? "تصدير الهدف" : "Export Goal")}
                  </span>
                </DropdownMenuItem>
              )}
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
          className="pt-2.5 sm:pt-3 border-t border-border/70 animate-in fade-in slide-in-from-top-3 duration-300 max-h-[32dvh] overflow-y-auto overscroll-contain scrollbar-thin sm:max-h-none sm:overflow-visible"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-1.5 sm:gap-2 sm:grid-cols-3">
            <div className="bg-muted/40 rounded-xl p-2.5 border border-border/70 hover:border-border transition-all duration-200 group shadow-xs">
              <p className="text-[9.5px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">
                {isArabic ? "تاريخ البدء" : "Start Date"}
              </p>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                {new Date(goal.created_at).toLocaleDateString(dateLocale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2.5 border border-border/70 hover:border-border transition-all duration-200 group shadow-xs">
              <p className="text-[9.5px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">
                {isArabic ? "تاريخ الانتهاء" : "End Date"}
              </p>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                {new Date(goal.estimated_completion_date).toLocaleDateString(
                  dateLocale,
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2.5 border border-border/70 hover:border-border transition-all duration-200 group shadow-xs">
              <p className="text-[9.5px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">
                {isArabic ? "الوقت المتبقي" : "Remaining Time"}
              </p>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                {goalEndDaysChip
                  ? goalEndDaysChip.text
                  : goal.total_days
                    ? `${formatNumberEn(goal.total_days)} ${isArabic ? "يوم" : "days"}`
                    : "—"}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2.5 border border-border/70 hover:border-border transition-all duration-200 group shadow-xs">
              <p className="text-[9.5px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">
                {isArabic ? "النقاط الحالية" : "Current Points"}
              </p>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                {formatNumberEn(goal.current_points)}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2.5 border border-border/70 hover:border-border transition-all duration-200 group shadow-xs">
              <p className="text-[9.5px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">
                {isArabic ? "النقاط المستهدفة" : "Target Points"}
              </p>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                {formatNumberEn(goal.target_points)}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2.5 border border-border/70 hover:border-border transition-all duration-200 group shadow-xs">
              <p className="text-[9.5px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <p className="text-xs font-bold text-foreground capitalize group-hover:text-primary transition-colors">
                {goal.status}
              </p>
            </div>
          </div>
          {goal.ai_summary && (
            <div className="mt-3 bg-primary/5 rounded-xl p-3 border border-primary/20 hover:border-primary/30 transition-all shadow-xs">
              <p className="text-[9.5px] text-primary font-bold mb-1 uppercase tracking-wider">
                {t.goalDescription}
              </p>
              <p className="text-xs text-foreground/85 leading-relaxed font-medium">
                {goal.ai_summary}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
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
