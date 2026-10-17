"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiUrl } from "@/lib/api";
import { getLocalDateKey } from "@/lib/task-periods";
import {
  normalizeDailyFocusEntryRow,
  normalizeDailyFocusResult,
  buildDailyFocusSessionFromRow,
  type DailyFocusEntryRow,
  type DailyFocusSession,
  type DailyFocusGoalContext,
} from "@/lib/daily-focus";
import type { Goal } from "@/components/home/HomeTypes";
import type { Language } from "@/lib/translations";

interface UseHomeDailyFocusOptions {
  goals: Goal[];
  supabase: SupabaseClient;
  language?: Language;
}

export function useHomeDailyFocus({
  goals,
  supabase,
  language = "ar",
}: UseHomeDailyFocusOptions) {
  const isArabic = language === "ar";
  const todayDateKey = useMemo(() => getLocalDateKey(), []);

  // Determine active goal: first pinned goal or first goal
  const defaultGoal = useMemo(() => {
    return goals.find((g) => g.is_pinned) || goals[0] || null;
  }, [goals]);

  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (defaultGoal && (!activeGoalId || !goals.some((g) => g.id === activeGoalId))) {
      setActiveGoalId(defaultGoal.id);
    }
  }, [defaultGoal, activeGoalId, goals]);

  const activeGoal = useMemo(() => {
    return goals.find((g) => g.id === activeGoalId) || defaultGoal;
  }, [goals, activeGoalId, defaultGoal]);

  const [dailyFocusRows, setDailyFocusRows] = useState<DailyFocusEntryRow[]>([]);
  const [dailyFocus, setDailyFocus] = useState<DailyFocusSession | null>(null);
  const [dailyFocusAnswer, setDailyFocusAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeGoalRef = useRef(activeGoal);
  useEffect(() => {
    activeGoalRef.current = activeGoal;
  }, [activeGoal]);

  const dailyFocusGoal = useMemo<DailyFocusGoalContext | null>(() => {
    if (!activeGoal) return null;
    return {
      id: activeGoal.id,
      title: activeGoal.title,
      ai_summary: activeGoal.ai_summary || "",
      created_at: activeGoal.created_at,
      current_points: activeGoal.current_points,
      target_points: activeGoal.target_points,
    };
  }, [activeGoal]);

  // Fetch rows for the active goal
  const fetchGoalFocus = useCallback(async (goalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("daily_focus_answers")
        .select("id, goal_id, user_id, prompt_date, angle_label, question, question_why, answer, answer_coaching, suggestions, created_at, updated_at, answered_at")
        .eq("goal_id", goalId)
        .order("prompt_date", { ascending: false })
        .limit(10);

      if (fetchErr) {
        console.error("Error fetching daily focus rows:", fetchErr);
        setDailyFocus(null);
        setDailyFocusAnswer("");
        return;
      }

      const rows = (data || [])
        .map((r) => normalizeDailyFocusEntryRow(r))
        .filter((r): r is DailyFocusEntryRow => Boolean(r));

      setDailyFocusRows(rows);

      const todayRow = rows.find((r) => r.prompt_date === todayDateKey);
      if (todayRow) {
        const session = buildDailyFocusSessionFromRow(todayRow);
        setDailyFocus(session);
        setDailyFocusAnswer(session.answer || "");
      } else {
        setDailyFocus(null);
        setDailyFocusAnswer("");
      }
    } catch (err) {
      console.error("fetchGoalFocus failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, todayDateKey]);

  useEffect(() => {
    if (activeGoal?.id) {
      fetchGoalFocus(activeGoal.id);
    } else {
      setDailyFocus(null);
      setDailyFocusRows([]);
      setDailyFocusAnswer("");
    }
  }, [activeGoal?.id, fetchGoalFocus]);

  // Generate question if not present today
  const generateFocusQuestion = useCallback(async () => {
    if (!dailyFocusGoal || loading || submitting) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch tasks & logs for context
      const [tasksRes, logsRes] = await Promise.all([
        supabase
          .from("sub_layers")
          .select("id, goal_id, parent_task_id, task_description, frequency, time_required_minutes, impact_weight, sort_order, schedule_days, completion_criteria")
          .eq("goal_id", dailyFocusGoal.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("daily_logs")
          .select("id, goal_id, created_at, user_input, ai_score, ai_feedback")
          .eq("goal_id", dailyFocusGoal.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const tasks = tasksRes.data || [];
      const logs = logsRes.data || [];

      const history = dailyFocusRows.map((r) => ({
        prompt_date: r.prompt_date,
        question: r.question,
        answer: r.answer || "",
        answer_coaching: r.answer_coaching,
        answered_at: r.answered_at,
      }));

      const res = await fetch(apiUrl("/api/goal/daily-focus"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: dailyFocusGoal,
          tasks,
          logs,
          history,
          date: todayDateKey,
          language,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error === "quota_exceeded"
            ? isArabic ? data?.message_ar : data?.message_en
            : isArabic ? "تعذر توليد سؤال اليوم حالياً." : "Could not generate today's question."
        );
      }

      const normalized = normalizeDailyFocusResult(data, todayDateKey);
      if (!normalized || normalized.status === "refused") {
        throw new Error(
          normalized?.safe_redirection?.message ||
          (isArabic ? "تعذر إنشاء سؤال مناسب لليوم." : "Could not generate question for today.")
        );
      }

      // Upsert into daily_focus_answers
      const suggestionsPayload = {
        items: normalized.suggestions || [],
        quick_options: normalized.quick_options || [],
        applied_ids: [],
        rejected_ids: [],
      };

      const { data: savedData, error: upsertErr } = await supabase
        .from("daily_focus_answers")
        .upsert(
          {
            goal_id: dailyFocusGoal.id,
            prompt_date: todayDateKey,
            angle_label: normalized.angle_label,
            question: normalized.question,
            question_why: normalized.question_why,
            answer: null,
            answer_coaching: normalized.answer_coaching || null,
            suggestions: suggestionsPayload,
            answered_at: null,
          },
          { onConflict: "goal_id,prompt_date" }
        )
        .select()
        .single();

      if (upsertErr) throw upsertErr;

      const savedRow = normalizeDailyFocusEntryRow(savedData);
      if (savedRow) {
        const session = buildDailyFocusSessionFromRow(savedRow);
        setDailyFocus(session);
        setDailyFocusAnswer("");
        setDailyFocusRows((prev) => [savedRow, ...prev.filter((r) => r.prompt_date !== todayDateKey)]);
      }
    } catch (err: any) {
      console.error("Failed to generate focus question:", err);
      setError(err?.message || (isArabic ? "حدث خطأ أثناء تحميل سؤال اليوم." : "Error loading question."));
    } finally {
      setLoading(false);
    }
  }, [dailyFocusGoal, loading, submitting, supabase, dailyFocusRows, todayDateKey, language, isArabic]);

  // Automatically generate question if goal exists and no session for today
  useEffect(() => {
    if (activeGoal?.id && !loading && !dailyFocus && dailyFocusRows.length >= 0) {
      const todayRow = dailyFocusRows.find((r) => r.prompt_date === todayDateKey);
      if (!todayRow && !error) {
        generateFocusQuestion();
      }
    }
  }, [activeGoal?.id, dailyFocus, dailyFocusRows, todayDateKey, loading, error, generateFocusQuestion]);

  // Handle answer submit
  const handleAnswerSubmit = useCallback(async () => {
    if (!dailyFocusGoal || !dailyFocus || !dailyFocusAnswer.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const submittedAnswer = dailyFocusAnswer.trim();

      // Call API to evaluate / coach the answer
      const res = await fetch(apiUrl("/api/goal/daily-focus"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: dailyFocusGoal,
          tasks: [],
          logs: [],
          history: [],
          answer: submittedAnswer,
          existingQuestion: dailyFocus.question,
          date: todayDateKey,
          language,
        }),
      });

      const data = await res.json().catch(() => null);
      const normalized = res.ok ? normalizeDailyFocusResult(data, todayDateKey) : null;
      const answerCoaching = normalized?.answer_coaching || dailyFocus.answer_coaching || null;

      const answeredAt = new Date().toISOString();

      let existingSuggestions: any = { items: [], quick_options: dailyFocus.quick_options || [], applied_ids: [], rejected_ids: [] };
      if (dailyFocus.suggestions) {
        existingSuggestions.items = dailyFocus.suggestions;
      }

      const { data: savedData, error: upsertErr } = await supabase
        .from("daily_focus_answers")
        .upsert(
          {
            goal_id: dailyFocusGoal.id,
            prompt_date: todayDateKey,
            angle_label: dailyFocus.angle_label || "",
            question: dailyFocus.question,
            question_why: dailyFocus.question_why || "",
            answer: submittedAnswer,
            answer_coaching: answerCoaching,
            suggestions: existingSuggestions,
            answered_at: answeredAt,
          },
          { onConflict: "goal_id,prompt_date" }
        )
        .select()
        .single();

      if (upsertErr) throw upsertErr;

      const savedRow = normalizeDailyFocusEntryRow(savedData);
      if (savedRow) {
        const session = buildDailyFocusSessionFromRow(savedRow);
        setDailyFocus(session);
        setDailyFocusRows((prev) => [savedRow, ...prev.filter((r) => r.prompt_date !== todayDateKey)]);
      }
    } catch (err: any) {
      console.error("Failed to submit daily focus answer:", err);
      setError(err?.message || (isArabic ? "تعذر حفظ إجابتك، يرجى المحاولة مرة أخرى." : "Failed to save answer."));
    } finally {
      setSubmitting(false);
    }
  }, [dailyFocusGoal, dailyFocus, dailyFocusAnswer, submitting, todayDateKey, language, supabase, isArabic]);

  const handleAppendTranscript = useCallback((text: string) => {
    setDailyFocusAnswer((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()));
  }, []);

  return {
    activeGoal,
    activeGoalId: activeGoal?.id || null,
    setActiveGoalId,
    dailyFocus,
    dailyFocusAnswer,
    setDailyFocusAnswer,
    loading,
    submitting,
    error,
    generateFocusQuestion,
    handleAnswerSubmit,
    handleAppendTranscript,
  };
}
