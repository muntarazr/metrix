import type { FullGoalExportData, GoalExportAnalytics } from './types.ts';
import { computeGoalExportAnalytics } from './analytics.ts';

export const WEEKDAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const WEEKDAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Generates an exhaustive, high-fidelity Markdown dossier covering the goal from start to finish.
 */
export function generateGoalMarkdownDossier(
    data: FullGoalExportData,
    isArabic: boolean = true
): string {
    const { goal, tasks, checkins, dailyLogs, dailyFocusAnswers, weeklyReviews, reminders, challenges } = data;
    const analytics = computeGoalExportAnalytics(data);

    const exportDateStr = new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const formatPaceLabel = (pace: GoalExportAnalytics['timeline']['paceStatus']) => {
        if (isArabic) {
            switch (pace) {
                case 'completed': return '🏆 تم إنجاز الهدف بنجاح!';
                case 'ahead': return '⚡ متقدم على الجدول الزمني (أداء استثنائي)';
                case 'on_track': return '🎯 على المسار الصحيح تماماً';
                case 'behind': return '⚠️ متأخر قليلاً عن المعدل المطلوب';
                case 'stalled': return '🛑 متوقف أو يحتاج لإعادة إشعال الحافز';
            }
        } else {
            switch (pace) {
                case 'completed': return '🏆 Goal successfully completed!';
                case 'ahead': return '⚡ Ahead of schedule (exceptional pace)';
                case 'on_track': return '🎯 Perfectly on track';
                case 'behind': return '⚠️ Slightly behind required pace';
                case 'stalled': return '🛑 Stalled / needs reactivation';
            }
        }
    };

    const formatDomainLabel = (domain?: string | null) => {
        if (!domain) return isArabic ? 'عام' : 'General';
        if (isArabic) {
            switch (domain) {
                case 'skills': return 'تعلّم ومهارات';
                case 'health': return 'صحة ولياقة';
                case 'career': return 'عمل ومشاريع';
                case 'habits': return 'عادات ونمط حياة';
                default: return domain;
            }
        }
        return domain;
    };

    const formatWeekdays = (days?: number[] | null) => {
        if (!days || days.length === 0) return isArabic ? 'يومياً بدون انقطاع' : 'Every day';
        const names = isArabic ? WEEKDAY_NAMES_AR : WEEKDAY_NAMES_EN;
        return days.map(d => names[d]).filter(Boolean).join('، ');
    };

    let md = '';

    // ==========================================
    // HEADER & TITLE
    // ==========================================
    md += `# 🎯 ${goal.title}\n\n`;
    md += `> **${isArabic ? 'تقرير الأداء الشامل والتوثيق المعماري الكامل للهدف' : 'Comprehensive Goal Dossier & Architectural Blueprint'}**\n`;
    md += `> **${isArabic ? 'تاريخ التصدير' : 'Exported At'}**: ${exportDateStr} | **${isArabic ? 'المعرّف' : 'Goal ID'}**: \`${goal.id}\`\n\n`;
    md += `---\n\n`;

    // ==========================================
    // 1. EXECUTIVE KPIS TABLE
    // ==========================================
    md += `## 📌 ${isArabic ? '١. بطاقة تعريف الهدف والمؤشرات الأساسية' : '1. Executive Summary & KPIs'}\n\n`;
    md += `| ${isArabic ? 'المؤشر' : 'Metric'} | ${isArabic ? 'القيمة والتفاصيل' : 'Value & Details'} |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **${isArabic ? 'عنوان الهدف' : 'Goal Title'}** | ${goal.title} |\n`;
    md += `| **${isArabic ? 'المجال / التصنيف' : 'Category / Domain'}** | ${formatDomainLabel(goal.domain)} |\n`;
    md += `| **${isArabic ? 'حالة الهدف' : 'Current Status'}** | ${goal.status} |\n`;
    md += `| **${isArabic ? 'تاريخ البدء' : 'Start Date'}** | ${analytics.timeline.startDate} |\n`;
    md += `| **${isArabic ? 'تاريخ الإنجاز المستهدف' : 'Target Completion Date'}** | ${analytics.timeline.targetDate || (isArabic ? 'غير محدد' : 'Unspecified')} |\n`;
    md += `| **${isArabic ? 'المدة المخططة' : 'Planned Duration'}** | ${analytics.timeline.totalDays} ${isArabic ? 'يوماً' : 'days'} |\n`;
    md += `| **${isArabic ? 'الأيام المنقضية / المتبقية' : 'Days Elapsed / Remaining'}** | ${analytics.timeline.daysElapsed} ${isArabic ? 'مضت' : 'elapsed'} / ${analytics.timeline.daysRemaining} ${isArabic ? 'متبقية' : 'remaining'} |\n`;
    md += `| **${isArabic ? 'نسبة مرور الوقت' : 'Timeline Progress'}** | ${analytics.timeline.timeProgressPercent}% |\n`;
    md += `| **${isArabic ? 'النقاط المحققة / المستهدفة' : 'Points Earned / Target'}** | **+${analytics.points.current.toLocaleString()}** / ${analytics.points.target.toLocaleString()} pts (**${analytics.points.progressPercent}%**) |\n`;
    md += `| **${isArabic ? 'السرعة الفعلية / السرعة المطلوبة' : 'Pace: Actual vs Required'}** | ${analytics.timeline.pointsVelocityActual} ${isArabic ? 'نقطة/يوم' : 'pts/day'} (${isArabic ? 'المطلوب:' : 'Required:'} ${analytics.timeline.pointsVelocityRequired} ${isArabic ? 'نقطة/يوم' : 'pts/day'}) |\n`;
    md += `| **${isArabic ? 'تقييم وتيرة الإنجاز' : 'Pace Evaluation'}** | **${formatPaceLabel(analytics.timeline.paceStatus)}** |\n`;

    const freezesUsed = goal.streak_freezes ? goal.streak_freezes.length : 0;
    md += `| **${isArabic ? 'تجميدات السلسلة المستخدمة' : 'Streak Freezes Used'}** | ${freezesUsed} ${isArabic ? 'تجميد' : 'freezes'} |\n`;

    if (reminders.length > 0) {
        const r = reminders[0];
        md += `| **${isArabic ? 'إعدادات التذكير اليومي' : 'Daily Reminder Setting'}** | ${r.reminder_time} (${r.enabled ? (isArabic ? 'مفعّل' : 'Active') : (isArabic ? 'معطّل' : 'Disabled')}) |\n`;
    }

    md += `\n---\n\n`;

    // ==========================================
    // 2. STRATEGIC VISION & AI SUMMARY
    // ==========================================
    md += `## 🧭 ${isArabic ? '٢. الرؤية الاستراتيجية وخطة الذكاء الاصطناعي' : '2. Strategic Vision & AI Plan'}\n\n`;
    if (goal.ai_summary && goal.ai_summary.trim()) {
        md += `> 💡 **${isArabic ? 'الرؤية المعمارية للهدف:' : 'Architectural Overview:'}**\n>\n`;
        md += `> ${goal.ai_summary.trim().replace(/\n/g, '\n> ')}\n\n`;
    } else {
        md += `*${isArabic ? 'لم يتم تسجيل ملخص استراتيجي نصي لهذا الهدف.' : 'No text summary was recorded for this goal.'}*\n\n`;
    }
    md += `---\n\n`;

    // ==========================================
    // 3. FULL TASK HIERARCHY & BLUEPRINT
    // ==========================================
    md += `## 🏗️ ${isArabic ? '٣. الهيكل التنفيذي للمهام وشروط الإنجاز (من الألف إلى الياء)' : '3. Complete Task Architecture & Hierarchy'}\n\n`;
    md += `> **${isArabic ? 'ملخص الالتزام الزمني:' : 'Time Commitment Summary:'}** ` +
        `${analytics.tasksSummary.mainTasksCount} ${isArabic ? 'مهام رئيسية' : 'Main tasks'} | ` +
        `${analytics.tasksSummary.subtasksCount} ${isArabic ? 'مهام فرعية' : 'Subtasks'} | ` +
        `${analytics.tasksSummary.dailyMinutesCommitment} ${isArabic ? 'دقيقة يومياً' : 'daily minutes'} | ` +
        `${analytics.tasksSummary.weeklyMinutesCommitment} ${isArabic ? 'دقيقة أسبوعياً' : 'weekly minutes'}\n\n`;

    const mainTasks = tasks.filter(t => t.task_type === 'main');
    const subTasksByParent = tasks.reduce<Record<string, typeof tasks>>((acc, t) => {
        if (t.parent_task_id) {
            if (!acc[t.parent_task_id]) acc[t.parent_task_id] = [];
            acc[t.parent_task_id].push(t);
        }
        return acc;
    }, {});

    if (mainTasks.length === 0 && tasks.length === 0) {
        md += `*${isArabic ? 'لا توجد مهام محددة لهذا الهدف.' : 'No tasks defined for this goal.'}*\n\n`;
    } else {
        mainTasks.forEach((mt, idx) => {
            const taskStat = analytics.checkinsSummary.perTaskStats.find(s => s.taskId === mt.id);
            const subs = subTasksByParent[mt.id] || [];
            const freqLabel = mt.frequency === 'weekly' ? (isArabic ? 'أسبوعية' : 'Weekly') : (isArabic ? 'يومية' : 'Daily');
            const scheduleText = formatWeekdays(mt.schedule_days);

            md += `### ${idx + 1}. ${mt.task_description}\n\n`;
            md += `- **${isArabic ? 'النوع والدورية' : 'Type & Frequency'}**: ${isArabic ? 'مهمة رئيسية' : 'Main Task'} [${freqLabel}]\n`;
            md += `- **${isArabic ? 'أيام التنفيذ المجدولة' : 'Scheduled Days'}**: ${scheduleText}\n`;
            md += `- **${isArabic ? 'الوزن النسبي والأثر' : 'Impact Weight'}**: ${mt.impact_weight || 1} / 5\n`;
            md += `- **${isArabic ? 'الوقت المقدر' : 'Estimated Time'}**: ${mt.time_required_minutes || 0} ${isArabic ? 'دقيقة' : 'minutes'}\n`;

            if (mt.completion_criteria && mt.completion_criteria.trim()) {
                md += `- **${isArabic ? 'معيار وشروط الإنجاز الدقيقة' : 'Completion Criteria'}**: ${mt.completion_criteria}\n`;
            }

            if (mt.mini_version && mt.mini_version.trim()) {
                md += `- **${isArabic ? 'النسخة المصغرة للأيام الصعبة (Mini Version)' : 'Emergency Mini Version'}**: ⚡ *${mt.mini_version}*\n`;
            }

            if (taskStat && taskStat.total > 0) {
                md += `- **${isArabic ? 'إحصائيات إنجاز هذه المهمة' : 'Task Execution Stats'}**: ` +
                    `${isArabic ? 'أُنجزت' : 'Completed'} **${taskStat.completed}** / ${taskStat.total} ${isArabic ? 'مرة' : 'times'} ` +
                    `(${taskStat.adherenceRate}%) | ` +
                    `${isArabic ? 'كاملة:' : 'Full:'} ${taskStat.full} | ` +
                    `${isArabic ? 'مصغرة:' : 'Mini:'} ${taskStat.mini} | ` +
                    `${isArabic ? 'تخطي:' : 'Skipped:'} ${taskStat.skipped}\n`;
            }

            if (subs.length > 0) {
                md += `\n**${isArabic ? 'المهام الفرعية التابعة:' : 'Subtasks under this task:'}**\n`;
                subs.forEach((st) => {
                    const sFreq = st.frequency === 'weekly' ? (isArabic ? 'أسبوعي' : 'Weekly') : (isArabic ? 'يومي' : 'Daily');
                    const sTime = st.time_required_minutes ? ` (~${st.time_required_minutes} ${isArabic ? 'دقيقة' : 'min'})` : '';
                    md += `  - [ ] **${st.task_description}** [${sFreq}${sTime}]\n`;
                    if (st.completion_criteria) {
                        md += `    - *${isArabic ? 'المعيار' : 'Criteria'}*: ${st.completion_criteria}\n`;
                    }
                    if (st.mini_version) {
                        md += `    - *${isArabic ? 'النسخة المصغرة' : 'Mini version'}*: ⚡ ${st.mini_version}\n`;
                    }
                });
            }

            md += `\n`;
        });
    }

    md += `---\n\n`;

    // ==========================================
    // 4. CHECK-INS & EXECUTION ANALYTICS
    // ==========================================
    md += `## 📊 ${isArabic ? '٤. سجل التحقق والتنفيذ الميداني' : '4. Check-ins & Execution Analytics'}\n\n`;
    md += `- **${isArabic ? 'إجمالي تسجيلات التحقق' : 'Total Check-in Records'}**: ${analytics.checkinsSummary.totalCheckins}\n`;
    md += `- **${isArabic ? 'المهام المنجزة بنجاح' : 'Tasks Completed'}**: **${analytics.checkinsSummary.completedTotal}** ` +
        `(${analytics.checkinsSummary.overallAdherenceRate}% ${isArabic ? 'معدل الالتزام العام' : 'Overall Adherence'})\n`;
    md += `  - ${isArabic ? 'وضع الإنجاز الكامل (Full):' : 'Full Mode completions:'} ${analytics.checkinsSummary.completedFull}\n`;
    md += `  - ${isArabic ? 'وضع الإنجاز المصغر (Mini):' : 'Mini Mode completions:'} ${analytics.checkinsSummary.completedMini}\n`;
    md += `- **${isArabic ? 'إجمالي مرات التخطي' : 'Total Tasks Skipped'}**: ${analytics.checkinsSummary.skippedTotal}\n`;

    if (analytics.checkinsSummary.skippedTotal > 0) {
        md += `\n**${isArabic ? 'تحليل أسباب التخطي المسجلة:' : 'Skip Reasons Breakdown:'}**\n`;
        md += `| ${isArabic ? 'السبب' : 'Reason'} | ${isArabic ? 'العدد' : 'Count'} |\n`;
        md += `| :--- | :--- |\n`;
        md += `| ${isArabic ? 'ضيق الوقت (no_time)' : 'No time'} | ${analytics.checkinsSummary.skipReasons.no_time} |\n`;
        md += `| ${isArabic ? 'المهمة صعبة أو شاقة (too_hard)' : 'Too hard'} | ${analytics.checkinsSummary.skipReasons.too_hard} |\n`;
        md += `| ${isArabic ? 'المعيار غير واضح (unclear)' : 'Unclear criteria'} | ${analytics.checkinsSummary.skipReasons.unclear} |\n`;
        md += `| ${isArabic ? 'انعدام الرغبة أو المزاج (no_mood)' : 'No mood'} | ${analytics.checkinsSummary.skipReasons.no_mood} |\n`;
    }

    if (checkins.length > 0) {
        md += `\n### ${isArabic ? 'جدول آخر التحققات اليومية المسجلة:' : 'Recent Recorded Check-ins:'}\n\n`;
        md += `| ${isArabic ? 'التاريخ' : 'Date'} | ${isArabic ? 'المهمة' : 'Task'} | ${isArabic ? 'الحالة' : 'Status'} | ${isArabic ? 'الوضع' : 'Mode'} | ${isArabic ? 'سبب التخطي' : 'Skip Reason'} |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- |\n`;
        checkins.slice(0, 25).forEach(c => {
            const taskObj = tasks.find(t => t.id === c.task_id);
            const taskTitle = taskObj ? taskObj.task_description : c.task_id.slice(0, 8);
            const statusStr = c.completed ? (isArabic ? '✅ منجز' : '✅ Done') : (isArabic ? '❌ تخطي' : '❌ Skipped');
            const modeStr = c.completed_mode === 'mini' ? (isArabic ? '⚡ مصغر' : '⚡ Mini') : (c.completed ? (isArabic ? 'كامل' : 'Full') : '-');
            const reasonStr = c.skip_reason || '-';
            md += `| ${c.period_start} | ${taskTitle} | ${statusStr} | ${modeStr} | ${reasonStr} |\n`;
        });
        if (checkins.length > 25) {
            md += `\n*${isArabic ? `(تم تضمين أحدث 25 تحقّقاً في الجدول المقروء، والبيانات الكاملة لجميع التحققات متوفرة في نسخة الـ JSON المصاحبة)` : `(Showing top 25 checkins in markdown table; full checkin records preserved in JSON export)`}*\n`;
        }
    } else {
        md += `\n*${isArabic ? 'لم يتم تسجيل تحققات يومية بعد لهذا الهدف.' : 'No check-in records have been logged yet for this goal.'}*\n`;
    }

    md += `\n---\n\n`;

    // ==========================================
    // 5. ALL DAILY LOGS & PROGRESS EVALUATIONS
    // ==========================================
    md += `## 📝 ${isArabic ? '٥. أرشيف السجلات اليومية وتقييمات الذكاء الاصطناعي (من اليوم الأول إلى النهاية)' : '5. Complete Daily Progress Logs & AI Evaluations'}\n\n`;
    md += `> **${isArabic ? 'إحصائيات السجلات:' : 'Logs Statistics:'}** ` +
        `${analytics.logsSummary.totalLogs} ${isArabic ? 'تقارير يومية مسجلة' : 'Daily logs recorded'} | ` +
        `${isArabic ? 'متوسط التقييم:' : 'Average Score:'} **${analytics.logsSummary.averageScore} / 100** | ` +
        `${isArabic ? 'أعلى تقييم:' : 'Highest:'} ${analytics.logsSummary.highestScore} / 100\n\n`;

    if (dailyLogs.length === 0) {
        md += `*${isArabic ? 'لم يتم تسجيل تقارير يومية لهذا الهدف بعد.' : 'No daily logs recorded yet for this goal.'}*\n\n`;
    } else {
        dailyLogs.forEach((log, lIdx) => {
            const dateStr = new Date(log.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            const scoreLabel = log.ai_score !== null && log.ai_score !== undefined
                ? `${log.ai_score} / 100`
                : (isArabic ? 'بدون تقييم' : 'Unrated');

            md += `### 📅 ${dateStr} (#${dailyLogs.length - lIdx}) — ${scoreLabel}\n\n`;

            if (log.user_input && log.user_input.trim()) {
                md += `**${isArabic ? 'تقرير المستخدم المكتوب:' : 'User Daily Report:'}**\n`;
                md += `> ${log.user_input.trim().replace(/\n/g, '\n> ')}\n\n`;
            }

            if (log.ai_feedback && log.ai_feedback.trim()) {
                md += `**${isArabic ? 'تقييم وتحليل الذكاء الاصطناعي:' : 'AI Evaluation & Feedback:'}**\n`;
                md += `> 🤖 ${log.ai_feedback.trim().replace(/\n/g, '\n> ')}\n\n`;
            }

            if (log.coaching_message && log.coaching_message.trim()) {
                md += `**${isArabic ? 'توجيه الكوتش الذكي:' : 'AI Coaching Insight:'}**\n`;
                md += `> 💬 *${log.coaching_message.trim().replace(/\n/g, '\n> ')}*\n\n`;
            }

            // Breakdown if present
            if (log.breakdown && typeof log.breakdown === 'object') {
                const items = Array.isArray(log.breakdown.items)
                    ? log.breakdown.items
                    : Array.isArray(log.breakdown)
                        ? log.breakdown
                        : [];
                if (items.length > 0) {
                    md += `**${isArabic ? 'تفصيل إنجاز المهام والنقاط الممنوحة:' : 'Tasks Score Breakdown:'}**\n`;
                    items.forEach((item: any) => {
                        const name = item.task_description || item.task_name || item.title || (isArabic ? 'مهمة' : 'Task');
                        const pts = item.points || item.awarded_points || 0;
                        const tier = item.tier || item.evidence_level || '';
                        md += `  - **${name}**: +${pts} pts ${tier ? `[${tier}]` : ''}\n`;
                    });
                    md += `\n`;
                }
            }

            md += `---\n\n`;
        });
    }

    // ==========================================
    // 6. DAILY STRATEGIC FOCUS SESSIONS
    // ==========================================
    md += `## 🎯 ${isArabic ? '٦. سجل جلسات التركيز والاستشارات الاستراتيجية اليومية' : '6. Daily Strategic Focus & Coaching Log'}\n\n`;
    md += `> **${isArabic ? 'ملخص الجلسات:' : 'Focus Sessions Summary:'}** ` +
        `${analytics.focusSummary.totalQuestions} ${isArabic ? 'أسئلة توجيهية' : 'Questions'} | ` +
        `${analytics.focusSummary.answeredCount} ${isArabic ? 'تمت الإجابة عليها' : 'Answered'} | ` +
        `${analytics.focusSummary.pendingCount} ${isArabic ? 'قيد الانتظار' : 'Pending'}\n\n`;

    if (dailyFocusAnswers.length === 0) {
        md += `*${isArabic ? 'لا توجد جلسات تركيز مسجلة لهذا الهدف.' : 'No daily focus sessions recorded for this goal.'}*\n\n`;
    } else {
        dailyFocusAnswers.forEach(fa => {
            md += `### 💡 ${fa.prompt_date} — ${fa.angle_label || (isArabic ? 'محور التركيز' : 'Focus Angle')}\n\n`;
            md += `**${isArabic ? 'السؤال الاستراتيجي:' : 'Strategic Question:'}**\n`;
            md += `> ${fa.question.replace(/\n/g, '\n> ')}\n\n`;

            if (fa.question_why) {
                md += `*${isArabic ? 'أهمية السؤال:' : 'Why it matters:'}* ${fa.question_why}\n\n`;
            }

            if (fa.answer && fa.answer.trim()) {
                md += `**${isArabic ? 'إجابة وتأملات المستخدم:' : 'User Answer & Reflections:'}**\n`;
                md += `> ✍️ ${fa.answer.trim().replace(/\n/g, '\n> ')}\n\n`;
            } else {
                md += `*${isArabic ? 'لم تتم الإجابة على هذا السؤال بعد.' : 'This question was not answered yet.'}*\n\n`;
            }

            if (fa.answer_coaching && fa.answer_coaching.trim()) {
                md += `**${isArabic ? 'توجيه الكوتش الاستراتيجي:' : 'Strategic AI Coaching:'}**\n`;
                md += `> 🧭 ${fa.answer_coaching.trim().replace(/\n/g, '\n> ')}\n\n`;
            }

            if (fa.suggestions && (Array.isArray(fa.suggestions) || Array.isArray(fa.suggestions.quick_options))) {
                const list = Array.isArray(fa.suggestions) ? fa.suggestions : fa.suggestions.quick_options;
                if (list.length > 0) {
                    md += `*${isArabic ? 'الخيارات والاقتراحات الاسترشادية:' : 'Guidance suggestions:'}*\n`;
                    list.forEach((s: any) => {
                        const sText = typeof s === 'string' ? s : s?.label || s?.text;
                        if (sText) md += `  - ${sText}\n`;
                    });
                    md += `\n`;
                }
            }

            md += `\n`;
        });
    }

    md += `---\n\n`;

    // ==========================================
    // 7. WEEKLY REVIEWS & PATTERNS
    // ==========================================
    md += `## 🔄 ${isArabic ? '٧. المراجعات الأسبوعية والتطور الدوري' : '7. Weekly Retrospectives & Pattern Analysis'}\n\n`;

    if (weeklyReviews.length === 0) {
        md += `*${isArabic ? 'لم تكتمل أية مراجعة أسبوعية لهذا الهدف حتى الآن.' : 'No weekly reviews completed yet for this goal.'}*\n\n`;
    } else {
        if (analytics.reviewsSummary.positivePatterns.length > 0) {
            md += `**${isArabic ? '✨ الأنماط الإيجابية المكتشفة دورياً:' : '✨ Recurring Positive Patterns:'}**\n`;
            analytics.reviewsSummary.positivePatterns.forEach(p => {
                md += `- ${p}\n`;
            });
            md += `\n`;
        }

        if (analytics.reviewsSummary.warningPatterns.length > 0) {
            md += `**${isArabic ? '⚠️ نقاط الاحتكاك ومناطق التحذير المكتشفة:' : '⚠️ Recurring Bottlenecks & Warnings:'}**\n`;
            analytics.reviewsSummary.warningPatterns.forEach(p => {
                md += `- ${p}\n`;
            });
            md += `\n`;
        }

        weeklyReviews.forEach(wr => {
            md += `### 🗓️ ${isArabic ? 'أسبوع' : 'Week of'} ${wr.week_start}\n\n`;
            if (wr.summary) {
                md += `**${isArabic ? 'الملخص:' : 'Summary:'}**\n> ${wr.summary.replace(/\n/g, '\n> ')}\n\n`;
            }
            if (wr.suggestion) {
                md += `**${isArabic ? 'توصيات الأسبوع القادم:' : 'Actionable Advice:'}**\n> 🎯 ${wr.suggestion.replace(/\n/g, '\n> ')}\n\n`;
            }
        });
    }

    md += `---\n\n`;

    // ==========================================
    // 8. CHALLENGES & MULTIPLAYER
    // ==========================================
    if (challenges.length > 0) {
        md += `## 🏆 ${isArabic ? '٨. المشاركة في التحديات الجماعية' : '8. Challenges & Multiplayer Context'}\n\n`;
        challenges.forEach(ch => {
            md += `- **${isArabic ? 'الدور' : 'Role'}**: ${ch.role} | ` +
                `**${isArabic ? 'كود الغرفة' : 'Room Code'}**: \`${ch.room?.invite_code || '-'}\` | ` +
                `**${isArabic ? 'تاريخ الانضمام' : 'Joined'}**: ${new Date(ch.joined_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}\n`;
        });
        md += `\n---\n\n`;
    }

    // ==========================================
    // FOOTER
    // ==========================================
    md += `*${isArabic ? 'تم إنشاء وتصدير هذا التقرير الشامل تلقائياً بواسطة نظام METRIX لإدارة الأهداف والإنتاجية.' : 'This comprehensive dossier was automatically generated by METRIX Goal Performance System.'}*\n`;

    return md;
}
