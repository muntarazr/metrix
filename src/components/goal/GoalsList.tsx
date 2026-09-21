'use client';

import { useState } from 'react';
import { Clock, Target, Trash2, MoreVertical, Pin, PinOff, Edit2, ListChecks, BarChart3, Plus } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/utils/supabase/client';
import type { GoalTaskStats } from '@/app/page';
import { cn } from '@/lib/utils';
import { PANEL_BASE, WELL_SURFACE } from "@/lib/surfaces";
import { ScrollArea } from '@/components/ui/scroll-area';
import { getGoalEndDaysChip } from '@/lib/goal-dates';
import { getGoalIcon } from './IconPicker';
import GoalEditDialog from './GoalEditDialog';
import GoalProgressBar from '@/components/shared/GoalProgressBar';
import ConfirmModal from '@/components/shared/ConfirmModal';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
    estimated_completion_date?: string | null;
    total_days?: number;
    ai_summary?: string;
    icon?: string;
    is_pinned?: boolean;
}

interface GoalsListProps {
    goals: Goal[];
    taskStatsMap?: Record<string, GoalTaskStats>;
    selectedGoalId: string | null;
    onSelectGoal: (id: string) => void;
    onGoalChanged?: () => void;
    onNavigateToCreate?: () => void;
    language?: Language;
}

