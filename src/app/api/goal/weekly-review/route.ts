import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { GeminiQuotaError, GeminiService } from "@/lib/gemini";
import { computeGoalProjection } from "@/lib/goal-projection";
import { requireAiQuota } from "@/lib/ai-quota";

/**
 * Builds one week's review for a goal.
 *
 * The aggregation happens here rather than in the prompt: Gemini is asked to
 * read counts, not to count. `weekStart` is supplied by the client because the
 * Monday a week starts on is a local-timezone question and the server has no
 * business guessing it (see src/lib/task-periods.ts).
 */

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

interface CheckinRow {
  task_id: string;
  period_start: string;
  completed: boolean;
  skip_reason: string | null;
  completed_mode: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { goalId, weekStart, language = "ar" } = await req.json();
    if (!goalId || !weekStart) {
      return NextResponse.json(
        { error: "goalId and weekStart are required" },
        { status: 400 },
      );
    }

    const weekEndDate = new Date(`${weekStart}T00:00:00`);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().split("T")[0];

    const { data: goal, error: goalError } = await auth.supabase
      .from("goals")
      .select(
        "id, title, ai_summary, current_points, target_points, created_at, estimated_completion_date",
      )
      .eq("id", goalId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const [{ data: rawCheckins, error: checkinError }, { data: logs }, { data: tasks }] =
      await Promise.all([
        auth.supabase
          .from("task_checkins")
          .select("task_id, period_start, completed, skip_reason, completed_mode")
          .eq("goal_id", goalId)
          .gte("period_start", weekStart)
          .lte("period_start", weekEnd),
        auth.supabase
          .from("daily_logs")
          .select("created_at, ai_score")
          .eq("goal_id", goalId)
          .gte("created_at", `${weekStart}T00:00:00`)
          .lte("created_at", `${weekEnd}T23:59:59`),
        auth.supabase
          .from("sub_layers")
          .select("id, task_description")
          .eq("goal_id", goalId),
      ]);

    if (checkinError) {
      // skip_reason / completed_mode do not exist until 0006_adaptive.sql runs.
      if (checkinError.code === "42703" || checkinError.code === "PGRST204") {
        return NextResponse.json({ error: "schema_outdated" }, { status: 409 });
      }
      return NextResponse.json(
        { error: "Failed to load week data" },
        { status: 500 },
      );
    }

    const checkins = (rawCheckins || []) as CheckinRow[];
    const taskLabels = new Map(
      (tasks || []).map((t) => [t.id as string, t.task_description as string]),
    );

    const skipReasons: Record<string, number> = {};
    const byWeekday: Record<string, { completed: number; skipped: number }> = {};
    const perTask = new Map<string, { completed: number; skipped: number }>();
    let completedCount = 0;
    let skippedCount = 0;
    let miniCount = 0;

    for (const row of checkins) {
      const weekdayKey =
        WEEKDAY_KEYS[new Date(`${row.period_start}T00:00:00`).getDay()];
      const bucket = (byWeekday[weekdayKey] ||= { completed: 0, skipped: 0 });
      const taskBucket =
        perTask.get(row.task_id) ||
        perTask.set(row.task_id, { completed: 0, skipped: 0 }).get(row.task_id)!;

      if (row.completed) {
        completedCount++;
        bucket.completed++;
        taskBucket.completed++;
        if (row.completed_mode === "mini") miniCount++;
      } else if (row.skip_reason) {
        skippedCount++;
        bucket.skipped++;
        taskBucket.skipped++;
        skipReasons[row.skip_reason] = (skipReasons[row.skip_reason] || 0) + 1;
      }
    }

    const byHour: Record<string, number> = {};
    const loggedDayKeys = new Set<string>();
    let pointsThisWeek = 0;

    for (const log of logs || []) {
      if (!log.created_at) continue;
      const date = new Date(log.created_at);
      loggedDayKeys.add(date.toISOString().split("T")[0]);
      const hour = String(date.getHours()).padStart(2, "0");
      byHour[hour] = (byHour[hour] || 0) + 1;
      pointsThisWeek += log.ai_score || 0;
    }

    const rank = (key: "completed" | "skipped") =>
      Array.from(perTask.entries())
        .filter(([, counts]) => counts[key] > 0)
        .sort((a, b) => b[1][key] - a[1][key])
        .slice(0, 3)
        .map(([taskId, counts]) => ({
          label: taskLabels.get(taskId) || taskId,
          [key]: counts[key],
        }));

    const projection = computeGoalProjection({
      currentPoints: goal.current_points,
      targetPoints: goal.target_points,
      createdAt: goal.created_at,
      plannedEndDate: goal.estimated_completion_date,
    });

    const stats = {
      completedCount,
      skippedCount,
      miniCount,
      loggedDays: loggedDayKeys.size,
      pointsThisWeek,
      skipReasons,
      byWeekday,
      byHour,
      topTasks: rank("completed") as { label: string; completed: number }[],
      strugglingTasks: rank("skipped") as { label: string; skipped: number }[],
      projection: projection
        ? {
            projectedDate: projection.projectedDate,
            deltaDays: projection.deltaDays,
          }
        : undefined,
    };

    // Nothing happened; a generated review of an empty week is noise.
    if (completedCount === 0 && skippedCount === 0 && loggedDayKeys.size === 0) {
      return NextResponse.json({ empty: true, stats });
    }

    const quotaResponse = await requireAiQuota(auth.supabase, "gemini", "weekly_review");
    if (quotaResponse) return quotaResponse;

    const review = await GeminiService.generateWeeklyReview(
      {
        title: goal.title,
        ai_summary: goal.ai_summary,
        current_points: goal.current_points,
        target_points: goal.target_points,
      },
      weekStart,
      stats,
      language === "en" ? "en" : "ar",
    );

    const { data: saved, error: saveError } = await auth.supabase
      .from("weekly_reviews")
      .upsert(
        {
          goal_id: goalId,
          week_start: weekStart,
          summary: review.summary,
          patterns: review.patterns,
          suggestion: review.suggestion,
          stats,
        },
        { onConflict: "goal_id,week_start" },
      )
      .select()
      .maybeSingle();

    if (saveError) {
      // The table itself is missing until 0006_adaptive.sql runs — still return
      // the review rather than throwing away a paid generation.
      console.error("weekly-review save failed:", saveError);
      return NextResponse.json({ ...review, stats, week_start: weekStart, persisted: false });
    }

    return NextResponse.json({ ...saved, persisted: true });
  } catch (error: unknown) {
    if (error instanceof GeminiQuotaError) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message_ar: `تم تجاوز حد الاستخدام اليومي. حاول مرة أخرى بعد ${Math.ceil(error.retryAfterSeconds / 60)} دقيقة.`,
          message_en: `Daily usage limit exceeded. Please try again in ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 429 },
      );
    }
    console.error("API weekly-review error:", error);
    return NextResponse.json({ error: "Failed to build weekly review" }, { status: 500 });
  }
}
