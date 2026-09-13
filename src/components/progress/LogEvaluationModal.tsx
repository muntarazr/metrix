"use client";

import { useState } from "react";
import {
  X,
  Trophy,
  Flame,
  AlertCircle,
  Sparkles,
  MessageSquare,
  ArrowUp,
  RotateCcw,
  Calendar,
  Check,
} from "lucide-react";
import { parseDailyLogBreakdown, getDailyPerformanceLabel } from "@/lib/daily-log-feedback";
import { formatNumberEn, textDirectionFor } from "@/lib/utils";
import { translations, type Language } from "@/lib/translations";
import ProgressUpdatesStep, { type ProgressUpdatesData } from "./ProgressUpdatesStep";

export interface LogItem {
  id: string;
  created_at: string;
  user_input: string;
  ai_score: number | null;
  ai_feedback: string;
  breakdown: unknown;
}

interface LogEvaluationModalProps {
  log: LogItem;
  goal: {
    id: string;
    title: string;
    current_points?: number;
    target_points?: number;
  };
  streak?: number;
  daysRemaining?: number | null;
  language?: Language;
  onClose: () => void;
}

export default function LogEvaluationModal({
  log,
  goal,
  streak = 1,
  daysRemaining = null,
  language = "ar",
  onClose,
}: LogEvaluationModalProps) {
  const t = translations[language];
  const isArabic = language === "ar";
  const [showAnimatedUpdates, setShowAnimatedUpdates] = useState(false);

  const breakdownData = parseDailyLogBreakdown(log.breakdown);
  const isMilestone = Boolean(breakdownData.milestone);
  const milestone = breakdownData.milestone;
  const performanceMeta = breakdownData.meta;
  const performanceTier = performanceMeta?.performance_tier ?? "average";
  const performanceLabel =
    getDailyPerformanceLabel(performanceMeta, language) ||
    (isMilestone
      ? isArabic
        ? "إنجاز مرحلي استثنائي"
        : "Milestone Achievement"
      : isArabic
        ? "تقييم اليوم"
        : "Day Review");

  const score = log.ai_score ?? 0;
  const inputDir = textDirectionFor(log.user_input);
  const feedbackDir = textDirectionFor(log.ai_feedback);

  const formattedDate = new Date(log.created_at).toLocaleDateString(
    isArabic ? "ar-SA" : "en-US",
    { weekday: "long", month: "long", day: "numeric" },
  );
  const formattedTime = new Date(log.created_at).toLocaleTimeString(
    isArabic ? "ar-SA" : "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );

  // Synthesize updates snapshot for this log so the user can re-watch the animation
  const updatesData: ProgressUpdatesData = {
    logType: isMilestone ? "milestone" : "daily",
    milestoneTitle: milestone?.name,
    milestoneTier: milestone?.tier,
    prevPoints: Math.max(0, (goal.current_points ?? score) - score),
    newPoints: goal.current_points ?? score,
    targetPoints: goal.target_points ?? 100,
    deltaPoints: score,
    prevStreak: Math.max(0, streak - 1),
    newStreak: streak,
    prevDaysRemaining: daysRemaining !== null ? daysRemaining + 1 : null,
    newDaysRemaining: daysRemaining,
    prevTasksDone: Math.max(0, (breakdownData.items?.length || 1) - 1),
    newTasksDone: Math.max(1, breakdownData.items?.length || 1),
    totalTasks: Math.max(1, breakdownData.items?.length || 1),
  };

  if (showAnimatedUpdates) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 border border-border shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-border/40">
            <span className="text-xs font-extrabold text-muted-foreground">
              {isArabic ? "حركة التحديثات" : "Updates Animation"}
            </span>
            <button
              onClick={() => setShowAnimatedUpdates(false)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ProgressUpdatesStep
            updates={updatesData}
            language={language}
            onDone={() => setShowAnimatedUpdates(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
      <div
        className="bg-card rounded-[24px] w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col border border-border shadow-2xl animate-in zoom-in-95 duration-300"
        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border/70 flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isMilestone
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                  : "bg-primary/10 border-primary/20 text-primary"
              }`}
            >
              {isMilestone ? <Trophy className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-foreground truncate">
                {isMilestone
                  ? milestone?.name || (isArabic ? "إنجاز كبير" : "Major Milestone")
                  : isArabic
                    ? "تفاصيل تسجيل الإنجاز"
                    : "Log Details & Evaluation"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{formattedDate}</span>
                <span>•</span>
                <span>{formattedTime}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/70 rounded-xl text-muted-foreground transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Badge & Score Ribbon */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                isMilestone
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : performanceTier === "exceptional"
                    ? "bg-primary/15 border-primary/25 text-primary"
                    : "bg-chart-2/15 border-chart-2/25 text-chart-2"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{performanceLabel}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-black shadow-sm">
              <ArrowUp className="w-3.5 h-3.5" />
              <span>+{formatNumberEn(score)}</span>
              <span className="text-xs font-semibold opacity-85">{t.points}</span>
            </div>
          </div>

          {/* User Input Section */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isArabic ? "ما قمت بتسجيله:" : "What you logged:"}
            </span>
            <div
              className="p-3.5 rounded-2xl bg-muted/20 border border-border/80 text-foreground text-sm font-medium leading-relaxed whitespace-pre-wrap"
              dir={inputDir}
              style={{ textAlign: inputDir === "rtl" ? "right" : "left" }}
            >
              {log.user_input}
            </div>
          </div>

          {/* AI Coach Feedback Section */}
          {log.ai_feedback && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>{isArabic ? "تقييم المدرب الذكي:" : "AI Coach Feedback:"}</span>
              </span>
              <div
                className="p-4 rounded-2xl bg-primary/5 border border-primary/15 text-foreground text-sm font-medium leading-relaxed italic"
                dir={feedbackDir}
                style={{ textAlign: feedbackDir === "rtl" ? "right" : "left" }}
              >
                &quot;{log.ai_feedback}&quot;
              </div>
            </div>
          )}

          {/* Milestone Image if attached */}
          {milestone?.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-amber-500/25 shadow-sm">
              <img
                src={milestone.imageUrl}
                alt={milestone.name || "Milestone"}
                className="w-full h-48 object-cover"
              />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/10 shrink-0 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAnimatedUpdates(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary font-bold text-sm transition-all flex items-center justify-center gap-2 border border-primary/20 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isArabic ? "مشاهدة التحديثات والأنيميشن" : "Watch Animated Updates"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-sm transition-all border border-border active:scale-95 cursor-pointer"
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
