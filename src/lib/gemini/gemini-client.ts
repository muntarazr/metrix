/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

export function getAi(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiQuotaError extends Error {
  isQuotaExceeded = true;
  retryAfterSeconds: number;
  constructor(retryAfter: number) {
    super("Gemini API quota exceeded");
    this.name = "GeminiQuotaError";
    this.retryAfterSeconds = retryAfter;
  }
}

export class GeminiImageUnavailableError extends Error {
  constructor(message = "Image generation is not available for this API plan") {
    super(message);
    this.name = "GeminiImageUnavailableError";
  }
}

export function getApiErrorText(error: any) {
  if (typeof error?.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function parseApiErrorPayload(error: any) {
  const text = getApiErrorText(error);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function getRetryDelaySeconds(error: any) {
  const payload = parseApiErrorPayload(error);
  const details = payload?.error?.details;
  if (Array.isArray(details)) {
    const retryInfo = details.find(
      (item: any) =>
        item?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
    );
    const retryDelay = retryInfo?.retryDelay;
    if (typeof retryDelay === "string") {
      const seconds = Number(retryDelay.replace("s", ""));
      if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
    }
  }

  const match = getApiErrorText(error).match(/retry in\s+([\d.]+)s/i);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  }

  return 60;
}

export function isQuotaError(error: any) {
  const text = getApiErrorText(error).toLowerCase();
  return (
    error?.status === 429 ||
    text.includes("resource_exhausted") ||
    text.includes("quota exceeded") ||
    text.includes("rate-limits")
  );
}

export function isImagePlanError(error: any) {
  const text = getApiErrorText(error).toLowerCase();
  return (
    text.includes("only available on paid plans") ||
    text.includes("upgrade your account")
  );
}

// Verified against the project's own API key on 2026-08-22. The previous chain
// was all 2.x models, which Google now refuses for newer keys with
// 404 "no longer available to new users" — every entry failed, and because
// callWithRetry treats an exhausted chain as a quota problem, the app reported
// "daily limit exceeded" for what was really a retired model list.
// Re-check with: GET https://generativelanguage.googleapis.com/v1beta/models
export const MODEL_FALLBACK_CHAIN = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

export async function callWithRetry(
  config: any,
  content: any,
  validateResponse?: (text: string) => any,
): Promise<any> {
  let lastError: any = null;

  const contents = Array.isArray(content) ? content : [content];

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await getAi().models.generateContent({
        model,
        config,
        contents,
      });

      if (validateResponse) {
        const text = response.text || "";
        if (!text) {
          throw new Error("Empty response text from Gemini API");
        }
        validateResponse(text);
      }

      console.log(`Gemini call succeeded with model: ${model}`);
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.code;

      if (status === 429) {
        console.warn(
          `Model ${model} quota exhausted (429), trying next fallback...`,
        );
        continue;
      }

      if (status === 503) {
        console.warn(`Model ${model} returned 503, retrying once in 3s...`);
        await delay(3000);
        try {
          const retryResponse = await getAi().models.generateContent({
            model,
            config,
            contents,
          });

          if (validateResponse) {
            const text = retryResponse.text || "";
            if (!text) {
              throw new Error("Empty response text from Gemini API on 503 retry");
            }
            validateResponse(text);
          }

          console.log(`Gemini 503 retry succeeded with model: ${model}`);
          return retryResponse;
        } catch (retryError: any) {
          lastError = retryError;
          const retryStatus = retryError?.status || retryError?.code;
          if (retryStatus === 429) {
            console.warn(
              `Model ${model} hit 429 on 503 retry, trying next fallback...`,
            );
            continue;
          }
          console.warn(
            `Model ${model} failed on 503 retry, trying next fallback...`,
          );
          continue;
        }
      }

      if (status === 404) {
        console.warn(
          `Model ${model} not found (404), trying next fallback...`,
        );
        continue;
      }

      if (validateResponse) {
        console.warn(
          `Model ${model} output failed validation (${error?.message}), trying next fallback...`,
        );
        continue;
      }

      throw error;
    }
  }

  const errorMsg = lastError?.message || "";
  const lastStatus = lastError?.status || lastError?.code;

  // Only a real 429 is a quota problem. A chain that 404s is a stale model
  // list, and saying "quota exceeded" there sends everyone hunting the wrong
  // bug — surface the model error instead.
  if (lastStatus !== 429) {
    console.error(
      `Gemini fallback chain exhausted without a quota error (last status ${lastStatus}). ` +
        `The model list is probably stale: ${errorMsg}`,
    );
    throw lastError instanceof Error
      ? lastError
      : new Error(`Gemini call failed: ${errorMsg || "unknown error"}`);
  }

  console.error("All Gemini models exhausted their quotas.");
  const retryMatch = errorMsg.match(/retryDelay[":]\s*["']?(\d+)/i);
  const apiRetrySeconds = retryMatch ? parseInt(retryMatch[1]) : 60;
  throw new GeminiQuotaError(apiRetrySeconds);
}
