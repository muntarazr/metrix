"use client";

import { useMemo, useState } from "react";
import { type Language } from "@/lib/translations";
import { getLocalDateKey } from "@/lib/task-periods";
import { parseDailyLogBreakdown } from "@/lib/daily-log-feedback";
import { cn, formatNumberEn, localeWithEnglishDigits } from "@/lib/utils";
import { PANEL_SURFACE, WELL_SURFACE } from "@/lib/surfaces";
import {
  DayCalendarCell,
  getDayBadgeLabel,
  parseLocalDay,
  type CalendarCell,
  type DayCalendarTooltipData,
} from "./DayCalendarCell";
import {
  DayLogDetailsModal,
  type DayCalendarLog,
} from "./DayLogDetailsModal";
import { DayCalendarHeader } from "./DayCalendarHeader";
import { DayCalendarFooter } from "./DayCalendarFooter";
import { DayCalendarSkeleton } from "./DayCalendarSkeleton";
import { DayCalendarTooltip } from "./DayCalendarTooltip";

export type Log = DayCalendarLog;

export interface DayCalendarGridProps {
  logs: Log[];
  goalStartDate: string;
  dailyCap: number;
  language?: Language;
  loading?: boolean;
  onViewLogDetails?: (log: Log) => void;
  streakFreezes?: string[];
  className?: string;
}

