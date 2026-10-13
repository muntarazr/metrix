import type { Language } from "@/lib/translations";
import type { GoalTaskStats } from "@/app/page";

export interface Goal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  status: string;
  created_at: string;
  estimated_completion_date?: string | null;
  total_days?: number | null;
  icon?: string;
  is_pinned?: boolean;
  ai_summary?: string;
}

export interface HomePageProps {
  goals: Goal[];
  taskStatsMap?: Record<string, GoalTaskStats>;
  onSelectGoal: (id: string) => void;
  onNavigateToCreate?: (goalText: string, mode?: "ai" | "manual") => void;
  onGoalUpdated?: () => void;
  language?: Language;
  recentGoalsLimit?: number;
  activeBoxMode?: "new" | "log" | null;
  onBoxModeChange?: (mode: "new" | "log") => void;
  focusInputSignal?: number;
}
