'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { type Language } from '@/lib/translations';
import { parseDailyLogBreakdown } from '@/lib/daily-log-feedback';
import { getScorableTasks, type TaskRow } from '@/lib/task-hierarchy';
import { getTaskAccent } from '@/lib/task-colors';
import { cn, formatNumberEn } from '@/lib/utils';
import { PANEL_SURFACE } from '@/lib/surfaces';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getLocalDateKey } from '@/lib/task-periods';

interface TaskInsightsProps {
  goalId: string;
  tasks: TaskRow[];
  language?: Language;
}

interface TaskCheckinRow {
  task_id: string;
  completed_at: string | null;
  period_start: string;
  points?: number;
}

interface DailyLogRow {
  created_at: string;
  breakdown: unknown;
}

interface BreakdownRow {
  task_id: string;
  points?: number;
  status?: string;
}

interface TaskAggregate {
  id: string;
  label: string;
  icon: string;
  impactWeight: number;
  frequency: string;
  completionCount: number;
  totalPoints: number;
  lastCompletedAt: string | null;
  recentCount: number;
}

const copy = {
  en: {
    title: 'Task Radar',
    loading: 'Loading task insights...',
    empty: 'Complete a few tasks and this panel will start mapping your strongest patterns.',
  },
  ar: {
    title: 'رادار المهام',
    loading: 'جارِ تحميل إحصائيات المهام...',
    empty: 'أنجز كم مهمة بالبداية، وهنا راح يظهر نمط المهام الأقوى عندك.',
  },
} as const;

