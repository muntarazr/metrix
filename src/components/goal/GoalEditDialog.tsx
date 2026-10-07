'use client';

import { type ElementType, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { arSA, enUS } from 'react-day-picker/locale';
import { AlertCircle, Calendar, CalendarDays, Clock, Loader2, Sparkles, Target, TrendingUp } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IconPicker, getGoalIcon } from './IconPicker';
import { apiUrl } from '@/lib/api';

interface EditableGoal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  created_at: string;
  estimated_completion_date: string;
  total_days?: number;
  ai_summary?: string;
  icon?: string;
}

/** A task row as the dialog needs it; mirrors the columns we read from sub_layers. */
interface TaskDraft {
  id: string;
  task_description: string;
  task_type: 'main' | 'sub';
  parent_task_id: string | null;
  frequency: string;
  impact_weight: number;
  time_required_minutes: number;
  completion_criteria: string;
}

type TaskChange =
  | {
      op: 'update';
      id: string;
      task_description?: string;
      frequency?: string;
      impact_weight?: number;
      time_required_minutes?: number;
      completion_criteria?: string;
    }
  | {
      op: 'add';
      task_type: 'main' | 'sub';
      parent_task_id: string | null;
      task_description: string;
      frequency: string;
      impact_weight: number;
      time_required_minutes: number;
      completion_criteria: string;
    }
  | { op: 'remove'; id: string; reason?: string };

interface GoalEditDialogProps {
  goal: EditableGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  language?: Language;
}

interface DatePopoverFieldProps {
  icon: ElementType;
  isArabic: boolean;
  label: string;
  locale: typeof arSA | typeof enUS;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  minDate?: string;
}

const getDateInputValue = (value?: string | null) => {
  if (!value) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  const plainDate = value.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(plainDate)) {
    return plainDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  return format(parsed, 'yyyy-MM-dd');
};

const dateInputToDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const dateInputToStableIso = (value: string) => `${value}T12:00:00.000Z`;

const getGoalDays = (startDate: string, endDate: string) => {
  const start = dateInputToDate(startDate);
  const end = dateInputToDate(endDate);
  const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffInDays);
};