export default function GoalsList({ goals, taskStatsMap = {}, selectedGoalId, onSelectGoal, onGoalChanged, onNavigateToCreate, language = 'ar' }: GoalsListProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'goals' | 'statistics'>('goals');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<{ id: string; title: string } | null>(null);

    const handleDeleteGoal = async (goalId: string) => {
        setDeletingId(goalId);

        try {
            // Child tables are configured with ON DELETE CASCADE,
            // so deleting the goal automatically cleans up related records.
            const { error } = await supabase.from('goals').delete().eq('id', goalId);

            if (error) throw error;

            if (onGoalChanged) onGoalChanged();
        } catch (error: unknown) {
            console.error('Error deleting goal:', error);
            const message = error instanceof Error ? error.message : JSON.stringify(error);
            alert((language === 'ar' ? 'فشل حذف الهدف: ' : 'Failed to delete goal: ') + message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleTogglePin = async (goal: Goal) => {
        try {
            const { error } = await supabase
                .from('goals')
                .update({ is_pinned: !goal.is_pinned })
                .eq('id', goal.id);

            if (error) throw error;
            if (onGoalChanged) onGoalChanged(); // Refresh list
        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    const openEditDialog = (goal: Goal) => {
        setEditingGoal(goal);
    };

    const isRTL = (text: string) => {
        const arabicRegex = /[\u0600-\u06ff]/;
        return arabicRegex.test(text);
    };

    return (
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex-1 flex flex-col gap-4">
            <div className={cn(WELL_SURFACE, "p-3 sm:p-4 rounded-2xl sm:rounded-[22px] flex-1 flex flex-col min-h-0")}>
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex flex-1 gap-1 p-1 rounded-xl bg-muted/60 border border-border/70 h-11">
                        <button
                            onClick={() => setActiveTab('goals')}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                                activeTab === 'goals'
                                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/45"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                            )}
                        >
                            <Target className="w-4 h-4 opacity-80" />
                            {t.myGoals}
                        </button>
                        <button
                            onClick={() => setActiveTab('statistics')}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                                activeTab === 'statistics'
                                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/45"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                            )}
                        >
                            <BarChart3 className="w-4 h-4 opacity-80" />
                            {t.goalsStatistics}
                        </button>
                    </div>

                    {onNavigateToCreate && (
                        <button
                            onClick={onNavigateToCreate}
                            className="flex h-11 items-center gap-1.5 px-3 sm:px-4 rounded-xl border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 active:scale-95 text-xs sm:text-sm font-bold transition-all shrink-0 shadow-2xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{isArabic ? "هدف جديد" : "New Goal"}</span>
                        </button>
                    )}
                </div>

                {goals.length === 0 && activeTab === 'goals' ? (
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-card/12 rounded-2xl border border-dashed border-border gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-muted/20">
                                <Target className="w-6 h-6 text-muted-foreground/75" />
                            </div>
                            <p className="text-muted-foreground/75 font-medium text-base">{t.noGoalsYet}</p>
                        </div>
                    </div>
                ) : activeTab === 'goals' ? (
                    <ScrollArea className="flex-1 min-h-0 pr-1" dir={isArabic ? 'rtl' : 'ltr'}>
                        <div className="space-y-3 pb-1">
                            {goals.map((goal) => {
                                const isSelected = selectedGoalId === goal.id;
                                const titleRTL = isArabic || isRTL(goal.title);
                                const currentPoints = goal.current_points ?? 0;
                                const targetPoints = goal.target_points ?? 0;
                                const progress = targetPoints > 0
                                    ? Math.round((currentPoints / targetPoints) * 100)
                                    : 0;
                                const daysChip = getGoalEndDaysChip(goal.estimated_completion_date, isArabic);
                                const stats = taskStatsMap[goal.id];

                                return (
                                    <div
                                        key={goal.id}
                                        className={cn(
                                            "group relative w-full rounded-xl border p-3 transition-all duration-200 ease-out sm:p-4",
                                            isSelected
                                                ? cn(PANEL_BASE, 'border-primary/45 ring-1 ring-primary/15')
                                                : cn(PANEL_BASE, 'border-border/70 hover:border-primary/25'),
                                            deletingId === goal.id && 'opacity-50 pointer-events-none'
                                        )}
                                    >
                                        <div
                                            onClick={() => onSelectGoal(goal.id)}
                                            className="flex w-full cursor-pointer flex-col gap-3"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    onSelectGoal(goal.id);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-2.5">
                                                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3" dir={titleRTL ? 'rtl' : 'ltr'}>
                                                    <div
                                                        className={cn(
                                                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-primary/15 bg-primary/12 p-2 text-primary transition-colors duration-200 sm:h-11 sm:w-11',
                                                            isSelected && 'bg-primary/12 border-primary/25',
                                                        )}
                                                    >
                                                        {getGoalIcon(goal.icon)}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h3
                                                            className={cn(
                                                                'line-clamp-2 text-[15px] font-bold leading-snug text-foreground tracking-tight transition-colors sm:text-base',
                                                                isSelected && 'text-primary',
                                                                titleRTL ? 'text-right' : 'text-left',
                                                            )}
                                                        >
                                                            {goal.title}
                                                        </h3>

                                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                            {goal.is_pinned && (
                                                                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20 shadow-2xs">
                                                                    <Pin className="h-2.5 w-2.5" />
                                                                    <span>{isArabic ? 'مثبت' : 'Pinned'}</span>
                                                                </span>
                                                            )}
                                                            {daysChip && (
                                                                <span
                                                                    className={cn(
                                                                        'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums border shadow-2xs transition-colors',
                                                                        daysChip.tone === 'soon' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
                                                                        daysChip.tone === 'today' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 animate-pulse',
                                                                        daysChip.tone === 'late' && 'bg-destructive/10 text-destructive border-destructive/25',
                                                                    )}
                                                                    title={daysChip.title}
                                                                >
                                                                    <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                                                    <span>{daysChip.text}</span>
                                                                </span>
                                                            )}
                                                            {stats && stats.total > 0 && (
                                                                <span
                                                                    className={cn(
                                                                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums border shadow-2xs transition-colors",
                                                                        stats.completed >= stats.total
                                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                                                            : "bg-muted/60 text-muted-foreground border-border/70"
                                                                    )}
                                                                    title={isArabic ? `${stats.completed} من ${stats.total} مهمة منجزة` : `${stats.completed} of ${stats.total} tasks done`}
                                                                >
                                                                    <ListChecks className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                                                    <span dir="ltr">{stats.completed}/{stats.total}</span>
                                                                    {stats.completed >= stats.total && (
                                                                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">✓</span>
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                             <button
                                                                 className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-muted-foreground/75 transition-all hover:border-border/70 hover:bg-muted/60 hover:text-foreground active:scale-95 after:absolute after:-inset-1"
                                                                 aria-label={language === 'ar' ? 'خيارات الهدف' : 'Goal options'}
                                                             >
                                                                 <MoreVertical className="h-4 w-4" />
                                                             </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align={isArabic ? 'start' : 'end'} className="w-52">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleTogglePin(goal);
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                {goal.is_pinned ? (
                                                                    <>
                                                                        <PinOff className="w-4 h-4" />
                                                                        {t.unpinGoal}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Pin className="w-4 h-4" />
                                                                        {t.pinGoal}
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditDialog(goal);
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                {t.editGoal}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                className="cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDeleteGoal({ id: goal.id, title: goal.title });
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                {language === 'ar' ? 'حذف الهدف' : 'Delete Goal'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            <GoalProgressBar
                                                currentPoints={currentPoints}
                                                targetPoints={targetPoints}
                                                progress={progress}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex-1 flex flex-col rounded-2xl border border-dashed border-border bg-card/12">
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-muted/20">
                                    <BarChart3 className="w-6 h-6 text-muted-foreground/75" />
                                </div>
                                <p className="text-muted-foreground/75 font-medium text-base">{t.goalsStatsUnderDevelopment}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <GoalEditDialog
                goal={editingGoal ? {
                    ...editingGoal,
                    estimated_completion_date: editingGoal.estimated_completion_date || editingGoal.created_at,
                } : null}
                open={!!editingGoal}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingGoal(null);
                    }
                }}
                language={language}
                onSaved={() => {
                    setEditingGoal(null);
                    if (onGoalChanged) onGoalChanged();
                }}
            />

            <ConfirmModal
                isOpen={!!confirmDeleteGoal}
                title={isArabic ? 'حذف الهدف' : 'Delete Goal'}
                message={
                    confirmDeleteGoal
                        ? isArabic
                            ? `هل أنت متأكد من حذف الهدف "${confirmDeleteGoal.title}"؟ لا يمكن التراجع عن هذا الإجراء.`
                            : `Are you sure you want to delete "${confirmDeleteGoal.title}"? This action cannot be undone.`
                        : ''
                }
                confirmLabel={isArabic ? 'حذف' : 'Delete'}
                variant="danger"
                language={language}
                onCancel={() => setConfirmDeleteGoal(null)}
                onConfirm={() => {
                    if (confirmDeleteGoal) handleDeleteGoal(confirmDeleteGoal.id);
                }}
            />
        </div>
    );
}
