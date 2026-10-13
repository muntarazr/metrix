"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Flame,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
import { type Language } from "@/lib/translations";
import {
  getDailyPerformanceLabel,
  parseDailyLogBreakdown,
} from "@/lib/daily-log-feedback";
import { cn, formatNumberEn, hasArabicText } from "@/lib/utils";

export interface DayCalendarLog {
  id: string;
  created_at: string;
  user_input: string;
  ai_score: number | null;
  ai_feedback: string;
  breakdown: unknown;
}

export interface DayLogDetailsModalProps {
  selectedDate: string | null;
  onClose: () => void;
  selectedLogs: DayCalendarLog[];
  isArabic: boolean;
  locale: string;
  language: Language;
  selectedDayIsFrozen: boolean;
  selectedDayBadge: "none" | "strong" | "exceptional";
  selectedDayBadgeLabel?: string | null;
  dayDetailLabel: string;
  noLogsForDayLabel: string;
}

export function DayLogDetailsModal({
  selectedDate,
  onClose,
  selectedLogs,
  isArabic,
  locale,
  language,
  selectedDayIsFrozen,
  selectedDayBadge,
  selectedDayBadgeLabel,
  dayDetailLabel,
  noLogsForDayLabel,
}: DayLogDetailsModalProps) {
  if (!selectedDate || typeof document === "undefined") {
    return null;
  }

  const isRTLText = hasArabicText;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-background/60 p-0 backdrop-blur-md sm:p-4 lg:items-center"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[calc(100dvh-0.75rem-env(safe-area-inset-top,0px))] w-full max-w-none flex-col overflow-hidden rounded-t-[24px] border border-border bg-card shadow-2xl shadow-black/10 sm:max-h-[85vh] sm:w-[min(calc(100vw-2rem),28rem)] sm:rounded-[24px] lg:w-[min(calc(100vw-3rem),42rem)] lg:max-w-2xl lg:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-4 pb-3 sm:px-5 sm:pb-4">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/75 uppercase tracking-wider">
              {dayDetailLabel}
            </p>
            <p className="mt-1 text-[15px] font-extrabold text-foreground sm:text-base">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                locale,
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                },
              )}
            </p>
            {selectedDayIsFrozen && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30">
                <span>❄️</span>
                <span>{isArabic ? "يوم راحة تكتيكي (محمي)" : "Tactical Rest Day (Protected)"}</span>
              </div>
            )}
            {!selectedDayIsFrozen && selectedDayBadgeLabel && (
              <div
                className={cn(
                  "mt-2.5 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1",
                  selectedDayBadge === "exceptional"
                    ? "bg-primary/12 text-primary ring-primary/25"
                    : "bg-chart-2/12 text-chart-2 ring-chart-2/20",
                )}
              >
                {selectedDayBadgeLabel}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2.5 pt-1">
            {selectedLogs.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-primary/12 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/25 shadow-sm">
                <Flame className="h-3.5 w-3.5" />
                <span>
                  +
                  {formatNumberEn(
                    selectedLogs.reduce(
                      (sum, log) => sum + (log.ai_score || 0),
                      0,
                    ),
                  )}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:space-y-3.5 sm:p-5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/20 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
          {selectedDayIsFrozen && selectedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center sm:py-14">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-500 border border-sky-500/25 text-2xl">
                ❄️
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-bold text-foreground">
                  {isArabic ? "يوم راحة تكتيكي مفعل" : "Tactical Rest Day Active"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isArabic
                    ? "تم استخدام تصريح الراحة لحماية سلسلة الاستمرار واحتساب متوسط النقاط اليومية لهذا اليوم."
                    : "A rest pass was used to protect your streak and award daily average points for this day."}
                </p>
              </div>
            </div>
          ) : selectedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground sm:py-14">
              <CalendarDays className="h-10 w-10 opacity-25" />
              <span className="text-sm font-semibold">{noLogsForDayLabel}</span>
            </div>
          ) : (
            selectedLogs
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )
              .map((log) => {
                const inputRTL = isRTLText(log.user_input);
                const feedbackRTL = log.ai_feedback
                  ? isRTLText(log.ai_feedback)
                  : false;
                const performanceMeta = parseDailyLogBreakdown(
                  log.breakdown,
                ).meta;
                const performanceLabel = getDailyPerformanceLabel(
                  performanceMeta,
                  language,
                );

                return (
                  <div
                    key={log.id}
                    className="space-y-2.5 rounded-xl border border-border/70 bg-muted/12 p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground/75">
                        {new Date(log.created_at).toLocaleTimeString(
                          locale,
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 rounded-xl bg-primary/12 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-primary/25 shadow-sm">
                        <Star className="h-3 w-3 fill-current" />
                        <span>
                          +{formatNumberEn(log.ai_score ?? 0)}
                        </span>
                      </div>
                    </div>

                    {performanceLabel && (
                      <div
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 shadow-sm",
                          performanceMeta?.performance_tier ===
                            "exceptional"
                            ? "bg-primary/12 text-primary ring-primary/25"
                            : performanceMeta?.performance_tier === "strong"
                              ? "bg-chart-2/12 text-chart-2 ring-chart-2/20"
                              : performanceMeta?.performance_tier === "weak"
                                ? "bg-destructive/12 text-destructive ring-destructive/25"
                                : "bg-foreground/12 text-foreground ring-foreground/25",
                        )}
                      >
                        {performanceLabel}
                      </div>
                    )}

                    <p
                      className="text-sm font-semibold leading-relaxed text-foreground"
                      dir={inputRTL ? "rtl" : "ltr"}
                      style={{ textAlign: inputRTL ? "right" : "left" }}
                    >
                      {log.user_input}
                    </p>

                    {log.ai_feedback && (
                      <div className="flex items-start gap-2.5 border-t border-border/45 pt-2.5 text-xs text-muted-foreground/75">
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/50" />
                        <p
                          className="italic leading-relaxed"
                          dir={feedbackRTL ? "rtl" : "ltr"}
                          style={{
                            textAlign: feedbackRTL ? "right" : "left",
                          }}
                        >
                          {log.ai_feedback}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
