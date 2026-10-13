import test from 'node:test';
import assert from 'node:assert/strict';
import {
    computeGoalExportAnalytics,
    generateGoalMarkdownDossier,
    generateGoalJsonExport,
    exportGoalMarkdownDirect,
    exportGoalJsonDirect,
    type FullGoalExportData,
} from '../goal-exporter.ts';

const mockGoalData: FullGoalExportData = {
    goal: {
        id: 'test-goal-uuid-1234',
        user_id: 'user-uuid-5678',
        title: 'إتقان الذكاء الاصطناعي وبناء المشاريع',
        domain: 'skills',
        ai_summary: 'خطة استراتيجية مكثفة للارتقاء من المبتدئ إلى المهندس الممارس خلال 60 يوماً.',
        icon: 'Brain',
        status: 'active',
        current_points: 3500,
        target_points: 10000,
        total_days: 60,
        estimated_completion_date: '2026-12-01',
        is_pinned: true,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        streak_freezes: [{ date: '2026-10-04', used_at: '2026-10-04T22:00:00Z' }],
    },
    tasks: [
        {
            id: 'task-1',
            goal_id: 'test-goal-uuid-1234',
            parent_task_id: null,
            task_description: 'دراسة أوراق بحثية وتلخيصها',
            task_type: 'main',
            frequency: 'daily',
            schedule_days: [0, 1, 2, 3, 4],
            impact_weight: 4,
            completion_criteria: 'قراءة ورقة واحدة وتلخيص 3 نقاط رئيسية في دفتر الملاحظات.',
            time_required_minutes: 45,
            sort_order: 0,
            icon: null,
            accent_color: null,
            is_pinned: false,
            mini_version: 'قراءة المقدمة والخلاصة فقط في 15 دقيقة',
            created_at: '2026-10-01T00:00:00Z',
        },
        {
            id: 'sub-1',
            goal_id: 'test-goal-uuid-1234',
            parent_task_id: 'task-1',
            task_description: 'تطبيق عملي للكود المرافق',
            task_type: 'sub',
            frequency: 'daily',
            schedule_days: null,
            impact_weight: 3,
            completion_criteria: 'تشغيل المستودع في بيئة العمل وتجربة نموذج أولي.',
            time_required_minutes: 30,
            sort_order: 0,
            icon: null,
            accent_color: null,
            is_pinned: false,
            mini_version: null,
            created_at: '2026-10-01T00:00:00Z',
        },
    ],
    checkins: [
        {
            id: 'c-1',
            goal_id: 'test-goal-uuid-1234',
            task_id: 'task-1',
            period_type: 'daily',
            period_start: '2026-10-06',
            completed: true,
            completed_at: '2026-10-06T18:00:00Z',
            completed_mode: 'full',
            skip_reason: null,
            created_at: '2026-10-06T18:00:00Z',
        },
        {
            id: 'c-2',
            goal_id: 'test-goal-uuid-1234',
            task_id: 'task-1',
            period_type: 'daily',
            period_start: '2026-10-05',
            completed: true,
            completed_at: '2026-10-05T19:00:00Z',
            completed_mode: 'mini',
            skip_reason: null,
            created_at: '2026-10-05T19:00:00Z',
        },
        {
            id: 'c-3',
            goal_id: 'test-goal-uuid-1234',
            task_id: 'task-1',
            period_type: 'daily',
            period_start: '2026-10-04',
            completed: false,
            completed_at: null,
            completed_mode: null,
            skip_reason: 'no_time',
            created_at: '2026-10-04T22:00:00Z',
        },
    ],
    dailyLogs: [
        {
            id: 'log-1',
            goal_id: 'test-goal-uuid-1234',
            user_input: 'أنهيت قراءة ورقة الـ Attention Is All You Need وطبقت أول طبقة Transformer.',
            ai_score: 95,
            ai_feedback: 'إنجاز ممتاز وعميق، استمر في ترسيخ الفهم بالتطبيق.',
            coaching_message: 'حافظ على هذا الزخم غداً عند كتابة باقي أجزاء النموذج.',
            breakdown: {
                items: [
                    { task_description: 'دراسة أوراق بحثية وتلخيصها', points: 95, tier: 'exceptional' }
                ]
            },
            created_at: '2026-10-06T19:00:00Z',
        },
    ],
    dailyFocusAnswers: [
        {
            id: 'fa-1',
            goal_id: 'test-goal-uuid-1234',
            user_id: 'user-uuid-5678',
            prompt_date: '2026-10-06',
            angle_label: 'وضوح المسار',
            question: 'ما الذي يجعل هذا الهدف مختلفاً عن محاولاتك السابقة؟',
            question_why: 'الربط بالمعنى الداخلي يرفع الاستمرارية.',
            answer: 'هذه المرة أركز على بناء مشاريع حقيقية وليس مجرد مشاهدة كورسات.',
            answer_coaching: 'ممتاز، وثّق كل مشروع في مستودع GitHub ليكون دليلاً ملموساً.',
            suggestions: {
                quick_options: ['التركيز على المشروعات الملموسة', 'الالتزام بمجتمع مطورين']
            },
            answered_at: '2026-10-06T10:00:00Z',
            created_at: '2026-10-06T08:00:00Z',
            updated_at: '2026-10-06T10:00:00Z',
        },
    ],
    weeklyReviews: [
        {
            id: 'wr-1',
            goal_id: 'test-goal-uuid-1234',
            user_id: 'user-uuid-5678',
            week_start: '2026-09-28',
            summary: 'أسبوع أول قوي، تم إنجاز معظم المهام اليومية في الصباح الباكر.',
            patterns: [
                { pattern: 'الصباح الباكر هو وقت ذروة الإنتاجية لديك', type: 'positive' },
                { pattern: 'تراجع التركيز في عطلة نهاية الأسبوع', type: 'warning' }
            ],
            suggestion: 'خصص ساعة صباحية يوم السبت لتفادي انقطاع السلسلة.',
            stats: { completed_tasks: 12 },
            created_at: '2026-10-05T00:00:00Z',
        },
    ],
    reminders: [
        {
            id: 'rem-1',
            user_id: 'user-uuid-5678',
            goal_id: 'test-goal-uuid-1234',
            reminder_time: '21:00',
            reminder_count: 2,
            enabled: true,
            timezone: 'Asia/Baghdad',
            created_at: '2026-10-01T00:00:00Z',
        },
    ],
    challenges: [],
};

