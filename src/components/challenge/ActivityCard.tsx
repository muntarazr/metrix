"use client";

import { useState } from "react";
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
import { cardClass } from "./challenge-types";
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

type EditMode = null | {
  logId: string;
  field: "name" | "description";
  value: string;
};

export function ActivityCard({
  goalId,
  recentEvents,
  meGoalTitle,
  opponentGoalTitle,
  locale,
  numberFormatter,
  ui,
}: ActivityCardProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  const isArabic = locale === "ar" || locale?.startsWith("ar");
  const milestoneEvents = recentEvents.filter((e) => e.milestone);

  const refresh = () => {
    if (goalId) {
      window.dispatchEvent(
        new CustomEvent("challenge-log-updated", { detail: { goalId } }),
      );
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

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm shadow-black/[0.02] sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-muted/60 border border-border/70 text-muted-foreground">
            <Trophy className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            {ui.recentTitle}
          </span>
          {milestoneEvents.length > 0 && (
            <span className="rounded-full border border-border/70 bg-muted/20 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {milestoneEvents.length}
            </span>
          )}
        </div>
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
          {milestoneEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-8 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {ui.activityEmpty}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:grid-cols-3">
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
                            <span>{isArabic ? "تغيير اللون" : "Change color"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            {(Object.keys(accentConfig) as AccentColor[]).map((color) => {
                              const option = accentConfig[color];
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => handlePatch(logId, { accentColor: color })}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-muted/40 active:scale-95"
                                  title={isArabic ? option.label.ar : option.label.en}
                                >
                                  <span className={cn("h-4 w-4 rounded-full ring-1 ring-black/10", option.swatch)} />
                                </button>
                              );
                            })}
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
                                        handlePatch(logId, { accentColor: color })
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
                      "group relative overflow-hidden rounded-xl border p-3 shadow-xs transition-colors duration-200",
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
                            {formatNumericDate(event.createdAt, 'en')} · {formatTime(event.createdAt, 'en')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10.5px] font-bold text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>+{Intl.NumberFormat('en').format(event.points)}</span>
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
