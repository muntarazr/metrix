'use client';

import { useEffect, useMemo, useState } from 'react';
import { arSA, enUS } from 'react-day-picker/locale';
import { createClient } from '@/utils/supabase/client';
import { getScorableTasks, type TaskRow } from '@/lib/task-hierarchy';
import { LEVEL_STEPS } from '@/components/challenge/RewardsSection';
import { getGoalEndDaysChip } from '@/lib/goal-dates';
import { apiUrl } from '@/lib/api';
import {
  type EditableGoal,
  type TaskDraft,
  type TaskChange,
  getDateInputValue,
  dateInputToDate,
  dateInputToStableIso,
  getGoalDays,
} from './goal-edit-types';
import { getGoalEditLabels, getGoalEditAiLabels } from './goal-edit-labels';

export function useGoalEditState(
  goal: EditableGoal | null,
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onSaved?: () => void,
  isArabic: boolean = true
) {
  const supabase = useMemo(() => createClient(), []);
  const locale = isArabic ? arSA : enUS;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Target');
  const [startDate, setStartDate] = useState(getDateInputValue());
  const [endDate, setEndDate] = useState(getDateInputValue());
  const [currentPoints, setCurrentPoints] = useState('0');
  const [targetPoints, setTargetPoints] = useState('10000');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Edit States
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [aiInstruction, setAiInstruction] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Tasks live alongside the goal so the AI can adjust the plan, not just its label.
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [taskChanges, setTaskChanges] = useState<TaskChange[]>([]);
  /** completed check-ins per task id - what a removal would destroy. */
  const [checkinCounts, setCheckinCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!goal || !open) {
      return;
    }

    setTitle(goal.title || '');
    setDescription(goal.ai_summary || '');
    setIcon(goal.icon || 'Target');
    setStartDate(getDateInputValue(goal.created_at));
    setEndDate(getDateInputValue(goal.estimated_completion_date));
    setCurrentPoints(String(goal.current_points || 0));
    setTargetPoints(String(goal.target_points || 10000));
    setErrorMessage(null);
    setAiSuccessMessage(null);
    setActiveTab('manual');
    setAiInstruction('');
    setTaskChanges([]);
  }, [goal?.id, open]);

  // Load the goal's tasks, plus how much history each one carries.
  useEffect(() => {
    if (!goal || !open) {
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('sub_layers')
        .select('id, task_description, task_type, parent_task_id, frequency, impact_weight, time_required_minutes, completion_criteria')
        .eq('goal_id', goal.id)
        .order('sort_order', { ascending: true });

      if (cancelled) {
        return;
      }

      if (error) {
        console.error('Error loading tasks for AI edit:', error);
        setTasks([]);
        setCheckinCounts({});
        return;
      }

      const rows = (data ?? []) as TaskDraft[];
      setTasks(rows);

      if (!rows.length) {
        setCheckinCounts({});
        return;
      }

      const { data: checkins, error: checkinError } = await supabase
        .from('task_checkins')
        .select('task_id')
        .in('task_id', rows.map((row) => row.id))
        .eq('completed', true);

      if (cancelled || checkinError) {
        return;
      }

      const counts: Record<string, number> = {};
      for (const row of checkins ?? []) {
        counts[row.task_id] = (counts[row.task_id] ?? 0) + 1;
      }
      setCheckinCounts(counts);
    })();

    return () => {
      cancelled = true;
    };
  }, [goal?.id, open]);

  const totalDays = getGoalDays(startDate, endDate);
  const parsedTargetPoints = Number(targetPoints);
  const parsedCurrentPoints = Number(currentPoints);

  const safePreviewTargetPoints = Number.isFinite(parsedTargetPoints) && parsedTargetPoints > 0
    ? Math.round(parsedTargetPoints)
    : 0;

  const safeCurrentPoints = Number.isFinite(parsedCurrentPoints) && parsedCurrentPoints >= 0
    ? Math.round(parsedCurrentPoints)
    : 0;

  const suggestedDailyPoints = safePreviewTargetPoints > 0 && totalDays > 0
    ? Math.max(1, Math.round(safePreviewTargetPoints / totalDays))
    : 0;

  const currentProgressPercent = safePreviewTargetPoints > 0
    ? Math.min(100, Math.max(0, Math.round((safeCurrentPoints / safePreviewTargetPoints) * 100)))
    : 0;

  const remainingDaysChip = useMemo(() => {
    return getGoalEndDaysChip(endDate, isArabic);
  }, [endDate, isArabic]);

  const currentLevelIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < LEVEL_STEPS.length; i++) {
      if (currentProgressPercent >= LEVEL_STEPS[i].percent) {
        index = i;
      }
    }
    return index;
  }, [currentProgressPercent]);

  const activeLevel = LEVEL_STEPS[currentLevelIndex] || LEVEL_STEPS[0];

  const effectiveTasks = useMemo(() => {
    if (!taskChanges.length) return tasks;

    const removalIds = new Set(
      taskChanges
        .filter((c): c is Extract<TaskChange, { op: 'remove' }> => c.op === 'remove')
        .map((c) => c.id)
    );

    const updatesMap = new Map(
      taskChanges
        .filter((c): c is Extract<TaskChange, { op: 'update' }> => c.op === 'update')
        .map((c) => [c.id, c])
    );

    const base = tasks
      .filter((t) => !removalIds.has(t.id))
      .map((t) => {
        const update = updatesMap.get(t.id);
        if (!update) return t;
        return {
          ...t,
          task_description: update.task_description ?? t.task_description,
          frequency: update.frequency ?? t.frequency,
          impact_weight: update.impact_weight ?? t.impact_weight,
          time_required_minutes: update.time_required_minutes ?? t.time_required_minutes,
          completion_criteria: update.completion_criteria ?? t.completion_criteria,
        };
      });

    const additions = taskChanges
      .filter((c): c is Extract<TaskChange, { op: 'add' }> => c.op === 'add')
      .map((add, idx) => ({
        id: `pending-add-${idx}`,
        task_description: add.task_description,
        task_type: add.task_type,
        parent_task_id: add.parent_task_id,
        frequency: add.frequency,
        impact_weight: add.impact_weight,
        time_required_minutes: add.time_required_minutes,
        completion_criteria: add.completion_criteria,
      }));

    return [...base, ...additions];
  }, [tasks, taskChanges]);

  const scorableTasks = useMemo(() => {
    if (!effectiveTasks || !effectiveTasks.length) return [];
    return getScorableTasks(effectiveTasks as unknown as TaskRow[]);
  }, [effectiveTasks]);

  const calculatedTaskPoints = useMemo(() => {
    if (!scorableTasks.length) return null;
    const weeks = Math.max(1, Math.ceil(totalDays / 7));
    const total = scorableTasks.reduce((sum, task) => {
      const isWeekly = task.frequency === 'weekly';
      const occurrences = isWeekly ? weeks : totalDays;
      const weight = Number(task.impact_weight) || 1;
      return sum + weight * occurrences;
    }, 0);
    return total > 0 ? total : null;
  }, [scorableTasks, totalDays]);

  const labels = useMemo(() => getGoalEditLabels(isArabic), [isArabic]);
  const aiLabels = useMemo(() => getGoalEditAiLabels(isArabic), [isArabic]);

  const handleClose = () => {
    if (isSaving || isAiProcessing) {
      return;
    }

    onOpenChange(false);
    setErrorMessage(null);
    setAiSuccessMessage(null);
  };

  const taskById = (id: string) => tasks.find((task) => task.id === id);

  const discardChange = (index: number) => {
    setTaskChanges((current) => current.filter((_, i) => i !== index));
  };

  const applyTaskChanges = async (goalId: string) => {
    const updates = taskChanges.filter((change): change is Extract<TaskChange, { op: 'update' }> => change.op === 'update');
    const additions = taskChanges.filter((change): change is Extract<TaskChange, { op: 'add' }> => change.op === 'add');
    const removals = taskChanges.filter((change): change is Extract<TaskChange, { op: 'remove' }> => change.op === 'remove');

    for (const update of updates) {
      const patch: Record<string, unknown> = {};
      if (update.task_description !== undefined) patch.task_description = update.task_description;
      if (update.frequency !== undefined) patch.frequency = update.frequency;
      if (update.impact_weight !== undefined) patch.impact_weight = update.impact_weight;
      if (update.time_required_minutes !== undefined) patch.time_required_minutes = update.time_required_minutes;
      if (update.completion_criteria !== undefined) patch.completion_criteria = update.completion_criteria;

      if (!Object.keys(patch).length) {
        continue;
      }

      const { error } = await supabase
        .from('sub_layers')
        .update(patch)
        .eq('id', update.id)
        .eq('goal_id', goalId);

      if (error) throw error;
    }

    if (additions.length) {
      const baseSortOrder = tasks.length;
      const { error } = await supabase.from('sub_layers').insert(
        additions.map((addition, index) => ({
          goal_id: goalId,
          parent_task_id: addition.parent_task_id,
          task_description: addition.task_description,
          task_type: addition.task_type,
          frequency: addition.frequency,
          impact_weight: addition.impact_weight,
          time_required_minutes: addition.time_required_minutes,
          completion_criteria: addition.completion_criteria,
          sort_order: baseSortOrder + index,
        })),
      );
      if (error) throw error;
    }

    if (removals.length) {
      const { error } = await supabase
        .from('sub_layers')
        .delete()
        .in('id', removals.map((removal) => removal.id))
        .eq('goal_id', goalId);
      if (error) throw error;
    }
  };

  const handleSave = async () => {
    if (!goal) {
      return;
    }

    const trimmedTitle = title.trim();
    const sanitizedDescription = description.trim();
    const numericCurrentPoints = Number(currentPoints);
    const numericTargetPoints = Number(targetPoints);

    if (!trimmedTitle) {
      setErrorMessage(labels.titleRequired);
      return;
    }

    if (!startDate || !endDate) {
      setErrorMessage(labels.dateRequired);
      return;
    }

    if (dateInputToDate(endDate) < dateInputToDate(startDate)) {
      setErrorMessage(labels.endDateError);
      return;
    }

    if (!Number.isFinite(numericCurrentPoints) || numericCurrentPoints < 0) {
      setErrorMessage(labels.currentPointsError);
      return;
    }

    if (!Number.isFinite(numericTargetPoints) || numericTargetPoints <= 0) {
      setErrorMessage(labels.pointsError);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const originalStartDate = goal ? getDateInputValue(goal.created_at) : null;
      const isStartDateChanged = originalStartDate !== null && startDate !== originalStartDate;
      const isShiftedForward = originalStartDate !== null && startDate > originalStartDate;

      const updates: Record<string, unknown> = {
        title: trimmedTitle,
        icon,
        ai_summary: sanitizedDescription,
        current_points: Math.max(0, Math.round(numericCurrentPoints)),
        target_points: Math.max(1, Math.round(numericTargetPoints)),
        estimated_completion_date: endDate,
        total_days: getGoalDays(startDate, endDate),
      };

      if (isStartDateChanged) {
        updates.created_at = dateInputToStableIso(startDate);
      }

      if (isShiftedForward) {
        const localStartDate = dateInputToDate(startDate);
        localStartDate.setHours(0, 0, 0, 0);
        const newStartIso = localStartDate.toISOString();
        const { data: oldLogs } = await supabase
          .from('daily_logs')
          .select('ai_score')
          .eq('goal_id', goal.id)
          .lt('created_at', newStartIso);

        const deductedPoints = (oldLogs || []).reduce((sum, l) => sum + (Number(l.ai_score) || 0), 0);
        if (deductedPoints > 0) {
          updates.current_points = Math.max(0, Number(updates.current_points) - deductedPoints);
        }

        await supabase.from('daily_logs').delete().eq('goal_id', goal.id).lt('created_at', newStartIso);
        await supabase.from('task_checkins').delete().eq('goal_id', goal.id).lt('period_start', startDate);
        await supabase.from('task_checkins').delete().eq('goal_id', goal.id).lt('completed_at', newStartIso);
      }

      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goal.id);

      if (error) {
        throw error;
      }

      if (taskChanges.length) {
        try {
          await applyTaskChanges(goal.id);
        } catch (taskError: unknown) {
          console.error('Error applying task changes:', taskError);
          setErrorMessage(aiLabels.taskSaveError);
          setIsSaving(false);
          return;
        }
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error: unknown) {
      console.error('Error updating goal:', error);
      const message = error instanceof Error && error.message ? error.message : labels.saveError;
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) {
      setErrorMessage(isArabic ? 'يرجى كتابة تعليمات التعديل أولاً.' : 'Please enter edit instructions first.');
      return;
    }

    setIsAiProcessing(true);
    setErrorMessage(null);
    setAiSuccessMessage(null);

    try {
      const response = await fetch(apiUrl('/api/goal/ai-edit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: {
            title,
            ai_summary: description,
            created_at: startDate,
            estimated_completion_date: endDate,
            current_points: Number(currentPoints),
            target_points: Number(targetPoints),
            icon,
          },
          instruction: aiInstruction,
          tasks: tasks.map((task) => ({
            id: task.id,
            task_description: task.task_description,
            task_type: task.task_type,
            parent_task_id: task.parent_task_id,
            frequency: task.frequency,
            impact_weight: task.impact_weight,
            time_required_minutes: task.time_required_minutes,
            completion_criteria: task.completion_criteria,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === 'quota_exceeded') {
          throw new Error(isArabic ? errorData.message_ar : errorData.message_en);
        }
        throw new Error(isArabic ? 'فشلت معالجة الطلب بواسطة الذكاء الاصطناعي.' : 'AI processing failed.');
      }

      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error(isArabic ? 'لم يتم استلام بيانات صالحة من الذكاء الاصطناعي.' : 'No valid data received from AI.');
      }

      if (result.status === 'refused') {
        throw new Error(result.explanation || (isArabic ? 'تم رفض الطلب لدواعي الأمان.' : 'Request was refused due to safety policies.'));
      }

      const g = (result.goal && typeof result.goal === 'object')
        ? result.goal
        : (result.updated_goal && typeof result.updated_goal === 'object')
          ? result.updated_goal
          : null;

      const hasTaskChanges = Array.isArray(result.task_changes) && result.task_changes.length > 0;
      const hasGoalChanges = Boolean(
        g && (
          g.title ||
          g.ai_summary !== undefined ||
          g.description !== undefined ||
          g.created_at ||
          g.estimated_completion_date ||
          g.current_points !== undefined ||
          g.target_points !== undefined ||
          g.icon
        )
      );

      if (result.status === 'ok' || hasGoalChanges || hasTaskChanges || Boolean(result.explanation)) {
        if (g) {
          if (typeof g.title === 'string' && g.title.trim()) setTitle(g.title.trim());
          if (typeof g.ai_summary === 'string' && g.ai_summary.trim()) setDescription(g.ai_summary.trim());
          else if (typeof g.description === 'string' && g.description.trim()) setDescription(g.description.trim());
          if (typeof g.created_at === 'string' && g.created_at.trim()) setStartDate(getDateInputValue(g.created_at));
          if (typeof g.estimated_completion_date === 'string' && g.estimated_completion_date.trim()) setEndDate(getDateInputValue(g.estimated_completion_date));
          if (g.current_points !== undefined && Number.isFinite(Number(g.current_points))) {
            setCurrentPoints(String(Math.max(0, Math.round(Number(g.current_points)))));
          }
          if (g.target_points !== undefined && Number.isFinite(Number(g.target_points)) && Number(g.target_points) > 0) {
            setTargetPoints(String(Math.max(1, Math.round(Number(g.target_points)))));
          }
          if (typeof g.icon === 'string' && g.icon.trim()) setIcon(g.icon.trim());
        }

        setTaskChanges(Array.isArray(result.task_changes) ? result.task_changes : []);
        setAiSuccessMessage(result.explanation || (isArabic ? 'تم تعديل الخطة بنجاح بالذكاء الاصطناعي!' : 'Plan updated successfully with AI!'));
        setAiInstruction('');
      } else {
        throw new Error(isArabic ? 'لم يتم استلام بيانات صالحة من الذكاء الاصطناعي.' : 'No valid data received from AI.');
      }
    } catch (err: unknown) {
      console.error('AI Edit error:', err);
      const message = err instanceof Error ? err.message : '';
      setErrorMessage(message || (isArabic ? 'حدث خطأ أثناء معالجة الطلب.' : 'An error occurred during processing.'));
    } finally {
      setIsAiProcessing(false);
    }
  };

  return {
    locale,
    title,
    setTitle,
    description,
    setDescription,
    icon,
    setIcon,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    currentPoints,
    setCurrentPoints,
    targetPoints,
    setTargetPoints,
    isSaving,
    errorMessage,
    setErrorMessage,
    activeTab,
    setActiveTab,
    aiInstruction,
    setAiInstruction,
    isAiProcessing,
    aiSuccessMessage,
    taskChanges,
    checkinCounts,
    totalDays,
    safePreviewTargetPoints,
    suggestedDailyPoints,
    remainingDaysChip,
    activeLevel,
    calculatedTaskPoints,
    labels,
    aiLabels,
    handleClose,
    taskById,
    discardChange,
    handleSave,
    handleAiEdit,
  };
}
