"use client";

import { useState } from "react";
import {
  X,
  Trophy,
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  Flame,
  ImageIcon,
  Copy,
  Upload,
  Loader2,
} from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import { getDailyPerformanceLabel } from "@/lib/daily-log-feedback";
import type { TaskRow } from "@/lib/task-hierarchy";
import GoalCompletionCelebration from "../goal/GoalCompletionCelebration";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import {
  formatLocalizedNumber,
  formatPointsDisplay,
  getAccountabilityCopy,
  getPerformanceStyles,
  splitResultText,
  type EvaluationResult,
  type LogMode,
  type PendingMilestoneImage,
  type ProgressLogDialogProps,
} from "./progress-log-helpers";

interface EvaluationResultsModalProps {
  evaluation: EvaluationResult;
  mode: LogMode;
  pendingMilestoneImage?: PendingMilestoneImage | null;
  goal: ProgressLogDialogProps["goal"];
  tasks: TaskRow[];
  dailyCap: number;
  language: Language;
  showCelebration: boolean;
  setShowCelebration: (val: boolean) => void;
  onNext: () => void;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EvaluationResultsModal({
  evaluation,
  mode,
  pendingMilestoneImage,
  goal,
  tasks,
  language,
  showCelebration,
  setShowCelebration,
  onNext,
  onClose,
  onSuccess,
}: EvaluationResultsModalProps) {
  const t = translations[language];
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [uploadedMilestoneImageUrl, setUploadedMilestoneImageUrl] = useState<
    string | null
  >(null);
  const [promptCopied, setPromptCopied] = useState(false);

  const isArabic = language === "ar";
  const accountabilityCopy = getAccountabilityCopy(language);

  const performanceTier =
    evaluation.performance_meta?.performance_tier ?? "average";
  const performanceLabel =
    evaluation.day_label ||
    getDailyPerformanceLabel(evaluation.performance_meta, language) ||
    (language === "ar" ? "تقييم اليوم" : "Day Review");
  const isMilestoneEvaluation =
    Boolean(pendingMilestoneImage) || mode === "milestone";
  const performanceStyles = getPerformanceStyles(
    performanceTier,
    isMilestoneEvaluation,
  );
  const HeroIcon = isMilestoneEvaluation
    ? Trophy
    : performanceTier === "weak"
      ? AlertCircle
      : Flame;
  const finalPerformanceLabel = isMilestoneEvaluation
    ? isArabic
      ? "إنجاز مرحلي استثنائي"
      : "Milestone Achievement"
    : performanceLabel;

  const scoreDisplay = formatPointsDisplay(
    evaluation.total_points_awarded,
    language,
    t.points,
  );
  const bonusDisplay = formatPointsDisplay(
    evaluation.bonus_points,
    language,
    t.points,
  );
  const messageLines = splitResultText(evaluation.coach_message, language);
  const comparisonLines = evaluation.comparison_message
    ? splitResultText(evaluation.comparison_message, language)
    : [];
  const warningLines = evaluation.warning_message
    ? splitResultText(evaluation.warning_message, language)
    : [];
  const sectionLabelClass = isArabic
    ? "text-[12px] font-semibold text-muted-foreground"
    : "text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground";
  const badgeTextClass = isArabic
    ? "text-[13px] font-semibold"
    : "text-[11px] font-bold uppercase tracking-[0.18em]";

  const detailItems = (
    evaluation.subtask_breakdown ||
    evaluation.task_breakdown ||
    []
  ).map((item) => {
    const points = Number(item.points) || 0;
    const status = item.status || "unknown";
    const taskLabel =
      tasks.find((tk: TaskRow) => tk.id === item.task_id)?.task_description ||
      (item as { task_description?: string }).task_description ||
      item.reason ||
      t.generalProgress;
    const statusLabel =
      status === "done"
        ? accountabilityCopy.done
        : status === "partial"
          ? accountabilityCopy.partial
          : status === "missed"
            ? accountabilityCopy.missed
            : accountabilityCopy.unknown;
    const statusClass =
      status === "done"
        ? "border-foreground/25 bg-foreground/12 text-foreground"
        : status === "partial"
          ? "border-border bg-muted/60 text-muted-foreground"
          : status === "missed"
            ? "border-destructive/25 bg-destructive/12 text-destructive"
            : "border-border bg-muted/60 text-muted-foreground";

    return {
      key: `${item.task_id}-${status}`,
      label: taskLabel,
      points,
      timeBonus: item.time_bonus || 0,
      statusLabel,
      statusClass,
    };
  });

  const hasTaskDetails =
    detailItems.length > 0 || Boolean(evaluation.bonus?.points);
  const hasSessionProgress = Boolean(
    (evaluation.session_entries_count &&
      evaluation.session_entries_count > 1) ||
      (evaluation.session_total_points || 0) > evaluation.total_points_awarded,
  );
  const resultShellClass = isArabic ? "text-right" : "text-left";
  const dayTotalText = `${accountabilityCopy.dayTotal}: ${formatLocalizedNumber(evaluation.session_total_points || evaluation.total_points_awarded, language)} ${t.points}`;
  const checkinsText = `${accountabilityCopy.checkins}: ${formatLocalizedNumber(evaluation.session_entries_count || 1, language)}`;

  const handleCopyMilestonePrompt = async () => {
    if (!pendingMilestoneImage?.imagePrompt?.trim()) return;
    try {
      await navigator.clipboard.writeText(pendingMilestoneImage.imagePrompt);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 2200);
    } catch (error) {
      setImageUploadError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر نسخ البرومبت"
            : "Could not copy prompt",
      );
    }
  };

  const handleMilestoneImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !pendingMilestoneImage || imageUploadLoading) return;

    setImageUploadLoading(true);
    setImageUploadError(null);
    try {
      const formData = new FormData();
      formData.append("goalId", goal.id);
      formData.append("logId", pendingMilestoneImage.logId);
      formData.append("image", file);

      const response = await fetch(apiUrl("/api/goal/milestone/image"), {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (language === "ar"
              ? "تعذر رفع صورة الإنجاز"
              : "Could not upload milestone image"),
        );
      }

      setUploadedMilestoneImageUrl(data?.imageUrl || null);
      window.dispatchEvent(
        new CustomEvent("challenge-log-updated", {
          detail: { goalId: goal.id },
        }),
      );
    } catch (error) {
      setImageUploadError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر رفع صورة الإنجاز"
            : "Could not upload milestone image",
      );
    } finally {
      setImageUploadLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-card rounded-[22px] w-full max-w-md max-h-[88dvh] overflow-hidden animate-in zoom-in-95 duration-300 border border-border shadow-sm flex flex-col">
        <div
          className={`p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain scrollbar-thin flex-1 ${resultShellClass}`}
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          {/* Header Hero Section */}
          <div className="flex items-start gap-3">
            <div
              className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[18px] border ${performanceStyles.hero}`}
            >
              <HeroIcon className="h-7 w-7" />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div
                className={`inline-flex items-center rounded-full border px-3 py-1 ${badgeTextClass} ${performanceStyles.badge}`}
              >
                {finalPerformanceLabel}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="text-2xl sm:text-[1.9rem] font-black leading-none text-foreground">
                  {scoreDisplay}
                </h3>
                <span className="text-sm font-medium text-muted-foreground">
                  {hasSessionProgress
                    ? accountabilityCopy.addedNow
                    : t.pointsAwarded}
                </span>
                {evaluation.bonus_points > 0 && (
                  <span className="inline-flex items-center rounded-full border border-foreground/15 bg-foreground/12 px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
                    {bonusDisplay}
                  </span>
                )}
              </div>

              {hasSessionProgress ? (
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <p className="font-medium">{dayTotalText}</p>
                  <p className="font-medium">{checkinsText}</p>
                </div>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  {t.progressAdded}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="p-2 sm:p-1.5 touch-manipulation text-muted-foreground/70 hover:text-foreground hover:bg-muted rounded-full transition-colors shrink-0 -mt-1 cursor-pointer"
              aria-label={isArabic ? "إغلاق" : "Close"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Coach Message Summary */}
          <div
            className={`rounded-[18px] border px-4 py-4 ${performanceStyles.summary}`}
          >
            <div className="space-y-1.5">
              {messageLines.map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className={cn(
                    "font-semibold text-foreground",
                    isArabic ? "text-[15px] leading-8" : "text-sm leading-7",
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* Milestone Image Prompt & Upload Card */}
          {pendingMilestoneImage && (
            <div className="rounded-[18px] border border-primary/25 bg-primary/12 p-4 text-primary">
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 w-full sm:flex-1 space-y-2">
                  <p className="text-sm font-black">
                    {isArabic
                      ? "أنشئ الصورة خارج التطبيق ثم ارفعها"
                      : "Generate it outside, then upload here"}
                  </p>
                  <p className="text-xs font-medium leading-6 text-primary/75">
                    {uploadedMilestoneImageUrl
                      ? isArabic
                        ? "تم رفع الصورة وربطها ببطاقة الإنجاز."
                        : "Image uploaded and attached to the milestone card."
                      : isArabic
                        ? "انسخ البرومبت، استخدم أي AI خارجي، ثم ارفع النتيجة."
                        : "Copy prompt, use any external AI, then upload the result."}
                  </p>
                  {imageUploadError && (
                    <p className="rounded-xl border border-destructive/25 bg-destructive/12 px-3 py-2 text-xs font-bold text-destructive">
                      {imageUploadError}
                    </p>
                  )}
                  {pendingMilestoneImage.imagePrompt.trim() && (
                    <div className="space-y-2">
                      <div className="max-h-32 overflow-y-auto overscroll-contain break-words rounded-xl border border-primary/25 bg-white/60 px-3 py-2 text-[11px] leading-5 text-primary dark:bg-black/15">
                        {pendingMilestoneImage.imagePrompt}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyMilestonePrompt}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 cursor-pointer"
                      >
                        <Copy className="h-4 w-4" />
                        {promptCopied
                          ? isArabic
                            ? "تم النسخ"
                            : "Copied"
                          : isArabic
                            ? "نسخ البرومبت"
                            : "Copy prompt"}
                      </button>
                    </div>
                  )}
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/12 px-4 py-3 text-sm font-black text-primary transition hover:bg-primary/12">
                    {imageUploadLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {imageUploadLoading
                      ? isArabic
                        ? "جاري رفع الصورة..."
                        : "Uploading image..."
                      : uploadedMilestoneImageUrl
                        ? isArabic
                          ? "استبدال الصورة"
                          : "Replace image"
                        : isArabic
                          ? "رفع الصورة"
                          : "Upload image"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleMilestoneImageUpload}
                      disabled={imageUploadLoading}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Message Card */}
          {evaluation.comparison_message && (
            <div className="rounded-[18px] border border-border bg-muted/12 px-4 py-3.5">
              <p className={sectionLabelClass}>
                {accountabilityCopy.comparison}
              </p>
              <div className="mt-1.5 space-y-1">
                {comparisonLines.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className={cn(
                      "text-foreground/90",
                      isArabic
                        ? "text-[14px] leading-7 font-medium"
                        : "text-sm leading-6 font-medium",
                    )}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Warning Message Card */}
          {evaluation.warning_message && (
            <div className="rounded-[18px] border border-destructive/25 bg-destructive/12 px-4 py-3.5 text-destructive">
              <p className={sectionLabelClass}>
                {accountabilityCopy.warning}
              </p>
              <div className="mt-1.5 space-y-1">
                {warningLines.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className={cn(
                      "font-semibold",
                      isArabic
                        ? "text-[14px] leading-7"
                        : "text-sm leading-6",
                    )}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Task Details Collapsible */}
          {hasTaskDetails && (
            <Collapsible
              open={showTaskDetails}
              onOpenChange={setShowTaskDetails}
            >
              <div className="rounded-[18px] border border-border bg-muted/12">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/20 cursor-pointer"
                    aria-expanded={showTaskDetails}
                  >
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-semibold text-foreground",
                          isArabic ? "text-[15px]" : "text-sm",
                        )}
                      >
                        {showTaskDetails
                          ? accountabilityCopy.hideTasks
                          : accountabilityCopy.showTasks}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-muted-foreground",
                          isArabic ? "text-[13px] leading-6" : "text-xs",
                        )}
                      >
                        {formatLocalizedNumber(detailItems.length, language)}{" "}
                        {accountabilityCopy.scoredTasks}.{" "}
                        {accountabilityCopy.detailsHint}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        {formatLocalizedNumber(detailItems.length, language)}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-300",
                          showTaskDetails && "rotate-180",
                        )}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="border-t border-border px-3 pb-3 pt-2">
                    <div className="max-h-60 space-y-2 overflow-y-auto pe-1">
                      {detailItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center gap-3 rounded-[16px] border border-border bg-background px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "truncate font-medium text-foreground",
                                isArabic
                                  ? "text-[14px] leading-7"
                                  : "text-sm",
                              )}
                            >
                              {item.label}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                  item.statusClass,
                                )}
                              >
                                {item.statusLabel}
                              </span>
                              {item.timeBonus > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/75">
                                  <ArrowUpRight className="h-3 w-3" />
                                  {formatPointsDisplay(
                                    item.timeBonus,
                                    language,
                                    t.points,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className={cn(
                              "shrink-0 font-black text-foreground",
                              isArabic ? "text-[15px]" : "text-sm",
                            )}
                          >
                            {formatPointsDisplay(
                              item.points,
                              language,
                              t.points,
                            )}
                          </div>
                        </div>
                      ))}

                      {evaluation.bonus && evaluation.bonus.points > 0 && (
                        <div className="flex items-center gap-3 rounded-[16px] border border-foreground/15 bg-foreground/12 px-3 py-2.5 text-foreground/75">
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "font-semibold",
                                isArabic
                                  ? "text-[14px] leading-7"
                                  : "text-sm",
                              )}
                            >
                              {t.bonus}: {evaluation.bonus.reason}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "shrink-0 font-black",
                              isArabic ? "text-[15px]" : "text-sm",
                            )}
                          >
                            {formatPointsDisplay(
                              evaluation.bonus.points,
                              language,
                              t.points,
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          <button
            onClick={onNext}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-[18px] font-bold text-base hover:opacity-90 transition-all shadow-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t.nextStep || (isArabic ? "التالي" : "Next")}</span>
            <span className="text-xs opacity-75">({t.continueJourney})</span>
          </button>

          {showCelebration && (
            <GoalCompletionCelebration
              goalTitle={goal.title}
              language={language}
              onClose={() => {
                setShowCelebration(false);
                onSuccess();
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
