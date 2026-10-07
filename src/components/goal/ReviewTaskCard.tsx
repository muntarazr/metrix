'use client';

import {
    Target,
    Edit3,
    CalendarDays,
    Clock,
    Zap,
    Check,
    Trash2,
    RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE } from "@/lib/surfaces";
import type { FlatTask } from './goal-creator-types';
import { WEEK_DAYS } from './goal-creator-types';
import { normalizeScheduleDays } from './goal-creator-helpers';

export interface ReviewTaskCardProps {
    task: FlatTask;
    index: number;
    isArabic: boolean;
    isReplacingTask?: boolean;
    onUpdate: (id: string, patch: Partial<FlatTask>) => void;
    onDelete: (id: string) => void;
    onRequestReplace: (task: FlatTask) => void;
}

export default function ReviewTaskCard({
    task,
    index,
    isArabic,
    isReplacingTask = false,
    onUpdate,
    onDelete,
    onRequestReplace,
}: ReviewTaskCardProps) {
    return (
        <div
            className={cn(
                PANEL_SURFACE,
                "rounded-2xl border transition-all p-3.5 space-y-3",
                task.included
                    ? "border-border/80 bg-card shadow-xs"
                    : "border-border/40 bg-muted/20 opacity-60"
            )}
        >
            {/* Top Task Row */}
            <div className="flex items-center gap-2.5">
                {/* Include / Exclude Checkbox */}
                <button
                    type="button"
                    onClick={() => onUpdate(task.id, { included: !task.included })}
                    className={cn(
                        "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                        task.included
                            ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                            : "border-muted-foreground/40 bg-background hover:border-primary/50 text-transparent"
                    )}
                    title={isArabic ? (task.included ? 'مضمنة في الخطة (انقر للاستبعاد)' : 'مستبعدة (انقر للتضمين)') : 'Toggle inclusion'}
                >
                    <Check className="w-3.5 h-3.5" />
                </button>

                {/* Task Title Input */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5 group/title relative">
                    <input
                        value={task.task}
                        onChange={(e) => onUpdate(task.id, { task: e.target.value })}
                        disabled={!task.included}
                        placeholder={isArabic ? 'اسم المهمة...' : 'Task title...'}
                        className={cn(
                            "w-full bg-transparent border border-transparent hover:border-border/60 focus:border-primary/40 rounded-lg px-2 py-1 outline-hidden text-sm font-semibold transition-all text-start",
                            !task.included && "line-through text-muted-foreground"
                        )}
                        dir={isArabic ? 'rtl' : 'ltr'}
                    />
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/title:text-muted-foreground/70 shrink-0 pointer-events-none transition-colors" />
                </div>

                {/* Frequency Toggle */}
                <button
                    type="button"
                    onClick={() => onUpdate(task.id, { frequency: task.frequency === 'daily' ? 'weekly' : 'daily' })}
                    disabled={!task.included}
                    className={cn(
                        "text-[10.5px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer shrink-0",
                        task.frequency === 'daily'
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400"
                    )}
                    title={isArabic ? 'انقر لتغيير التكرار (يومي / أسبوعي)' : 'Click to toggle frequency'}
                >
                    {task.frequency === 'daily' ? (isArabic ? 'يومي' : 'Daily') : (isArabic ? 'أسبوعي' : 'Weekly')}
                </button>

                {/* Time Required in Minutes */}
                <div
                    className="flex items-center gap-1 bg-muted/60 border border-border/80 rounded-lg px-2 py-1 text-[11px] text-muted-foreground shrink-0"
                    title={isArabic ? 'الوقت بالدقائق' : 'Time in minutes'}
                >
                    <Clock className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                    <input
                        type="number"
                        min={5}
                        max={300}
                        step={5}
                        value={task.time_required_minutes || 20}
                        onChange={(e) => onUpdate(task.id, { time_required_minutes: Math.max(5, Number(e.target.value) || 5) })}
                        disabled={!task.included}
                        className="w-7 text-center bg-transparent border-none outline-hidden font-semibold text-foreground text-xs p-0"
                    />
                    <span className="text-[10px] text-muted-foreground">{isArabic ? 'د' : 'm'}</span>
                </div>

                {/* Impact Weight */}
                <div
                    className="flex items-center gap-1 bg-muted/60 border border-border/80 rounded-lg px-2 py-1 text-[11px] shrink-0"
                    title={isArabic ? 'وزن المهمة ونقاطها (1-5)' : 'Impact weight (1-5)'}
                >
                    <Zap className="w-3 h-3 text-primary/80 shrink-0" />
                    <input
                        type="number"
                        min={1}
                        max={5}
                        value={task.impact_weight || 1}
                        onChange={(e) => onUpdate(task.id, { impact_weight: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })}
                        disabled={!task.included}
                        className="w-5 text-center bg-transparent border-none outline-hidden font-bold text-foreground text-xs p-0"
                    />
                    <span className="text-[10px] text-muted-foreground">{isArabic ? 'ن' : 'pt'}</span>
                </div>

                {/* Smart Replace Button */}
                <button
                    type="button"
                    onClick={() => onRequestReplace(task)}
                    disabled={!task.included || isReplacingTask}
                    className="text-muted-foreground/60 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0 cursor-pointer"
                    title={isArabic ? 'استبدال هذه المهمة بملاحظتك' : 'Replace with your custom note'}
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", isReplacingTask && "animate-spin")} />
                </button>

                {/* Delete Button */}
                <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    className="text-muted-foreground/50 hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                    title={isArabic ? 'حذف المهمة' : 'Delete task'}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Execution Days */}
            <div className="flex flex-wrap items-center gap-1.5 px-0.5">
                <span className="flex items-center gap-1 text-[10.5px] font-bold text-muted-foreground shrink-0 me-0.5">
                    <CalendarDays className="w-3 h-3 text-primary/70" />
                    {isArabic ? 'أيام التنفيذ' : 'Days'}
                </span>
                {WEEK_DAYS.map((d) => {
                    const active = task.schedule_days
                        ? task.schedule_days.includes(d.idx)
                        : true;
                    return (
                        <button
                            key={d.idx}
                            type="button"
                            disabled={!task.included}
                            onClick={() => {
                                const all = WEEK_DAYS.map(w => w.idx);
                                const current = task.schedule_days && task.schedule_days.length > 0
                                    ? task.schedule_days
                                    : all;
                                const next = current.includes(d.idx)
                                    ? current.filter(i => i !== d.idx)
                                    : [...current, d.idx];
                                onUpdate(task.id, { schedule_days: normalizeScheduleDays(next) });
                            }}
                            title={isArabic ? `ال${d.ar}` : d.en}
                            className={cn(
                                "w-6 h-6 rounded-md border text-[10px] font-bold flex items-center justify-center transition-all select-none cursor-pointer",
                                active
                                    ? "bg-primary/15 border-primary/45 text-primary shadow-2xs"
                                    : "bg-muted/40 border-border/60 text-muted-foreground/50 hover:border-primary/30",
                                !task.included && "cursor-not-allowed opacity-50"
                            )}
                        >
                            {isArabic ? d.letterAr : d.letterEn}
                        </button>
                    );
                })}
                <span className="text-[10px] text-muted-foreground/60 ms-0.5">
                    {!task.schedule_days || task.schedule_days.length === 0
                        ? (isArabic ? 'كل الأيام حسب التكرار' : 'All days per frequency')
                        : (isArabic
                            ? task.schedule_days.map(i => WEEK_DAYS[i]?.ar).filter(Boolean).join('، ')
                            : task.schedule_days.map(i => WEEK_DAYS[i]?.en).filter(Boolean).join(', '))}
                </span>
            </div>

            {/* Bottom Criteria Row (Definition of Done) */}
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 shrink-0 font-bold text-primary">
                    <Target className="w-3.5 h-3.5 shrink-0" />
                    <span>{isArabic ? 'معيار الإنجاز:' : 'Criteria:'}</span>
                </div>
                <input
                    value={task.completion_criteria || ''}
                    onChange={(e) => onUpdate(task.id, { completion_criteria: e.target.value })}
                    disabled={!task.included}
                    placeholder={isArabic ? 'ما الذي يثبت اكتمال هذه المهمة بدقة؟' : 'What proves this task is completed?'}
                    className="flex-1 bg-transparent border-none outline-hidden text-xs text-foreground/90 placeholder:text-muted-foreground/45 font-medium"
                    dir={isArabic ? 'rtl' : 'ltr'}
                />
            </div>
        </div>
    );
}
