"use client";

import AnalyzingScreen from "./AnalyzingScreen";
import {
  X,
  Send,
  AlertCircle,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import VoiceRecorder, { useVoiceGlow } from "../shared/VoiceRecorder";
import { VoiceBeam } from "voice-glow";
import type { ScorableTask } from "@/lib/task-hierarchy";
import { formatLocalizedNumber } from "./progress-log-helpers";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIDailyLogScreenProps {
  isMultiGoal: boolean;
  language: Language;
  notification: { type: "error" | "warning"; message: string } | null;
  setNotification: (val: { type: "error" | "warning"; message: string } | null) => void;
  loading: boolean;
  logText: string;
  setLogText: (val: string | ((prev: string) => string)) => void;
  totalScorableTasks: number;
  historyDays: number | null;
  scorableTasks: ScorableTask[];
  loggedTodayTaskIds: Set<string>;
  handleVoiceTranscript: (transcript: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onClose: () => void;
}

export default function AIDailyLogScreen({
  isMultiGoal,
  language,
  notification,
  setNotification,
  loading,
  logText,
  setLogText,
  totalScorableTasks,
  historyDays,
  scorableTasks,
  loggedTodayTaskIds,
  handleVoiceTranscript,
  onSubmit,
  onBack,
  onClose,
}: AIDailyLogScreenProps) {
  const t = translations[language];
  const voiceGlow = useVoiceGlow();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card rounded-t-2xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden border border-border shadow-2xl shadow-black/10 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border/70 flex justify-between items-center shrink-0">
          <div className="flex-1 min-w-0" dir={language === "ar" ? "rtl" : "ltr"}>
            <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
              {language === "ar" ? "تسجيل التقدم اليومي" : "Daily Progress"}
            </h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-1.5 shrink-0">
            {!isMultiGoal && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 touch-manipulation hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 border border-border/45 hover:border-border/70 text-muted-foreground hover:text-foreground cursor-pointer"
                title={language === "ar" ? "تغيير طريقة التسجيل" : "Change mode"}
              >
                <ArrowRight className={cn("w-4 h-4 sm:w-5 sm:h-5", language === "ar" ? "rotate-0" : "rotate-180")} />
              </button>
            )}
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
            className={`mx-4 sm:mx-6 mt-4 p-3 sm:p-3.5 rounded-xl flex items-center gap-3 shrink-0 shadow-sm ${notification.type === "error" ? "bg-destructive/12 border border-destructive/15 text-destructive" : "bg-primary/12 border border-primary/15 text-primary"}`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-semibold flex-1 min-w-0 break-words">{notification.message}</p>
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
          />
        ) : (
          <div className="px-4 sm:px-6 py-4 sm:py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3.5 sm:space-y-4 overflow-y-auto overscroll-contain flex-1">
            {/* Today's Tasks Overview */}
            {scorableTasks.length > 0 && (
              <div className="space-y-1.5" dir={language === "ar" ? "rtl" : "ltr"}>
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-muted-foreground/75 uppercase tracking-wider">
                    {language === "ar" ? "مهام اليوم" : "Today's Tasks"}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground/75">
                    {formatLocalizedNumber(
                      scorableTasks.filter((t) => loggedTodayTaskIds.has(t.id)).length,
                      language,
                    )}{" "}
                    / {formatLocalizedNumber(scorableTasks.length, language)}{" "}
                    {language === "ar" ? "مكتمل" : "completed"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 sm:max-h-28 overflow-y-auto overscroll-contain p-2 rounded-xl bg-muted/20 border border-border/60 scrollbar-thin">
                  {scorableTasks.map((task) => {
                    const isDone = loggedTodayTaskIds.has(task.id);
                    return (
                      <span
                        key={task.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                          isDone
                            ? "bg-foreground/5 border-foreground/15 text-muted-foreground line-through opacity-70"
                            : "bg-card border-border text-foreground shadow-2xs",
                        )}
                        title={task.task_description}
                      >
                        {isDone ? (
                          <Check className="w-3 h-3 text-primary shrink-0 stroke-[2.5]" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]">{task.task_description}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between px-1">
                <Label
                  htmlFor="ai-progress-textarea"
                  className="text-xs sm:text-sm font-bold text-muted-foreground/75 uppercase tracking-wider cursor-pointer"
                >
                  {t.describeWhatYouDid}
                </Label>
                {logText.trim().length > 0 && (
                  <span className="text-[11px] text-muted-foreground/60 tabular-nums font-medium">
                    {logText.trim().split(/\s+/).filter(Boolean).length}{" "}
                    {language === "ar" ? "كلمة" : "words"}
                  </span>
                )}
              </div>
              <div className="relative">
                <VoiceBeam
                  stream={voiceGlow.stream}
                  active={voiceGlow.active}
                  motion={voiceGlow.motion}
                  theme={voiceGlow.theme}
                >
                  <Textarea
                    id="ai-progress-textarea"
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    placeholder={t.progressPlaceholder}
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

            <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-primary/8 rounded-xl flex items-center gap-2.5 text-primary text-xs border border-primary/15 shadow-2xs">
              <Sparkles className="w-4 h-4 shrink-0 opacity-90" />
              <p dir={language === "ar" ? "rtl" : "ltr"} className="font-medium leading-normal flex-1">
                {t.aiJudgeNote}
              </p>
            </div>

            <Button
              onClick={onSubmit}
              disabled={!logText.trim() || loading}
              size="lg"
              className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-md shadow-primary/12 cursor-pointer transition-all duration-200 active:scale-[0.98]"
            >
              <Send className={cn("w-4 h-4 sm:w-5 sm:h-5", language === "ar" && "rtl:-scale-x-100")} /> {t.submitLog}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
