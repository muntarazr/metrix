"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type { DailyFocusHistoryItem } from "@/lib/daily-focus";
import { cn } from "@/lib/utils";

interface DailyFocusHistorySectionProps {
  language?: Language;
  isArabic: boolean;
  dailyFocusHistory?: DailyFocusHistoryItem[];
  missedDailyFocusHistory?: DailyFocusHistoryItem[];
}

export function DailyFocusHistorySection({
  language = "ar",
  isArabic,
  dailyFocusHistory = [],
  missedDailyFocusHistory = [],
}: DailyFocusHistorySectionProps) {
  const t = translations[language];
  const [questionHistoryTab, setQuestionHistoryTab] = useState<"answered" | "missed">("answered");
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(null);
  const [expandedMissedItem, setExpandedMissedItem] = useState<string | null>(null);

  const previousHistory = dailyFocusHistory.slice(0, 8);

  if (previousHistory.length === 0 && missedDailyFocusHistory.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card p-3 sm:p-5 shadow-xs">
      {/* Segmented Control */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex w-full sm:w-auto sm:inline-flex items-center rounded-lg border border-border/60 bg-muted/60 p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => setQuestionHistoryTab("answered")}
            className={cn(
              "inline-flex flex-1 sm:flex-initial justify-center min-w-0 h-8 sm:h-7.5 items-center gap-1.5 rounded-md px-2 sm:px-2.5 text-[11px] font-medium transition-all duration-150 cursor-pointer active:scale-95 touch-manipulation",
              questionHistoryTab === "answered"
                ? "bg-card text-foreground border border-border/60 shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="truncate">{isArabic ? "الأسئلة المُجاب عنها" : "Answered"}</span>
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">
              {previousHistory.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setQuestionHistoryTab("missed")}
            className={cn(
              "inline-flex flex-1 sm:flex-initial justify-center min-w-0 h-8 sm:h-7.5 items-center gap-1.5 rounded-md px-2 sm:px-2.5 text-[11px] font-medium transition-all duration-150 cursor-pointer active:scale-95 touch-manipulation",
              questionHistoryTab === "missed"
                ? "bg-card text-foreground border border-border/60 shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="truncate">{isArabic ? "أسئلة فاتتك" : "Missed"}</span>
            <span className="shrink-0 rounded-full bg-muted-foreground/15 px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
              {missedDailyFocusHistory.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-3">
        {questionHistoryTab === "answered" ? (
          previousHistory.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground/75">
              {isArabic ? "لا توجد أسئلة مجاب عنها حتى الآن." : "No answered questions yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {previousHistory.map((item) => {
                const itemKey = `${item.prompt_date}-${item.question}`;
                const itemOpen = expandedHistoryItem === itemKey;

                return (
                  <article
                    key={itemKey}
                    className="rounded-xl border border-border/60 bg-muted/20 transition-all duration-200 hover:border-border/80"
                  >
                    <button
                      type="button"
                      aria-expanded={itemOpen}
                      onClick={() =>
                        setExpandedHistoryItem(itemOpen ? null : itemKey)
                      }
                      className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-start transition-colors"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                        <time dir="ltr" className="tabular-nums font-mono text-[10px] font-bold text-muted-foreground">
                          {item.prompt_date}
                        </time>
                        <span className="rounded-full border border-primary/20 bg-primary/12 px-1.5 py-0.5 text-primary text-[9px]">
                          {isArabic ? "محفوظ" : "Saved"}
                        </span>
                        <ChevronDown
                          className={cn(
                            "ms-auto h-3.5 w-3.5 transition-transform duration-200",
                            itemOpen && "rotate-180",
                          )}
                        />
                      </div>
                    </button>

                    <div
                      className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                      style={{ gridTemplateRows: itemOpen ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-border/50 bg-card/60 px-3.5 pb-3 pt-2.5">
                          <p className="text-xs font-semibold leading-relaxed text-foreground">
                            {item.question}
                          </p>
                          <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                            <p className="text-[10px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-muted-foreground/75">
                              {t.answerQuestion}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                              {item.answer || "—"}
                            </p>
                          </div>
                          {item.answer_coaching ? (
                            <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground italic">
                              {item.answer_coaching}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : missedDailyFocusHistory.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground/75">
            {isArabic ? "رائع! لم يفتك أي سؤال." : "Great! No missed questions."}
          </p>
        ) : (
          <div className="space-y-2">
            {missedDailyFocusHistory.map((item) => {
              const itemKey = `${item.prompt_date}-${item.question}`;
              const itemOpen = expandedMissedItem === itemKey;

              return (
                <article
                  key={itemKey}
                  className="rounded-xl border border-dashed border-border/70 bg-muted/15"
                >
                  <button
                    type="button"
                    aria-expanded={itemOpen}
                    onClick={() =>
                      setExpandedMissedItem(itemOpen ? null : itemKey)
                    }
                    className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-start transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60">
                      <time dir="ltr" className="tabular-nums font-mono text-[10px] font-bold text-muted-foreground/60">
                        {item.prompt_date}
                      </time>
                      <span className="rounded-full border border-foreground/15 bg-foreground/10 px-1.5 py-0.5 text-foreground/70 text-[9px]">
                        {isArabic ? "فائت" : "Missed"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "ms-auto h-3.5 w-3.5 transition-transform duration-200",
                          itemOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  <div
                    className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                    style={{ gridTemplateRows: itemOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-border/40 px-3.5 pb-3 pt-2.5">
                        <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                          {item.question}
                        </p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground/75 italic">
                          {isArabic
                            ? "لم يتم إرسال جواب لهذا السؤال."
                            : "No answer was recorded for this question."}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
