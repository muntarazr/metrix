'use client';

import { useMemo, useState } from 'react';
import {
  Crown,
  Lock,
  Check,
  Gift,
  Snowflake,
  Zap,
  Sparkles,
  Trophy,
  Flame,
  Milestone,
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

export interface LevelStep {
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

export const LEVEL_STEPS: LevelStep[] = [
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

function renderStepIcon(step: LevelStep, isUnlocked: boolean, isCurrent: boolean) {
  const iconClass = 'w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]';
  switch (step.level) {
    case 1:
      return <Sparkles className={iconClass} />;
    case 2:
      return <Gift className={iconClass} />;
    case 3:
      return <Snowflake className={iconClass} />;
    case 4:
      return <Milestone className={iconClass} />;
    case 5:
      return <Zap className={iconClass} />;
    case 6:
      return <Flame className={iconClass} />;
    case 7:
      return <Trophy className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
  }
}

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
      className="rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs relative overflow-hidden transition-all"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted/60 border border-border/70 text-muted-foreground">
            <Crown className="h-4 w-4" />
          </div>
          <div className="text-sm font-bold tracking-tight text-foreground truncate">
            {isArabic ? 'مستويات الهدف' : 'Goal Levels'}
          </div>
        </div>

        <div className="shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/70 text-xs shadow-2xs">
            <span className="font-extrabold text-foreground tabular-nums">
              {numberFormatter.format(safeCurrent)}
            </span>
            <span className="text-muted-foreground/50 text-[11px] font-medium select-none">
              /
            </span>
            <span className="font-semibold text-muted-foreground tabular-nums text-[11px]">
              {numberFormatter.format(safeTarget)}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/90">
              {isArabic ? 'نقطة' : 'pts'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Unified Progression Track */}
      <div className="relative py-1 my-1 z-10">
        <div className="flex items-start justify-between relative px-0.5">
          {LEVEL_STEPS.map((step, idx) => {
            const isUnlocked = progressPercent >= step.percent;
            const isCurrent = step.level === activeLevel.level;
            const isSelected = selectedStep.level === step.level;
            const nextStep = LEVEL_STEPS[idx + 1];

            let segmentFill = 0;
            if (nextStep) {
              if (progressPercent >= nextStep.percent) {
                segmentFill = 100;
              } else if (progressPercent <= step.percent) {
                segmentFill = 0;
              } else {
                segmentFill = Math.round(
                  ((progressPercent - step.percent) / (nextStep.percent - step.percent)) * 100
                );
              }
            }

            return (
              <div key={step.level} className="flex-1 flex items-start last:flex-none">
                {/* Node Button */}
                <button
                  type="button"
                  onClick={() => setSelectedLevel(step.level)}
                  className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-hidden shrink-0 select-none"
                  title={`Level ${step.level}: ${isArabic ? step.titleAr : step.titleEn}`}
                >
                  <div
                    className={cn(
                      'w-6 h-6 min-[380px]:w-7 min-[380px]:h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 relative',
                      isSelected
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110 shadow-xs'
                        : '',
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-2 ring-primary/40 ring-offset-1 ring-offset-card'
                        : isUnlocked
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-muted/70 text-muted-foreground/60 border border-border/80 hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {renderStepIcon(step, isUnlocked, isCurrent)}

                    {/* Unlocked check badge on completed non-current steps */}
                    {isUnlocked && !isCurrent && (
                      <span className="absolute -top-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-1 ring-card shadow-2xs">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <span
                    className={cn(
                      'text-[9px] sm:text-[10px] tabular-nums transition-colors',
                      isCurrent
                        ? 'text-primary font-black'
                        : isSelected
                          ? 'text-foreground font-bold'
                          : isUnlocked
                            ? 'text-foreground/80 font-medium'
                            : 'text-muted-foreground/60 font-medium',
                    )}
                  >
                    {step.percent}%
                  </span>
                </button>

                {/* Connecting Segment to Next Step */}
                {nextStep && (
                  <div className="flex-1 h-1 sm:h-1.5 mx-0.5 min-[380px]:mx-1 sm:mx-1.5 bg-muted/80 rounded-full overflow-hidden relative self-start mt-2.5 min-[380px]:mt-3 sm:mt-[13px] border border-border/30">
                    <div
                      className="absolute top-0 bottom-0 start-0 bg-primary rounded-full transition-all duration-500 shadow-2xs shadow-primary/30"
                      style={{ width: `${segmentFill}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Milestone Detail Banner */}
      <div className="mt-2 px-3 py-2.5 sm:py-2 rounded-xl border border-border/70 bg-muted/25 flex flex-col items-stretch sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 relative z-10 text-xs transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors shadow-2xs',
              selectedStep.level === activeLevel.level
                ? 'bg-primary text-primary-foreground border-primary/30'
                : progressPercent >= selectedStep.percent
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-card text-muted-foreground border-border/80',
            )}
          >
            {renderStepIcon(
              selectedStep,
              progressPercent >= selectedStep.percent,
              selectedStep.level === activeLevel.level,
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-foreground text-xs tracking-tight whitespace-normal sm:truncate">
                {isArabic
                  ? `المستوى ${selectedStep.level}: ${selectedStep.titleAr}`
                  : `Level ${selectedStep.level}: ${selectedStep.titleEn}`}
              </span>
              {selectedStep.level === activeLevel.level && (
                <span className="inline-flex items-center text-[9px] font-black text-primary bg-primary/15 border border-primary/25 px-1.5 py-0.2 rounded-md shrink-0">
                  {isArabic ? 'الحالي' : 'Current'}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-[10px] text-muted-foreground whitespace-normal sm:truncate leading-relaxed sm:leading-normal mt-0.5">
              {isArabic ? selectedStep.descAr : selectedStep.descEn}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {Math.round((selectedStep.percent / 100) * safeTarget) <= safeCurrent ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>{isArabic ? 'مكتمل' : 'Reached'}</span>
            </span>
          ) : (
            <span className="text-primary font-bold inline-flex items-center gap-1 text-[11px] bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg tabular-nums">
              <span>
                {isArabic
                  ? `متبقي ${numberFormatter.format(
                      Math.max(
                        0,
                        Math.round((selectedStep.percent / 100) * safeTarget) -
                          safeCurrent,
                      ),
                    )} نقطة`
                  : `${numberFormatter.format(
                      Math.max(
                        0,
                        Math.round((selectedStep.percent / 100) * safeTarget) -
                          safeCurrent,
                      ),
                    )} pts left`}
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export default RewardsSection;
