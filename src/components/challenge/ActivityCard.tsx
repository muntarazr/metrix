"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Trophy,
  Trash2,
  AlertTriangle,
  Loader2,
  MoreVertical,
  Pencil,
  FileText,
  Palette,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Sparkles,
  RefreshCw,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChallengeEvent } from "./challenge-types";
import { formatNumericDate, formatTime } from "./challenge-utils";
import { apiUrl } from "@/lib/api";

interface ActivityCardProps {
  goalId?: string;
  recentEvents: ChallengeEvent[];
  visibleEvents: ChallengeEvent[];
  canToggleEvents: boolean;
  showAllEvents: boolean;
  onToggleShowAll: () => void;
  meName: string;
  opponentName: string;
  meGoalTitle?: string;
  opponentGoalTitle?: string;
  locale: string;
  numberFormatter: Intl.NumberFormat;
  ui: {
    recentTitle: string;
    activityEmpty: string;
  };
  t: {
    challengeShowLess: string;
    challengeShowMore: string;
  };
}

type AccentColor = "emerald" | "violet" | "amber" | "rose" | "sky" | "slate";
type MilestoneTier = "minor" | "major" | "legendary";

interface SuggestedMilestone {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  tier: MilestoneTier;
  points: number;
  accentColor: AccentColor;
}

interface RejectedSuggestionItem {
  name: string;
  description?: string;
  reason: string;
}

const accentConfig: Record<
  AccentColor,
  {
    label: { ar: string; en: string };
    swatch: string;
    card: string;
    border: string;
    icon: string;
  }
> = {
  /* The keys are the values already stored on existing challenges, so they stay.
     What they render is now a single monochrome ramp — teal is the one opt-in
     colour, everything else is a tone of the neutral scale. */
  emerald: {
    label: { ar: "فيروزي", en: "Teal" },
    swatch: "bg-primary",
    card: "from-primary/12 to-primary/12",
    border: "border-primary/25",
    icon: "text-primary",
  },
  violet: {
    label: { ar: "فحمي", en: "Charcoal" },
    swatch: "bg-foreground",
    card: "from-foreground/12 to-foreground/12",
    border: "border-foreground/25",
    icon: "text-foreground",
  },
  amber: {
    label: { ar: "رمادي", en: "Graphite" },
    swatch: "bg-foreground/60",
    card: "from-foreground/12 to-foreground/12",
    border: "border-foreground/15",
    icon: "text-foreground/75",
  },
  rose: {
    label: { ar: "فضي", en: "Silver" },
    swatch: "bg-muted-foreground",
    card: "from-muted/60 to-muted/20",
    border: "border-border",
    icon: "text-muted-foreground",
  },
  sky: {
    label: { ar: "ضبابي", en: "Mist" },
    swatch: "bg-muted-foreground/60",
    card: "from-muted/60 to-transparent",
    border: "border-border",
    icon: "text-muted-foreground/75",
  },
  slate: {
    label: { ar: "حبري", en: "Ink" },
    swatch: "bg-foreground/90",
    card: "from-foreground/12 to-foreground/12",
    border: "border-foreground/25",
    icon: "text-foreground/90",
  },
};

function normalizeAccentColor(value: unknown): AccentColor {
  return typeof value === "string" && value in accentConfig
    ? (value as AccentColor)
    : "violet";
}

function getTierLabel(tier: MilestoneTier | undefined, isArabic: boolean) {
  switch (tier) {
    case "legendary":
      return isArabic ? "إنجاز أسطوري" : "Legendary";
    case "major":
      return isArabic ? "إنجاز رئيسي" : "Major";
    case "minor":
    default:
      return isArabic ? "إنجاز مركز" : "Focused";
  }
}

type EditMode = null | {
  logId: string;
  field: "name" | "description";
  value: string;
};

