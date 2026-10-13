"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Language } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GoalIconPicker, getGoalIcon } from "@/components/goal/IconPicker";

/** Every field of a task that a user is allowed to change. */
export interface EditableTask {
  id: string;
  task_description: string;
  task_type: "main" | "sub";
  frequency: string;
  impact_weight: number;
  time_required_minutes?: number | null;
  completion_criteria?: string | null;
  icon?: string | null;
}

export interface TaskPatch {
  task_description: string;
  frequency: "daily" | "weekly";
  impact_weight: number;
  time_required_minutes: number;
  completion_criteria: string;
  icon?: string | null;
}

interface TaskEditDialogProps {
  task: EditableTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, patch: TaskPatch) => Promise<void>;
  language?: Language;
  goalTitle?: string;
}

/** Main tasks weigh up to 10; a subtask sits inside one, so it caps at 5. */
const weightScale = (taskType: "main" | "sub") =>
  taskType === "main"
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    : [1, 2, 3, 4, 5];

export default function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onSave,
  language = "ar",
}: TaskEditDialogProps) {
  const isArabic = language === "ar";

  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [weight, setWeight] = useState(1);
  const [minutes, setMinutes] = useState("0");
  const [criteria, setCriteria] = useState("");
  const [icon, setIcon] = useState("Target");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!task || !open) {
      return;
    }

    setDescription(task.task_description ?? "");
    setFrequency(task.frequency === "weekly" ? "weekly" : "daily");
    setWeight(task.impact_weight ?? 1);
    setMinutes(String(task.time_required_minutes ?? 0));
    setCriteria(task.completion_criteria ?? "");
    setIcon(task.icon || "Target");
    setErrorMessage(null);
  }, [task, open]);

  const t = {
    titleMain: isArabic ? "تعديل المهمة" : "Edit task",
    titleSub: isArabic ? "تعديل المهمة" : "Edit task",
    description: isArabic ? "اسم المهمة" : "Task name",
    descriptionPlaceholder: isArabic
      ? "مثال: ممارسة الرياضة الصباحية"
      : "Example: Morning workout",
    frequency: isArabic ? "التكرار" : "Cadence",
    daily: isArabic ? "يومي" : "Daily",
    weekly: isArabic ? "أسبوعي" : "Weekly",
    weight: isArabic ? "الوزن" : "Weight",
    minutes: isArabic ? "الوقت المطلوب (دقيقة)" : "Time required (minutes)",
    criteria: isArabic ? "معيار الإنجاز" : "Completion criteria",
    criteriaPlaceholder: isArabic
      ? "مثال: تسجيل بطول 10 دقائق + خطآن مكتوبان."
      : "Example: a 10-minute recording plus two written fixes.",
    cancel: isArabic ? "إلغاء" : "Cancel",
    save: isArabic ? "حفظ التعديلات" : "Save changes",
    required: isArabic ? "اكتب اسم المهمة أولاً." : "Enter a task name first.",
    minutesError: isArabic
      ? "الوقت يجب أن يكون بين 0 و 1440 دقيقة."
      : "Time must be between 0 and 1440 minutes.",
    saveError: isArabic
      ? "تعذر حفظ التعديلات. حاول مرة ثانية."
      : "Could not save your changes. Please try again.",
    changeIcon: isArabic ? "تغيير أيقونة المهمة" : "Change task icon",
  };

  const handleClose = () => {
    if (isSaving) {
      return;
    }
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!task) {
      return;
    }

    const trimmed = description.trim();
    if (!trimmed) {
      setErrorMessage(t.required);
      return;
    }

    const numericMinutes = Number(minutes);
    if (!Number.isFinite(numericMinutes) || numericMinutes < 0 || numericMinutes > 1440) {
      setErrorMessage(t.minutesError);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSave(task.id, {
        task_description: trimmed,
        frequency,
        impact_weight: weight,
        time_required_minutes: Math.round(numericMinutes),
        completion_criteria: criteria.trim(),
        icon,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error saving task:", error);
      setErrorMessage(t.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const isSub = task?.task_type === "sub";

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent
        aria-describedby={undefined}
        dir={isArabic ? "rtl" : "ltr"}
        className="flex max-h-[calc(100dvh-2rem)] sm:max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card p-0 shadow-2xl shadow-black/25"
      >
        <DialogHeader className="shrink-0 px-4 sm:px-6 pt-5 sm:pt-6 text-start rtl:text-right">
          <DialogTitle className="text-base font-bold">
            {isSub ? t.titleSub : t.titleMain}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 sm:px-6 py-3.5 sm:py-4">
          {errorMessage && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/12 px-3 py-2 text-xs font-semibold text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3.5 sm:space-y-4 rounded-2xl border border-border bg-canvas p-3 sm:p-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-edit-description" className="text-xs font-bold text-muted-foreground/75">
                {t.description}
              </Label>
              <div className="flex items-center gap-2">
                <GoalIconPicker
                  currentIconName={icon || "Target"}
                  onSelect={(newIcon) => setIcon(newIcon)}
                >
                  <button
                    type="button"
                    aria-label={t.changeIcon}
                    title={t.changeIcon}
                    className="h-10 w-10 p-2 shrink-0 bg-muted/40 text-foreground hover:bg-muted/70 transition-all duration-150 rounded-xl flex items-center justify-center cursor-pointer border border-border/80 shadow-xs active:scale-95"
                  >
                    <span className="h-5 w-5 flex items-center justify-center transition-transform duration-200 hover:scale-110">
                      {getGoalIcon(icon || "Target")}
                    </span>
                  </button>
                </GoalIconPicker>

                <Input
                  id="task-edit-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  placeholder={t.descriptionPlaceholder}
                  dir={isArabic ? "rtl" : "ltr"}
                  className="h-10 flex-1 rounded-xl border border-border bg-card dark:bg-card px-3.5 text-base sm:text-sm shadow-sm focus:border-primary transition-colors duration-200"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground/75">{t.frequency}</Label>
                <div className="flex rounded-xl border border-border bg-card dark:bg-card p-1 shadow-sm">
                  {(["daily", "weekly"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFrequency(option)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors duration-200",
                        frequency === option
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      )}
                    >
                      {option === "daily" ? t.daily : t.weekly}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-edit-minutes" className="text-xs font-bold text-muted-foreground/75">
                  {t.minutes}
                </Label>
                <Input
                  id="task-edit-minutes"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1440}
                  step={5}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  dir="ltr"
                  className="h-10 rounded-xl border border-border bg-card dark:bg-card px-3.5 text-base sm:text-sm shadow-sm focus:border-primary transition-colors duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/75">{t.weight}</Label>
              <div className="scrollbar-thin grid grid-cols-5 gap-1.5 sm:flex sm:gap-1 sm:overflow-x-auto pb-1">
                {weightScale(task?.task_type ?? "sub").map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setWeight(value)}
                    className={cn(
                      "h-9 w-full sm:w-9 shrink-0 rounded-lg text-xs font-bold transition-colors duration-200 touch-manipulation",
                      weight === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card dark:bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-edit-criteria" className="text-xs font-bold text-muted-foreground/75">
                {t.criteria}
              </Label>
              <Textarea
                id="task-edit-criteria"
                value={criteria}
                onChange={(event) => setCriteria(event.target.value)}
                placeholder={t.criteriaPlaceholder}
                dir={isArabic ? "rtl" : "ltr"}
                className="min-h-16 rounded-xl border border-border bg-card dark:bg-card px-3.5 py-2.5 text-base sm:text-sm leading-6 shadow-sm focus:border-primary transition-colors duration-200"
              />
            </div>
          </div>
        </div>

        <DialogFooter
          className={cn(
            "flex-row items-center justify-end shrink-0 gap-2 border-t border-border/70 bg-card px-4 sm:px-6 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4",
            isArabic && "sm:flex-row-reverse sm:space-x-reverse",
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="h-10 flex-1 sm:flex-initial sm:w-auto rounded-xl font-bold border-border touch-manipulation"
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 flex-1 sm:flex-initial sm:w-auto rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md touch-manipulation"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0 rtl:mr-0 rtl:ml-2" />}
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
