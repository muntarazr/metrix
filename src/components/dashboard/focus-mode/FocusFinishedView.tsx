"use client";

import { Trophy, RotateCcw } from "lucide-react";

interface FocusFinishedViewProps {
  isArabic: boolean;
  taskDescription: string;
  onClose: () => void;
  onReset: () => void;
}

export function FocusFinishedView({
  isArabic,
  taskDescription,
  onClose,
  onReset,
}: FocusFinishedViewProps) {
  return (
    <div className="my-auto flex flex-col items-center text-center py-2 sm:py-4 px-2 max-w-sm mx-auto w-full animate-in zoom-in-95 fade-in duration-300">
      <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-2 sm:mb-3 border border-primary/25 shadow-sm">
        <Trophy className="h-7 w-7" />
      </div>

      <h3 className="text-lg sm:text-xl font-black text-foreground">
        {isArabic
          ? "🎉 انتهت جلسة التركيز!"
          : "🎉 Focus Session Finished!"}
      </h3>

      <p className="mt-2 text-xs sm:text-sm text-muted-foreground/90 leading-relaxed max-w-xs">
        {isArabic
          ? `أتممت وقت التركيز المحدد على "${taskDescription}". وثّق ما قمت به في المراجعة اليومية ليتم تقييم أدائك وكسب نقاطك.`
          : `Completed full focus time on "${taskDescription}". Log what you achieved in your daily review to get evaluated and earn points.`}
      </p>

      {/* Quick Actions */}
      <div className="mt-3.5 sm:mt-5 flex w-full items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground text-background font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer active:scale-95 hover:opacity-90"
        >
          <span>
            {isArabic ? "إنهاء والعودة" : "Done & Return"}
          </span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 px-3.5 items-center justify-center rounded-xl border border-border/80 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-bold transition-all cursor-pointer active:scale-95"
          title={isArabic ? "جلسة أخرى" : "Restart"}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
