"use client";

import { useState, useEffect } from "react";
import { Plus, X, ListTodo, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskAddModalProps {
  isOpen: boolean;
  type: "main" | "sub";
  parentTitle?: string;
  isArabic: boolean;
  onClose: () => void;
  onAdd: (data: {
    title: string;
    criteria: string;
    frequency: "daily" | "weekly";
    weight: number;
  }) => void;
}

export default function TaskAddModal({
  isOpen,
  type,
  parentTitle,
  isArabic,
  onClose,
  onAdd,
}: TaskAddModalProps) {
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [weight, setWeight] = useState(type === "main" ? 3 : 2);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setCriteria("");
      setFrequency("daily");
      setWeight(type === "main" ? 3 : 2);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      criteria: criteria.trim(),
      frequency,
      weight,
    });
    onClose();
  };

  const maxWeight = type === "main" ? 10 : 5;
  const weights = Array.from({ length: maxWeight }, (_, i) => i + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="relative flex w-full max-w-md flex-col rounded-xl border border-border/70 bg-card p-5 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              {type === "main" ? (
                <ListTodo className="h-4 w-4" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {type === "main"
                  ? isArabic
                    ? "إضافة مسار رئيسي"
                    : "Add Main Track"
                  : isArabic
                    ? "إضافة خطوة فرعية"
                    : "Add Subtask"}
              </h3>
              {parentTitle && (
                <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">
                  {isArabic ? "تابع لـ: " : "Under: "}
                  {parentTitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              {isArabic ? "وصف المهمة *" : "Task Description *"}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "main"
                  ? isArabic
                    ? "مثال: ممارسة البرمجة العملية"
                    : "e.g., Practical coding exercises"
                  : isArabic
                    ? "مثال: حل مسألتين في هياكل البيانات"
                    : "e.g., Solve 2 algorithm questions"
              }
              className="w-full rounded-lg border border-border/80 bg-muted/20 px-3.5 py-2 text-xs sm:text-sm focus:bg-background focus:border-primary outline-none transition-colors shadow-xs"
              autoFocus
            />
          </div>

          {/* Criteria */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {isArabic ? "معيار الإنجاز (اختياري)" : "Completion Criteria (Optional)"}
            </label>
            <input
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder={
                isArabic
                  ? "ما الذي يثبت إتمام هذه المهمة بدقة؟"
                  : "What proves this task is completed?"
              }
              className="w-full rounded-lg border border-border/80 bg-muted/20 px-3.5 py-2 text-xs focus:bg-background focus:border-primary outline-none transition-colors shadow-xs"
            />
          </div>

          {/* Frequency & Weight */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Frequency */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                {isArabic ? "التكرار" : "Frequency"}
              </label>
              <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFrequency("daily")}
                  className={cn(
                    "rounded-md px-3 py-1 transition-all",
                    frequency === "daily"
                      ? "bg-card text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isArabic ? "يومي" : "Daily"}
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency("weekly")}
                  className={cn(
                    "rounded-md px-3 py-1 transition-all",
                    frequency === "weekly"
                      ? "bg-card text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isArabic ? "أسبوعي" : "Weekly"}
                </button>
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                {isArabic ? "الأهمية / الوزن" : "Weight / Impact"}
              </label>
              <div className="scrollbar-thin flex items-center gap-1 overflow-x-auto">
                {weights.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeight(w)}
                    className={cn(
                      "h-7 w-7 shrink-0 rounded-md text-xs font-medium transition-all",
                      weight === w
                        ? "bg-primary text-primary-foreground shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50",
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted active:scale-95 transition-all"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              <span>{isArabic ? "إضافة الآن" : "Add Task"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