test('computeGoalExportAnalytics calculates comprehensive metrics correctly', () => {
    const analytics = computeGoalExportAnalytics(mockGoalData);

    assert.equal(analytics.points.current, 3500);
    assert.equal(analytics.points.target, 10000);
    assert.equal(analytics.points.progressPercent, 35);
    assert.equal(analytics.timeline.totalDays, 60);

    // Checkins stats
    assert.equal(analytics.checkinsSummary.totalCheckins, 3);
    assert.equal(analytics.checkinsSummary.completedTotal, 2);
    assert.equal(analytics.checkinsSummary.completedFull, 1);
    assert.equal(analytics.checkinsSummary.completedMini, 1);
    assert.equal(analytics.checkinsSummary.skippedTotal, 1);
    assert.equal(analytics.checkinsSummary.skipReasons.no_time, 1);

    // Task stats
    assert.equal(analytics.tasksSummary.mainTasksCount, 1);
    assert.equal(analytics.tasksSummary.subtasksCount, 1);
    assert.equal(analytics.tasksSummary.totalTasks, 2);

    // Logs stats
    assert.equal(analytics.logsSummary.totalLogs, 1);
    assert.equal(analytics.logsSummary.averageScore, 95);
    assert.equal(analytics.logsSummary.highestScore, 95);

    // Focus & Review stats
    assert.equal(analytics.focusSummary.answeredCount, 1);
    assert.equal(analytics.reviewsSummary.totalReviews, 1);
    assert.ok(analytics.reviewsSummary.positivePatterns.length > 0);
    assert.ok(analytics.reviewsSummary.warningPatterns.length > 0);
});

