'use client';

import { useMemo, useState } from 'react';
import {
  Crown,
  Lock,
  Check,
  Gift,
  Snowflake,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

export interface RewardsSectionProps {
  goalId: string;
  currentPoints: number;
  targetPoints: number;
  language: Language;
  numberFormatter: Intl.NumberFormat;
  t: {
    challengeRewards?: string;
    points?: string;
    [key: string]: any;
  };
}

interface LevelStep {
  level: number;
  percent: number;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: 'spark' | 'reward' | 'freeze' | 'surge' | 'momentum' | 'mastery';
  badgeAr?: string;
  badgeEn?: string;
}

const LEVEL_STEPS: LevelStep[] = [
  {
    level: 1,
    percent: 0,
    titleAr: 'الشرارة الأولى',
    titleEn: 'The Spark',
    descAr: 'بداية الرحلة والانطلاق نحو النتيجة المرجوة',
    descEn: 'The journey begins towards your target',
    icon: 'spark',
  },
  {
    level: 2,
    percent: 15,
    titleAr: 'المكافأة الذاتية',
    titleEn: 'Self-Reward',
    descAr: 'استحقاق أول مكافأة شخصية للاحتفال بالتزامك',
    descEn: 'Unlock your first personal celebration treat',
    icon: 'reward',
    badgeAr: '🎁 مكافأة ذاتية',
    badgeEn: '🎁 Self-Reward',
  },
  {
    level: 3,
    percent: 30,
    titleAr: 'درع الانضباط',
    titleEn: 'Tactical Shield',
    descAr: 'كسب تصريح يوم راحة تكتيكي لحماية الاستمرارية',
    descEn: 'Earn a tactical rest day freeze pass',
    icon: 'freeze',
    badgeAr: '❄️ يوم راحة',
    badgeEn: '❄️ Rest Pass',
  },
  {
    level: 4,
    percent: 50,
    titleAr: 'نقطة التحول',
    titleEn: 'The Turning Point',
    descAr: 'تجاوز منتصف الطريق والاقتراب من النتيجة الفعلية',
    descEn: 'Crossed the halfway threshold with proven grit',
    icon: 'surge',
  },
  {
    level: 5,
    percent: 70,
    titleAr: 'تسارع الكفاءة',
    titleEn: 'Efficiency Surge',
    descAr: 'العادة أصبحت راسخة والوتيرة تتسارع بثقة',
    descEn: 'Routine is locked in and momentum is rising',
    icon: 'surge',
  },
  {
    level: 6,
    percent: 85,
    titleAr: 'زخم النخبة',
    titleEn: 'Elite Momentum',
    descAr: 'الأمتار الأخيرة، أعلى تركيز وأقوى أثر',
    descEn: 'Final sprint with unmatched discipline',
    icon: 'momentum',
  },
  {
    level: 7,
    percent: 100,
    titleAr: 'سيادة الهدف',
    titleEn: 'Apex Mastery',
    descAr: 'تحقيق الهدف بالكامل واختراق سقف الإنجاز',
    descEn: 'Complete mastery and full goal breakthrough',
    icon: 'mastery',
    badgeAr: '🏆 التتويج الأسطوري',
    badgeEn: '🏆 Apex Crown',
  },
];

export function RewardsSection({
  currentPoints,
  targetPoints,
  language = 'ar',
  numberFormatter,
  t,
}: RewardsSectionProps) {
  const isArabic = language === 'ar';
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const safeTarget = Math.max(1, Math.round(targetPoints) || 100);
  const safeCurrent = Math.max(0, Math.round(currentPoints) || 0);
  const progressRatio = Math.min(1, safeCurrent / safeTarget);
  const progressPercent = Math.round(progressRatio * 100);

  // Compute current active level
  const currentLevelIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < LEVEL_STEPS.length; i++) {
      if (progressPercent >= LEVEL_STEPS[i].percent) {
        index = i;
      }
    }
    return index;
  }, [progressPercent]);

  const activeLevel = LEVEL_STEPS[currentLevelIndex];
  const nextLevel = LEVEL_STEPS[currentLevelIndex + 1] || null;

  // Selected level for detail card (defaults to next level or active level)
  const selectedStep = useMemo(() => {
    if (selectedLevel !== null) {
      const found = LEVEL_STEPS.find((s) => s.level === selectedLevel);
      if (found) return found;
    }
    return nextLevel || activeLevel;
  }, [selectedLevel, nextLevel, activeLevel]);

  return (
    <section
      className="rounded-2xl border border-border/70 bg-card p-3 sm:p-3.5 shadow-xs relative overflow-hidden transition-all"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Background Accent Gradient */}
      <div className="pointer-events-none absolute -top-12 -end-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary shadow-xs">
            <Crown className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5 truncate">
            <h3 className="text-xs sm:text-sm font-extrabold text-foreground tracking-tight truncate">
              {isArabic ? 'مستويات الهدف والجوائز' : 'Goal Levels & Rewards'}
            </h3>
            <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/25 px-2 py-0.2 text-[10px] font-black text-primary shrink-0">
              Level {activeLevel.level}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-end">
          <span className="text-xs font-black text-foreground tabular-nums">
            {progressPercent}%
          </span>
          <span className="text-[10px] text-muted-foreground ms-1 hidden min-[440px]:inline">
            ({numberFormatter.format(safeCurrent)} / {numberFormatter.format(safeTarget)} {isArabic ? 'نقطة' : 'pts'})
          </span>
        </div>
      </div>

      {/* Horizontal Stepper Track */}
      <div className="relative px-2 py-1 my-1 z-10">
        {/* Connecting Progress Rail */}
        <div className="absolute top-[13px] sm:top-[15px] inset-x-5 sm:inset-x-6 h-1 bg-muted/80 rounded-full overflow-hidden border border-border/40">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/85 transition-all duration-500 ease-out shadow-xs shadow-primary/30"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 7 Checkpoint Nodes */}
        <div className="relative z-10 flex items-center justify-between">
          {LEVEL_STEPS.map((step) => {
            const isUnlocked = progressPercent >= step.percent;
            const isCurrent = step.level === activeLevel.level;
            const isSelected = selectedStep.level === step.level;

            return (
              <button
                key={step.level}
                type="button"
                onClick={() => setSelectedLevel(step.level)}
                className="flex flex-col items-center gap-1 group cursor-pointer active:scale-95 transition-transform"
                title={`Level ${step.level}: ${isArabic ? step.titleAr : step.titleEn}`}
              >
                <div
                  className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-200',
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                      : '',
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/30 scale-105'
                      : isUnlocked
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                        : 'bg-card text-muted-foreground border-border/70 group-hover:border-primary/40',
                  )}
                >
                  {isUnlocked && !isCurrent ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isCurrent ? (
                    <Zap className="w-3 h-3 fill-primary-foreground stroke-[2.5]" />
                  ) : (
                    <span>{step.level}</span>
                  )}
                </div>

                <span
                  className={cn(
                    'text-[9px] sm:text-[10px] font-bold tabular-nums',
                    isCurrent
                      ? 'text-primary font-black'
                      : isUnlocked
                        ? 'text-foreground'
                        : 'text-muted-foreground/60',
                  )}
                >
                  {step.percent}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact Active/Selected Level Card */}
      <div className="mt-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-between gap-2.5 relative z-10 transition-all">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[11px] font-black',
              selectedStep.level === activeLevel.level
                ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                : progressPercent >= selectedStep.percent
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-card text-muted-foreground border-border/70',
            )}
          >
            {selectedStep.level}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs text-foreground truncate">
                Level {selectedStep.level}: {isArabic ? selectedStep.titleAr : selectedStep.titleEn}
              </span>
              {(selectedStep.badgeAr || selectedStep.badgeEn) && (
                <span className="inline-flex items-center text-[10px] font-bold rounded-md bg-amber-500/12 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-1.5 py-0.2 shrink-0">
                  {isArabic ? selectedStep.badgeAr : selectedStep.badgeEn}
                </span>
              )}
              {selectedStep.level === activeLevel.level && (
                <span className="inline-flex items-center text-[9px] font-black rounded-md bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.2 shrink-0">
                  {isArabic ? 'المستوى الحالي' : 'Current'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              {isArabic ? selectedStep.descAr : selectedStep.descEn}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-end">
          {Math.round((selectedStep.percent / 100) * safeTarget) <= safeCurrent ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>{isArabic ? 'مكتمل' : 'Unlocked'}</span>
            </span>
          ) : (
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-black text-foreground tabular-nums">
                {numberFormatter.format(Math.round((selectedStep.percent / 100) * safeTarget))} {isArabic ? 'نقطة' : 'pts'}
              </span>
              <span className="text-[9px] font-semibold text-muted-foreground tabular-nums">
                {isArabic
                  ? `متبقي ${numberFormatter.format(Math.max(0, Math.round((selectedStep.percent / 100) * safeTarget) - safeCurrent))}`
                  : `${numberFormatter.format(Math.max(0, Math.round((selectedStep.percent / 100) * safeTarget) - safeCurrent))} left`}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default RewardsSection;
