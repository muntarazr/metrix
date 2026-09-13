"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { Language } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Every field of a task that a user is allowed to change. */
export interface EditableTask {
  id: string;
  task_description: string;
  task_type: "main" | "sub";
  frequency: string;
  impact_weight: number;
  time_required_minutes?: number | null;
  completion_criteria?: string | null;
}

export interface TaskPatch {
  task_description: string;
  frequency: "daily" | "weekly";
  impact_weight: number;
  time_required_minutes: number;
  completion_criteria: string;
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
  goalTitle = "",
}: TaskEditDialogProps) {
  const isArabic = language === "ar";

  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [weight, setWeight] = useState(1);
  const [minutes, setMinutes] = useState("0");
  const [criteria, setCriteria] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCriteria, setIsGeneratingCriteria] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateCriteria = async () => {
    if (!description.trim()) return;
    setIsGeneratingCriteria(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/goal/task-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task?.id,
          taskDescription: description.trim(),
          goalTitle: goalTitle || undefined,
          taskType: task?.task_type ?? "sub",
          language,
          force: true,
        }),
      });
      const data = await res.json();
      if (data.criteria) {
        setCriteria(data.criteria);
      } else if (data.error === "quota_exceeded") {
        setErrorMessage(isArabic ? data.message_ar : data.message_en);
      }
    } catch (e) {
      console.error("Failed to generate criteria:", e);
    } finally {
      setIsGeneratingCriteria(false);
    }
  };

  useEffect(() => {
    if (!task || !open) {
      return;
    }

    setDescription(task.task_description ?? "");
    setFrequency(task.frequency === "weekly" ? "weekly" : "daily");
    setWeight(task.impact_weight ?? 1);
    setMinutes(String(task.time_required_minutes ?? 0));
    setCriteria(task.completion_criteria ?? "");
    setErrorMessage(null);
  }, [task, open]);

  const t = {
    titleMain: isArabic ? "تعديل المهمة الرئيسية" : "Edit main task",
    titleSub: isArabic ? "تعديل المهمة الفرعية" : "Edit subtask",
    subtitle: isArabic
      ? "عدّل المهمة كاملة — الوصف والتكرار والوزن والوقت ومعيار الإنجاز."
      : "Edit the whole task — description, cadence, weight, time, and completion criteria.",
    description: isArabic ? "وصف المهمة" : "Task description",
    descriptionPlaceholder: isArabic
      ? "مثال: المحادثة — تحدث 10 دقائق وسجّل صوتك"
      : "Example: Speaking — talk for 10 minutes and record yourself",
    frequency: isArabic ? "التكرار" : "Cadence",
    daily: isArabic ? "يومي" : "Daily",
    weekly: isArabic ? "أسبوعي" : "Weekly",
    weight: isArabic ? "الوزن" : "Weight",
    weightHint: isArabic
      ? "كل ما زاد الوزن زادت نقاط المهمة."
      : "A heavier task is worth more points.",
    minutes: isArabic ? "الوقت المطلوب (دقيقة)" : "Time required (minutes)",
    criteria: isArabic ? "معيار الإنجاز" : "Completion criteria",
    criteriaPlaceholder: isArabic
      ? "مثال: تسجيل بطول 10 دقائق + خطآن مكتوبان."
      : "Example: a 10-minute recording plus two written fixes.",
    criteriaHint: isArabic
      ? "اكتبه قابلاً للقياس حتى تعرف بوضوح متى أنجزتها."
      : "Make it measurable so you know exactly when it is done.",
    cancel: isArabic ? "إلغاء" : "Cancel",
    save: isArabic ? "حفظ التعديلات" : "Save changes",
    required: isArabic ? "اكتب وصف المهمة أولاً." : "Enter a task description first.",
    minutesError: isArabic
      ? "الوقت يجب أن يكون بين 0 و 1440 دقيقة."
      : "Time must be between 0 and 1440 minutes.",
    saveError: isArabic
      ? "تعذر حفظ التعديلات. حاول مرة ثانية."
      : "Could not save your changes. Please try again.",
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
        dir={isArabic ? "rtl" : "ltr"}
        className="max-w-lg rounded-3xl border border-border bg-card p-0 shadow-2xl shadow-black/25"
      >
        <DialogHeader className="space-y-1 px-6 pt-6 text-start rtl:text-right">
          <DialogTitle className="text-base font-bold">
            {isSub ? t.titleSub : t.titleMain}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground/90">
            {t.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {errorMessage && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/12 px-3 py-2 text-xs font-semibold text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-border bg-canvas p-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-edit-description" className="text-xs font-bold text-muted-foreground/75">
                {t.description}
              </Label>
              <Textarea
                id="task-edit-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t.descriptionPlaceholder}
                dir={isArabic ? "rtl" : "ltr"}
                className="min-h-20 rounded-xl border border-border bg-card dark:bg-card px-3.5 py-2.5 text-sm leading-6 shadow-sm focus:border-primary transition-colors duration-200"
              />
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
                  min={0}
                  max={1440}
                  step={5}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  dir="ltr"
                  className="h-10 rounded-xl border border-border bg-card dark:bg-card px-3.5 text-sm shadow-sm focus:border-primary transition-colors duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/75">{t.weight}</Label>
              <div className="scrollbar-thin flex gap-1 overflow-x-auto pb-1">
                {weightScale(task?.task_type ?? "sub").map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setWeight(value)}
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-lg text-xs font-bold transition-colors duration-200",
                      weight === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card dark:bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground/75">{t.weightHint}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="task-edit-criteria" className="text-xs font-bold text-muted-foreground/75">
                  {t.criteria}
                </Label>
                <button
                  type="button"
                  onClick={handleGenerateCriteria}
                  disabled={isGeneratingCriteria || !description.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/8 px-2 py-0.5 text-[11px] font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                  title={isArabic ? "توليد معيار إنجاز بالذكاء الاصطناعي" : "Generate completion criteria with AI"}
                >
                  {isGeneratingCriteria ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  <span>{isArabic ? "توليد بالذكاء الاصطناعي" : "Generate with AI"}</span>
                </button>
              </div>
              <Textarea
                id="task-edit-criteria"
                value={criteria}
                onChange={(event) => setCriteria(event.target.value)}
                placeholder={t.criteriaPlaceholder}
                dir={isArabic ? "rtl" : "ltr"}
                className="min-h-16 rounded-xl border border-border bg-card dark:bg-card px-3.5 py-2.5 text-sm leading-6 shadow-sm focus:border-primary transition-colors duration-200"
              />
              <p className="text-[11px] text-muted-foreground/75">{t.criteriaHint}</p>
            </div>
          </div>
        </div>

        <DialogFooter
          className={cn(
            "gap-2 border-t border-border/70 bg-card px-6 py-4",
            isArabic && "sm:flex-row-reverse sm:space-x-reverse",
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="h-10 w-full sm:w-auto rounded-xl font-bold border-border"
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 w-full sm:w-auto rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0 rtl:mr-0 rtl:ml-2" />}
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
