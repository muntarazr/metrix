import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { GeminiQuotaError, GeminiService } from "@/lib/gemini";
import { requireAiQuota } from "@/lib/ai-quota";

/**
 * Returns a concrete, measurable completion criteria (Definition of Done) for a task.
 * Can be called with a taskId to generate, update, and cache directly in the database,
 * or with taskDescription + goalTitle to preview/autofill in the editor dialog.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const body = await req.json();
    const {
      taskId,
      taskDescription,
      goalTitle,
      goalId,
      taskType = "sub",
      language = "ar",
      force = false,
    } = body;

    let targetDescription = taskDescription;
    let targetGoalTitle = goalTitle;
    let targetTaskType: "main" | "sub" = taskType === "main" ? "main" : "sub";

    if (taskId) {
      const { data: task, error: taskError } = await auth.supabase
        .from("sub_layers")
        .select("id, task_description, completion_criteria, goal_id, task_type")
        .eq("id", taskId)
        .maybeSingle();

      if (taskError) {
        return NextResponse.json({ error: "Failed to load task" }, { status: 500 });
      }
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (!force && task.completion_criteria && task.completion_criteria.trim().length > 0) {
        return NextResponse.json({ criteria: task.completion_criteria, cached: true });
      }

      targetDescription = task.task_description;
      targetTaskType = task.task_type === "main" ? "main" : "sub";

      if (!targetGoalTitle && task.goal_id) {
        const { data: goal } = await auth.supabase
          .from("goals")
          .select("title")
          .eq("id", task.goal_id)
          .maybeSingle();
        targetGoalTitle = goal?.title || "";
      }
    } else if (goalId && !targetGoalTitle) {
      const { data: goal } = await auth.supabase
        .from("goals")
        .select("title")
        .eq("id", goalId)
        .maybeSingle();
      targetGoalTitle = goal?.title || "";
    }

    if (!targetDescription || !targetDescription.trim()) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400 });
    }

    const quotaResponse = await requireAiQuota(auth.supabase, "gemini", "task_mini");
    if (quotaResponse) return quotaResponse;

    const criteria = await GeminiService.generateCompletionCriteria(
      targetDescription.trim(),
      targetGoalTitle || "",
      targetTaskType,
      language === "en" ? "en" : "ar",
    );

    if (!criteria) {
      return NextResponse.json({ error: "Failed to generate criteria" }, { status: 502 });
    }

    if (taskId) {
      await auth.supabase
        .from("sub_layers")
        .update({ completion_criteria: criteria })
        .eq("id", taskId);
    }

    return NextResponse.json({ criteria, cached: false });
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
    console.error("API task-criteria error:", error);
    return NextResponse.json({ error: "Failed to generate completion criteria" }, { status: 500 });
  }
}
