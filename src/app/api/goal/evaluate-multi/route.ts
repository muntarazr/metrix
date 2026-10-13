import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { GeminiService } from "@/lib/gemini";
import { requireAiQuota, handleAiRouteError } from "@/lib/ai-quota";
import {
  rejectIfContentLengthTooLarge,
  rejectIfJsonBodyTooLarge,
} from "@/lib/request-limits";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const sizeGuard = rejectIfContentLengthTooLarge(req);
    if (sizeGuard) return sizeGuard;

    const body = await req.json();
    const bodyGuard = rejectIfJsonBodyTooLarge(body);
    if (bodyGuard) return bodyGuard;

    const {
      goals,
      userInput,
      language = "ar",
      coachPersona = "balanced",
    } = body;

    if (!Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json(
        { error: "No goals provided" },
        { status: 400 },
      );
    }

    if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
      return NextResponse.json(
        { error: "No input provided" },
        { status: 400 },
      );
    }

    const quotaResponse = await requireAiQuota(
      auth.supabase,
      "gemini",
      "evaluate",
    );
    if (quotaResponse) return quotaResponse;

    const normalizedPersona =
      coachPersona === "strict" || coachPersona === "analytical"
        ? coachPersona
        : "balanced";

    const result = await GeminiService.evaluateMultiGoalDailyLog(
      goals,
      userInput.trim(),
      language === "ar" ? "ar" : "en",
      normalizedPersona,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("evaluate-multi route error:", error);
    return handleAiRouteError(error, "Failed to evaluate multi-goal log");
  }
}
