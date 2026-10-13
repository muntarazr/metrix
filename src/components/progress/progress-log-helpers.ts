import type { Language } from "@/lib/translations";
import type { MainBreakdownItem, TaskRow } from "@/lib/task-hierarchy";
import type {
  DailyLogBreakdownItem,
  DailyLogPerformanceMeta,
} from "@/lib/daily-log-feedback";

export type LogMode = "select" | "ai" | "milestone";

export interface EvaluationResult {
  total_points_awarded: number;
  base_points: number;
  bonus_points: number;
  session_total_points?: number;
  session_entries_count?: number;
  coach_message: string;
  full_feedback?: string;
  day_label?: string;
  comparison_message?: string | null;
  warning_message?: string | null;
  performance_meta?: DailyLogPerformanceMeta;
  main_breakdown?: MainBreakdownItem[];
  subtask_breakdown?: DailyLogBreakdownItem[];
  task_breakdown?: DailyLogBreakdownItem[];
  bonus?: {
    points: number;
    reason: string;
  };
}

export interface EvaluationApiResponse extends EvaluationResult {
  error?: string;
  status?: "ok" | "refused";
  safe_redirection?: { message?: string };
  message?: string;
  message_ar?: string;
  message_en?: string;
}

export interface TaskCheckinRow {
  id: string;
  task_id: string;
  period_type: string;
  period_start: string;
  completed: boolean;
  completed_at: string | null;
}

export interface TodaySessionLogRow {
  id: string;
  created_at: string;
  user_input: string;
  ai_score: number | null;
  breakdown: unknown;
}

export interface PendingMilestoneImage {
  logId: string;
  score: number;
  message: string;
  imagePrompt: string;
}

export interface ProgressLogDialogProps {
  goal: {
    id: string;
    title: string;
    ai_summary?: string;
    created_at?: string;
    estimated_completion_date?: string | null;
    current_points?: number;
    target_points?: number;
  };
  goals?: Array<{
    id: string;
    title: string;
    ai_summary?: string;
    created_at?: string;
    estimated_completion_date?: string | null;
    current_points?: number;
    target_points?: number;
  }>;
  tasks: TaskRow[];
  initialMode?: LogMode;
  onClose: () => void;
  onSuccess: () => void;
  language?: Language;
}

/** Distinct calendar days present in a set of logs. */
export function countDistinctLoggedDays(
  logs: Array<{ created_at?: string | null }> | null | undefined,
): number {
  const days = new Set<string>();
  for (const log of logs || []) {
    if (typeof log.created_at === "string") {
      days.add(log.created_at.split("T")[0]);
    }
  }
  return days.size;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
    if (typeof err.error === "string" && err.error.trim()) {
      return err.error;
    }
    if (typeof err.details === "string" && err.details.trim()) {
      return err.details;
    }
    if (typeof err.hint === "string" && err.hint.trim()) {
      return err.hint;
    }
  }
  return fallback;
}

export function formatLocalizedNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US").format(
    value,
  );
}

export function formatPointsDisplay(
  value: number,
  language: Language,
  unitLabel: string,
): string {
  const formattedValue = formatLocalizedNumber(value, language);
  return language === "ar"
    ? `${formattedValue} ${unitLabel}+`
    : `+${formattedValue} ${unitLabel}`;
}

