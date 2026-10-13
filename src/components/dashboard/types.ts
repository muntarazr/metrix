import type { Language } from "@/lib/translations";
import { parseDailyLogBreakdown } from "@/lib/daily-log-feedback";

export interface Goal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  status: string;
  created_at: string;
  estimated_completion_date: string;
  total_days: number;
  ai_summary: string;
  icon?: string;
  is_pinned?: boolean;
  manual_task_order?: boolean;
}

export interface TaskCheckin {
  id: string;
  goal_id: string;
  task_id: string;
  period_type: string;
  period_start: string;
  completed: boolean;
  completed_at: string | null;
  /** Set only on a skipped period; null on a completed or untouched one. */
  skip_reason?: string | null;
  /** 'full' | 'mini' — how the task was completed. */
  completed_mode?: string | null;
}

export interface ActivityLog {
  id: string;
  created_at: string;
  user_input: string;
  ai_score: number | null;
  ai_feedback: string;
  breakdown: unknown;
}

export interface DailyLogBreakdownRow {
  created_at: string;
  breakdown: unknown;
}

export interface BreakdownRow {
  task_id: string;
  points?: number;
  status?: string;
}

export interface DashboardProps {
  goal: Goal;
  language?: Language;
  onGoalUpdated?: () => void;
  onLogModalChange?: (isOpen: boolean) => void;
  isActive?: boolean;
}

export type DashboardTab = "focus" | "chart" | "challenge";

export function normalizeBreakdown(value: unknown): BreakdownRow[] {
  return parseDailyLogBreakdown(value).items.map((item) => ({
    task_id: item.task_id,
    points: Number(item.points) || 0,
    status: item.status,
  }));
}

export function hasMeaningfulProgress(item: BreakdownRow) {
  return (
    (item.points || 0) > 0 ||
    item.status === "done" ||
    item.status === "partial"
  );
}
