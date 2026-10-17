'use client';

import {
  AlertCircle,
  Edit3,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  type EditableGoal,
  type GoalEditDialogProps,
} from './edit/goal-edit-types';
import { useGoalEditState } from './edit/useGoalEditState';
import GoalEditManualTab from './GoalEditManualTab';
import GoalEditAiTab from './GoalEditAiTab';

export type { EditableGoal, GoalEditDialogProps };

export default function GoalEditDialog({
  goal,
  open,
  onOpenChange,
  onSaved,
  language = 'ar',
}: GoalEditDialogProps) {
  const t = translations[language];
  const isArabic = language === 'ar';

  const {
    locale,
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
    isSaving,
    errorMessage,
    setErrorMessage,
    activeTab,
    setActiveTab,
    aiInstruction,
    setAiInstruction,
    isAiProcessing,
    aiSuccessMessage,
    taskChanges,
    checkinCounts,
    totalDays,
    safePreviewTargetPoints,
    suggestedDailyPoints,
    remainingDaysChip,
    calculatedTaskPoints,
    labels,
    aiLabels,
    handleClose,
    taskById,
    discardChange,
    handleSave,
    handleAiEdit,
  } = useGoalEditState(goal, open, onOpenChange, onSaved, isArabic);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent
        dir={isArabic ? 'rtl' : 'ltr'}
        className="w-[calc(100vw-1.5rem)] sm:max-w-[460px] max-h-[85dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl transition-all duration-200"
      >
        {/* Sleek, Compact Header */}
        <div className="shrink-0 border-b border-border/50 px-4 sm:px-5 py-3">
          <div className="flex items-center justify-between gap-2 pe-7">
            <DialogTitle className="text-sm sm:text-base font-bold text-foreground tracking-tight">
              {labels.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {labels.subtitle}
            </DialogDescription>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex shrink-0 rounded-lg bg-muted/50 p-1 border border-border/40">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all cursor-pointer font-medium",
                  activeTab === 'manual'
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Edit3 className="size-3" />
                <span>{aiLabels.tabManual}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ai');
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all cursor-pointer font-medium",
                  activeTab === 'ai'
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="size-3" />
                <span>{aiLabels.tabAi}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dialog Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium shadow-xs">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {aiSuccessMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary font-medium shadow-xs">
              <Sparkles className="size-3.5 shrink-0 text-primary" />
              <span>{aiSuccessMessage}</span>
            </div>
          )}

          {activeTab === 'manual' ? (
            <GoalEditManualTab
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              icon={icon}
              setIcon={setIcon}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              currentPoints={currentPoints}
              setCurrentPoints={setCurrentPoints}
              targetPoints={targetPoints}
              setTargetPoints={setTargetPoints}
              totalDays={totalDays}
              safePreviewTargetPoints={safePreviewTargetPoints}
              suggestedDailyPoints={suggestedDailyPoints}
              remainingDaysChip={remainingDaysChip}
              calculatedTaskPoints={calculatedTaskPoints}
              labels={labels}
              locale={locale}
              isArabic={isArabic}
            />
          ) : (
            <GoalEditAiTab
              aiInstruction={aiInstruction}
              setAiInstruction={setAiInstruction}
              isAiProcessing={isAiProcessing}
              onAiEdit={handleAiEdit}
              taskChanges={taskChanges}
              discardChange={discardChange}
              taskById={taskById}
              checkinCounts={checkinCounts}
              aiSuccessMessage={aiSuccessMessage}
              title={title}
              description={description}
              icon={icon}
              totalDays={totalDays}
              remainingDaysChip={remainingDaysChip}
              safePreviewTargetPoints={safePreviewTargetPoints}
              aiLabels={aiLabels}
              labels={labels}
              isArabic={isArabic}
            />
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter
          className={cn(
            'shrink-0 border-t border-border/50 px-4 sm:px-5 py-2.5 sm:py-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex flex-row items-center justify-end gap-2',
            isArabic && 'sm:flex-row-reverse sm:space-x-reverse',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving || isAiProcessing}
            className="h-9.5 flex-1 sm:flex-initial sm:w-auto rounded-xl font-medium text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isAiProcessing}
            className="h-9.5 flex-1 sm:flex-initial sm:w-auto rounded-xl font-semibold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin shrink-0 rtl:mr-0 rtl:ml-2" />}
            {t.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
