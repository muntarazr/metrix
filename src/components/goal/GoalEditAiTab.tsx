'use client';

import React from 'react';
import {
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TaskChange, TaskDraft } from './edit/goal-edit-types';

export interface GoalEditAiTabProps {
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  isAiProcessing: boolean;
  onAiEdit: () => void;
  taskChanges: TaskChange[];
  discardChange: (index: number) => void;
  taskById: (id: string) => TaskDraft | undefined;
  checkinCounts: Record<string, number>;
  aiSuccessMessage: string | null;
  title: string;
  description: string;
  icon: string;
  totalDays: number;
  remainingDaysChip: { tone: 'soon' | 'today' | 'late'; text: string; title: string } | null;
  safePreviewTargetPoints: number;
  aiLabels: Record<string, string>;
  labels: Record<string, string>;
  isArabic: boolean;
}

export default function GoalEditAiTab({
  aiInstruction,
  setAiInstruction,
  isAiProcessing,
  onAiEdit,
  taskChanges,
  discardChange,
  taskById,
  checkinCounts,
  aiSuccessMessage,
  title,
  totalDays,
  safePreviewTargetPoints,
  aiLabels,
  labels,
  isArabic,
}: GoalEditAiTabProps) {
  return (
    <div className="space-y-3.5">
      {/* 1. AI Instructions */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-instructions" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span>{aiLabels.aiPromptLabel}</span>
        </Label>
        <div className="relative">
          <Textarea
            id="ai-instructions"
            value={aiInstruction}
            onChange={(event) => setAiInstruction(event.target.value)}
            placeholder={aiLabels.aiTextareaPlaceholder}
            dir={isArabic ? 'rtl' : 'ltr'}
            rows={3}
            className="min-h-[72px] sm:min-h-[80px] max-h-32 w-full rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs sm:text-sm leading-relaxed resize-none shadow-xs placeholder:text-muted-foreground/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/40 transition-all"
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-muted-foreground/70 font-medium">
            {isArabic ? 'أفكار سريعة:' : 'Quick ideas:'}
          </span>
          {[
            isArabic ? 'مدد الهدف أسبوعين' : 'Extend by 2 weeks',
            isArabic ? 'طابق النقاط مع المهام' : 'Sync points with tasks',
            isArabic ? 'بسّط خطة الهدف' : 'Simplify goal plan',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setAiInstruction(suggestion)}
              className="rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={onAiEdit}
            disabled={isAiProcessing || !aiInstruction.trim()}
            size="sm"
            className="h-9 rounded-xl px-4 text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {isAiProcessing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin shrink-0 rtl:mr-0 rtl:ml-1.5" />
                <span>{aiLabels.aiProcessing}</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5 shrink-0 rtl:mr-0 rtl:ml-1.5" />
                <span>{aiLabels.aiButton}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Compact summary badge if updated */}
      {(aiSuccessMessage || taskChanges.length > 0) && (
        <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="size-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground truncate">{title || (isArabic ? 'الهدف المحدث' : 'Updated goal')}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0 tabular-nums">
            <span>{totalDays} {isArabic ? 'يوم' : 'd'}</span>
            <span>•</span>
            <span className="font-semibold text-primary">{safePreviewTargetPoints.toLocaleString()} {labels.pointsUnit}</span>
          </div>
        </div>
      )}

      {/* 3. Task Changes List */}
      {taskChanges.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">{aiLabels.changesTitle}</span>
            <span className="text-[10px] text-muted-foreground">{aiLabels.changesHint}</span>
          </div>

          <ul className="space-y-1.5">
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
                    'flex items-center justify-between gap-2.5 rounded-lg border px-2.5 py-1.5 text-xs',
                    isRemove ? 'border-destructive/30 bg-destructive/5' : 'border-border/60 bg-muted/20',
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.2 text-[10px] font-bold',
                          isRemove
                            ? 'bg-destructive/15 text-destructive'
                            : isAdd
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary/15 text-primary',
                        )}
                      >
                        {opLabel}
                      </span>
                      <span className={cn('text-xs font-medium text-foreground truncate', isRemove && 'line-through opacity-70')}>
                        {taskDesc}
                      </span>
                    </div>
                    {details.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {details.join(' · ')}
                      </p>
                    )}
                    {lostHistory > 0 && (
                      <p className="text-[10px] font-semibold text-destructive">
                        {lostHistory} {isArabic ? 'إنجاز مسجل' : 'records'} — {aiLabels.historyWarning}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => discardChange(index)}
                    className="h-6 shrink-0 rounded px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {aiLabels.discard}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
