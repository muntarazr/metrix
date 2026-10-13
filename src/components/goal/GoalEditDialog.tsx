'use client';

import {
  AlertCircle,
  Edit3,
  Loader2,
  Sparkles,
  Target,
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
    activeLevel,
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
        className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[85dvh] sm:max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-2xl transition-all duration-200"
      >
        {/* Visible, Distinctive Header */}
        <div className="shrink-0 border-b border-border/60 bg-muted/15 px-4 sm:px-6 pt-3.5 sm:pt-5 pb-3 sm:pb-4">
          <div className="flex items-start justify-between gap-3 pe-8 sm:pe-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  {labels.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {labels.subtitle}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2">
            <div className="inline-flex w-full sm:w-auto rounded-xl bg-muted/70 p-1 border border-border/60 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer",
                  activeTab === 'manual'
                    ? "bg-card text-foreground shadow-xs border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Edit3 className="size-3.5" />
                <span>{aiLabels.tabManual}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ai');
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer",
                  activeTab === 'ai'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="size-3.5" />
                <span>{aiLabels.tabAi}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dialog Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive font-medium shadow-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {aiSuccessMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs sm:text-sm text-primary font-medium shadow-xs">
              <Sparkles className="size-4 shrink-0 text-primary" />
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
              activeLevel={activeLevel}
              aiLabels={aiLabels}
              labels={labels}
              isArabic={isArabic}
            />
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter
          className={cn(
            'shrink-0 border-t border-border/60 bg-muted/15 px-4 sm:px-6 py-2.5 sm:py-3.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:pb-[calc(0.875rem+env(safe-area-inset-bottom))] flex flex-row items-center justify-end gap-2 sm:gap-2.5',
            isArabic && 'sm:flex-row-reverse sm:space-x-reverse',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving || isAiProcessing}
            className="h-10 flex-1 sm:flex-initial sm:w-auto rounded-xl font-medium text-xs sm:text-sm text-muted-foreground hover:text-foreground"
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isAiProcessing}
            className="h-10 flex-1 sm:flex-initial sm:w-auto rounded-xl font-semibold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0 rtl:mr-0 rtl:ml-2" />}
            {t.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
