import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * AI routes forward whatever the client sends straight into a Gemini prompt.
 * Without a cap here, a single request can inflate token usage/cost or blow
 * past provider limits. 200KB comfortably covers a goal description, a full
 * task list and log history; anything past that is abuse, not a real plan.
 */
const MAX_AI_JSON_BODY_BYTES = 200_000;

function tooLargeResponse() {
  return NextResponse.json(
    {
      error: "request_too_large",
      message_ar: "الطلب أكبر من الحد المسموح به.",
      message_en: "Request payload is too large.",
    },
    { status: 413 },
  );
}

/** Cheap header-based rejection before the body is even read, when present. */
export function rejectIfContentLengthTooLarge(
  req: NextRequest,
  maxBytes = MAX_AI_JSON_BODY_BYTES,
): NextResponse | null {
  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return tooLargeResponse();
  }
  return null;
}

/** Safety net for chunked bodies with no Content-Length, checked after parse. */
export function rejectIfJsonBodyTooLarge(
  parsedBody: unknown,
  maxBytes = MAX_AI_JSON_BODY_BYTES,
): NextResponse | null {
  let byteLength: number;
  try {
    byteLength = Buffer.byteLength(JSON.stringify(parsedBody) ?? "", "utf8");
  } catch {
    return NextResponse.json({ error: "invalid_request_body" }, { status: 400 });
  }
  if (byteLength > maxBytes) {
    return tooLargeResponse();
  }
  return null;
}