function DatePopoverField({
  icon: Icon,
  isArabic,
  label,
  locale,
  onChange,
  placeholder,
  value,
  minDate,
}: DatePopoverFieldProps) {
  const minimumDate = minDate ? dateInputToDate(minDate) : undefined;

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/80">
        <Icon className="size-3.5 text-primary/70" />
        <span>{label}</span>
      </Label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-11 w-full rounded-xl border-border/80 bg-card px-3.5 font-normal shadow-xs hover:border-primary/40 transition-colors',
              isArabic ? 'justify-end text-right' : 'justify-start text-left',
              !value && 'text-muted-foreground',
            )}
          >
            <Calendar className="size-4 shrink-0 text-primary/60 mr-2 rtl:mr-0 rtl:ml-2" />
            <span className="truncate text-xs sm:text-sm font-medium">
              {value ? format(dateInputToDate(value), 'PPP', { locale }) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto border-border/70 p-0 shadow-xl rounded-2xl"
          align={isArabic ? 'end' : 'start'}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <ShadcnCalendar
            mode="single"
            selected={value ? dateInputToDate(value) : undefined}
            onSelect={(date: Date | undefined) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
            initialFocus
            captionLayout="dropdown"
            locale={locale}
            dir={isArabic ? 'rtl' : 'ltr'}
            fromYear={2020}
            toYear={2035}
            disabled={minimumDate ? (date) => date < minimumDate : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function GoalEditDialog({
  goal,
  open,
  onOpenChange,
  onSaved,
  language = 'ar',
}: GoalEditDialogProps) {
  const supabase = createClient();
  const t = translations[language];
  const isArabic = language === 'ar';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, open]);

  const totalDays = getGoalDays(startDate, endDate);
  const parsedTargetPoints = Number(targetPoints);

  const safePreviewTargetPoints = Number.isFinite(parsedTargetPoints) && parsedTargetPoints > 0
    ? Math.max(1000, Math.round(parsedTargetPoints))
    : 10000;
  const suggestedDailyPoints = Math.max(1, Math.round(safePreviewTargetPoints / totalDays));

  const labels = {
    title: isArabic ? 'تعديل معلومات الهدف' : 'Edit goal details',
    subtitle: isArabic
      ? 'حدّث الاسم والوصف والتواريخ والنقاط من مكان واحد، بنفس أسلوب الواجهة الرئيسي.'
      : 'Update the title, description, dates, and points from one place with the same interface style.',
    startDate: isArabic ? 'تاريخ البدء' : 'Start date',
    endDate: isArabic ? 'تاريخ الانتهاء' : 'End date',
    selectDate: isArabic ? 'اختر تاريخاً' : 'Select date',
    currentProgress: isArabic ? 'التقدم الحالي' : 'Current progress',
    currentPoints: isArabic ? 'النقاط الحالية' : 'Current points',
    targetPoints: isArabic ? 'النقاط المستهدفة' : 'Target points',
    duration: isArabic ? 'مدة الخطة' : 'Plan duration',
    dailyPace: isArabic ? 'المعدل اليومي التقريبي' : 'Approx. daily pace',
    finalTarget: isArabic ? 'الهدف النهائي' : 'Final target',
    currentHint: isArabic ? 'يمكنك تعديل النقاط الحالية إذا كنت تريد تصحيح التقدم اليدوي.' : 'You can edit the current points if you need to correct progress manually.',
    targetHint: isArabic ? 'الحد الأدنى للنقاط المستهدفة هو 1000 نقطة.' : 'The minimum target is 1000 points.',
    titleRequired: isArabic ? 'اكتب اسم الهدف أولاً.' : 'Enter a goal title first.',
    dateRequired: isArabic ? 'حدد تاريخ البدء وتاريخ الانتهاء.' : 'Select both a start date and end date.',
    endDateError: isArabic ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.' : 'The end date must be after the start date.',
    currentPointsError: isArabic ? 'النقاط الحالية يجب أن تكون صفر أو أكثر.' : 'Current points must be zero or more.',
    pointsError: isArabic ? 'النقاط المستهدفة يجب أن تكون 1000 أو أكثر.' : 'Target points must be 1000 or more.',
    saveError: isArabic ? 'تعذر حفظ التعديلات. حاول مرة ثانية.' : 'Could not save your changes. Please try again.',
  };

  const aiLabels = {
    tabManual: isArabic ? 'تعديل يدوي' : 'Manual Edit',
    tabAi: isArabic ? 'تعديل بالذكاء الاصطناعي' : 'AI Edit',
    aiTitle: isArabic ? 'التعديل الذكي بالذكاء الاصطناعي' : 'Smart AI Editing',
    aiSubtitle: isArabic 
      ? 'اكتب التغييرات التي تريدها (مثل: "مدد الهدف لنهاية السنة" أو "غير النقاط إلى 5000") وسيقوم الذكاء الاصطناعي بتحديث الحقول فوراً.'
      : 'Describe the changes you want (e.g. "Extend goal to end of year" or "Change points to 5,000") and the AI will update the details instantly.',
    aiTextareaPlaceholder: isArabic
      ? 'مثال: غير العنوان إلى "تعلم البرمجة المتقدمة" ومدد تاريخ الانتهاء لشهر سبتمبر القادم...'
      : 'Example: Change title to "Advanced Programming" and extend the end date to next September...',
    aiButton: isArabic ? 'معالجة بالذكاء الاصطناعي' : 'Process with AI',
    aiProcessing: isArabic ? 'جاري التحليل والمعالجة...' : 'Analyzing and processing...',
    aiSuccess: isArabic ? 'تم تحديث الحقول بنجاح! راجع التعديلات أدناه ثم احفظ التغييرات.' : 'Fields updated successfully! Review the adjustments below and save.',
    aiSuccessPreviewTitle: isArabic ? 'معاينة الخطة المحدثة' : 'Updated Plan Preview',
    aiPromptLabel: isArabic ? 'ما الذي ترغب في تعديله؟' : 'What would you like to edit?',
    changesTitle: isArabic ? 'تعديلات المهام المقترحة' : 'Proposed task changes',
    changesHint: isArabic
      ? 'راجعها قبل الحفظ. تقدر تتجاهل أي تعديل ما يعجبك.'
      : 'Review before saving. You can discard any change you do not want.',
    opUpdate: isArabic ? 'تعديل' : 'Edit',
    opAdd: isArabic ? 'إضافة' : 'Add',
    opRemove: isArabic ? 'حذف' : 'Remove',
    discard: isArabic ? 'تجاهل' : 'Discard',
    historyWarning: isArabic
      ? 'سيُحذف معه سجل الإنجاز'
      : 'its completion history goes with it',
    unknownTask: isArabic ? '(مهمة غير معروفة)' : '(unknown task)',
    minutes: isArabic ? 'دقيقة' : 'min',
    daily: isArabic ? 'يومي' : 'daily',
    weekly: isArabic ? 'أسبوعي' : 'weekly',
    weight: isArabic ? 'الوزن' : 'weight',
    subOf: isArabic ? 'مهمة فرعية' : 'subtask',
    mainTask: isArabic ? 'مهمة رئيسية' : 'main task',
    taskSaveError: isArabic
      ? 'حُفظ الهدف، لكن تعذر حفظ تعديلات المهام.'
      : 'The goal was saved, but the task changes could not be applied.',
  };

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

  /**
   * Writes the reviewed operations. Updates and additions first, removals last, so a
   * failure part-way through never leaves the plan emptier than the user approved.
   */
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

    if (!Number.isFinite(numericTargetPoints) || numericTargetPoints < 1000) {
      setErrorMessage(labels.pointsError);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('goals')
        .update({
          title: trimmedTitle,
          icon,
          ai_summary: sanitizedDescription,
          current_points: Math.max(0, Math.round(numericCurrentPoints)),
          target_points: Math.max(1000, Math.round(numericTargetPoints)),
          created_at: dateInputToStableIso(startDate),
          estimated_completion_date: dateInputToStableIso(endDate),
          total_days: getGoalDays(startDate, endDate),
        })
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
      if (result.status === 'refused') {
        throw new Error(result.explanation || (isArabic ? 'تم رفض الطلب لدواعي الأمان.' : 'Request was refused due to safety policies.'));
      }

      if (result.goal) {
        const g = result.goal;
        
        // Update state variables to sync preview and form
        if (g.title) setTitle(g.title);
        if (g.ai_summary !== undefined) setDescription(g.ai_summary);
        if (g.created_at) setStartDate(getDateInputValue(g.created_at));
        if (g.estimated_completion_date) setEndDate(getDateInputValue(g.estimated_completion_date));
        if (g.current_points !== undefined) setCurrentPoints(String(g.current_points));
        if (g.target_points !== undefined) setTargetPoints(String(g.target_points));
        if (g.icon) setIcon(g.icon);

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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent
        dir={isArabic ? 'rtl' : 'ltr'}
        className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-2xl transition-all duration-200"
      >
        {/* Visible, Distinctive Header */}
        <div className="shrink-0 border-b border-border/60 bg-muted/15 px-5 sm:px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3 pe-10 sm:pe-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  {labels.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {labels.subtitle}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-xl bg-muted/70 p-1 border border-border/60 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
                  activeTab === 'manual'
                    ? "bg-card text-foreground shadow-xs border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Target className="size-3.5" />
                <span>{aiLabels.tabManual}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ai');
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
                  activeTab === 'ai'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="size-3.5" />
                <span>{aiLabels.tabAi}</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/40">
              <span>{isArabic ? 'الهدف:' : 'Target:'}</span>
              <span className="font-bold text-foreground" dir="ltr">{safePreviewTargetPoints.toLocaleString()}</span>
              <span>{isArabic ? 'نقطة' : 'pts'}</span>
            </div>
          </div>
        </div>

        {/* Dialog Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive font-medium shadow-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {aiSuccessMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs sm:text-sm text-primary font-medium shadow-xs">
              <Sparkles className="size-4 shrink-0 text-primary" />
              <span>{aiSuccessMessage}</span>
            </div>
          )}

          {activeTab === 'manual' ? (
            <div className="space-y-5">
              {/* SECTION 1: GOAL IDENTITY */}
              <div className="space-y-3">
                <Label htmlFor="goal-edit-title" className="text-xs font-bold text-muted-foreground/80 flex items-center justify-between">
                  <span>{isArabic ? 'عنوان الهدف وأيقونته' : 'Goal Title & Icon'}</span>
                  <span className="text-[11px] font-normal text-muted-foreground/60">{isArabic ? 'اضغط على الأيقونة لتغييرها' : 'Click icon to change'}</span>
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <IconPicker
                      selectedIcon={icon}
                      onSelectIcon={setIcon}
                      className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border-border/80 bg-muted/30 hover:bg-muted/60 hover:border-primary/50 transition-all shadow-xs"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="goal-edit-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={isArabic ? 'مثال: الوصول لوزن 75 كغ مع بناء عضلات' : 'Goal title...'}
                      dir={isArabic ? 'rtl' : 'ltr'}
                      className="h-11 sm:h-12 rounded-xl border-border/80 bg-card px-4 text-sm font-semibold shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="goal-edit-description" className="text-xs font-bold text-muted-foreground/80">
                    {t.goalDescription}
                  </Label>
                  <Textarea
                    id="goal-edit-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={isArabic ? 'اكتب وصفاً أو دافعاً للهدف (اختياري)...' : 'Write a brief description or motivation for this goal...'}
                    dir={isArabic ? 'rtl' : 'ltr'}
                    className="min-h-[76px] max-h-32 rounded-xl border-border/80 bg-card px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* SECTION 2: TIMELINE & METRICS (2x2 GRID) */}
              <div className="pt-1">
                <div className="text-xs font-bold text-muted-foreground/80 mb-3 flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary/70" />
                  <span>{isArabic ? 'الجدول الزمني والنقاط' : 'Timeline & Points'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <DatePopoverField
                    icon={CalendarDays}
                    isArabic={isArabic}
                    label={labels.startDate}
                    locale={locale}
                    onChange={setStartDate}
                    placeholder={labels.selectDate}
                    value={startDate}
                  />
                  <DatePopoverField
                    icon={Target}
                    isArabic={isArabic}
                    label={labels.endDate}
                    locale={locale}
                    onChange={setEndDate}
                    placeholder={labels.selectDate}
                    value={endDate}
                    minDate={startDate}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="goal-edit-current-points" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/80">
                      <TrendingUp className="size-3.5 text-primary/70" />
                      <span>{labels.currentPoints}</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="goal-edit-current-points"
                        type="number"
                        min={0}
                        step={100}
                        value={currentPoints}
                        onChange={(event) => setCurrentPoints(event.target.value)}
                        className="h-11 rounded-xl border-border/80 bg-card px-3.5 text-sm font-semibold shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                        dir="ltr"
                      />
                      <span className="absolute inset-y-0 end-3 flex items-center text-xs font-medium text-muted-foreground/60 pointer-events-none">
                        {isArabic ? 'نقطة' : 'pts'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="goal-edit-target-points" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/80">
                      <Target className="size-3.5 text-primary/70" />
                      <span>{labels.targetPoints}</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="goal-edit-target-points"
                        type="number"
                        min={1000}
                        step={100}
                        value={targetPoints}
                        onChange={(event) => setTargetPoints(event.target.value)}
                        className="h-11 rounded-xl border-border/80 bg-card px-3.5 text-sm font-semibold shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                        dir="ltr"
                      />
                      <span className="absolute inset-y-0 end-3 flex items-center text-xs font-medium text-muted-foreground/60 pointer-events-none">
                        {isArabic ? 'نقطة' : 'pts'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: TELEMETRY STRIP */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 sm:px-4 sm:py-3">
                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border/50 rtl:divide-x-reverse">
                  <div className="px-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{labels.duration}</p>
                    <p className="text-xs sm:text-sm font-extrabold text-foreground mt-0.5">
                      {totalDays} <span className="text-[10px] font-normal text-muted-foreground">{isArabic ? 'يوم' : 'days'}</span>
                    </p>
                  </div>
                  <div className="px-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{labels.dailyPace}</p>
                    <p className="text-xs sm:text-sm font-extrabold text-foreground mt-0.5" dir="ltr">
                      ~{suggestedDailyPoints.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">{isArabic ? 'ن/يوم' : 'pts/d'}</span>
                    </p>
                  </div>
                  <div className="px-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{labels.currentProgress}</p>
                    <p className="text-xs sm:text-sm font-extrabold text-primary mt-0.5">
                      {Math.min(100, Math.max(0, Math.round(((Number(currentPoints) || 0) / safePreviewTargetPoints) * 100)))}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SMART PREMIUM AI EDIT TAB */
            <div className="space-y-5">
              {/* AI Intro Card */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/25">
                  <Sparkles className="size-4.5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-sm font-bold text-foreground">{aiLabels.aiTitle}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiLabels.aiSubtitle}</p>
                </div>
              </div>

              {/* Prompt Area */}
              <div className="space-y-2.5">
                <Label htmlFor="ai-instructions" className="text-xs font-bold text-muted-foreground/80">
                  {aiLabels.aiPromptLabel}
                </Label>
                <div className="relative">
                  <Textarea
                    id="ai-instructions"
                    value={aiInstruction}
                    onChange={(event) => setAiInstruction(event.target.value)}
                    placeholder={aiLabels.aiTextareaPlaceholder}
                    dir={isArabic ? 'rtl' : 'ltr'}
                    className={cn(
                      'min-h-[110px] w-full rounded-xl border border-border/80 bg-card px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 resize-none transition-colors',
                      isArabic ? 'text-right pl-10' : 'text-left pr-10',
                    )}
                  />
                  <div className={cn("absolute bottom-3 pointer-events-none", isArabic ? "left-3" : "right-3")}>
                    <Sparkles className={cn("size-4 transition-colors duration-200", isAiProcessing ? "text-primary animate-pulse" : "text-muted-foreground/40")} />
                  </div>
                </div>

                {/* Suggested Quick Prompt Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground/60">{isArabic ? 'أمثلة سريعة:' : 'Quick examples:'}</span>
                  {[
                    isArabic ? 'مدد الهدف شهراً إضافياً' : 'Extend goal by 1 month',
                    isArabic ? 'زد النقاط المستهدفة إلى 15,000' : 'Increase target to 15,000 pts',
                    isArabic ? 'عدل التواريخ لتنتهي بنهاية العام' : 'End at year end',
                  ].map((example, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAiInstruction(example)}
                      className="rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 hover:border-border transition-colors cursor-pointer"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={handleAiEdit}
                    disabled={isAiProcessing || !aiInstruction.trim()}
                    className="h-10 rounded-xl px-5 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors w-full sm:w-auto"
                  >
                    {isAiProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0 rtl:mr-0 rtl:ml-2" />
                        <span>{aiLabels.aiProcessing}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 shrink-0 rtl:mr-0 rtl:ml-2" />
                        <span>{aiLabels.aiButton}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* PENDING TASK CHANGES */}
              {taskChanges.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>{aiLabels.changesTitle}</span>
                    </h5>
                    <span className="text-[10px] text-muted-foreground">{aiLabels.changesHint}</span>
                  </div>

                  <ul className="space-y-2">
                    {taskChanges.map((change, index) => {
                      const isRemove = change.op === 'remove';
                      const isAdd = change.op === 'add';
                      const existing = change.op === 'add' ? undefined : taskById(change.id);
                      const lostHistory = isRemove ? (checkinCounts[(change as { id: string }).id] ?? 0) : 0;

                      const opLabel = isRemove ? aiLabels.opRemove : isAdd ? aiLabels.opAdd : aiLabels.opUpdate;
                      const taskDesc = change.op === 'add'
                        ? change.task_description
                        : existing?.task_description ?? aiLabels.unknownTask;

                      const details: string[] = [];
                      if (change.op === 'add') {
                        details.push(change.task_type === 'sub' ? aiLabels.subOf : aiLabels.mainTask);
                        details.push(change.frequency === 'weekly' ? aiLabels.weekly : aiLabels.daily);
                        if (change.time_required_minutes > 0) details.push(`${change.time_required_minutes} ${aiLabels.minutes}`);
                      } else if (change.op === 'update') {
                        if (change.task_description !== undefined) details.push(`← ${change.task_description}`);
                        if (change.frequency !== undefined) details.push(change.frequency === 'weekly' ? aiLabels.weekly : aiLabels.daily);
                        if (change.time_required_minutes !== undefined) details.push(`${change.time_required_minutes} ${aiLabels.minutes}`);
                        if (change.impact_weight !== undefined) details.push(`${aiLabels.weight} ${change.impact_weight}`);
                      }

                      return (
                        <li
                          key={`${change.op}-${index}`}
                          className={cn(
                            'flex items-start justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2 text-xs',
                            isRemove ? 'border-destructive/40' : 'border-border/60',
                          )}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                                  isRemove
                                    ? 'bg-destructive/15 text-destructive'
                                    : isAdd
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-primary/15 text-primary',
                                )}
                              >
                                {opLabel}
                              </span>
                              <span className={cn('text-xs font-semibold text-foreground', isRemove && 'line-through opacity-70')}>
                                {taskDesc}
                              </span>
                            </div>
                            {details.length > 0 && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {details.join(' · ')}
                              </p>
                            )}
                            {lostHistory > 0 && (
                              <p className="text-[11px] font-semibold text-destructive">
                                {lostHistory} {isArabic ? 'إنجاز مسجل' : 'recorded completions'} — {aiLabels.historyWarning}
                              </p>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => discardChange(index)}
                            className="h-6 shrink-0 rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            {aiLabels.discard}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* COMPACT PLAN PREVIEW CARD */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h5 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Target className="size-3.5 text-primary/70" />
                    <span>{aiLabels.aiSuccessPreviewTitle}</span>
                  </h5>
                  {aiSuccessMessage && (
                    <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                      {isArabic ? 'تم التحديث' : 'Synced'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      {getGoalIcon(icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h6 className="font-bold text-sm text-foreground truncate">
                        {title || (isArabic ? 'بدون عنوان' : 'Untitled')}
                      </h6>
                      <p className="text-xs text-muted-foreground truncate">
                        {description || (isArabic ? 'لا يوجد وصف.' : 'No description.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <div className="bg-card px-2.5 py-1.5 rounded-lg border border-border/60 text-center">
                      <span className="text-[9px] text-muted-foreground block">{labels.duration}</span>
                      <span className="font-bold text-foreground">{totalDays} {isArabic ? 'يوم' : 'd'}</span>
                    </div>
                    <div className="bg-card px-2.5 py-1.5 rounded-lg border border-border/60 text-center">
                      <span className="text-[9px] text-muted-foreground block">{labels.targetPoints}</span>
                      <span className="font-bold text-primary">{safePreviewTargetPoints.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter
          className={cn(
            'shrink-0 border-t border-border/60 bg-muted/15 px-5 sm:px-6 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5',
            isArabic && 'sm:flex-row-reverse sm:space-x-reverse',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving || isAiProcessing}
            className="h-10 w-full sm:w-auto rounded-xl font-medium text-xs sm:text-sm text-muted-foreground hover:text-foreground"
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isAiProcessing}
            className="h-10 w-full sm:w-auto rounded-xl font-semibold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0 rtl:mr-0 rtl:ml-2" />}
            {t.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
