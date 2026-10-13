/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deterministic local evaluation of goal feasibility and realistic timeline.
 */
export function evaluateRealismLocally(params: {
  goalTitle: string;
  aiSummary?: string;
  targetDurationDays: number;
  previousDurationDays?: number;
  initialPlanDays?: number;
  language?: "ar" | "en";
}): {
  is_realistic: boolean;
  severity: "realistic" | "warning" | "impossible";
  warning_message: string;
  recommended_min_days: number;
} {
  const isAr = (params.language || "ar") === "ar";
  const fullGoalText = `${params.goalTitle} ${params.aiSummary || ""}`.toLowerCase();

  // 1. Weight loss pattern check (e.g. "التحول من ال 105 إلى ال 85", "خسارة 20 كجم", "lose 20 kg")
  const weightLossRegex = /(?:خسارة|فقدان|إنقاص|انقاص|تخفيض|تنزيل|نزول|نقص|خساره|lose|loss|dropping)\s*(\d+)\s*(?:كجم|كيلو|كيلوغرام|كغ|kg|kilos|pounds|رطل)/i;
  const weightTransformRegex = /(?:(?:التحول|تغيير|نزول|إنقاص|انقاص|فقدان|خسارة)\s+)?من\s+(?:ال\s*)?(\d+)\s*(?:كجم|كيلو|كيلوغرام|كغ|kg)?\s+(?:إلى|الى|لـ|ل)\s+(?:ال\s*)?(\d+)|from\s+(\d+)\s+to\s+(\d+)/i;

  let kgToLose = 0;
  const matchLoss = fullGoalText.match(weightLossRegex);
  if (matchLoss) {
    kgToLose = Number(matchLoss[1]);
  } else {
    const matchTrans = fullGoalText.match(weightTransformRegex);
    if (matchTrans) {
      const fromVal = Number(matchTrans[1] || matchTrans[3]);
      const toVal = Number(matchTrans[2] || matchTrans[4]);
      if (fromVal > toVal) {
        kgToLose = fromVal - toVal;
      }
    }
  }

  if (kgToLose > 0) {
    // Safe maximum weight loss is ~1 kg per week (7 days)
    const safeMinDays = Math.max(14, Math.round(kgToLose * 7));
    const totalDeficit = kgToLose * 7700;
    const dailyDeficit = Math.round(totalDeficit / Math.max(1, params.targetDurationDays));

    if (params.targetDurationDays < safeMinDays * 0.4) {
      return {
        is_realistic: false,
        severity: "impossible",
        recommended_min_days: safeMinDays,
        warning_message: isAr
          ? `لا يمكنك تحقيق هدف خسارة ${kgToLose} كجم خلال ${params.targetDurationDays} أيام فقط؛ لأن هذا يتطلب عجزاً حرارياً يفوق ${dailyDeficit.toLocaleString()} سعرة حرارية يومياً (إجمالي ${totalDeficit.toLocaleString()} سعرة)، وهو أمر مستحيل بيولوجياً ويشكل خطراً صحياً بالغاً. الحد الأدنى الآمن علمياً هو ${safeMinDays} يوماً (بمعدل 0.5 إلى 1 كجم أسبوعياً).`
          : `You cannot lose ${kgToLose} kg in ${params.targetDurationDays} days; this requires an impossible daily deficit of ${dailyDeficit.toLocaleString()} kcal (${totalDeficit.toLocaleString()} kcal total), which is biologically unachievable and dangerous. The recommended safe minimum is ${safeMinDays} days.`,
      };
    }
    if (params.targetDurationDays < safeMinDays * 0.75) {
      return {
        is_realistic: false,
        severity: "warning",
        recommended_min_days: safeMinDays,
        warning_message: isAr
          ? `المدة المحددة (${params.targetDurationDays} يوماً) مضغوطة جداً وغير واقعية لخسارة ${kgToLose} كجم، وقد تسبب إجهاداً شديداً وفقداناً للكتلة العضلية. يُنصح بمدة لا تقل عن ${safeMinDays} يوماً لضمان استدامة النتائج وصحتك.`
          : `The selected timeline (${params.targetDurationDays} days) is overly aggressive for losing ${kgToLose} kg and may cause muscle loss and burnout. A sustainable timeline is at least ${safeMinDays} days.`,
      };
    }
  }

  // 2. High ratio compression vs initial plan days (e.g. originally 90-120 days, pulled down to <= 14 days)
  const benchmarkInitialDays = params.initialPlanDays || params.previousDurationDays || 90;
  if (benchmarkInitialDays >= 45 && params.targetDurationDays <= 14) {
    const minRecommended = Math.max(30, Math.round(benchmarkInitialDays * 0.5));
    return {
      is_realistic: false,
      severity: "impossible",
      recommended_min_days: minRecommended,
      warning_message: isAr
        ? `لا يمكنك تحقيق هذا الهدف خلال ${params.targetDurationDays} أيام؛ لأن هذا المسار تم تصميمه كرحلة تراكمية (${benchmarkInitialDays} يوماً). ضغطه في ${params.targetDurationDays} أيام فقط غير قابل للتنفيذ عملياً وسيؤدي إلى الإحباط والانقطاع.`
        : `This goal was designed as a ${benchmarkInitialDays}-day journey. Compressing it into ${params.targetDurationDays} days is unfeasible and leads to quick burnout.`,
    };
  }

  return {
    is_realistic: true,
    severity: "realistic",
    warning_message: "",
    recommended_min_days: params.targetDurationDays,
  };
}