export default function DayCalendarGrid({
  logs,
  goalStartDate,
  dailyCap,
  language = "ar",
  loading = false,
  onViewLogDetails: _onViewLogDetails,
  streakFreezes = [],
  className,
}: DayCalendarGridProps) {
  const isArabic = language === "ar";
  const labels = {
    currentMonth: isArabic ? "الحالي" : "Current",
    monthPoints: isArabic ? "نقاط" : "Points",
    loggedDays: isArabic ? "مسجل" : "Logged",
    daysLeft: isArabic ? "متبقي" : "Left",
    less: isArabic ? "أقل" : "Less",
    more: isArabic ? "أكثر" : "More",
    noLogsForDay: isArabic ? "لا يوجد سجل لهذا اليوم" : "No logs for this day",
    dayDetail: isArabic ? "تفاصيل اليوم" : "Day detail",
    logs: isArabic ? "سجل" : "logs",
    points: isArabic ? "نقطة" : "pts",
    noActivity: isArabic ? "لا يوجد نشاط" : "No activity",
    beforeStart: isArabic ? "قبل بداية الهدف" : "Before goal start",
    futureDay: isArabic ? "يوم مستقبلي" : "Future day",
  };

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const goalStart = useMemo(
    () => parseLocalDay(goalStartDate),
    [goalStartDate],
  );
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => today.getFullYear());
  const [tooltip, setTooltip] = useState<DayCalendarTooltipData | null>(null);

  const logsByDate = useMemo(() => {
    const map = new Map<string, Log[]>();
    logs.forEach((log) => {
      const dateKey = getLocalDateKey(new Date(log.created_at));
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)?.push(log);
    });
    return map;
  }, [logs]);

  const locale = localeWithEnglishDigits(language);
  const monthNameFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
      }),
    [locale],
  );
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    // Jan 7, 2024 = Sunday — gives Sun-Sat order (Sunday first)
    return Array.from({ length: 7 }, (_, index) =>
      formatter.format(new Date(2024, 0, 7 + index)),
    );
  }, [locale]);
  const todayWeekdayIndex = today.getDay();

  const { calendarCells, monthStats } = useMemo(() => {
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const monthStart = new Date(viewYear, viewMonth, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(viewYear, viewMonth, daysInMonth);
    monthEnd.setHours(0, 0, 0, 0);

    const cells: Array<CalendarCell | null> = Array.from(
      { length: 42 },
      (_, index) => {
        const dayNum = index - firstDayIndex + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
          return null;
        }

        const date = new Date(viewYear, viewMonth, dayNum);
        date.setHours(0, 0, 0, 0);
        const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        const dayLogs = logsByDate.get(dateKey) || [];
        const totalPoints = dayLogs.reduce(
          (sum, log) => sum + (log.ai_score || 0),
          0,
        );
        const badge = dayLogs.some(
          (log) =>
            parseDailyLogBreakdown(log.breakdown).meta?.badge === "exceptional",
        )
          ? "exceptional"
          : dayLogs.some(
                (log) =>
                  parseDailyLogBreakdown(log.breakdown).meta?.badge ===
                  "strong",
              )
            ? "strong"
            : "none";

        const isFrozen = streakFreezes.includes(dateKey);

        return {
          date: dateKey,
          dayNum,
          isBeforeStart: date < goalStart,
          isAfterToday: date > today,
          isToday: date.getTime() === today.getTime(),
          hasLogs: dayLogs.length > 0,
          logCount: dayLogs.length,
          totalPoints,
          badge,
          isFrozen,
        };
      },
    );

    const validMonthCells = cells.filter(
      (cell): cell is CalendarCell => cell !== null,
    );
    const loggedCells = validMonthCells.filter(
      (cell) => !cell.isBeforeStart && !cell.isAfterToday && cell.hasLogs,
    );

    return {
      calendarCells: cells,
      monthStats: {
        loggedDays: loggedCells.length,
        totalPoints: loggedCells.reduce(
          (sum, cell) => sum + cell.totalPoints,
          0,
        ),
        totalEntries: loggedCells.reduce((sum, cell) => sum + cell.logCount, 0),
        daysRemaining:
          monthStart > today
            ? daysInMonth
            : monthEnd < today
              ? 0
              : Math.max(0, daysInMonth - today.getDate()),
      },
    };
  }, [goalStart, logsByDate, today, viewDate, streakFreezes]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "2-digit",
      }).format(viewDate),
    [locale, viewDate],
  );

  const monthPickerItems = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const date = new Date(pickerYear, monthIndex, 1);
        return {
          monthIndex,
          label: monthNameFormatter.format(date),
          isActive:
            viewDate.getFullYear() === pickerYear &&
            viewDate.getMonth() === monthIndex,
        };
      }),
    [monthNameFormatter, pickerYear, viewDate],
  );

  const monthSummaryItems = [
    {
      key: "points",
      label: labels.monthPoints,
      value: formatNumberEn(monthStats.totalPoints),
      accent: "text-primary",
    },
    {
      key: "logged",
      label: labels.loggedDays,
      value: formatNumberEn(monthStats.loggedDays),
      accent: "text-foreground",
    },
    {
      key: "remaining",
      label: labels.daysLeft,
      value: formatNumberEn(monthStats.daysRemaining),
      accent: "text-muted-foreground",
    },
  ];

  const selectedLogs = selectedDate ? logsByDate.get(selectedDate) || [] : [];
  const selectedDayIsFrozen = selectedDate ? streakFreezes.includes(selectedDate) : false;
  const selectedDayBadge = selectedLogs.some(
    (log) =>
      parseDailyLogBreakdown(log.breakdown).meta?.badge === "exceptional",
  )
    ? "exceptional"
    : selectedLogs.some(
          (log) =>
            parseDailyLogBreakdown(log.breakdown).meta?.badge === "strong",
        )
      ? "strong"
      : "none";
  const selectedDayBadgeLabel = getDayBadgeLabel(selectedDayBadge, language);

  const handlePrevMonth = () => {
    setSelectedDate(null);
    setTooltip(null);
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(null);
    setTooltip(null);
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleMonthPickerOpenChange = (open: boolean) => {
    setIsMonthPickerOpen(open);
    if (open) {
      setPickerYear(viewDate.getFullYear());
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    setSelectedDate(null);
    setTooltip(null);
    setViewDate(new Date(pickerYear, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

  if (loading) {
    return <DayCalendarSkeleton className={className} />;
  }

  const isViewingCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  return (
    <>
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-2xl p-2 sm:p-2.5 md:p-3",
          PANEL_SURFACE,
          className,
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DayCalendarHeader
          viewDate={viewDate}
          today={today}
          isArabic={isArabic}
          monthLabel={monthLabel}
          pickerYear={pickerYear}
          isMonthPickerOpen={isMonthPickerOpen}
          monthPickerItems={monthPickerItems}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onOpenChange={handleMonthPickerOpenChange}
          onPickerYearChange={setPickerYear}
          onSelectMonth={handleSelectMonth}
          onResetToToday={() => {
            setSelectedDate(null);
            setTooltip(null);
            setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
          }}
        />

        <div className="mt-1 flex flex-1 flex-col min-h-0 sm:mt-1.5">
          <div
            className={cn(
              "mb-1 grid grid-cols-7 gap-0.5 rounded-lg p-0.5 sm:mb-1.5 sm:gap-1 sm:p-1",
              WELL_SURFACE,
            )}
            dir="ltr"
          >
            {weekdayLabels.map((dayLabel, index) => {
              const isCurrentWeekday =
                isViewingCurrentMonth && index === todayWeekdayIndex;

              return (
                <div
                  key={`${dayLabel}-${index}`}
                  aria-current={isCurrentWeekday ? "date" : undefined}
                  className={cn(
                    "flex h-5 sm:h-6 items-center justify-center rounded-md border text-[10px] font-bold leading-none transition-colors sm:text-xs",
                    isCurrentWeekday
                      ? "border-primary/45 bg-primary/15 text-primary shadow-xs"
                      : "border-transparent bg-card/60 text-muted-foreground/75",
                  )}
                >
                  {dayLabel}
                </div>
              );
            })}
          </div>

          <div
            className="grid flex-1 grid-cols-7 grid-rows-6 gap-0.5 min-h-0 sm:gap-1 md:h-full"
            dir="ltr"
          >
            {calendarCells.map((day, index) => (
              <DayCalendarCell
                key={day ? day.date : `blank-${index}`}
                day={day}
                index={index}
                selectedDate={selectedDate}
                dailyCap={dailyCap}
                language={language}
                isArabic={isArabic}
                logsLabel={labels.logs}
                noActivityLabel={labels.noActivity}
                onSelectDate={setSelectedDate}
                onSetTooltip={setTooltip}
                onClearTooltip={() => setTooltip(null)}
              />
            ))}
          </div>
        </div>

        <DayCalendarFooter
          monthSummaryItems={monthSummaryItems}
          lessLabel={labels.less}
          moreLabel={labels.more}
        />
      </div>

      <DayCalendarTooltip
        tooltip={tooltip}
        dailyCap={dailyCap}
        labels={labels}
      />

      <DayLogDetailsModal
        selectedDate={selectedDate}
        onClose={() => setSelectedDate(null)}
        selectedLogs={selectedLogs}
        isArabic={isArabic}
        locale={locale}
        language={language}
        selectedDayIsFrozen={selectedDayIsFrozen}
        selectedDayBadge={selectedDayBadge}
        selectedDayBadgeLabel={selectedDayBadgeLabel}
        dayDetailLabel={labels.dayDetail}
        noLogsForDayLabel={labels.noLogsForDay}
      />
    </>
  );
}
