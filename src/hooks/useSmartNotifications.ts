"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { getLocalDateKey } from "@/lib/task-periods";
import { getFreezableDate } from "@/lib/streak";

export type NotificationType =
  | "streak_rescue"
  | "comeback_welcome"
  | "consistency_boost"
  | "habit_nudge"
  | "challenge_alert"
  | "daily_focus"
  | "milestone_celebration"
  | "deadline_alert"
  | "record_streak"
  | "weekly_review"
  | "streak_freeze"
  | "dormant_goal";

export type HabitState = "consistent" | "intermittent" | "comeback" | "at_risk" | "idle";

export interface SmartNotification {
  id: string;
  type: NotificationType;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  goalId?: string;
  goalTitle?: string;
  timestamp: string;
  actionLabel?: string;
}

export interface AICoachInsight {
  habitState: HabitState;
  quote: string;
  authorOrTag: string;
  subtitle: string;
  tone: "celebratory" | "encouraging" | "urgent" | "reflective";
}

interface GoalInput {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  status: string;
  created_at: string;
  estimated_completion_date?: string | null;
  icon?: string;
  is_pinned?: boolean;
  streak_freezes?: string[] | null;
}

interface UseSmartNotificationsOptions {
  goals: GoalInput[];
  language?: "ar" | "en";
}

/* ------------------------------------------------------------------ */
/*  Behavioral Quotes & Insights Repository (Psychology-informed)      */
/* ------------------------------------------------------------------ */