/**
 * Deterministic local fallback rebalance algorithm. Ensures that plan rebalance
 * works 100% reliably even when AI is unavailable or quotas are met.
 */
export function rebalancePlanLocally(params: {
  goalTitle: string;
  aiSummary?: string;
  targetDurationDays: number;
  previousDurationDays?: number;
  initialPlanDays?: number;
  difficulty: "easy" | "medium" | "hard" | "expert" | "legendary";
  targetPoints: number;
  tasks: Array<any>;
  language?: "ar" | "en";
}) {
  const isAr = (params.language || "ar") === "ar";
  const tierDailyMinutes: Record<string, number> = {
    easy: 20,
    medium: 35,
    hard: 60,
    expert: 90,
    legendary: 120,
  };
  const tierWeightRange: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
    expert: 4,
    legendary: 5,
  };
  const tierNamesAr: Record<string, string> = {
    easy: "سهل",
    medium: "متوسط",
    hard: "صعب",
    expert: "خبير",
    legendary: "أسطوري",
  };

  const realismCheck = evaluateRealismLocally(params);

  const targetMinutes = tierDailyMinutes[params.difficulty] || 35;
  const baseWeight = tierWeightRange[params.difficulty] || 2;
  const prevDays = params.previousDurationDays || params.targetDurationDays;
  const ratio = prevDays > 0 ? prevDays / params.targetDurationDays : 1;

  const updatedMains = (params.tasks || []).map((main: any, mIdx: number) => {
    const subs = Array.isArray(main.subtasks) ? main.subtasks : [];
    const subCount = Math.max(1, subs.length);
    const allocatedMinutesPerSub = Math.max(5, Math.round(targetMinutes / subCount));

    const updatedSubs = subs.map((sub: any, sIdx: number) => {
      const currentMins = Number(sub.time_required_minutes) || allocatedMinutesPerSub;
      const adjustedMins = Math.max(5, Math.min(180, Math.round(currentMins * (ratio > 1 ? Math.min(1.5, ratio) : Math.max(0.7, ratio)))));
      const finalMins = params.difficulty === "easy" ? Math.min(25, adjustedMins) : Math.max(allocatedMinutesPerSub, adjustedMins);

      let criteria = (sub.completion_criteria || "").trim();
      if (!criteria) {
        criteria = isAr
          ? (ratio >= 1.4 ? `إنجاز مكثف لمتطلبات الخطوة بتركيز لمدة لا تقل عن ${finalMins} دقيقة لمواكبة المدة المضغوطة (${params.targetDurationDays} يوم).` : `إتمام متطلبات الخطوة بتركيز لمدة لا تقل عن ${finalMins} دقيقة.`)
          : (ratio >= 1.4 ? `Intensive execution of subtask requirements with focus for at least ${finalMins} minutes (${params.targetDurationDays}-day pace).` : `Complete subtask requirements with focus for at least ${finalMins} minutes.`);
      } else if (ratio >= 1.4 && !criteria.includes("مكثف") && !criteria.includes("intensive")) {
        criteria = isAr
          ? `${criteria} (إنجاز مكثف لمواكبة المدة المضغوطة ${params.targetDurationDays} يوم)`
          : `${criteria} (intensive pace for ${params.targetDurationDays}-day target)`;
      }

      return {
        id: sub.id || `s_${mIdx + 1}_${sIdx + 1}`,
        task: sub.task || `Subtask ${sIdx + 1}`,
        frequency: sub.frequency === "weekly" ? "weekly" : "daily",
        impact_weight: Math.max(1, Math.min(5, baseWeight + (sIdx % 2))),
        time_required_minutes: finalMins,
        completion_criteria: criteria,
      };
    });

    return {
      id: main.id || `m_${mIdx + 1}`,
      task: main.task || `Main Task ${mIdx + 1}`,
      frequency: main.frequency === "weekly" ? "weekly" : "daily",
      impact_weight: Math.max(2, Math.min(10, baseWeight * 2)),
      completion_criteria: main.completion_criteria || (isAr ? `التحقق من إتمام كافة الخطوات بدقة لضمان التقدم نحو مستهدف ${params.targetPoints} نقطة.` : `Verify completion of all subtasks toward target ${params.targetPoints} points.`),
      subtasks: updatedSubs,
    };
  });

  const diffAr = tierNamesAr[params.difficulty] || params.difficulty;
  const auditSummary = !realismCheck.is_realistic
    ? realismCheck.warning_message
    : isAr
      ? `تمت المراجعة المنطقية وإعادة الموازنة بنجاح: تم ضبط معايير الإنجاز اليومية لتلائم مدة ${params.targetDurationDays} يوماً بمستوى "${diffAr}"، وإعادة معايرة الأوقات المطلوبة (${targetMinutes} دقيقة يومياً) وتوزيع أوزان النقاط لتحقيق مستهدف ${params.targetPoints.toLocaleString()} نقطة بواقعية واستدامة.`
      : `Logical plan audit & rebalance complete: Daily completion criteria updated for ${params.targetDurationDays} days at "${params.difficulty}" tier. Calibrated required daily time (~${targetMinutes} mins/day) and impact weights to realistically achieve ${params.targetPoints.toLocaleString()} points.`;

  return {
    status: "ok" as const,
    audit_summary: auditSummary,
    recommended_daily_time_minutes: targetMinutes,
    realism_check: realismCheck,
    main_tasks: updatedMains,
  };
}
