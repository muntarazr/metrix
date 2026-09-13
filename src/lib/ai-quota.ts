import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AiProvider = "gemini" | "mistral";
export type AiOperation =
  | "investigate"
  | "plan"
  | "daily_focus"
  | "evaluate"
  | "milestone_evaluate"
  | "ai_edit"
  | "task_mini"
  | "weekly_review"
  | "transcribe";

interface QuotaResult {
  allowed: boolean;
  retry_after_seconds: number;
}

/**
 * Atomically reserves one accepted AI attempt for the authenticated user.
 * The database owns this limit so it remains correct across server instances.
 */
export async function requireAiQuota(
  supabase: SupabaseClient,
  provider: AiProvider,
  operation: AiOperation,
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_provider: provider,
    p_operation: operation,
  });

  if (error) {
    // A deployment must not expose paid AI endpoints until migration 0007 runs.
    console.error("AI quota reservation failed:", {
      code: error.code,
      operation,
      provider,
    });
    return NextResponse.json(
      {
        error: "ai_quota_unavailable",
        message_ar: "خدمة حماية استخدام الذكاء الاصطناعي غير جاهزة. حاول لاحقًا.",
        message_en: "AI usage protection is not ready. Please try again later.",
      },
      { status: 503 },
    );
  }

  const result = Array.isArray(data) ? (data[0] as QuotaResult | undefined) : undefined;
  if (!result?.allowed) {
    const retryAfterSeconds = Math.max(1, result?.retry_after_seconds || 60);
    return NextResponse.json(
      {
        error: "quota_exceeded",
        retryAfterSeconds,
        message_ar: "تم الوصول إلى حد استخدام الذكاء الاصطناعي مؤقتًا. حاول مرة أخرى قريبًا.",
        message_en: "You have temporarily reached the AI usage limit. Please try again shortly.",
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  return null;
}