const COACH_QUOTES = {
  consistent: {
    ar: [
      { quote: "الزخم يصنع المعجزات؛ ما تكرره يومياً يتحول إلى هويتك وقوتك.", tag: "قوة الاستمرارية" },
      { quote: "النجاح ليس قفزة عملاقة مفاجئة، بل خطوات متواضعة لا تتراجع.", tag: "انضباط" },
      { quote: "أنت تبني مساراً عصبياً جديداً لكل عادة تثبت عليها اليوم.", tag: "علم العادات" },
      { quote: "التزامك الهادئ اليوم هو ما يصنع النتائج المدوية غداً.", tag: "تركيز" },
    ],
    en: [
      { quote: "Momentum creates miracles; what you repeat daily becomes your identity.", tag: "Momentum" },
      { quote: "Success is not a giant leap, but steady, unstoppable footsteps.", tag: "Discipline" },
      { quote: "You are wiring new neural pathways for every habit you reinforce today.", tag: "Habit Science" },
      { quote: "Your quiet dedication today creates the visible breakthroughs tomorrow.", tag: "Focus" },
    ],
  },
  intermittent: {
    ar: [
      { quote: "لا تنتظر المزاج المثالي؛ دقيقة واحدة من الفعل كافية لهزيمة التردد.", tag: "كسر التردد" },
      { quote: "الاستمرارية أهم من الكمية. خطوة صغيرة جداً اليوم تبقيك في اللعبة.", tag: "الخطوة الأولى" },
      { quote: "إذا كان الهدف يبدو ثقيلاً، قلل حجمه حتى يصبح إنجازه سهلاً وبديهياً.", tag: "تبسيط" },
      { quote: "التسجيل المتقطع بداية جيدة، وتثبيت التوقيت هو ما يحوله لعادة راسخة.", tag: "نصيحة ذكية" },
    ],
    en: [
      { quote: "Do not wait for the perfect mood; one minute of action dissolves hesitation.", tag: "Overcome Resistance" },
      { quote: "Consistency beats intensity. One small action today keeps you in the arena.", tag: "Micro-steps" },
      { quote: "When a goal feels heavy, shrink it until taking action is effortless.", tag: "Simplicity" },
      { quote: "Irregular progress is still progress. Anchoring the time will make it permanent.", tag: "Smart Tip" },
    ],
  },
  comeback: {
    ar: [
      { quote: "أهلاً بعودتك! لا تنظر لأيام الغياب؛ اليوم صفحة جديدة تُكتب بإرادتك.", tag: "بداية جديدة" },
      { quote: "السقوط ليس نهاية الطريق، بل الوقوف مجدداً هو جوهر النجاح.", tag: "إعادة الانطلاق" },
      { quote: "لا تعاقب نفسك، فقط أنجز مهمة واحدة صغيرة الآن واستعد زخمك.", tag: "بلا لوم" },
    ],
    en: [
      { quote: "Welcome back! Forget the days missed; today is a clean canvas waiting for you.", tag: "Fresh Start" },
      { quote: "A break is not failure. Getting back up is the very essence of growth.", tag: "Resilience" },
      { quote: "No self-criticism needed. Check off one micro-task now and reignite your fire.", tag: "No Guilt" },
    ],
  },
  at_risk: {
    ar: [
      { quote: "الوقت يمضي وسلسلتك في انتظارك؛ دقيقة تسجيل واحدة تحمي تعب الأيام الماضية.", tag: "حماية السلسلة" },
      { quote: "لا تدع يومك ينتهي دون أثر؛ سجل نشاطك الآن قبل فوات الأوان.", tag: "تنبيه طوارئ" },
    ],
    en: [
      { quote: "Time is ticking and your streak is on the line. A 60-second log saves days of work.", tag: "Streak Shield" },
      { quote: "Do not let today close without your mark. Log your effort before midnight.", tag: "Priority" },
    ],
  },
  idle: {
    ar: [
      { quote: "الرحلة تبدأ بخطوة، وأعظم الأهداف تحققت بقرار البدء اليوم.", tag: "ابدأ الآن" },
    ],
    en: [
      { quote: "Every long journey starts with a simple step. Today is your day to start.", tag: "Start Now" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Helper: Select deterministic quote based on day of month          */
/* ------------------------------------------------------------------ */

function pickQuote(state: HabitState, lang: "ar" | "en", daySeed: number) {
  const pool = COACH_QUOTES[state]?.[lang] || COACH_QUOTES.consistent[lang];
  const index = Math.abs(daySeed) % pool.length;
  return pool[index];
}

let cachedNotifications: SmartNotification[] | null = null;
let cachedCoachInsight: AICoachInsight | null = null;
let cachedGoalsSignature = "";

/* ------------------------------------------------------------------ */
/*  Main Hook                                                         */
/* ------------------------------------------------------------------ */

export function useSmartNotifications({
  goals,
  language = "ar",
}: UseSmartNotificationsOptions) {
  const [notifications, setNotifications] = useState<SmartNotification[]>(
    () => cachedNotifications ?? []
  );
  const [coachInsight, setCoachInsight] = useState<AICoachInsight | null>(
    () => cachedCoachInsight
  );
  const [loading, setLoading] = useState(() => !cachedCoachInsight);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const supabase = useMemo(() => createClient(), []);
  const isArabic = language === "ar";

  // Load read status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("metrix_read_notifications");
      if (saved) {
        setReadNotificationIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadNotificationIds(allIds);
    try {
      localStorage.setItem("metrix_read_notifications", JSON.stringify(Array.from(allIds)));
    } catch {
      // ignore
    }
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem("metrix_read_notifications", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const evaluateBehaviorAndGenerate = useCallback(async () => {
    if (!goals || goals.length === 0) {
      setNotifications([]);
      setCoachInsight({
        habitState: "idle",
        quote: isArabic ? "أضف هدفك الأول لتبدأ رحلة البناء والذكاء." : "Create your first goal to begin your growth journey.",
        authorOrTag: isArabic ? "انطلاقة" : "Kickoff",
        subtitle: isArabic ? "لا توجد أهداف نشطة حالياً" : "No active goals yet",
        tone: "reflective",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    const todayKey = getLocalDateKey();
    const now = new Date();
    const currentHour = now.getHours();
    const daySeed = now.getDate() + now.getMonth() * 31;

    try {
      const goalIds = goals.map((g) => g.id);

      // 1. Fetch recent activity logs across all goals (last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: recentLogs } = await supabase
        .from("daily_logs")
        .select("id, goal_id, created_at, ai_score")
        .in("goal_id", goalIds)
        .gte("created_at", fourteenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      // 2. Fetch today's checkins across goals
      const { data: todayCheckins } = await supabase
        .from("task_checkins")
        .select("id, goal_id, completed, period_start")
        .in("goal_id", goalIds)
        .eq("period_start", todayKey)
        .eq("completed", true);

      // Check if user logged anything today
      const hasLoggedToday =
        (todayCheckins && todayCheckins.length > 0) ||
        (recentLogs &&
          recentLogs.some(
            (log) =>
              new Date(log.created_at).toLocaleDateString("en-CA") === todayKey,
          ));

      // Calculate active days in last 7 days
      const uniqueDaysLast7 = new Set<string>();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      (recentLogs || []).forEach((log) => {
        const logDate = new Date(log.created_at);
        if (logDate >= sevenDaysAgo) {
          uniqueDaysLast7.add(logDate.toLocaleDateString("en-CA"));
        }
      });

      const daysLoggedCount = uniqueDaysLast7.size;

      // Determine days since last log
      let daysSinceLastLog = 0;
      if (recentLogs && recentLogs.length > 0) {
        const latestLogDate = new Date(recentLogs[0].created_at);
        const diffTime = Math.abs(now.getTime() - latestLogDate.getTime());
        daysSinceLastLog = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else {
        daysSinceLastLog = 10; // No recent logs
      }

      // 3. Classify Habit State
      let habitState: HabitState = "consistent";
      let tone: AICoachInsight["tone"] = "encouraging";

      if (!hasLoggedToday && currentHour >= 18) {
        // Evening and nothing logged yet
        habitState = "at_risk";
        tone = "urgent";
      } else if (daysSinceLastLog >= 4) {
        habitState = "comeback";
        tone = "encouraging";
      } else if (daysLoggedCount >= 4 || (hasLoggedToday && daysLoggedCount >= 3)) {
        habitState = "consistent";
        tone = "celebratory";
      } else {
        habitState = "intermittent";
        tone = "encouraging";
      }

      // Generate AI Coach Insight
      const picked = pickQuote(habitState, language, daySeed);
      let subtitle = "";
      if (habitState === "at_risk") {
        subtitle = isArabic
          ? "لم تسجل أي تقدم اليوم بعد، احمِ تقدمك قبل نهاية اليوم"
          : "No progress logged yet today. Protect your streak before midnight";
      } else if (habitState === "consistent") {
        subtitle = isArabic
          ? `زخم ممتاز! سجلت ${daysLoggedCount} أيام هذا الأسبوع`
          : `Great momentum! Logged ${daysLoggedCount} days this week`;
      } else if (habitState === "comeback") {
        subtitle = isArabic
          ? "أهلاً بك مجدداً، استئناف العادة يبدأ بدقيقة واحدة"
          : "Welcome back, restarting a habit starts with just 1 minute";
      } else {
        subtitle = isArabic
          ? "الاستمرارية تبنى يوماً بعد يوم، خطوة اليوم تصنع الفارق"
          : "Consistency builds day by day, today's step makes the difference";
      }

      setCoachInsight({
        habitState,
        quote: picked.quote,
        authorOrTag: picked.tag,
        subtitle,
        tone,
      });

      // 4. Generate Filtered Smart Notifications (Strict Throttling: Max 2-3 actionable items)
      const generatedNotifs: SmartNotification[] = [];

      // A. Emergency Streak Alert
      if (habitState === "at_risk") {
        const primary = goals[0];
        generatedNotifs.push({
          id: `streak-risk-${todayKey}`,
          type: "streak_rescue",
          priority: "high",
          title: isArabic ? "سلسلتك في خطر!" : "Streak at risk!",
          message: isArabic
            ? `باقي بضع ساعات وسلسلة هدفك (${primary.title}) تتوقف. سجل خطوة سريعة الآن.`
            : `Only a few hours left before your streak on (${primary.title}) resets. Log a quick checkin now.`,
          goalId: primary.id,
          goalTitle: primary.title,
          timestamp: now.toISOString(),
          actionLabel: isArabic ? "تسجيل سريع" : "Quick Log",
        });
      }

      // B. Welcome back alert if returned after long absence
      if (habitState === "comeback" && !hasLoggedToday) {
        generatedNotifs.push({
          id: `comeback-${todayKey}`,
          type: "comeback_welcome",
          priority: "high",
          title: isArabic ? "مرحباً بعودتك!" : "Welcome Back!",
          message: isArabic
            ? "العودة بعد التوقف هي أهم مهارة في بناء العادات. لا تفوت تسجيل اليوم."
            : "Returning after a break is the ultimate superpower. Do not miss logging today.",
          timestamp: now.toISOString(),
          actionLabel: isArabic ? "ابدأ اليوم" : "Start Today",
        });
      }

      // C. Check milestones for goals (e.g. >50% or >75%)
      for (const g of goals) {
        if (g.target_points > 0) {
          const ratio = (g.current_points / g.target_points) * 100;
          if (ratio >= 50 && ratio < 60) {
            generatedNotifs.push({
              id: `milestone-50-${g.id}`,
              type: "milestone_celebration",
              priority: "medium",
              title: isArabic ? "إنجاز 50%!" : "50% Milestone!",
              message: isArabic
                ? `لقد قطعت نصف الطريق في هدفك "${g.title}". حافظ على هذا الإيقاع!`
                : `You are halfway through your goal "${g.title}". Keep up the pace!`,
              goalId: g.id,
              goalTitle: g.title,
              timestamp: now.toISOString(),
            });
            break; // Keep only one milestone to avoid clutter
          }
        }
      }

      // D. Consistency Boost (Positive feedback if doing great)
      if (habitState === "consistent" && hasLoggedToday) {
        generatedNotifs.push({
          id: `consistency-${todayKey}`,
          type: "consistency_boost",
          priority: "low",
          title: isArabic ? "أداء منضبط" : "Solid Discipline",
          message: isArabic
            ? "أحسنت! أكملت نشاطك لليوم واستمرارك يعزز بناء شخصيتك الجديدة."
            : "Great job! You logged your progress today and strengthened your new habits.",
          timestamp: now.toISOString(),
        });
      }

      // 1. Deadline Alert (Approaching goal target completion date)
      for (const g of goals) {
        if (g.estimated_completion_date) {
          const endDate = new Date(g.estimated_completion_date);
          endDate.setHours(0, 0, 0, 0);
          const todayDate = new Date(now);
          todayDate.setHours(0, 0, 0, 0);
          const daysLeft = Math.round((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          const ratio = g.target_points > 0 ? (g.current_points / g.target_points) * 100 : 0;

          if (daysLeft >= 0 && daysLeft <= 7 && ratio < 90) {
            generatedNotifs.push({
              id: `deadline-${g.id}-${todayKey}`,
              type: "deadline_alert",
              priority: daysLeft <= 3 ? "high" : "medium",
              title: isArabic
                ? (daysLeft === 0 ? "اليوم الأخير للهدف! ⏳" : `باقي ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} على الموعد النهائي! ⏳`)
                : (daysLeft === 0 ? "Final day for goal! ⏳" : `${daysLeft} days left before deadline! ⏳`),
              message: isArabic
                ? `موعد انتهاء هدفك "${g.title}" اقترب وأنجزت ${Math.round(ratio)}%. كثّف نشاطك للوصول للهدف في الوقت المحدد!`
                : `Target deadline for "${g.title}" is approaching (${Math.round(ratio)}% done). Step up to finish on time!`,
              goalId: g.id,
              goalTitle: g.title,
              timestamp: now.toISOString(),
              actionLabel: isArabic ? "تسجيل سريع" : "Quick Log",
            });
            break;
          }
        }
      }

      // 2. Personal Streak Record / Full Week Streak
      if (daysLoggedCount >= 7) {
        generatedNotifs.push({
          id: `record-streak-${todayKey}`,
          type: "record_streak",
          priority: "medium",
          title: isArabic ? "أداء قياسي استثنائي! 🏆" : "Personal Record! 🏆",
          message: isArabic
            ? `سجلت نشاطاً في جميع أيام هذا الأسبوع الـ 7! هذا الزخم يضعك في نخبة الـ 5% الأكثر التزاماً.`
            : `You logged on all 7 days this week! Your unstoppable consistency puts you in the top 5%.`,
          timestamp: now.toISOString(),
        });
      }

      // 3. Weekly Review Summary (Weekends: Sunday & Saturday)
      const dayOfWeek = now.getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && daysLoggedCount > 0) {
        generatedNotifs.push({
          id: `weekly-review-${todayKey}`,
          type: "weekly_review",
          priority: "low",
          title: isArabic ? "ملخص أسبوعك 📊" : "Weekly Summary 📊",
          message: isArabic
            ? `أنهيت أسبوعك بـ ${daysLoggedCount} أيام تسجيل نشطة. راجع لوحة تحكم أهدافك لمشاهدة منحنى نموك.`
            : `You wrapped up the week with ${daysLoggedCount} active log days. Check your dashboard to view your growth curve.`,
          timestamp: now.toISOString(),
        });
      }

      // 4. Streak Freeze Alert (If missed yesterday but can be saved with freeze)
      for (const g of goals) {
        const goalLogs = (recentLogs || []).filter((l) => l.goal_id === g.id);
        const loggedDates = new Set(goalLogs.map((l) => new Date(l.created_at).toLocaleDateString("en-CA")));
        const freezable = getFreezableDate(loggedDates, (g.streak_freezes || []) as string[]);
        if (freezable) {
          generatedNotifs.push({
            id: `freeze-opportunity-${g.id}-${todayKey}`,
            type: "streak_freeze",
            priority: "high",
            title: isArabic ? "فرصة حماية السلسلة ❄️" : "Streak Freeze Available ❄️",
            message: isArabic
              ? `فاتك تسجيل يوم الأمس في "${g.title}". يمكنك استخدام يوم التجميد لحماية تعبك وسلسلتك من الصفر!`
              : `You missed logging yesterday on "${g.title}". You can activate a freeze to protect your hard-earned streak!`,
            goalId: g.id,
            goalTitle: g.title,
            timestamp: now.toISOString(),
            actionLabel: isArabic ? "حماية السلسلة" : "Protect Streak",
          });
          break;
        }
      }

      // 5. Dormant Goal Revival (Inactive for >= 6 days while other goals are active)
      if (goals.length > 1 && daysLoggedCount >= 2) {
        for (const g of goals) {
          const goalLogs = (recentLogs || []).filter((l) => l.goal_id === g.id);
          if (goalLogs.length === 0) {
            generatedNotifs.push({
              id: `dormant-${g.id}-${todayKey}`,
              type: "dormant_goal",
              priority: "low",
              title: isArabic ? "هدف في انتظارك 💤" : "Goal Waiting for You 💤",
              message: isArabic
                ? `هدف "${g.title}" لم تسجل فيه منذ أكثر من أسبوع. حتى خطوة صغيرة بدقيقة واحدة كافية لإعادة إحيائه!`
                : `No activity on "${g.title}" for over a week. Even a 60-second micro-step will bring it back to life!`,
              goalId: g.id,
              goalTitle: g.title,
              timestamp: now.toISOString(),
              actionLabel: isArabic ? "تسجيل سريع" : "Quick Log",
            });
            break;
          }
        }
      }

      cachedNotifications = generatedNotifs;
      cachedCoachInsight = {
        habitState,
        quote: picked.quote,
        authorOrTag: picked.tag,
        subtitle,
        tone,
      };

      setNotifications(generatedNotifs);
    } catch (err) {
      console.error("Failed to generate smart notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [goals, language, isArabic, supabase]);

  useEffect(() => {
    evaluateBehaviorAndGenerate();
  }, [evaluateBehaviorAndGenerate]);

  // Filter unread notifications
  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !readNotificationIds.has(n.id));
  }, [notifications, readNotificationIds]);

  const highPriorityCount = useMemo(() => {
    return unreadNotifications.filter((n) => n.priority === "high").length;
  }, [unreadNotifications]);

  return {
    notifications,
    unreadNotifications,
    highPriorityCount,
    coachInsight,
    loading,
    refresh: evaluateBehaviorAndGenerate,
    markAllAsRead,
    markAsRead,
    isRead: (id: string) => readNotificationIds.has(id),
  };
}
