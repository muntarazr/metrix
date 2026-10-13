'use client';

import React from 'react';
import { arSA, enUS } from 'react-day-picker/locale';
import {
  Calendar,
  CalendarDays,
  Calculator,
  Clock,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IconPicker } from './IconPicker';
import { DatePopoverField } from './edit/goal-edit-types';

export interface GoalEditManualTabProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  icon: string;
  setIcon: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  currentPoints: string;
  setCurrentPoints: (value: string) => void;
  targetPoints: string;
  setTargetPoints: (value: string) => void;
  totalDays: number;
  safePreviewTargetPoints: number;
  suggestedDailyPoints: number;
  remainingDaysChip: { tone: 'soon' | 'today' | 'late'; text: string; title: string } | null;
  calculatedTaskPoints: number | null;
  labels: Record<string, string>;
  locale: typeof arSA | typeof enUS;
  isArabic: boolean;
}

export default function GoalEditManualTab({
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
  totalDays,
  safePreviewTargetPoints,
  suggestedDailyPoints,
  remainingDaysChip,
  calculatedTaskPoints,
  labels,
  locale,
  isArabic,
}: GoalEditManualTabProps) {
  return (
    <div className="space-y-4">
      {/* CARD 1: GOAL IDENTITY */}
      <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
            <Target className="size-3.5 text-primary" />
            {labels.goalInfo}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {labels.iconHint}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <IconPicker
              selectedIcon={icon}
              onSelectIcon={setIcon}
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 transition-all shadow-xs"
            />
          </div>
          <div className="flex-1 min-w-0">
            <Input
              id="goal-edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={isArabic ? 'اسم الهدف...' : 'Goal title...'}
              dir={isArabic ? 'rtl' : 'ltr'}
              className="h-11 sm:h-12 rounded-xl border-border/80 bg-card px-4 text-base sm:text-sm font-semibold shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <Label htmlFor="goal-edit-description" className="text-xs font-medium text-muted-foreground">
            {labels.descriptionLabel}
          </Label>
          <Textarea
            id="goal-edit-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={labels.descriptionPlaceholder}
            dir={isArabic ? 'rtl' : 'ltr'}
            className="min-h-[64px] max-h-28 rounded-xl border-border/80 bg-card px-3.5 py-2.5 text-base sm:text-sm leading-relaxed shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 resize-none transition-colors"
          />
        </div>
      </div>

      {/* CARD 2: TIMELINE */}
      <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-primary" />
            {labels.timeline}
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Days Remaining Chip matching Dashboard */}
            {remainingDaysChip ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] sm:text-[11px] font-medium tabular-nums border shadow-xs transition-colors',
                  remainingDaysChip.tone === 'soon' &&
                    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
                  remainingDaysChip.tone === 'today' &&
                    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 animate-pulse',
                  remainingDaysChip.tone === 'late' &&
                    'bg-destructive/10 text-destructive border-destructive/25',
                )}
                title={remainingDaysChip.title}
              >
                <Clock className="size-3 shrink-0" aria-hidden />
                <span>{remainingDaysChip.text}</span>
              </span>
            ) : totalDays > 0 ? (
              <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10.5px] sm:text-[11px] font-bold text-primary border border-primary/20">
                <span>{totalDays} {labels.daysUnit}</span>
              </div>
            ) : null}
          </div>
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
            icon={Calendar}
            isArabic={isArabic}
            label={labels.endDate}
            locale={locale}
            onChange={setEndDate}
            placeholder={labels.selectDate}
            value={endDate}
            minDate={startDate}
          />
        </div>
      </div>

      {/* CARD 3: TARGET POINTS & PROGRESS */}
      <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            {labels.pointsAndProgress}
          </span>
          {suggestedDailyPoints > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {labels.dailyPace}: <strong className="text-foreground font-bold" dir="ltr">~{suggestedDailyPoints.toLocaleString()}</strong> {labels.paceUnit}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="goal-edit-current-points" className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{labels.currentPoints}</span>
              <span className="text-[10px] text-muted-foreground/70">{labels.currentPointsHint}</span>
            </Label>
            <div className="relative">
              <Input
                id="goal-edit-current-points"
                type="number"
                min={0}
                step={10}
                value={currentPoints}
                onChange={(event) => setCurrentPoints(event.target.value)}
                className="h-11 rounded-xl border-border/80 bg-card px-3.5 text-base sm:text-sm font-semibold shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                dir="ltr"
              />
              <span className="absolute inset-y-0 end-3 flex items-center text-xs font-medium text-muted-foreground/60 pointer-events-none">
                {labels.pointsUnit}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-edit-target-points" className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{labels.targetPoints}</span>
              <span className="text-[10px] text-muted-foreground/70">{labels.targetPointsHint}</span>
            </Label>
            <div className="relative">
              <Input
                id="goal-edit-target-points"
                type="number"
                min={1}
                step={10}
                value={targetPoints}
                onChange={(event) => setTargetPoints(event.target.value)}
                className="h-11 rounded-xl border-border/80 bg-card px-3.5 text-base sm:text-sm font-semibold shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                dir="ltr"
              />
              <span className="absolute inset-y-0 end-3 flex items-center text-xs font-medium text-muted-foreground/60 pointer-events-none">
                {labels.pointsUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Streamlined task calculation helper if available */}
        {calculatedTaskPoints !== null && safePreviewTargetPoints !== calculatedTaskPoints && (
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <Calculator className="size-4 text-primary shrink-0" />
              <div className="leading-snug">
                <span>{labels.taskPointsSuggestion} </span>
                <strong className="font-bold text-foreground" dir="ltr">{calculatedTaskPoints.toLocaleString()}</strong>
                <span> {labels.pointsUnit}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTargetPoints(String(calculatedTaskPoints))}
              className="h-7 shrink-0 text-xs font-bold text-primary hover:text-primary hover:bg-primary/15 rounded-lg px-2.5 border border-primary/20 cursor-pointer"
            >
              {labels.applyTaskPoints}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
