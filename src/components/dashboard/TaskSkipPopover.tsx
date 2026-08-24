"use client";

import { useState } from "react";
import { Loader2, Sparkles, Undo2, Zap } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SkipReason = "no_time" | "too_hard" | "unclear" | "no_mood";

export const SKIP_REASONS: {
  key: SkipReason;
  ar: string;
  en: string;
  emoji: string;
}[] = [
  { key: "no_time", ar: "ما لكيت وقت", en: "No time", emoji: "⏳" },
  { key: "too_hard", ar: "كانت صعبة", en: "Too hard", emoji: "🧱" },
  { key: "unclear", ar: "ما فهمت المطلوب", en: "Unclear", emoji: "❓" },
  { key: "no_mood", ar: "ما كان عندي مزاج", en: "No energy", emoji: "🔋" },
];

export function skipReasonLabel(reason: string, isArabic: boolean): string {
  const match = SKIP_REASONS.find((r) => r.key === reason);
  if (!match) return reason;
  return isArabic ? match.ar : match.en;
}

interface TaskSkipPopoverProps {
  isArabic: boolean;
  /** The reason already recorded for this period, if any. */
  skipReason: string | null;
  /** Cached two-minute version; null means it has not been generated yet. */
  miniVersion: string | null;
  onSelectReason: (reason: SkipReason) => Promise<void> | void;
  onClearReason: () => Promise<void> | void;
  /** Generates and caches the mini version; returns null on failure. */
  onRequestMini: () => Promise<string | null>;
  /** Marks the task done via its mini version. */
  onCompleteMini: () => Promise<void> | void;
}

/**
 * The affordance for a task that did not happen.
 *
 * A missed task normally just sits there unchecked, which teaches the app
 * nothing and the user less. One tap records why, and offers the two-minute
 * version as a way out that still counts.
 */
export default function TaskSkipPopover({
  isArabic,
  skipReason,
  miniVersion,
  onSelectReason,
  onClearReason,
  onRequestMini,
  onCompleteMini,
}: TaskSkipPopoverProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // The parent caches the generated text on the task row, so prefer its value
  // and fall back to what this popover generated in the current session.
  const [generatedMini, setGeneratedMini] = useState<string | null>(null);
  const mini = miniVersion ?? generatedMini;
  const [miniLoading, setMiniLoading] = useState(false);
  const [miniError, setMiniError] = useState<string | null>(null);

  const handleReason = async (reason: SkipReason) => {
    setBusy(true);
    try {
      if (skipReason === reason) {
        await onClearReason();
      } else {
        await onSelectReason(reason);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleMini = async () => {
    if (mini) return;
    setMiniLoading(true);
    setMiniError(null);
    try {
      const result = await onRequestMini();
      if (result) setGeneratedMini(result);
      else
        setMiniError(
          isArabic ? "تعذر توليد النسخة المصغرة" : "Could not generate it",
        );
    } finally {
      setMiniLoading(false);
    }
  };

  const handleCompleteMini = async () => {
    setBusy(true);
    try {
      await onCompleteMini();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 active:scale-90",
            skipReason
              ? "border-foreground/25 bg-foreground/12 text-foreground"
              : "border-transparent text-muted-foreground/50 hover:border-border/70 hover:bg-muted/60 hover:text-muted-foreground",
          )}
          title={isArabic ? "ما صارت؟" : "Didn't happen?"}
          aria-label={isArabic ? "ما صارت؟" : "Didn't happen?"}
        >
          <Zap className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-64 p-3"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/75">
          {isArabic ? "ليش ما صارت؟" : "Why didn't it happen?"}
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {SKIP_REASONS.map((reason) => {
            const active = skipReason === reason.key;
            return (
              <button
                key={reason.key}
                onClick={() => handleReason(reason.key)}
                disabled={busy}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-start text-[11px] font-semibold leading-tight transition-all active:scale-95 disabled:opacity-50",
                  active
                    ? "border-primary/25 bg-primary/12 text-primary"
                    : "border-border/70 bg-background text-foreground/75 hover:border-border hover:bg-muted/60",
                )}
              >
                <span aria-hidden>{reason.emoji}</span>
                <span className="min-w-0 flex-1 break-words">
                  {isArabic ? reason.ar : reason.en}
                </span>
              </button>
            );
          })}
        </div>

        {skipReason && (
          <button
            onClick={() => handleReason(skipReason as SkipReason)}
            disabled={busy}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/75 hover:text-foreground disabled:opacity-50"
          >
            <Undo2 className="h-3 w-3" />
            {isArabic ? "إلغاء السبب" : "Clear reason"}
          </button>
        )}

        <div className="mt-3 border-t border-border/70 pt-2.5">
          {mini ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold leading-snug text-foreground/90">
                {mini}
              </p>
              <button
                onClick={handleCompleteMini}
                disabled={busy}
                className="w-full rounded-lg bg-primary py-1.5 text-[11px] font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {isArabic ? "سويت المصغرة ✓" : "Did the mini ✓"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleMini}
              disabled={miniLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/25 hover:text-primary active:scale-[0.98] disabled:opacity-50"
            >
              {miniLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isArabic ? "نسخة دقيقتين" : "Two-minute version"}
            </button>
          )}
          {miniError && (
            <p className="mt-1.5 text-[10px] font-semibold text-destructive">
              {miniError}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
