"use client";

import AnalyzingScreen from "./AnalyzingScreen";
import { X, Trophy, AlertCircle, ArrowRight } from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import VoiceRecorder, { useVoiceGlow } from "../shared/VoiceRecorder";
import { VoiceBeam } from "voice-glow";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MilestoneLogScreenProps {
  goalTitle: string;
  language: Language;
  notification: { type: "error" | "warning"; message: string } | null;
  setNotification: (val: { type: "error" | "warning"; message: string } | null) => void;
  loading: boolean;
  logText: string;
  setLogText: (val: string | ((prev: string) => string)) => void;
  milestoneName: string;
  setMilestoneName: (val: string) => void;
  totalScorableTasks: number;
  historyDays: number | null;
  handleVoiceTranscript: (transcript: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onClose: () => void;
}

export default function MilestoneLogScreen({
  goalTitle,
  language,
  notification,
  setNotification,
  loading,
  logText,
  setLogText,
  milestoneName,
  setMilestoneName,
  totalScorableTasks,
  historyDays,
  handleVoiceTranscript,
  onSubmit,
  onBack,
  onClose,
}: MilestoneLogScreenProps) {
  const t = translations[language];
  const voiceGlow = useVoiceGlow();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card rounded-t-2xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden border border-primary/25 shadow-2xl shadow-primary/12 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border/70 flex justify-between items-center shrink-0 bg-primary/8">
          <div className="flex-1 min-w-0" dir={language === "ar" ? "rtl" : "ltr"}>
            <h3 className="text-base sm:text-lg font-extrabold text-primary flex items-center gap-2 tracking-tight truncate">
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 border border-primary/15">
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              {language === "ar" ? "إنجاز كبير (Milestone)" : "Major Milestone"}
            </h3>
            <p className="text-xs text-muted-foreground/75 font-semibold uppercase tracking-wider mt-0.5 truncate">
              {goalTitle}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 touch-manipulation hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 border border-border/45 hover:border-border/70 text-muted-foreground hover:text-foreground cursor-pointer"
              title={language === "ar" ? "تغيير طريقة التسجيل" : "Change mode"}
            >
              <ArrowRight className={cn("w-4 h-4 sm:w-5 sm:h-5", language === "ar" ? "rotate-0" : "rotate-180")} />
            </button>
            <button
              onClick={onClose}
              className="p-2 touch-manipulation hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 border border-border/45 hover:border-border/70 cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {notification && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-3 sm:p-3.5 rounded-xl flex items-center gap-3 shadow-sm ${notification.type === "error" ? "bg-destructive/12 border border-destructive/15 text-destructive" : "bg-primary/12 border border-primary/15 text-primary"}`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-semibold flex-1">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <AnalyzingScreen
            language={language}
            logText={logText}
            taskCount={totalScorableTasks}
            historyDays={historyDays}
            variant="milestone"
          />
        ) : (
          <div
            className="px-4 sm:px-6 py-4 sm:py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3.5 sm:space-y-4 overflow-y-auto overscroll-contain flex-1"
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            <div className="p-3 sm:p-4 bg-foreground/60/[0.06] border border-foreground/15 rounded-2xl flex gap-2.5 sm:gap-3 text-foreground/75 text-xs sm:text-sm shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/60/10 border border-foreground/15">
                <AlertCircle className="w-4 h-4" />
              </span>
              <p className="font-medium leading-relaxed">
                {language === "ar"
                  ? "تحذير: الإنجازات يجب أن تكون قفزات هائلة مقارنة بالمهام العادية. إذا كان هذا مجرد إنجاز لمهامك المعتادة، سيتم رفضه من قبل الذكاء الاصطناعي ولن تحصل على أي نقاط!"
                  : "WARNING: Milestones must be massive leaps compared to normal tasks. If this is just a regular task, it will be rejected by AI and you will get NO points!"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="milestone-name-input"
                className="text-xs sm:text-sm font-bold text-muted-foreground/75 uppercase tracking-wider px-1 cursor-pointer"
              >
                {language === "ar" ? "اسم الإنجاز" : "Milestone Name"}
              </Label>
              <Input
                id="milestone-name-input"
                type="text"
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
                placeholder={
                  language === "ar"
                    ? "مثال: إطلاق التطبيق، اجتياز الاختبار النهائي..."
                    : "e.g. Launched App, Passed Final Exam..."
                }
                disabled={loading}
                dir={language === "ar" ? "rtl" : "ltr"}
                className="w-full h-11 px-3.5 py-2.5 sm:py-3 rounded-xl border border-border/70 bg-muted/20 text-foreground font-semibold text-base placeholder:text-muted-foreground/50 focus-visible:border-primary/50 focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="milestone-progress-textarea"
                className="text-xs sm:text-sm font-semibold text-muted-foreground/75 uppercase tracking-wider px-1 cursor-pointer"
              >
                {t.describeWhatYouDid}
              </Label>
              <div className="relative">
                <VoiceBeam
                  stream={voiceGlow.stream}
                  active={voiceGlow.active}
                  motion={voiceGlow.motion}
                  theme={voiceGlow.theme}
                >
                  <Textarea
                    id="milestone-progress-textarea"
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    placeholder={
                      language === "ar"
                        ? "اشرح بالتفصيل لماذا يعتبر هذا الإنجاز قفزة استثنائية في هدفك..."
                        : "Explain in detail why this is an exceptional leap in your goal..."
                    }
                    disabled={loading}
                    dir={language === "ar" ? "rtl" : "ltr"}
                    className="w-full h-28 sm:h-36 min-h-[100px] sm:min-h-[110px] p-3.5 sm:p-4 pb-12 sm:pb-14 pe-12 sm:pe-14 rounded-2xl resize-none transition-all duration-200 placeholder:text-muted-foreground/50 bg-muted/20 text-foreground border-border/70 focus-visible:border-primary/50 focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-primary/20 text-base leading-relaxed"
                  />
                </VoiceBeam>
                <div className="absolute bottom-2.5 end-2.5 z-10">
                  <VoiceRecorder
                    onTranscript={handleVoiceTranscript}
                    onStreamChange={voiceGlow.setStream}
                    onRecordingChange={voiceGlow.setIsRecording}
                    onProcessingChange={voiceGlow.setIsProcessing}
                    language={language === "ar" ? "ar" : "en"}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={onSubmit}
              disabled={!logText.trim() || !milestoneName.trim() || loading}
              size="lg"
              className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl font-extrabold text-sm sm:text-base shadow-md shadow-primary/20 active:scale-[0.98] cursor-pointer"
            >
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              {language === "ar" ? "سجل الإنجاز الكبير" : "Log Major Milestone"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
