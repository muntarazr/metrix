'use client';

import React from 'react';
import { arSA, enUS } from 'react-day-picker/locale';
import {
  Calendar,
  CalendarDays,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <div className="space-y-3.5">
      {/* 1. Goal Identity (Icon + Title & Description) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <IconPicker
            selectedIcon={icon}
            onSelectIcon={setIcon}
            className="h-10 w-10 shrink-0 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-all shadow-xs"
          />
          <Input
            id="goal-edit-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isArabic ? 'اسم الهدف...' : 'Goal title...'}
            dir={isArabic ? 'rtl' : 'ltr'}
            className="h-10 flex-1 rounded-xl border border-border/70 bg-muted/20 px-3.5 text-sm sm:text-base font-semibold placeholder:text-muted-foreground/50 shadow-xs focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/40 transition-all"
          />
        </div>

        <Textarea
          id="goal-edit-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={labels.descriptionPlaceholder}
          dir={isArabic ? 'rtl' : 'ltr'}
          rows={2}
          className="min-h-[54px] max-h-24 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs sm:text-sm leading-relaxed resize-none placeholder:text-muted-foreground/50 shadow-xs focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/40 transition-all"
        />
      </div>

      {/* 2. Timeline (Dates paired with live remaining counter) */}
      <div className="pt-2 border-t border-border/40">
        <div className="grid grid-cols-2 gap-2.5">
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
            badge={
              remainingDaysChip ? (
                <span
                  className={cn(
                    'text-[10.5px] font-medium tabular-nums',
                    remainingDaysChip.tone === 'soon' && 'text-emerald-600 dark:text-emerald-400',
                    remainingDaysChip.tone === 'today' && 'text-amber-600 dark:text-amber-400',
                    remainingDaysChip.tone === 'late' && 'text-destructive',
                  )}
                  title={remainingDaysChip.title}
                >
                  {remainingDaysChip.text}
                </span>
              ) : totalDays > 0 ? (
                <span className="text-[10.5px] text-muted-foreground font-medium">
                  {totalDays} {labels.daysUnit}
                </span>
              ) : null
            }
            locale={locale}
            onChange={setEndDate}
            placeholder={labels.selectDate}
            value={endDate}
            minDate={startDate}
          />
        </div>
      </div>

      {/* 3. Points & Progress (Paired with daily pace guidance) */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label htmlFor="goal-edit-current-points" className="text-[11px] font-medium text-muted-foreground">
              {labels.currentPoints}
            </Label>
            <div className="relative">
              <Input
                id="goal-edit-current-points"
                type="number"
                min={0}
                step={10}
                value={currentPoints}
                onChange={(event) => setCurrentPoints(event.target.value)}
                className="h-10 rounded-xl border border-border/70 bg-muted/20 px-3 text-sm font-semibold shadow-xs focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/40 tabular-nums transition-all"
                dir="ltr"
              />
              <span className="absolute inset-y-0 end-2.5 flex items-center text-[11px] text-muted-foreground/60 pointer-events-none">
                {labels.pointsUnit}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="goal-edit-target-points" className="text-[11px] font-medium text-muted-foreground">
                {labels.targetPoints}
              </Label>
              {suggestedDailyPoints > 0 && (
                <span className="text-[10.5px] text-muted-foreground/80 tabular-nums">
                  ~{suggestedDailyPoints.toLocaleString()} {labels.paceUnit}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="goal-edit-target-points"
                type="number"
                min={1}
                step={10}
                value={targetPoints}
                onChange={(event) => setTargetPoints(event.target.value)}
                className="h-10 rounded-xl border border-border/70 bg-muted/20 px-3 text-sm font-semibold shadow-xs focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/40 tabular-nums transition-all"
                dir="ltr"
              />
              <span className="absolute inset-y-0 end-2.5 flex items-center text-[11px] text-muted-foreground/60 pointer-events-none">
                {labels.pointsUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Compact task calculation shortcut */}
        {calculatedTaskPoints !== null && safePreviewTargetPoints !== calculatedTaskPoints && (
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs text-muted-foreground border border-primary/15 transition-colors">
            <span className="flex items-center gap-1.5">
              <Calculator className="size-3.5 text-primary/70 shrink-0" />
              <span>{labels.taskPointsSuggestion}</span>
              <strong className="text-foreground font-semibold tabular-nums" dir="ltr">{calculatedTaskPoints.toLocaleString()}</strong>
              <span>{labels.pointsUnit}</span>
            </span>
            <button
              type="button"
              onClick={() => setTargetPoints(String(calculatedTaskPoints))}
              className="rounded px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/15 transition-colors cursor-pointer"
            >
              {labels.applyTaskPoints}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
