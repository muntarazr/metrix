'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  TrendingUp,
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

interface TopTaskItem {
  id: string;
  fullName: string;
  icon: string;
  completions: number;
  totalPoints: number;
  impactWeight: number;
  frequency: string;
  parentName: string | null;
  completionCriteria: string | null;
  miniVersion: string | null;
  accent: ReturnType<typeof getTaskAccent>;
  lastCompletedAt: string | null;
}

const copy = {
  en: {
    title: 'Most Frequent Skills',
    subtitle: 'Skills and tasks with your highest consistency and repetition',
    loading: 'Loading skill insights...',
    empty: 'Complete a few tasks first, and your most frequent skills will be mapped here.',
    completions: 'Completions',
    times: 'times',
    points: 'pts',
    daily: 'Daily',
    weekly: 'Weekly',
    rank: 'Rank',
    totalDone: 'total completions',
    pillar: 'Pillar',
    criteria: 'Completion Criteria',
    miniVersion: '2-Minute Rule',
    activeSkills: 'top skills',
    details: 'Skill Details',
  },
  ar: {
    title: 'المهارات الأكثر تكرارًا',
    subtitle: 'المهارات والمهام الأكثر التزاماً وتكراراً في مسار نموك',
    loading: 'جارِ تحميل إحصائيات المهارات...',
    empty: 'أنجز بعض المهام أولاً، وسيظهر هنا تلقائياً ترتيب المهارات الأكثر تكراراً والتزاماً.',
    completions: 'مرات التكرار',
    times: 'مرات',
    points: 'نقطة',
    daily: 'يومية',
    weekly: 'أسبوعية',
    rank: 'المرتبة',
    totalDone: 'إنجاز كلي',
    pillar: 'الركيزة / المسار',
    criteria: 'معيار الإنجاز',
    miniVersion: 'نسخة الدقيقتين',
    activeSkills: 'مهارات متميزة',
    details: 'تفاصيل المهارة',
  },
} as const;

