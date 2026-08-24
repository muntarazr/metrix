import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { GeminiQuotaError, GeminiService } from "@/lib/gemini";

/**
 * Returns the two-minute version of a task, generating it once and caching it
 * on `sub_layers.mini_version`. Generation is the expensive part, so a task is
 * only ever sent to Gemini the first time somebody asks for it.
 *
 * RLS on sub_layers/goals does the ownership check — the select simply comes
 * back empty for a task the caller does not own.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { taskId, language = "ar" } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const { data: task, error: taskError } = await auth.supabase
      .from("sub_layers")
      .select("id, task_description, mini_version, goal_id")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) {
      // The column is missing until supabase/migrations/0006_adaptive.sql runs.
      if (taskError.code === "42703" || taskError.code === "PGRST204") {
        return NextResponse.json({ error: "schema_outdated" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to load task" }, { status: 500 });
    }
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.mini_version) {
      return NextResponse.json({ miniVersion: task.mini_version, cached: true });
    }

    const { data: goal } = await auth.supabase
      .from("goals")
      .select("title")
      .eq("id", task.goal_id)
      .maybeSingle();

    const miniVersion = await GeminiService.generateMiniVersion(
      task.task_description,
      goal?.title || "",
      language === "en" ? "en" : "ar",
    );

    if (!miniVersion) {
      return NextResponse.json({ error: "Failed to generate" }, { status: 502 });
    }

    await auth.supabase
      .from("sub_layers")
      .update({ mini_version: miniVersion })
      .eq("id", taskId);

    return NextResponse.json({ miniVersion, cached: false });
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
    console.error("API task-mini error:", error);
    return NextResponse.json({ error: "Failed to generate mini version" }, { status: 500 });
  }
}
