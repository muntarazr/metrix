'use client';

import React from 'react';
import { Clock, Plus, Trash2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WELL_SURFACE } from '@/lib/surfaces';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WEEK_DAYS } from '../goal-creator-types';
import { normalizeScheduleDays } from '../goal-creator-helpers';
import { TIME_PRESETS, type ManualTaskDraft } from './manual-goal-types';

export interface ManualTasksStepProps {
    tasks: ManualTaskDraft[];
    onAddTask: () => void;
    onUpdateTask: (id: string, patch: Partial<ManualTaskDraft>) => void;
    onDeleteTask: (id: string) => void;
    isArabic: boolean;
}

export default function ManualTasksStep({
    tasks,
    onAddTask,
    onUpdateTask,
    onDeleteTask,
    isArabic,
}: ManualTasksStepProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-foreground">
                        {isArabic ? 'المهام اليومية ومعايير الإنجاز' : 'Tasks & Completion Criteria'}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {isArabic
                            ? 'أنت من يحدد معيار النجاح الدقيق لكل مهمة لتسجيل تقدمك بدون تهاون.'
                            : 'Define the tasks and exact verification criteria for daily check-ins.'}
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={onAddTask}
                    size="sm"
                    className="rounded-xl font-bold gap-1.5 h-8 px-3 text-xs shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'إضافة مهمة' : 'Add Task'}</span>
                </Button>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
                {tasks.map((task, index) => {
                    return (
                        <div
                            key={task.id}
                            className={cn(
                                WELL_SURFACE,
                                "rounded-2xl border border-border/80 p-3.5 space-y-3 relative transition-all"
                            )}
                        >
                            {/* Task Title & Delete */}
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-primary/12 border border-primary/25 text-primary text-xs font-black flex items-center justify-center shrink-0">
                                    {index + 1}
                                </div>

                                <Input
                                    value={task.task_description}
                                    onChange={(e) => onUpdateTask(task.id, { task_description: e.target.value })}
                                    placeholder={isArabic ? `اسم المهمة (مثلاً: حل 3 مسائل برمجية، ركض 5 كم...)` : `Task ${index + 1} description...`}
                                    className="h-10 rounded-xl font-bold text-base sm:text-sm bg-background/80 border-border/80 focus:border-primary flex-1 min-w-0"
                                    dir={isArabic ? 'rtl' : 'ltr'}
                                />

                                <button
                                    type="button"
                                    onClick={() => onDeleteTask(task.id)}
                                    className="w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                    title={isArabic ? 'حذف المهمة' : 'Delete Task'}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Controls: Frequency & Time presets */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                {/* Frequency */}
                                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/60">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateTask(task.id, { frequency: 'daily' })}
                                        className={cn(
                                            "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                                            task.frequency === 'daily'
                                                ? "bg-card text-foreground shadow-2xs font-extrabold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {isArabic ? 'يومي' : 'Daily'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onUpdateTask(task.id, { frequency: 'weekly' })}
                                        className={cn(
                                            "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                                            task.frequency === 'weekly'
                                                ? "bg-card text-foreground shadow-2xs font-extrabold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {isArabic ? 'أسبوعي' : 'Weekly'}
                                    </button>
                                </div>

                                {/* Time presets */}
                                <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 text-xs max-w-full">
                                    <Clock className="w-3 h-3 text-muted-foreground ms-1 shrink-0" />
                                    {TIME_PRESETS.map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => onUpdateTask(task.id, { time_required_minutes: m })}
                                            className={cn(
                                                "px-1.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                                                task.time_required_minutes === m
                                                    ? "bg-primary text-primary-foreground shadow-2xs"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {m}{isArabic ? 'د' : 'm'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Days selector */}
                            <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] font-bold text-muted-foreground me-1">
                                    {isArabic ? 'الأيام:' : 'Days:'}
                                </span>
                                {WEEK_DAYS.map((d) => {
                                    const active = task.schedule_days
                                        ? task.schedule_days.includes(d.idx)
                                        : true;
                                    return (
                                        <button
                                            key={d.idx}
                                            type="button"
                                            onClick={() => {
                                                const all = WEEK_DAYS.map((w) => w.idx);
                                                const current = task.schedule_days && task.schedule_days.length > 0
                                                    ? task.schedule_days
                                                    : all;
                                                const next = current.includes(d.idx)
                                                    ? current.filter((i) => i !== d.idx)
                                                    : [...current, d.idx];
                                                onUpdateTask(task.id, { schedule_days: normalizeScheduleDays(next) });
                                            }}
                                            className={cn(
                                                "w-6 h-6 rounded-md border text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95",
                                                active
                                                    ? "bg-primary/20 text-primary border-primary/40 font-black shadow-2xs"
                                                    : "bg-muted/20 border-border/60 text-muted-foreground/60 hover:border-primary/40"
                                            )}
                                            title={isArabic ? d.ar : d.en}
                                        >
                                            {isArabic ? d.letterAr : d.letterEn}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* CRITERIA FIELD: Core of the user's manual benchmark */}
                            <div className="rounded-xl border border-primary/25 bg-primary/5 p-2.5 space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                    <Target className="w-3.5 h-3.5 shrink-0" />
                                    <span>{isArabic ? 'معيار الإنجاز (شرط التحقق الدقيق):' : 'Completion Criteria:'}</span>
                                </div>
                                <Input
                                    value={task.completion_criteria}
                                    onChange={(e) => onUpdateTask(task.id, { completion_criteria: e.target.value })}
                                    placeholder={isArabic ? 'ما الذي يثبت اكتمال هذه المهمة بدقة؟ (مثال: إنهاء 20 صفحة بدون مقاطعة)' : 'What proves this task is completed?'}
                                    className="h-9 sm:h-8 rounded-lg text-base sm:text-xs font-medium bg-background/80 border-primary/20 focus:border-primary placeholder:text-muted-foreground/50"
                                    dir={isArabic ? 'rtl' : 'ltr'}
                                />
                            </div>
                        </div>
                    );
                })}

                {/* Add Task Button */}
                <Button
                    type="button"
                    variant="outline"
                    onClick={onAddTask}
                    className="w-full border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 py-3 h-auto rounded-xl font-bold text-xs gap-2"
                >
                    <Plus className="w-4 h-4 text-primary" />
                    <span>{isArabic ? 'إضافة مهمة أخرى' : 'Add Another Task'}</span>
                </Button>
            </div>
        </div>
    );
}
