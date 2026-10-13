"use client";

import { X, Bot, Trophy } from "lucide-react";
import { translations, type Language } from "@/lib/translations";

interface LogModeSelectScreenProps {
  goalTitle: string;
  language: Language;
  onSelectMode: (mode: "ai" | "milestone") => void;
  onClose: () => void;
}

export default function LogModeSelectScreen({
  goalTitle,
  language,
  onSelectMode,
  onClose,
}: LogModeSelectScreenProps) {
  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card rounded-t-2xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden border border-border shadow-2xl shadow-black/10 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border/70 flex justify-between items-center shrink-0">
          <div className="flex-1 min-w-0" dir={language === "ar" ? "rtl" : "ltr"}>
            <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight truncate">
              {t.logProgress}
            </h3>
            <p className="text-xs text-muted-foreground/75 font-semibold mt-0.5 uppercase tracking-wider truncate">
              {goalTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 shrink-0 border border-border/45 hover:border-border/70 text-muted-foreground hover:text-foreground touch-manipulation"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div
          className="px-4 sm:px-6 py-4 sm:py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3 overflow-y-auto overscroll-contain flex-1"
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          <p className="text-xs sm:text-sm text-muted-foreground/75 font-semibold mb-3 sm:mb-4">
            {t.logProgressMode}
          </p>

          <button
            onClick={() => onSelectMode("ai")}
            className="w-full p-3.5 sm:p-5 bg-primary/[0.08] border border-primary/20 rounded-xl hover:bg-primary/[0.12] hover:border-primary/30 transition-all duration-200 active:scale-[0.98] group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-primary/12 rounded-lg flex items-center justify-center shrink-0 border border-primary/20 group-hover:border-primary/30 transition-colors">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-start">
                <h4 className="font-semibold text-foreground text-base mb-1">
                  {t.aiMode}
                </h4>
                <p className="text-sm text-muted-foreground/75 leading-relaxed">
                  {t.aiModeDesc}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectMode("milestone")}
            className="w-full p-3.5 sm:p-5 bg-primary/[0.08] border border-primary/20 rounded-xl hover:bg-primary/[0.12] hover:border-primary/30 transition-all duration-200 active:scale-[0.98] group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-primary/12 rounded-lg flex items-center justify-center shrink-0 border border-primary/20 group-hover:border-primary/30 transition-colors">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-start">
                <h4 className="font-bold text-foreground text-base mb-1">
                  {language === "ar"
                    ? "إنجاز كبير (Milestone)"
                    : "Major Milestone"}
                </h4>
                <p className="text-sm text-muted-foreground/75 leading-relaxed">
                  {language === "ar"
                    ? "سجل إنجازاً استثنائياً كبيراً لتحصل على مكافأة ضخمة"
                    : "Log an exceptional achievement for massive points"}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