export function ActivityCard({
  goalId,
  recentEvents,
  locale,
  ui,
}: ActivityCardProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Suggested milestones state
  const [suggestions, setSuggestions] = useState<SuggestedMilestone[]>([]);
  const [rejectedHistory, setRejectedHistory] = useState<RejectedSuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const isArabic = locale === "ar" || locale?.startsWith("ar");
  const milestoneEvents = recentEvents.filter((e) => e.milestone);

  const quickRejectReasons = isArabic
    ? [
        "صعب أو كبير جداً حالياً",
        "يحتاج وقت أطول من المتاح",
        "غير مناسب لتركيزي الحالي",
        "أنجزته سابقاً",
      ]
    : [
        "Too big or hard right now",
        "Takes too much time",
        "Not aligned with current focus",
        "Already completed this",
      ];

  const storageKey = goalId
    ? `metrix:milestone_suggestions:v1:${goalId}`
    : null;

  const persistSuggestionsState = useCallback(
    (
      nextSuggestions: SuggestedMilestone[],
      nextRejected: RejectedSuggestionItem[],
    ) => {
      if (!storageKey || typeof window === "undefined") return;
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            suggestions: nextSuggestions,
            rejected: nextRejected,
            updatedAt: Date.now(),
          }),
        );
      } catch {
        // Ignore storage errors
      }
    },
    [storageKey],
  );

  const fetchSuggestionsFromApi = useCallback(
    async (options?: {
      count?: number;
      rejectedList?: RejectedSuggestionItem[];
      currentNames?: string[];
    }): Promise<SuggestedMilestone[]> => {
      if (!goalId) return [];
      const response = await fetch(apiUrl("/api/goal/milestone"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest",
          goalId,
          language: isArabic ? "ar" : "en",
          count: options?.count ?? 2,
          rejectedSuggestions: options?.rejectedList ?? [],
          currentNames: options?.currentNames ?? [],
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data?.suggestions)) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isArabic
              ? "تعذر جلب الإنجازات المقترحة"
              : "Could not load suggested milestones"),
        );
      }
      return data.suggestions as SuggestedMilestone[];
    },
    [goalId, isArabic],
  );

  useEffect(() => {
    if (!goalId || !storageKey) return;
    let cancelled = false;

    const loadInitial = async () => {
      try {
        const cachedRaw =
          typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (
            Array.isArray(parsed?.suggestions) &&
            parsed.suggestions.length > 0
          ) {
            setSuggestions(parsed.suggestions);
            setRejectedHistory(
              Array.isArray(parsed?.rejected) ? parsed.rejected : [],
            );
            return;
          }
        }
      } catch {
        // Ignore cache parse issues
      }

      setLoadingSuggestions(true);
      try {
        const fresh = await fetchSuggestionsFromApi({ count: 2 });
        if (!cancelled) {
          setSuggestions(fresh);
          persistSuggestionsState(fresh, []);
        }
      } catch (err) {
        console.warn("Initial milestone suggestions failed:", err);
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    };

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [goalId, storageKey, fetchSuggestionsFromApi, persistSuggestionsState]);

  const refresh = () => {
    if (goalId) {
      window.dispatchEvent(
        new CustomEvent("challenge-log-updated", { detail: { goalId } }),
      );
    }
  };

  const handleRefreshSuggestions = async () => {
    if (!goalId || loadingSuggestions) return;
    setLoadingSuggestions(true);
    setErrorMessage(null);
    try {
      const fresh = await fetchSuggestionsFromApi({
        count: 2,
        rejectedList: rejectedHistory,
        currentNames: suggestions.map((s) => s.name),
      });
      setSuggestions(fresh);
      persistSuggestionsState(fresh, rejectedHistory);
    } catch (e) {
      setErrorMessage(
        e instanceof Error
          ? e.message
          : isArabic
            ? "تعذر تحديث الاقتراحات"
            : "Could not refresh suggestions",
      );
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleRejectSuggestion = async (suggestion: SuggestedMilestone) => {
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason || !goalId) return;

    setReplacingId(suggestion.id);
    setErrorMessage(null);

    const nextRejected: RejectedSuggestionItem[] = [
      ...rejectedHistory,
      {
        name: suggestion.name,
        description: suggestion.description,
        reason: trimmedReason,
      },
    ].slice(-10);

    try {
      const remainingNames = suggestions
        .filter((s) => s.id !== suggestion.id)
        .map((s) => s.name);

      const replacements = await fetchSuggestionsFromApi({
        count: 1,
        rejectedList: nextRejected,
        currentNames: [...remainingNames, suggestion.name],
      });

      const nextSuggestions = suggestions.map((item) =>
        item.id === suggestion.id && replacements[0] ? replacements[0] : item,
      ).filter((item) =>
        replacements[0] ? true : item.id !== suggestion.id,
      );

      setRejectedHistory(nextRejected);
      setSuggestions(nextSuggestions);
      persistSuggestionsState(nextSuggestions, nextRejected);
      setRejectingId(null);
      setRejectReason("");
    } catch (e) {
      setErrorMessage(
        e instanceof Error
          ? e.message
          : isArabic
            ? "تعذر استبدال المقترح"
            : "Could not replace suggestion",
      );
    } finally {
      setReplacingId(null);
    }
  };

  const handleClaimSuggested = async (suggestion: SuggestedMilestone) => {
    if (!goalId || claimingId) return;
    setClaimingId(suggestion.id);
    setErrorMessage(null);

    try {
      const response = await fetch(apiUrl("/api/goal/milestone"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim_suggested",
          goalId,
          name: suggestion.name,
          description: suggestion.description,
          shortDescription: suggestion.shortDescription,
          tier: suggestion.tier,
          points: suggestion.points,
          accentColor: suggestion.accentColor,
          language: isArabic ? "ar" : "en",
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isArabic
              ? "تعذر إضافة الإنجاز"
              : "Could not add milestone"),
        );
      }

      const remaining = suggestions.filter((s) => s.id !== suggestion.id);
      setSuggestions(remaining);
      persistSuggestionsState(remaining, rejectedHistory);
      refresh();

      // If no suggestions remain, quietly fetch one more in background
      if (remaining.length === 0) {
        fetchSuggestionsFromApi({
          count: 2,
          rejectedList: rejectedHistory,
          currentNames: [suggestion.name],
        })
          .then((fresh) => {
            setSuggestions(fresh);
            persistSuggestionsState(fresh, rejectedHistory);
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(
        e instanceof Error
          ? e.message
          : isArabic
            ? "تعذر تسجيل الإنجاز"
            : "Could not claim milestone",
      );
    } finally {
      setClaimingId(null);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!goalId) return;
    setBusyId(logId);
    setErrorMessage(null);
    try {
      const response = await fetch(apiUrl("/api/goal/milestone"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, goalId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isArabic ? "تعذر حذف الإنجاز" : "Could not delete milestone"),
        );
      }
      refresh();
      setConfirmDeleteId(null);
    } catch (e) {
      console.error(e);
      setErrorMessage(
        e instanceof Error
          ? e.message
          : isArabic
            ? "تعذر حذف الإنجاز"
            : "Could not delete milestone",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handlePatch = async (
    logId: string,
    payload: {
      name?: string;
      description?: string;
      accentColor?: AccentColor;
    },
  ) => {
    if (!goalId) return false;
    setBusyId(logId);
    setErrorMessage(null);
    try {
      const response = await fetch(apiUrl("/api/goal/milestone"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, goalId, ...payload }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isArabic ? "تعذر تحديث الإنجاز" : "Could not update milestone"),
        );
      }
      refresh();
      setEditMode(null);
      return true;
    } catch (e) {
      console.error(e);
      setErrorMessage(
        e instanceof Error
          ? e.message
          : isArabic
            ? "تعذر تحديث الإنجاز"
            : "Could not update milestone",
      );
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const totalCardsCount = milestoneEvents.length + suggestions.length;

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm shadow-black/[0.02] sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-muted/60 border border-border/70 text-muted-foreground">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground truncate">
                {ui.recentTitle}
              </span>
              <span className="rounded-full border border-border/70 bg-muted/20 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {milestoneEvents.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {isArabic
                ? "إنجازاتك الموثقة ومقترحات ذكية يمكنك إتمامها مباشرة"
                : "Your completed milestones & tailored suggestions you can claim directly"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!collapsed && goalId && (
            <button
              type="button"
              onClick={handleRefreshSuggestions}
              disabled={loadingSuggestions}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.98] disabled:opacity-50"
              title={
                isArabic
                  ? "توليد اقتراحات إنجاز جديدة"
                  : "Generate new milestone suggestions"
              }
            >
              <RefreshCw
                className={cn(
                  "h-3 w-3",
                  loadingSuggestions && "animate-spin text-primary",
                )}
              />
              <span className="hidden min-[400px]:inline">
                {isArabic ? "اقتراح جديد" : "New suggestions"}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:opacity-90 active:scale-[0.98]"
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                {isArabic ? "إظهار" : "Show"}
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                {isArabic ? "إخفاء" : "Hide"}
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-2 flex items-start justify-between gap-2 rounded-xl border border-destructive/25 bg-destructive/12 px-3 py-2 text-xs font-semibold text-destructive">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded-md p-0.5 hover:bg-destructive/12"
            aria-label={isArabic ? "إخفاء الخطأ" : "Dismiss error"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {!collapsed && (
        <div className="mt-3">
          {totalCardsCount === 0 && !loadingSuggestions ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-8 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {ui.activityEmpty}
              </p>
              {goalId && (
                <button
                  type="button"
                  onClick={handleRefreshSuggestions}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:opacity-90 active:scale-[0.98]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {isArabic
                      ? "اقترح إنجازات مناسبة لهدفي"
                      : "Suggest milestones for my goal"}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:grid-cols-3">
              {/* 1. Completed Milestones */}
              {milestoneEvents.map((event, index) => {
                const actorIsMe = event.actor === "me";
                const logId =
                  event.logId || `${event.actor}-${event.createdAt}-${index}`;
                const accentKey = normalizeAccentColor(
                  event.milestone!.accentColor,
                );
                const accent = accentConfig[accentKey];
                const isConfirmDelete = confirmDeleteId === logId;
                const isBusy = busyId === logId;
                const displayDesc =
                  event.milestone!.short_description?.trim() ||
                  event.milestone!.description;
                const isEditingThisCard = editMode?.logId === logId;
                const milestoneActionsMenu =
                  actorIsMe && event.logId ? (
                    <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 sm:h-6 sm:w-6 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                          aria-label={
                            isArabic ? "خيارات الإنجاز" : "Milestone options"
                          }
                        >
                          <MoreVertical className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align={isArabic ? "start" : "end"}
                        side="bottom"
                        className={cn("w-52", isArabic && "text-right")}
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            setEditMode({
                              logId,
                              field: "name",
                              value: event.milestone!.name,
                            })
                          }
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                          <span>{isArabic ? "تعديل الاسم" : "Edit name"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setEditMode({
                              logId,
                              field: "description",
                              value: event.milestone!.description,
                            })
                          }
                          className="cursor-pointer"
                        >
                          <FileText className="h-4 w-4" />
                          <span>{isArabic ? "تعديل الوصف" : "Edit text"}</span>
                        </DropdownMenuItem>
                        <div className="px-2 py-1.5 sm:hidden">
                          <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Palette className="h-3.5 w-3.5" />
                            <span>
                              {isArabic ? "تغيير اللون" : "Change color"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            {(Object.keys(accentConfig) as AccentColor[]).map(
                              (color) => {
                                const option = accentConfig[color];
                                return (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() =>
                                      handlePatch(logId, { accentColor: color })
                                    }
                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-muted/40 active:scale-95"
                                    title={
                                      isArabic
                                        ? option.label.ar
                                        : option.label.en
                                    }
                                  >
                                    <span
                                      className={cn(
                                        "h-4 w-4 rounded-full ring-1 ring-black/10",
                                        option.swatch,
                                      )}
                                    />
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>
                        <div className="hidden sm:block">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer">
                              <Palette className="h-4 w-4" />
                              <span>
                                {isArabic ? "تغيير اللون" : "Change color"}
                              </span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent
                              className={cn("w-44", isArabic && "text-right")}
                            >
                              {(Object.keys(accentConfig) as AccentColor[]).map(
                                (color) => {
                                  const option = accentConfig[color];
                                  return (
                                    <DropdownMenuItem
                                      key={color}
                                      onClick={() =>
                                        handlePatch(logId, {
                                          accentColor: color,
                                        })
                                      }
                                      className="cursor-pointer"
                                    >
                                      <span
                                        className={cn(
                                          "h-3.5 w-3.5 rounded-full ring-1 ring-black/10",
                                          option.swatch,
                                        )}
                                      />
                                      <span>
                                        {isArabic
                                          ? option.label.ar
                                          : option.label.en}
                                      </span>
                                    </DropdownMenuItem>
                                  );
                                },
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmDeleteId(logId)}
                          variant="destructive"
                          className="cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>{isArabic ? "حذف" : "Delete"}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null;

                return (
                  <div
                    key={logId}
                    className={cn(
                      "group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 shadow-xs transition-colors duration-200",
                      accent.card,
                      accent.border,
                      isConfirmDelete && "min-h-[160px]",
                    )}
                  >
                    {/* Delete confirm overlay */}
                    {isConfirmDelete && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2.5 rounded-xl bg-background p-3 text-center animate-in fade-in duration-200">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <p className="max-w-60 text-xs font-bold leading-relaxed text-foreground">
                          {isArabic
                            ? "حذف هذا الإنجاز؟ سيتم خصم نقاطه من الهدف."
                            : "Delete this achievement? Its points will be deducted."}
                        </p>
                        <div className="flex w-full max-w-60 gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isBusy}
                            className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs font-semibold text-muted-foreground transition hover:opacity-90 active:scale-[0.98]"
                          >
                            {isArabic ? "إلغاء" : "Cancel"}
                          </button>
                          <button
                            onClick={() =>
                              event.logId && handleDelete(event.logId)
                            }
                            disabled={isBusy}
                            className="flex flex-1 items-center justify-center rounded-lg bg-destructive py-2 text-xs font-bold text-destructive-foreground transition hover:opacity-90 active:scale-[0.98]"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isArabic ? (
                              "حذف"
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Top Row: Milestone Info + Points Badge + Options */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                            accent.icon,
                            accent.border,
                          )}
                        >
                          <Trophy className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {event.milestone!.name}
                          </h4>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {formatNumericDate(event.createdAt, "en")} ·{" "}
                            {formatTime(event.createdAt, "en")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10.5px] font-bold text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>
                            +{Intl.NumberFormat("en").format(event.points)}
                          </span>
                        </span>
                        {milestoneActionsMenu}
                      </div>
                    </div>

                    {/* Middle / Bottom: Comment & Details */}
                    <div className="mt-2.5 pt-2 border-t border-border/40">
                      {isEditingThisCard ? (
                        <InlineEditor
                          mode={editMode!}
                          isArabic={isArabic}
                          onCancel={() => setEditMode(null)}
                          onSave={(value) =>
                            event.logId &&
                            handlePatch(event.logId, {
                              [editMode!.field]: value,
                            })
                          }
                          isBusy={isBusy}
                        />
                      ) : (
                        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground font-medium">
                          {displayDesc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 2. Suggested Milestones (in the SAME card grid, badged as "مقترح") */}
              {suggestions.map((suggestion) => {
                const accentKey = normalizeAccentColor(suggestion.accentColor);
                const accent = accentConfig[accentKey];
                const isRejecting = rejectingId === suggestion.id;
                const isReplacing = replacingId === suggestion.id;
                const isClaiming = claimingId === suggestion.id;

                return (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-dashed p-3 shadow-xs transition-all duration-200 bg-muted/15",
                      accent.border,
                    )}
                  >
                    {/* Top Row: Icon + Title + "مقترح" Badge + Points */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background/80",
                            accent.icon,
                            accent.border,
                          )}
                        >
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {isArabic ? "مقترح" : "Suggested"}
                            </span>
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {getTierLabel(suggestion.tier, isArabic)}
                            </span>
                          </div>
                          <h4 className="mt-0.5 text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                            {suggestion.name}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10.5px] font-bold text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>
                            +{Intl.NumberFormat("en").format(suggestion.points)}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Body / Rejection Reason Form */}
                    <div className="mt-2.5 pt-2 border-t border-border/40">
                      {isRejecting ? (
                        <div className="space-y-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-foreground">
                              {isArabic
                                ? "لماذا ترفض هذا المقترح؟ (لنقدم الأفضل)"
                                : "Why reject this suggestion?"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              disabled={isReplacing}
                              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {quickRejectReasons.map((chip) => {
                              const selected = rejectReason === chip;
                              return (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => setRejectReason(chip)}
                                  className={cn(
                                    "rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors",
                                    selected
                                      ? "border-primary bg-primary/15 text-primary"
                                      : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {chip}
                                </button>
                              );
                            })}
                          </div>

                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder={
                              isArabic
                                ? "أو اكتب السبب هنا..."
                                : "Or type your reason..."
                            }
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />

                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleRejectSuggestion(suggestion)}
                              disabled={isReplacing || !rejectReason.trim()}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-[11px] font-bold text-primary-foreground shadow-xs transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                            >
                              {isReplacing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              <span>
                                {isArabic
                                  ? "استبدال بمقترح أنسب"
                                  : "Replace with better"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              disabled={isReplacing}
                              className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:opacity-90"
                            >
                              {isArabic ? "إلغاء" : "Cancel"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground font-medium">
                            {suggestion.description ||
                              suggestion.shortDescription}
                          </p>

                          <div className="mt-3 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleClaimSuggested(suggestion)}
                              disabled={isClaiming || isReplacing}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 px-2.5 text-[11px] font-bold text-primary-foreground shadow-xs transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                            >
                              {isClaiming ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {isArabic
                                  ? "أنجزته (إضافة مباشرة)"
                                  : "Completed (Add directly)"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(suggestion.id);
                                setRejectReason("");
                              }}
                              disabled={isClaiming || isReplacing}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-[0.98] disabled:opacity-50"
                            >
                              <ThumbsDown className="h-3 w-3" />
                              <span>{isArabic ? "رفض" : "Reject"}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Skeleton card while loading initial suggestions */}
              {loadingSuggestions && suggestions.length === 0 && (
                <div className="flex flex-col justify-between rounded-xl border border-dashed border-border/70 bg-muted/15 p-3 min-h-[136px] animate-pulse">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-16 rounded bg-muted" />
                        <div className="h-3.5 w-32 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-5 w-12 rounded-full bg-muted" />
                  </div>
                  <div className="mt-3 space-y-1.5 pt-2 border-t border-border/40">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function InlineEditor({
  mode,
  isArabic,
  onCancel,
  onSave,
  isBusy,
}: {
  mode: NonNullable<EditMode>;
  isArabic: boolean;
  onCancel: () => void;
  onSave: (value: string) => void;
  isBusy: boolean;
}) {
  const [value, setValue] = useState(mode.value);
  const isMultiline = mode.field === "description";

  return (
    <div className="mt-1.5">
      {isMultiline ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full resize-none rounded-lg border border-border bg-background p-2 text-base sm:text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none"
          rows={3}
          placeholder={isArabic ? "الوصف..." : "Description..."}
          autoFocus
        />
      ) : (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-border bg-background p-2 text-base sm:text-xs font-bold text-foreground focus:border-primary focus:outline-none"
          placeholder={isArabic ? "اسم الإنجاز..." : "Milestone name..."}
          autoFocus
        />
      )}
      <div className="mt-1.5 flex gap-1.5">
        <button
          onClick={() => onSave(value.trim())}
          disabled={isBusy || !value.trim()}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary py-2 sm:py-1 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {isBusy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {isArabic ? "حفظ" : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={isBusy}
          className="rounded-lg bg-muted px-3 py-2 sm:px-2 sm:py-1 text-xs font-semibold text-muted-foreground transition hover:opacity-90 active:scale-[0.98]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