export function splitResultText(text: string, language: Language): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  if (language !== "ar") {
    return normalized
      .split(/\.\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  return normalized
    .replace(/\.\s+/g, "\n")
    .replace(
      /،\s*(لكن|وهذا|إذا|فأنت|مقارنة|لكن تحتاج|ولا يزال|وستتباطأ|وسيَتباطأ|وسيتباطأ)/g,
      "\n$1",
    )
    .split("\n")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function mergeDaySessionInput(
  existingInput: string | null | undefined,
  nextInput: string,
  language: Language,
): string {
  const current = (existingInput || "").trim();
  const addition = nextInput.trim();

  if (!current) return addition;
  if (!addition) return current;

  const marker = language === "ar" ? "تحديث إضافي:" : "Additional check-in:";
  return `${current}\n\n${marker}\n${addition}`;
}

export function getStatusPriority(status?: DailyLogBreakdownItem["status"]): number {
  if (status === "done") return 4;
  if (status === "partial") return 3;
  if (status === "missed") return 2;
  return 1;
}

export function mergeDailyBreakdownItems(
  existingItems: DailyLogBreakdownItem[],
  nextItems: DailyLogBreakdownItem[],
): DailyLogBreakdownItem[] {
  const merged = new Map<string, DailyLogBreakdownItem>();

  [...existingItems, ...nextItems].forEach((item) => {
    const previous = merged.get(item.task_id);

    if (!previous) {
      merged.set(item.task_id, { ...item });
      return;
    }

    merged.set(item.task_id, {
      ...previous,
      ...item,
      points: Math.max(Number(previous.points) || 0, Number(item.points) || 0),
      time_bonus:
        Math.max(
          Number(previous.time_bonus) || 0,
          Number(item.time_bonus) || 0,
        ) || undefined,
      status:
        getStatusPriority(item.status) >= getStatusPriority(previous.status)
          ? item.status
          : previous.status,
      reason: item.reason || previous.reason,
    });
  });

  return Array.from(merged.values());
}

export function getAccountabilityCopy(language: Language) {
  return language === "ar"
    ? {
        comparison: "مقارنة",
        warning: "تحذير",
        showTasks: "عرض تفاصيل المهام",
        hideTasks: "إخفاء تفاصيل المهام",
        detailsHint: "التفاصيل اختيارية وتظهر فقط عند الحاجة.",
        scoredTasks: "مهام مقيّمة",
        addedNow: "المضاف الآن",
        dayTotal: "إجمالي اليوم",
        checkins: "تحديثات",
        done: "مكتمل",
        partial: "جزئي",
        missed: "مفوّت",
        unknown: "غير واضح",
      }
    : {
        comparison: "Comparison",
        warning: "Warning",
        showTasks: "Show Task Details",
        hideTasks: "Hide Task Details",
        detailsHint: "Task scoring stays optional until you need it.",
        scoredTasks: "Scored tasks",
        addedNow: "Added now",
        dayTotal: "Day total",
        checkins: "check-ins",
        done: "Done",
        partial: "Partial",
        missed: "Missed",
        unknown: "Unclear",
      };
}

export function getPerformanceStyles(performanceTier: string, isMilestone: boolean) {
  if (isMilestone) {
    return {
      hero: "border-amber-500/30 bg-amber-500/15 text-amber-500 shadow-md shadow-amber-500/10",
      badge: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black",
      summary: "border-amber-500/20 bg-amber-500/5 text-foreground",
    };
  }

  if (performanceTier === "exceptional") {
    return {
      hero: "border-foreground/15 bg-foreground/12 text-foreground/75",
      badge: "border-foreground/15 bg-foreground/12 text-foreground/75",
      summary: "border-foreground/15 bg-foreground/12 text-foreground/75",
    };
  }

  if (performanceTier === "strong") {
    return {
      hero: "border-foreground/25 bg-foreground/12 text-foreground",
      badge: "border-foreground/25 bg-foreground/12 text-foreground",
      summary: "border-foreground/25 bg-foreground/12 text-foreground",
    };
  }

  if (performanceTier === "weak") {
    return {
      hero: "border-destructive/25 bg-destructive/12 text-destructive",
      badge: "border-destructive/25 bg-destructive/12 text-destructive",
      summary: "border-destructive/25 bg-destructive/12 text-destructive",
    };
  }

  return {
    hero: "border-border bg-muted/60 text-muted-foreground",
    badge: "border-border bg-muted/60 text-muted-foreground",
    summary: "border-border bg-muted/60 text-muted-foreground",
  };
}