export default function TaskInsights({ goalId, tasks, language = 'ar' }: TaskInsightsProps) {
  const supabase = useMemo(() => createClient(), []);
  const isArabic = language === 'ar';
  const text = copy[language];
  const [history, setHistory] = useState<TaskCheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TopTaskItem | null>(null);

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

    const topTasks: TopTaskItem[] = [...completedTasks]
      .sort((a, b) => b.completionCount - a.completionCount || b.totalPoints - a.totalPoints)
      .slice(0, 6)
      .map((item) => {
        const source = taskMap.get(item.id);
        const originalTask = tasks.find((t) => t.id === item.id);
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
          totalPoints: item.totalPoints,
          impactWeight: item.impactWeight,
          frequency: item.frequency,
          parentName: source?.parentTaskId ? (mainTaskMap.get(source.parentTaskId)?.label ?? null) : null,
          completionCriteria: originalTask?.completion_criteria ?? null,
          miniVersion: originalTask?.mini_version ?? null,
          accent: getTaskAccent(accentSeed, accentColor),
          lastCompletedAt: item.lastCompletedAt,
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
      <div
        className={cn(PANEL_SURFACE, "rounded-2xl p-3.5 sm:p-4")}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-muted/60 animate-pulse" />
            <div className="space-y-1">
              <div className="h-3.5 w-28 rounded bg-muted/60 animate-pulse" />
              <div className="h-2.5 w-40 rounded bg-muted/30 animate-pulse hidden sm:block" />
            </div>
          </div>
          <div className="h-5 w-16 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3 gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-5 w-5 rounded bg-muted/50 animate-pulse" />
                  <div className="h-7 w-7 rounded-lg bg-muted/50 animate-pulse" />
                  <div className="h-3.5 w-32 rounded bg-muted/60 animate-pulse" />
                </div>
                <div className="h-5 w-8 rounded-lg bg-muted/50 animate-pulse" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics.aggregates.length || analytics.totalCompleted === 0) {
    return (
      <div
        className={cn(PANEL_SURFACE, "rounded-2xl p-4 sm:p-5")}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-foreground">{text.title}</div>
            <p className="mt-0.5 text-xs text-muted-foreground/80 leading-relaxed">{text.empty}</p>
          </div>
        </div>
      </div>
    );
  }

  const summary = isArabic ? getSummaryTextAr() : getSummaryTextEn();
  const maxCompletions = analytics.topTasks[0]?.completions || 1;

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-2.5">
      {/* Detail Dialog */}
      <Dialog
        open={selectedTask !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-5" dir={isArabic ? 'rtl' : 'ltr'}>
          {selectedTask && (
            <div className="space-y-3.5">
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface border border-border/70 text-xl shadow-xs mt-0.5">
                    {selectedTask.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 items-center justify-center rounded bg-primary/10 border border-primary/20 px-1.5 text-[10px] font-black text-primary">
                        #{analytics.topTasks.findIndex((t) => t.id === selectedTask.id) + 1}
                      </span>
                      {selectedTask.parentName && (
                        <span className="text-xs font-semibold text-muted-foreground truncate">
                          {selectedTask.parentName}
                        </span>
                      )}
                    </div>
                    <DialogTitle className="text-start text-sm sm:text-base font-bold text-foreground leading-snug mt-1.5">
                      {selectedTask.fullName}
                    </DialogTitle>
                  </div>
                </div>
              </DialogHeader>

              {/* Stats overview in dialog */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                <div className="rounded-xl border border-border/60 bg-surface/50 p-2.5">
                  <div className="text-[10px] font-medium text-muted-foreground">
                    {text.completions}
                  </div>
                  <div className="text-sm font-black text-foreground mt-0.5">
                    {formatNumberEn(selectedTask.completions)} {text.times}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/50 p-2.5">
                  <div className="text-[10px] font-medium text-muted-foreground">
                    {isArabic ? 'إجمالي النقاط' : 'Total Points'}
                  </div>
                  <div className="text-sm font-black text-primary mt-0.5">
                    +{formatNumberEn(selectedTask.totalPoints)} {text.points}
                  </div>
                </div>
              </div>

              {/* Details / criteria if any */}
              {selectedTask.completionCriteria && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <div className="text-[10px] font-bold text-foreground/80 mb-0.5">
                    {text.criteria}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedTask.completionCriteria}
                  </p>
                </div>
              )}

              {selectedTask.miniVersion && (
                <div className="rounded-xl border border-primary/15 bg-primary/8 p-2.5">
                  <div className="text-[10px] font-bold text-primary mb-0.5">
                    {text.miniVersion}
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {selectedTask.miniVersion}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Daily Progress Box Card (Only displays at the end of the day, after 5 PM) */}
      {isEndOfDay && (
        <div className={cn(PANEL_SURFACE, "rounded-2xl p-3.5")}>
          <div className="flex flex-col gap-1.5">
            <div className="text-xs sm:text-sm font-extrabold text-foreground flex items-center gap-1.5">
              {summary.header}
            </div>
            <p className="text-xs text-muted-foreground/90 leading-relaxed font-medium">
              {summary.body}
            </p>
          </div>
        </div>
      )}

      {/* Top Skills Section Card - Refined Balanced Height */}
      <div className={cn(PANEL_SURFACE, "rounded-2xl p-3.5 sm:p-4 transition-all duration-300")}>
        {/* Section Header */}
        <div className="flex items-center justify-between gap-3 pb-2.5 mb-3 border-b border-border/60">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/15">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-extrabold text-foreground sm:text-sm">
                {text.title}
              </h3>
              <p className="hidden sm:block text-[11px] text-muted-foreground/75 leading-tight truncate mt-0.5">
                {text.subtitle}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>
              {formatNumberEn(analytics.topTasks.length)} {text.activeSkills}
            </span>
          </span>
        </div>

        {/* Top Tasks Balanced Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {analytics.topTasks.map((item, index) => {
            const progressPercent = Math.max(14, Math.round((item.completions / maxCompletions) * 100));
            const isTopRank = index === 0;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedTask(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedTask(item);
                  }
                }}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl border-2 border-border/80 bg-card p-3.5 text-start transition-all duration-200 hover:border-primary/60 hover:shadow-md cursor-pointer active:translate-y-[1px] shadow-xs",
                  isTopRank && "border-primary/40 ring-2 ring-primary/20 bg-primary/[0.03]"
                )}
              >
                {/* Top Row: Rank + Icon + Full Name + Multiplier */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-xl px-2 text-[10px] font-black shrink-0 tabular-nums border-2",
                        isTopRank
                          ? "bg-primary text-primary-foreground border-primary/40 shadow-xs"
                          : "bg-muted text-muted-foreground border-border/80 font-bold"
                      )}
                    >
                      #{index + 1}
                    </span>

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface border-2 border-border/70 text-sm shadow-xs">
                      {item.icon}
                    </span>

                    <h4
                      className="truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight"
                      title={item.fullName}
                    >
                      {item.fullName}
                    </h4>
                  </div>

                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-black text-primary tabular-nums"
                    dir="ltr"
                  >
                    <span className="text-[10px] font-bold">×</span>
                    {formatNumberEn(item.completions)}
                  </span>
                </div>

                {/* Bottom Row: Metadata (Pillar / Frequency) & Points / Consistency bar */}
                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground truncate">
                    {item.parentName && (
                      <>
                        <span className="truncate max-w-[120px] text-[10px] font-medium text-muted-foreground/80">
                          {item.parentName}
                        </span>
                        <span className="text-muted-foreground/40 text-[9px]">•</span>
                      </>
                    )}
                    <span className="text-[10px] font-medium text-muted-foreground/75">
                      {item.frequency === 'daily' ? text.daily : text.weekly}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-foreground/85 tabular-nums">
                      <span className="text-primary font-black">+{formatNumberEn(item.totalPoints)}</span>
                      <span className="text-[9px] text-muted-foreground ms-0.5">{text.points}</span>
                    </span>

                    {/* Mini consistency indicator track */}
                    <div className="w-12 h-1.5 overflow-hidden rounded-full bg-muted/50 shrink-0">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