export default function TaskInsights({ goalId, tasks, language = 'ar' }: TaskInsightsProps) {
  const supabase = useMemo(() => createClient(), []);
  const isArabic = language === 'ar';
  const text = copy[language];
  const [history, setHistory] = useState<TaskCheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskNameDialog, setTaskNameDialog] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    return getLocalDateKey();
  }, []);

  const completedTodayTasks = useMemo(() => {
    return tasks.filter((task) =>
      history.some((h) => h.task_id === task.id && h.period_start === todayStr)
    );
  }, [tasks, history, todayStr]);

  const dailyTasks = useMemo(() => tasks.filter((t) => t.frequency === 'daily'), [tasks]);

  const currentHour = useMemo(() => new Date().getHours(), []);
  const isEndOfDay = currentHour >= 17; // After 5:00 PM

  const getSummaryTextAr = () => {
    const header = isEndOfDay ? '📝 حصاد نهاية اليوم' : '☀️ ملخص المهام اليومية';
    if (completedTodayTasks.length === 0) {
      return {
        header,
        body: `لم تقم بإكمال أي مهام اليوم بعد. لا يزال لديك المتسع من الوقت لإنجاز مهامك اليومية والمحافظة على تقدمك المستمر!`,
      };
    }

    const taskNames = completedTodayTasks.map((t) => `«${t.task_description}»`).join('، ');
    const totalDaily = dailyTasks.length;
    const completedDaily = dailyTasks.filter((t) => completedTodayTasks.some((ct) => ct.id === t.id)).length;

    return {
      header,
      body: `أنت تسير بقوة! لقد أنجزت اليوم ${completedTodayTasks.length} مهمة بنجاح (منها ${completedDaily} من أصل ${totalDaily} من مهامك اليومية المكررة). المهام التي تم إكمالها اليوم هي: ${taskNames}. استمر في هذا العطاء والالتزام الرائع!`,
    };
  };

  const getSummaryTextEn = () => {
    const header = isEndOfDay ? '📝 End of Day Summary' : '☀️ Daily Task Summary';
    if (completedTodayTasks.length === 0) {
      return {
        header,
        body: `You haven't completed any tasks today yet. There is still time to check off your tasks and keep your streak going!`,
      };
    }

    const taskNames = completedTodayTasks.map((t) => `"${t.task_description}"`).join(', ');
    const totalDaily = dailyTasks.length;
    const completedDaily = dailyTasks.filter((t) => completedTodayTasks.some((ct) => ct.id === t.id)).length;

    return {
      header,
      body: `You're crushing it! Today you successfully completed ${completedTodayTasks.length} tasks (including ${completedDaily} out of ${totalDaily} daily recurring tasks). The tasks checked off today: ${taskNames}. Keep up this excellent momentum!`,
    };
  };

  useEffect(() => {
    let mounted = true;

    async function fetchHistory() {
      setLoading(true);
      const [{ data: checkinData }, { data: logData }] = await Promise.all([
        supabase
          .from('task_checkins')
          .select('task_id, completed_at, period_start')
          .eq('goal_id', goalId)
          .eq('completed', true)
          .order('completed_at', { ascending: false }),
        supabase
          .from('daily_logs')
          .select('created_at, breakdown')
          .eq('goal_id', goalId)
          .not('breakdown', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      const mergedHistory = new Map<string, TaskCheckinRow>();

      for (const row of ((checkinData as TaskCheckinRow[] | null) || [])) {
        const stamp = row.completed_at || `${row.period_start}T00:00:00.000Z`;
        const key = `${row.task_id}:${row.period_start}:${stamp}`;
        mergedHistory.set(key, row);
      }

      for (const log of ((logData as DailyLogRow[] | null) || [])) {
        const periodStart = log.created_at?.split('T')[0];
        if (!periodStart) continue;

        for (const item of parseDailyLogBreakdown(log.breakdown).items.map((entry) => ({
          task_id: entry.task_id,
          points: Number(entry.points) || 0,
          status: entry.status,
        } satisfies BreakdownRow))) {
          const hasProgress = (item.points || 0) > 0 || item.status === 'done' || item.status === 'partial';
          if (!hasProgress) continue;

          const key = `${item.task_id}:${periodStart}:${log.created_at}`;
          const existing = mergedHistory.get(key);
          if (existing && (existing.points || 0) >= (item.points || 0)) continue;

          mergedHistory.set(key, {
            task_id: item.task_id,
            completed_at: log.created_at,
            period_start: periodStart,
            points: item.points || 0,
          });
        }
      }

      if (mounted) {
        setHistory(
          Array.from(mergedHistory.values()).sort(
            (a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''),
          ),
        );
        setLoading(false);
      }
    }

    fetchHistory();

    return () => {
      mounted = false;
    };
  }, [goalId, supabase]);

  const analytics = useMemo(() => {
    const scorableTasks = getScorableTasks(tasks);
    const mainTaskMap = new Map(
      tasks
        .filter((task) => task.task_type !== 'sub')
        .map((task) => [
          task.id,
          {
            label: task.task_description,
            accentColor: task.accent_color || null,
          },
        ]),
    );
    const taskMap = new Map(
      tasks.map((task) => [
        task.id,
        {
          label: task.task_description,
          icon: task.icon || (task.task_type === 'sub' ? '🔹' : '🧭'),
          impactWeight: Number(task.impact_weight) || 1,
          frequency: task.frequency || 'daily',
          parentTaskId: task.parent_task_id || null,
          accentColor: task.accent_color || null,
        },
      ]),
    );

    const baseAggregates = new Map<string, TaskAggregate>();
    for (const task of scorableTasks) {
      const source = taskMap.get(task.id);
      baseAggregates.set(task.id, {
        id: task.id,
        label: source?.label || task.task_description,
        icon: source?.icon || '✨',
        impactWeight: Number(task.impact_weight) || source?.impactWeight || 1,
        frequency: task.frequency,
        completionCount: 0,
        totalPoints: 0,
        lastCompletedAt: null,
        recentCount: 0,
      });
    }

    for (const row of history) {
      const aggregate = baseAggregates.get(row.task_id);
      if (!aggregate) continue;

      const stamp = row.completed_at || `${row.period_start}T00:00:00.000Z`;
      aggregate.completionCount += 1;
      aggregate.totalPoints += row.points ?? aggregate.impactWeight;

      if (!aggregate.lastCompletedAt || stamp > aggregate.lastCompletedAt) {
        aggregate.lastCompletedAt = stamp;
      }
    }

    const aggregates = Array.from(baseAggregates.values());
    const completedTasks = aggregates.filter((item) => item.completionCount > 0);

    const topTasks = [...completedTasks]
      .sort((a, b) => b.completionCount - a.completionCount || b.totalPoints - a.totalPoints)
      .slice(0, 6)
      .map((item) => {
        const source = taskMap.get(item.id);
        const accentSeed = source?.parentTaskId || item.id;
        const mainTaskMeta = source?.parentTaskId
          ? mainTaskMap.get(source.parentTaskId) || null
          : mainTaskMap.get(item.id) || null;
        const accentColor = source?.parentTaskId
          ? mainTaskMeta?.accentColor || source?.accentColor || null
          : source?.accentColor || mainTaskMeta?.accentColor || null;

        return {
          id: item.id,
          fullName: item.label,
          icon: item.icon,
          completions: item.completionCount,
          accent: getTaskAccent(accentSeed, accentColor),
        };
      });

    return {
      aggregates,
      topTasks,
      totalCompleted: completedTasks.reduce((sum, item) => sum + item.completionCount, 0),
    };
  }, [history, tasks]);

  if (loading) {
    return (
      <div className={cn(PANEL_SURFACE, "rounded-2xl p-3")}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex min-w-0 items-center justify-between gap-1.5 rounded-xl border border-border/45 bg-muted/20 px-2.5 py-2.5"
            >
              <div className="h-6 w-6 shrink-0 rounded-lg bg-muted/60 animate-pulse" />
              <div className="h-5 w-10 rounded-lg bg-muted/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics.aggregates.length || analytics.totalCompleted === 0) {
    return (
      <div
        className={cn(PANEL_SURFACE, "rounded-2xl p-6")}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/75 ring-1 ring-border/25">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-foreground">{text.title}</div>
            <p className="mt-1.5 text-sm text-muted-foreground/75 leading-relaxed">{text.empty}</p>
          </div>
        </div>
      </div>
    );
  }

  const summary = isArabic ? getSummaryTextAr() : getSummaryTextEn();

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-3">
      <Dialog
        open={taskNameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setTaskNameDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl" dir={isArabic ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-start text-base font-bold leading-snug sm:text-lg">
              {taskNameDialog}
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Daily Progress Box Card (Only displays at the end of the day, after 5 PM) */}
      {isEndOfDay && (
        <div className={cn(PANEL_SURFACE, "rounded-2xl p-4")}>
          <div className="flex flex-col gap-2">
            <div className="text-[14px] font-extrabold text-foreground flex items-center gap-1.5">
              {summary.header}
            </div>
            <p className="text-sm text-muted-foreground/90 leading-relaxed font-medium">
              {summary.body}
            </p>
          </div>
        </div>
      )}

      {/* Top Tasks Grid Container */}
      <style>{`
        /* Task accent roles. One monochrome ramp plus the brand teal — retired
           hues resolve to the tone that replaced them (see lib/task-colors.ts). */
        .metrix-task-card { --c-brand: var(--muted-foreground); }
        .metrix-task-card[data-color="zinc"],
        .metrix-task-card[data-color="fuchsia"] { --c-brand: var(--foreground); }
        .metrix-task-card[data-color="violet"],
        .metrix-task-card[data-color="blue"],
        .metrix-task-card[data-color="indigo"] { --c-brand: color-mix(in oklab, var(--foreground) 75%, var(--card)); }
        .metrix-task-card[data-color="sky"],
        .metrix-task-card[data-color="lime"] { --c-brand: var(--muted-foreground); }
        .metrix-task-card[data-color="amber"],
        .metrix-task-card[data-color="orange"] { --c-brand: color-mix(in oklab, var(--muted-foreground) 70%, var(--card)); }
        .metrix-task-card[data-color="rose"],
        .metrix-task-card[data-color="pink"] { --c-brand: color-mix(in oklab, var(--muted-foreground) 50%, var(--card)); }
        .metrix-task-card[data-color="teal"],
        .metrix-task-card[data-color="emerald"],
        .metrix-task-card[data-color="cyan"] { --c-brand: var(--primary); }

        .metrix-tasks-container {
          background-color: var(--card) !important;
          border: 1px solid var(--border) !important;
          border-radius: 16px !important;
          padding: 12px !important;
        }

        .metrix-task-card {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 8px !important;
          padding: 8px 10px !important;
          border-radius: 12px !important;
          background-color: color-mix(in oklab, var(--c-brand) 3%, transparent) !important;
          border: 1px solid color-mix(in oklab, var(--c-brand) 10%, var(--border)) !important;
          transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
        }

        .metrix-task-card:hover {
          border-color: color-mix(in oklab, var(--c-brand) 50%, transparent) !important;
          background-color: color-mix(in oklab, var(--c-brand) 100%, var(--background)) !important;
          transform: translateY(-1px) scale(1.02) !important;
          box-shadow: 0 4px 12px -3px color-mix(in oklab, var(--c-brand) 15%, transparent) !important;
        }

        .metrix-task-card:hover * {
          color: var(--background) !important;
        }

        .metrix-task-icon {
          font-size: 1.15rem !important;
        }

        .metrix-task-badge {
          font-size: 11px !important;
          font-weight: 800 !important;
          padding: 3px 6px !important;
          border-radius: 6px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02) !important;
          transition: all 0.2s ease !important;
          background-color: color-mix(in oklab, var(--c-brand) 12%, var(--background)) !important;
          color: color-mix(in oklab, var(--c-brand) 80%, var(--foreground)) !important;
        }
      `}</style>

      <div className="metrix-tasks-container relative overflow-hidden transition-all duration-300">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 transition-all duration-300">
          {analytics.topTasks.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.fullName}
              data-color={item.accent.key}
              onClick={() => setTaskNameDialog(item.fullName)}
              className="metrix-task-card group relative flex min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="metrix-task-icon shrink-0">
                {item.icon}
              </span>

              <span className="metrix-task-badge shrink-0 tabular-nums" dir="ltr">
                <span className="text-[10px] font-bold transition-colors">×</span>
                {formatNumberEn(item.completions)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
