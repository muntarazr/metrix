"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Loader2, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations, type Language } from "@/lib/translations";
import { apiUrl } from "@/lib/api";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  language?: Language;
  className?: string;
  /** Smaller control for textareas, toolbars and dialogs */
  size?: "default" | "sm";
  /** In corner overlays, stack status lines above the button */
  statusAboveButton?: boolean;
  /** Optional variant (kept for backwards compatibility) */
  variant?: "default" | "button" | "toolbar";
  /** Optional hint (unused in minimal icon style) */
  idleHint?: string;
  /** Optional notification when recording status changes */
  onRecordingChange?: (isRecording: boolean) => void;
  /** Optional notification when processing status changes */
  onProcessingChange?: (isProcessing: boolean) => void;
}

export default function VoiceRecorder({
  onTranscript,
  language = "ar",
  className,
  size = "default",
  statusAboveButton = true,
  onRecordingChange,
  onProcessingChange,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = translations[language];

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  useEffect(() => {
    onProcessingChange?.(isProcessing);
  }, [isProcessing, onProcessingChange]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-dismiss errors after 3.5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const copy = translations[language];

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });

          const formData = new FormData();
          formData.append(
            "audio",
            audioBlob,
            `recording.${mimeType.split("/")[1]}`,
          );
          formData.append("language", language);

          const response = await fetch(apiUrl("/api/transcribe"), {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok || data.fallback) {
            console.warn("Transcription failed:", response.status);
            setError(copy.voiceTranscribeFailed);
          } else if (data.text) {
            onTranscript(data.text);
          } else {
            setError(copy.voiceNoSpeechDetected);
          }
        } catch (err: unknown) {
          console.error("Transcription error:", err);
          setError(copy.voiceTranscribeError);
        } finally {
          setIsProcessing(false);
          cleanup();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: unknown) {
      console.error("Recording error:", err);
      setError(translations[language].voiceMicAccessError);
      setIsRecording(false);
    }
  }, [language, onTranscript, cleanup]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isProcessing, isRecording, startRecording, stopRecording]);

  const sizeClasses =
    size === "sm"
      ? "h-9 w-9"
      : "h-10 w-10";

  const iconClasses = size === "sm" ? "size-3.5 sm:size-4" : "size-4";

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {error && (
        <div
          role="alert"
          className={cn(
            "absolute z-20 w-max max-w-[min(15rem,calc(100vw-3rem))] whitespace-normal break-words text-start rounded-md border border-destructive/25 bg-card/95 px-2.5 py-1 text-[11px] leading-snug font-medium text-destructive shadow-xs backdrop-blur-xs",
            statusAboveButton
              ? "bottom-full mb-1.5 end-0"
              : "top-full mt-1.5 end-0",
          )}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={toggleRecording}
        disabled={isProcessing}
        aria-pressed={isRecording}
        title={isRecording ? t.voiceMicStopAria : t.voiceMicStartAria}
        aria-label={isRecording ? t.voiceMicStopAria : t.voiceMicStartAria}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer active:scale-95 select-none touch-manipulation",
          sizeClasses,
          isProcessing
            ? "border-primary/45 bg-primary/12 text-primary cursor-not-allowed"
            : isRecording
              ? "border-destructive/45 bg-destructive/12 text-destructive hover:bg-destructive/20 animate-pulse shadow-xs"
              : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground shadow-2xs hover:border-border",
        )}
      >
        {isProcessing ? (
          <Loader2 className={cn("animate-spin shrink-0", iconClasses)} />
        ) : isRecording ? (
          <StopCircle className={cn("shrink-0", iconClasses)} />
        ) : (
          <Mic className={cn("shrink-0", iconClasses)} />
        )}
      </button>
    </div>
  );
}
