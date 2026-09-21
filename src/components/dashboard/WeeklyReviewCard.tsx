"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarRange, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { apiUrl, getAuthHeaders } from "@/lib/api";
import { getLocalWeekStartMonday } from "@/lib/task-periods";
import { cn } from "@/lib/utils";
import { PANEL_SURFACE } from "@/lib/surfaces";
import type { Language } from "@/lib/translations";

interface WeeklyReviewRow {
  week_start: string;
  summary: string;
  patterns: { label: string; detail: string }[];
  suggestion: string;
}

interface WeeklyReviewCardProps {
  goalId: string;
  language?: Language;
}

/**
 * The week read back to the user.
 *
 * Generation is explicit rather than automatic: a review costs a Gemini call,
 * and a week nobody looks at does not need one. Once generated it is cached in
 * `weekly_reviews` and read straight from there on later visits.
 */
export default function WeeklyReviewCard({
  goalId,
  language = "ar",
}: WeeklyReviewCardProps) {
  const isArabic = language === "ar";
  const supabase = createClient();
  const weekStart = getLocalWeekStartMonday();

  const [review, setReview] = useState<WeeklyReviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCached = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("weekly_reviews")
      .select("week_start, summary, patterns, suggestion")
      .eq("goal_id", goalId)
      .eq("week_start", weekStart)
      .maybeSingle();

    // The table only exists after supabase/migrations/0006_adaptive.sql runs;
    // until then the card simply shows its empty state.
    if (!fetchError && data) setReview(data as WeeklyReviewRow);
    setLoading(false);
  }, [goalId, supabase, weekStart]);

  useEffect(() => {
    setLoading(true);
    setReview(null);
    fetchCached();
  }, [fetchCached]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/goal/weekly-review"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ goalId, weekStart, language }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.error === "schema_outdated"
            ? isArabic
              ? "قاعدة البيانات ناقصة — شغّل supabase/migrations/0006_adaptive.sql"
              : "Database is missing columns — run supabase/migrations/0006_adaptive.sql"
            : isArabic
              ? data?.message_ar || "تعذر توليد المراجعة"
              : data?.message_en || "Could not generate the review",
        );
        return;
      }

      if (data?.empty) {
        setError(
          isArabic
            ? "ما بيه بيانات كافية لهذا الأسبوع بعد"
            : "Not enough activity this week yet",
        );
        return;
      }

      setReview({
        week_start: data.week_start || weekStart,
        summary: data.summary || "",
        patterns: Array.isArray(data.patterns) ? data.patterns : [],
        suggestion: data.suggestion || "",
      });
    } catch {
      setError(isArabic ? "تعذر الاتصال بالخادم" : "Could not reach the server");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className={cn(PANEL_SURFACE, "rounded-2xl p-3.5")}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <CalendarRange className="h-3.5 w-3.5" />
          </span>
          <h3 className="truncate text-xs font-extrabold text-foreground sm:text-sm">
            {isArabic ? "مراجعة الأسبوع" : "Weekly review"}
          </h3>
        </div>

        <button
          onClick={generate}
          disabled={generating || loading}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all duration-150 cursor-pointer active:translate-y-[1px] disabled:opacity-50",
            review
              ? "border-2 border-border/80 bg-card text-foreground shadow-[0_2px_0_0_var(--border)] active:shadow-none hover:bg-accent"
              : "bg-primary text-primary-foreground shadow-[0_2px_0_0_color-mix(in_oklch,var(--primary)_70%,black)] hover:brightness-105 active:shadow-none",
          )}
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : review ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {review
            ? isArabic
              ? "تحديث"
              : "Refresh"
            : isArabic
              ? "ولّد المراجعة"
              : "Generate"}
        </button>
      </div>

      {error && (
        <p className="mt-2.5 text-[11px] font-bold leading-snug text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded-lg bg-muted/60" />
          <div className="h-3 w-1/2 animate-pulse rounded-lg bg-muted/20" />
        </div>
      ) : review ? (
        <div className="mt-2.5 space-y-2.5">
          {review.summary && (
            <p className="text-[11px] leading-relaxed text-foreground font-medium sm:text-xs">
              {review.summary}
            </p>
          )}

          {review.patterns.length > 0 && (
            <ul className="space-y-1.5">
              {review.patterns.map((pattern, index) => (
                <li
                  key={`${pattern.label}-${index}`}
                  className="rounded-xl border-2 border-border/80 bg-muted/30 px-3 py-2 shadow-xs"
                >
                  <p className="text-[11px] font-black text-foreground">
                    {pattern.label}
                  </p>
                  {pattern.detail && (
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground font-medium">
                      {pattern.detail}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {review.suggestion && (
            <p className="rounded-xl border-2 border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold leading-relaxed text-primary shadow-xs">
              {review.suggestion}
            </p>
          )}
        </div>
      ) : (
        !error && (
          <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground/75">
            {isArabic
              ? "تقرير قصير من بيانات أسبوعك الفعلية — الأنماط اللي ما تنتبه لها بنفسك."
              : "A short report from your actual week — the patterns you can't see yourself."}
          </p>
        )
      )}
    </div>
  );
}