test('generateGoalMarkdownDossier outputs rich sections from start to end', () => {
    const md = generateGoalMarkdownDossier(mockGoalData, true);

    // Key headers & markers
    assert.ok(md.includes('إتقان الذكاء الاصطناعي وبناء المشاريع'));
    assert.ok(md.includes('١. بطاقة تعريف الهدف والمؤشرات الأساسية'));
    assert.ok(md.includes('٢. الرؤية الاستراتيجية وخطة الذكاء الاصطناعي'));
    assert.ok(md.includes('٣. الهيكل التنفيذي للمهام وشروط الإنجاز'));
    assert.ok(md.includes('٤. سجل التحقق والتنفيذ الميداني'));
    assert.ok(md.includes('٥. أرشيف السجلات اليومية وتقييمات الذكاء الاصطناعي'));
    assert.ok(md.includes('٦. سجل جلسات التركيز والاستشارات الاستراتيجية اليومية'));
    assert.ok(md.includes('٧. المراجعات الأسبوعية والتطور الدوري'));

    // Content checks
    assert.ok(md.includes('دراسة أوراق بحثية وتلخيصها'));
    assert.ok(md.includes('قراءة المقدمة والخلاصة فقط في 15 دقيقة')); // mini version
    assert.ok(md.includes('Attention Is All You Need')); // daily log
    assert.ok(md.includes('ما الذي يجعل هذا الهدف مختلفاً')); // focus question
    assert.ok(md.includes('الصباح الباكر هو وقت ذروة الإنتاجية')); // weekly pattern
    assert.ok(md.includes('21:00')); // reminder
});

test('generateGoalJsonExport outputs valid JSON with complete hierarchy', () => {
    const jsonStr = generateGoalJsonExport(mockGoalData);
    const parsed = JSON.parse(jsonStr);

    assert.equal(parsed.meta.app, 'METRIX');
    assert.equal(parsed.goal.id, 'test-goal-uuid-1234');
    assert.equal(parsed.tasks_hierarchy.length, 2);
    assert.equal(parsed.checkins_log.length, 3);
    assert.equal(parsed.daily_logs.length, 1);
    assert.equal(parsed.daily_focus_sessions.length, 1);
    assert.equal(parsed.weekly_reviews.length, 1);
    assert.equal(parsed.reminders.length, 1);
});

test('exportGoalMarkdownDirect and exportGoalJsonDirect execute successfully with mock Supabase client', async () => {
    const mockSupabase: any = {
        from: (table: string) => {
            const queryBuilder: any = {
                select: () => queryBuilder,
                eq: () => queryBuilder,
                order: () => queryBuilder,
                single: async () => {
                    if (table === 'goals') return { data: mockGoalData.goal, error: null };
                    return { data: null, error: null };
                },
                then: (resolve: any) => {
                    if (table === 'goals') return resolve({ data: mockGoalData.goal, error: null });
                    if (table === 'sub_layers') return resolve({ data: mockGoalData.tasks, error: null });
                    if (table === 'task_checkins') return resolve({ data: mockGoalData.checkins, error: null });
                    if (table === 'daily_logs') return resolve({ data: mockGoalData.dailyLogs, error: null });
                    if (table === 'daily_focus_answers') return resolve({ data: mockGoalData.dailyFocusAnswers, error: null });
                    if (table === 'weekly_reviews') return resolve({ data: mockGoalData.weeklyReviews, error: null });
                    if (table === 'goal_reminders') return resolve({ data: mockGoalData.reminders, error: null });
                    if (table === 'challenge_participants') return resolve({ data: [], error: null });
                    return resolve({ data: [], error: null });
                },
            };
            return queryBuilder;
        },
    };

    // In Node test environment, window is undefined, so downloadExportFile safely returns without DOM errors
    await assert.doesNotReject(async () => {
        await exportGoalMarkdownDirect(mockSupabase, { id: 'test-goal-uuid-1234', title: 'Test Goal' }, true);
    });

    await assert.doesNotReject(async () => {
        await exportGoalJsonDirect(mockSupabase, { id: 'test-goal-uuid-1234', title: 'Test Goal' });
    });
});
