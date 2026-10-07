"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";

interface TaskDeleteConfirmDialogProps {
  isOpen: boolean;
  taskTitle: string;
  isArabic: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function TaskDeleteConfirmDialog({
  isOpen,
  taskTitle,
  isArabic,
  onClose,
  onConfirm,
}: TaskDeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="relative flex w-full max-w-sm flex-col rounded-xl border border-destructive/30 bg-card p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive border border-destructive/25">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              {isArabic ? "تأكيد حذف المهمة" : "Confirm Task Deletion"}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isArabic ? "إجراء لا يمكن التراجع عنه" : "This action cannot be undone"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground line-clamp-2">
            "{taskTitle}"
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-destructive/90 font-medium">
            {isArabic
              ? "تنبيه: حذف هذه المهمة سيؤثر على حساب الخطة والأيام الإجمالية والنقاط المتبقية للهدف."
              : "Warning: Deleting this task affects the timeline, total days, and remaining goal points."}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border/70 bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs"
          >
            {isArabic ? "إلغاء وتراجع" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:opacity-90 active:scale-95 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isArabic ? "تأكيد الحذف" : "Delete Task"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
