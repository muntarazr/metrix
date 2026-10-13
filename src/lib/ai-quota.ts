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
  // In local development, bypass the artificial database quota to allow thorough testing
  if (process.env.NODE_ENV === "development" && process.env.ENFORCE_AI_QUOTA_IN_DEV !== "true") {
    return null;
  }

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

/**
 * Formats a standardized 429 response when Gemini API quota is exceeded.
 */
export function createGeminiQuotaResponse(error: { retryAfterSeconds?: number }): NextResponse {
  const retryAfterSeconds = Math.max(1, Number(error.retryAfterSeconds) || 60);
  const retryMinutes = Math.ceil(retryAfterSeconds / 60);
  return NextResponse.json(
    {
      error: "quota_exceeded",
      message_ar: `تم تجاوز حد الاستخدام اليومي. حاول مرة أخرى بعد ${retryMinutes} دقيقة.`,
      message_en: `Daily usage limit exceeded. Please try again in ${retryMinutes} minute(s).`,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

/**
 * Catches and maps route errors into appropriate JSON responses,
 * mapping quota errors to 429 and unexpected errors to 500.
 */
export function handleAiRouteError(
  error: unknown,
  fallbackMessage = "AI operation failed",
): NextResponse {
  if (
    error &&
    typeof error === "object" &&
    (("isQuotaExceeded" in error && Boolean((error as Record<string, unknown>).isQuotaExceeded)) ||
      ("name" in error && (error as Record<string, unknown>).name === "GeminiQuotaError") ||
      ("retryAfterSeconds" in error &&
        typeof (error as Record<string, unknown>).retryAfterSeconds === "number"))
  ) {
    return createGeminiQuotaResponse(error as { retryAfterSeconds?: number });
  }

  return NextResponse.json(
    {
      error: fallbackMessage,
      ...(process.env.NODE_ENV !== "production"
        ? { detail: error instanceof Error ? error.message : String(error) }
        : {}),
    },
    { status: 500 },
  );
}
