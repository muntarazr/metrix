"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCriteriaDialogProps {
  isOpen: boolean;
  taskTitle: string;
  initialCriteria?: string;
  isArabic: boolean;
  onClose: () => void;
  onSave?: (newCriteria: string) => Promise<void> | void;
  goalTitle?: string;
}

export default function TaskCriteriaDialog({
  isOpen,
  taskTitle,
  initialCriteria = "",
  isArabic,
  onClose,
  onSave,
}: TaskCriteriaDialogProps) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCriteria(initialCriteria);
  }, [initialCriteria, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(criteria);
      } finally {
        setIsSaving(false);
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="relative flex w-full max-w-md flex-col rounded-xl border border-border/70 bg-card p-5 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {isArabic ? "معيار إنجاز المهمة" : "Task Completion Criteria"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Task Title */}
        <p className="mt-3 text-xs font-semibold text-foreground/90 line-clamp-2">
          {taskTitle}
        </p>

        {/* Input */}
        <div className="mt-3">
          <textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder={
              isArabic
                ? "اكتب هنا الشروط المحددة لاعتبار المهمة منجزة بدقة..."
                : "Describe specific conditions for this task to be considered done..."
            }
            rows={3}
            className="w-full rounded-lg border border-border/80 bg-muted/20 p-3 text-xs leading-relaxed focus:bg-background focus:border-primary outline-none transition-colors placeholder:text-muted-foreground/60 shadow-xs"
            autoFocus
          />
        </div>

        {/* Review Note with Plan */}
        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border/60">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
          <span>
            {isArabic
              ? "ملاحظة: مراجعة معيار الإنجاز تضمن توافق الخطوة بدقة مع أهداف الخطة الكلية."
              : "Note: Reviewing completion criteria ensures alignment with overall plan milestones."}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{isArabic ? "حفظ ومراجعة" : "Save Criteria"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
