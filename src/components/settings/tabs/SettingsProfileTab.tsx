'use client';

import { Camera, Loader2, Bot, Flame, Sparkles, Brain, CheckCircle2, Download, Zap, BookOpen, Target } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { translations, type Language } from '@/lib/translations';
import { cn, formatNumberEn } from '@/lib/utils';
import { getGoalIcon } from '@/components/goal/IconPicker';
import { getGoalEndDaysChip } from '@/lib/goal-dates';
import type { Goal, CoachPersona } from '../types';

interface SettingsProfileTabProps {
    user: SupabaseUser | null;
    displayName: string;
    onDisplayNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDisplayNameBlur: () => void;
    isSavingName: boolean;
    avatarUrl: string | null;
    onOpenAvatarModal: () => void;
    maxStreak: number;
    totalPointsEarned: number;
    totalLogs: number;
    completedGoals: number;
    goals: Goal[];
    coachPersona: CoachPersona;
    onPersonaChange: (persona: CoachPersona) => void;
    onSelectGoal?: (goalId: string) => void;
    onExportGoal: (goal: Goal) => void;
    exportingGoalId: string | null;
    language: Language;
}

export default function SettingsProfileTab({
    user,
    displayName,
    onDisplayNameChange,
    onDisplayNameBlur,
    isSavingName,
    avatarUrl,
    onOpenAvatarModal,
    maxStreak,
    totalPointsEarned,
    totalLogs,
    completedGoals,
    goals,
    coachPersona,
    onPersonaChange,
    onSelectGoal,
    onExportGoal,
    exportingGoalId,
    language,
}: SettingsProfileTabProps) {
    const t = translations[language];
    const isArabic = language === 'ar';

    return (
        <div className="w-full space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Minimal Identity Bar */}
            <div className="min-h-[72px] h-auto rounded-xl border border-border/70 bg-card px-3.5 sm:px-4 py-3 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                    {/* Avatar with subtle hover camera indicator */}
                    <div className="relative group shrink-0">
                        <button
                            type="button"
                            onClick={onOpenAvatarModal}
                            className="w-12 h-12 rounded-full overflow-hidden bg-muted/80 border border-border/70 flex items-center justify-center transition-all hover:ring-2 hover:ring-primary/40 hover:scale-105 active:scale-95 cursor-pointer relative shadow-xs"
                            title={t.editAvatar}
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xl font-black text-foreground">
                                    {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                </span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                                <Camera className="w-4 h-4 text-white" />
                            </div>
                        </button>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text"
                                value={displayName}
                                onChange={onDisplayNameChange}
                                onBlur={onDisplayNameBlur}
                                placeholder={user?.email?.split('@')[0] || (isArabic ? 'الاسم...' : 'Name...')}
                                className="w-full min-w-0 font-black text-foreground text-base tracking-tight bg-transparent hover:bg-muted/40 focus:bg-card px-1 py-0.5 rounded-md border border-transparent hover:border-border/60 focus:border-primary/50 focus:outline-none transition-all truncate"
                            />
                            {isSavingName && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate px-1">
                            {user?.email || '—'}
                        </p>
                    </div>
                </div>

                {user?.created_at && (
                    <div className={cn(
                        "shrink-0 w-full min-[420px]:w-auto flex flex-row min-[420px]:flex-col justify-between min-[420px]:justify-start px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] sm:text-xs font-semibold text-muted-foreground leading-snug",
                        isArabic ? "text-right items-center min-[420px]:items-start" : "text-left items-center min-[420px]:items-start"
                    )}>
                        <span>{t.memberSince}</span>
                        <span>{new Date(user.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' })}</span>
                    </div>
                )}
            </div>

            {/* Compact Single-Row Horizontal Stats Strip */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                    {
                        value: maxStreak.toString(),
                        unit: isArabic ? 'يوم' : 'd',
                        label: isArabic ? 'السلسلة' : 'Streak',
                        icon: Flame,
                        iconColor: "text-amber-500 bg-amber-500/12 border-amber-500/25",
                    },
                    {
                        value: totalPointsEarned >= 1000 ? (totalPointsEarned / 1000).toFixed(1) + 'k' : totalPointsEarned.toString(),
                        label: isArabic ? 'النقاط' : 'Points',
                        icon: Zap,
                        iconColor: "text-amber-400 bg-amber-400/12 border-amber-400/25",
                    },
                    {
                        value: `${completedGoals}/${goals.length}`,
                        label: isArabic ? 'الأهداف' : 'Goals',
                        icon: Target,
                        iconColor: "text-emerald-500 bg-emerald-500/12 border-emerald-500/25",
                    },
                ].map((stat, idx) => {
                    const IconComp = stat.icon;
                    return (
                        <div
                            key={idx}
                            className="rounded-xl border border-border/70 bg-card/90 px-2 py-2 sm:px-3 sm:py-2.5 flex items-center gap-2 sm:gap-3 shadow-xs min-w-0"
                        >
                            <div className={cn("flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs", stat.iconColor)}>
                                <IconComp className="w-5.5 h-5.5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="flex flex-col justify-center min-w-0 flex-1 text-start">
                                <div className="flex items-baseline gap-1 leading-none">
                                    <span className="text-lg sm:text-xl md:text-2xl font-black text-foreground tabular-nums tracking-tight truncate">
                                        {stat.value}
                                    </span>
                                    {stat.unit && (
                                        <span className="text-xs sm:text-sm font-bold text-muted-foreground/85">
                                            {stat.unit}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs sm:text-[13px] font-bold text-muted-foreground truncate leading-tight mt-1">
                                    {stat.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* AI Coach Persona Selector */}
            <div className="rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                        <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-baseline gap-2 min-w-0">
                        <h3 className="font-bold text-xs sm:text-sm text-foreground tracking-tight truncate">
                            {isArabic ? 'شخصية مدرب الذكاء الاصطناعي' : 'AI Coach Persona'}
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2" dir={isArabic ? 'rtl' : 'ltr'}>
                    {[
                        {
                            id: 'strict' as const,
                            titleAr: 'صارم وحازم',
                            titleEn: 'Strict & Direct',
                            icon: Flame,
                        },
                        {
                            id: 'balanced' as const,
                            titleAr: 'متوازن ومشجع',
                            titleEn: 'Balanced & Motivating',
                            icon: Sparkles,
                        },
                        {
                            id: 'analytical' as const,
                            titleAr: 'واقعي وتحليلي',
                            titleEn: 'Analytical & Pragmatic',
                            icon: Brain,
                        },
                    ].map((persona) => {
                        const Icon = persona.icon;
                        const isSelected = coachPersona === persona.id;
                        return (
                            <button
                                key={persona.id}
                                type="button"
                                onClick={() => onPersonaChange(persona.id)}
                                className={cn(
                                    'px-2.5 py-2 rounded-xl border text-start transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center justify-between',
                                    isSelected
                                        ? 'border-primary/50 bg-primary/[0.08] shadow-xs ring-1 ring-primary/25'
                                        : 'border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border'
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={cn(
                                        'p-1.5 rounded-lg border flex items-center justify-center shrink-0',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-muted/60 text-muted-foreground border-border/70'
                                    )}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </span>
                                    <span className="font-extrabold text-xs text-foreground truncate">
                                        {isArabic ? persona.titleAr : persona.titleEn}
                                    </span>
                                </div>
                                {isSelected && (
                                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Goals Showcase Section */}
            <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between pb-0.5">
                    <h2 className="text-xs sm:text-sm font-bold text-muted-foreground tracking-tight">
                        {isArabic ? 'الأهداف' : 'Goals'}
                        <span className="ms-1.5 text-[11px] font-medium opacity-60 tabular-nums">
                            ({goals.length})
                        </span>
                    </h2>
                </div>

                {goals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                            {isArabic ? 'لا توجد أهداف نشطة حالياً' : 'No active goals yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {goals.map((goalItem) => {
                            const progress = goalItem.target_points > 0
                                ? Math.min(100, Math.round((goalItem.current_points / goalItem.target_points) * 100))
                                : 0;
                            const isDone = progress >= 100;
                            const endDaysChip = getGoalEndDaysChip(goalItem.estimated_completion_date, isArabic);

                            return (
                                <div
                                    key={goalItem.id}
                                    onClick={() => onSelectGoal?.(goalItem.id)}
                                    role={onSelectGoal ? 'button' : undefined}
                                    tabIndex={onSelectGoal ? 0 : undefined}
                                    onKeyDown={(e) => {
                                        if (onSelectGoal && (e.key === 'Enter' || e.key === ' ')) {
                                            e.preventDefault();
                                            onSelectGoal(goalItem.id);
                                        }
                                    }}
                                    className={cn(
                                        "group rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 transition-all duration-150 hover:border-primary/40 hover:shadow-xs shadow-2xs select-none",
                                        onSelectGoal && "cursor-pointer"
                                    )}
                                >
                                    {/* Header Row: Icon + Title + Actions */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 p-1.5 shadow-2xs">
                                                {getGoalIcon(goalItem.icon || 'Target')}
                                            </span>

                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <h3 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                                    {goalItem.title}
                                                </h3>

                                                {isDone && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 shrink-0">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>{isArabic ? 'مكتمل' : 'Done'}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Button: Export (Icon-only) */}
                                        <div
                                            className="flex items-center gap-1 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onExportGoal(goalItem);
                                                }}
                                                disabled={exportingGoalId === goalItem.id}
                                                className="flex h-8 w-8 sm:h-7 sm:w-7 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/60 hover:border-primary/40 transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50"
                                                title={isArabic ? 'تصدير الهدف' : 'Export Goal'}
                                            >
                                                {exportingGoalId === goalItem.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                                ) : (
                                                    <Download className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Bar & Stats (Compact single-level) */}
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                            <span className="flex items-center gap-1 tabular-nums">
                                                <span className="text-foreground font-black">+{formatNumberEn(goalItem.current_points)}</span>
                                                <span className="opacity-60">/ {formatNumberEn(goalItem.target_points)}</span>
                                            </span>

                                            <div className="flex items-center gap-2">
                                                {endDaysChip && (
                                                    <span className={cn(
                                                        "text-[10px] font-semibold",
                                                        endDaysChip.tone === 'late' && "text-destructive",
                                                        endDaysChip.tone === 'soon' && "text-amber-500"
                                                    )} title={endDaysChip.title}>
                                                        {endDaysChip.text}
                                                    </span>
                                                )}
                                                <span className={cn(
                                                    "font-bold tabular-nums text-xs",
                                                    isDone ? "text-emerald-500" : "text-primary"
                                                )}>
                                                    {progress}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/60 border border-border/50">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500 ease-out",
                                                    isDone
                                                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                                        : "bg-primary"
                                                )}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
