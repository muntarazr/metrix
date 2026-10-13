'use client';

import { Camera, Loader2, Bot, Flame, Sparkles, Brain, CheckCircle2, Download } from 'lucide-react';
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

            {/* Minimal Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                    { value: `${maxStreak} ${t.days}`, label: t.bestStreak },
                    { value: totalPointsEarned >= 1000 ? (totalPointsEarned / 1000).toFixed(1) + 'k' : totalPointsEarned.toString(), label: isArabic ? 'النقاط' : 'Points' },
                    { value: totalLogs.toString(), label: isArabic ? 'التسجيلات' : 'Logs' },
                    { value: `${completedGoals} / ${goals.length}`, label: t.completedGoals },
                ].map((stat, idx) => (
                    <div
                        key={idx}
                        className="rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 text-center shadow-xs"
                    >
                        <p className="text-lg sm:text-xl font-black text-foreground tabular-nums tracking-tight">
                            {stat.value}
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* AI Coach Persona Selector */}
            <div className="rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 space-y-2 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                            <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-baseline gap-2 min-w-0">
                            <h3 className="font-bold text-xs sm:text-sm text-foreground tracking-tight truncate">
                                {isArabic ? 'شخصية مدرب الذكاء الاصطناعي' : 'AI Coach Persona'}
                            </h3>
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                {isArabic ? '— أسلوب التقييم ومستوى الصرامة' : '— Critique tone & rigor'}
                            </span>
                        </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        {coachPersona === 'strict'
                            ? (isArabic ? 'صارم' : 'Strict')
                            : coachPersona === 'analytical'
                                ? (isArabic ? 'تحليلي' : 'Analytical')
                                : (isArabic ? 'متوازن' : 'Balanced')}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2" dir={isArabic ? 'rtl' : 'ltr'}>
                    {[
                        {
                            id: 'strict' as const,
                            titleAr: 'صارم وحازم',
                            titleEn: 'Strict & Direct',
                            descAr: 'انضباط صارم ومباشر بدون مجاملة.',
                            descEn: 'Uncompromising rigor focused on discipline.',
                            icon: Flame,
                        },
                        {
                            id: 'balanced' as const,
                            titleAr: 'متوازن ومشجع',
                            titleEn: 'Balanced & Motivating',
                            descAr: 'تقييم محفز يعزز الاستمرارية والجهد.',
                            descEn: 'Encouraging yet honest, builds momentum.',
                            icon: Sparkles,
                        },
                        {
                            id: 'analytical' as const,
                            titleAr: 'واقعي وتحليلي',
                            titleEn: 'Analytical & Pragmatic',
                            descAr: 'يركز على الأرقام والمخرجات الملموسة.',
                            descEn: 'Pragmatic breakdown of time and outputs.',
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
                                    'px-2.5 py-1.5 sm:py-2 rounded-xl border text-start transition-all duration-200 cursor-pointer active:scale-[0.98] flex flex-col justify-center gap-0.5',
                                    isSelected
                                        ? 'border-primary/50 bg-primary/[0.08] shadow-xs ring-1 ring-primary/25'
                                        : 'border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border'
                                )}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={cn(
                                            'p-1 rounded-md border flex items-center justify-center shrink-0',
                                            isSelected
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/60 text-muted-foreground border-border/70'
                                        )}>
                                            <Icon className="w-3 h-3" />
                                        </span>
                                        <span className="font-extrabold text-xs text-foreground truncate">
                                            {isArabic ? persona.titleAr : persona.titleEn}
                                        </span>
                                    </div>
                                    {isSelected && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-1">
                                    {isArabic ? persona.descAr : persona.descEn}
                                </p>
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
