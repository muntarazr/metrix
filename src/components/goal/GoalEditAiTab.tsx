'use client';

import React from 'react';
import {
  Clock,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getGoalIcon } from './IconPicker';
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
  activeLevel: { level: number };
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
  description,
  icon,
  totalDays,
  remainingDaysChip,
  safePreviewTargetPoints,
  activeLevel,
  aiLabels,
  labels,
  isArabic,
}: GoalEditAiTabProps) {
  return (
    <div className="space-y-4">
      {/* AI INSTRUCTION PROMPT CARD */}
      <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5 space-y-3.5">
        <Label htmlFor="ai-instructions" className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
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
            className={cn(
              'min-h-[88px] sm:min-h-[110px] w-full rounded-xl border border-border/80 bg-card px-4 py-3 text-base sm:text-sm leading-relaxed shadow-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 resize-none transition-colors',
              isArabic ? 'text-right pl-10' : 'text-left pr-10',
            )}
          />
          <div className={cn("absolute bottom-3 pointer-events-none", isArabic ? "left-3" : "right-3")}>
            <Sparkles className={cn("size-4 transition-colors duration-200", isAiProcessing ? "text-primary animate-pulse" : "text-muted-foreground/40")} />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={onAiEdit}
            disabled={isAiProcessing || !aiInstruction.trim()}
            className="h-10 rounded-xl px-5 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors w-full sm:w-auto cursor-pointer"
          >
            {isAiProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0 rtl:mr-0 rtl:ml-2" />
                <span>{aiLabels.aiProcessing}</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4 shrink-0 rtl:mr-0 rtl:ml-2" />
                <span>{aiLabels.aiButton}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* PENDING TASK CHANGES */}
      {taskChanges.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-1.5 sm:gap-3 border-b border-border/50 pb-2">
            <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>{aiLabels.changesTitle}</span>
            </h5>
            <span className="text-[10px] text-muted-foreground">{aiLabels.changesHint}</span>
          </div>

          <ul className="space-y-2">
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
                    'flex items-start justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2 text-xs',
                    isRemove ? 'border-destructive/40' : 'border-border/60',
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                          isRemove
                            ? 'bg-destructive/15 text-destructive'
                            : isAdd
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary/15 text-primary',
                        )}
                      >
                        {opLabel}
                      </span>
                      <span className={cn('text-xs font-semibold text-foreground', isRemove && 'line-through opacity-70')}>
                        {taskDesc}
                      </span>
                    </div>
                    {details.length > 0 && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {details.join(' · ')}
                      </p>
                    )}
                    {lostHistory > 0 && (
                      <p className="text-[11px] font-semibold text-destructive">
                        {lostHistory} {isArabic ? 'إنجاز مسجل' : 'recorded completions'} — {aiLabels.historyWarning}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => discardChange(index)}
                    className="h-6 shrink-0 rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {aiLabels.discard}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* COMPACT PLAN PREVIEW CARD */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h5 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <Target className="size-3.5 text-primary/70" />
            <span>{aiLabels.aiSuccessPreviewTitle}</span>
          </h5>
          {aiSuccessMessage && (
            <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
              {isArabic ? 'تم التحديث' : 'Synced'}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              {getGoalIcon(icon)}
            </div>
            <div className="min-w-0 flex-1">
              <h6 className="font-bold text-sm text-foreground truncate">
                {title || (isArabic ? 'بدون عنوان' : 'Untitled')}
              </h6>
              <p className="text-xs text-muted-foreground truncate">
                {description || (isArabic ? 'لا يوجد وصف.' : 'No description.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="flex-1 min-w-[70px] sm:flex-initial bg-card px-2.5 py-1.5 rounded-lg border border-border/60 text-center">
              <span className="text-[9px] text-muted-foreground block">{labels.duration}</span>
              <span className="font-bold text-foreground">{totalDays} {isArabic ? 'يوم' : 'd'}</span>
            </div>
            {remainingDaysChip && (
              <div className="flex-1 min-w-[70px] sm:flex-initial bg-card px-2.5 py-1.5 rounded-lg border border-border/60 text-center">
                <span className="text-[9px] text-muted-foreground block">{labels.remainingBadge}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{remainingDaysChip.text}</span>
              </div>
            )}
            <div className="flex-1 min-w-[70px] sm:flex-initial bg-card px-2.5 py-1.5 rounded-lg border border-border/60 text-center">
              <span className="text-[9px] text-muted-foreground block">{labels.targetPoints}</span>
              <span className="font-bold text-primary">{safePreviewTargetPoints.toLocaleString()}</span>
            </div>
            <div className="flex-1 min-w-[70px] sm:flex-initial bg-card px-2.5 py-1.5 rounded-lg border border-border/60 text-center">
              <span className="text-[9px] text-muted-foreground block">{labels.levelLabel}</span>
              <span className="font-bold text-primary">Level {activeLevel.level}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
