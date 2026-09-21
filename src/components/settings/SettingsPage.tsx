'use client';

import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Sun, Moon, Globe, Target, Flame, Crown, LogOut, User, Camera, Trash2, ScrollText, Download, Loader2,
    Trophy, Zap, CalendarCheck, ShieldCheck, Mail, Check, Sparkles, CheckCircle2, Upload, X, Pencil,
    Bell, Clock
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE, WELL_SURFACE } from '@/lib/surfaces';
import {
    isNotificationsEnabled,
    setNotificationsEnabled,
    getNotificationTime,
    setNotificationTime
} from '@/hooks/useStreakReminder';

const PRESET_AVATARS = [
    { id: 'adventurer-1', label: 'Warrior', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix' },
    { id: 'adventurer-2', label: 'Strategist', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka' },
    { id: 'adventurer-3', label: 'Navigator', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Leo' },
    { id: 'adventurer-4', label: 'Architect', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Milo' },
    { id: 'adventurer-5', label: 'Catalyst', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zoe' },
    { id: 'adventurer-6', label: 'Champion', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Jasper' },
    { id: 'adventurer-7', label: 'Pioneer', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nova' },
    { id: 'adventurer-8', label: 'Master', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha' },
];
import { getIconComponent } from '@/components/goal/IconPicker';
import { buildTaskHierarchy, type TaskRow } from '@/lib/task-hierarchy';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
    domain?: string | null;
    icon?: string;
    estimated_completion_date?: string | null;
    total_days?: number | null;
    ai_summary?: string | null;
}

interface SettingsPageProps {
    user: SupabaseUser | null;
    language: Language;
    setLanguage: (lang: Language) => void;
    goals: Goal[];
    onProfileUpdated?: () => void | Promise<void>;
    onGoalsDeleted?: () => void;
}

type SettingsTab = 'general' | 'profile';

export default function SettingsPage({ user, language, setLanguage, goals, onProfileUpdated }: SettingsPageProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [totalLogs, setTotalLogs] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [signingOut, setSigningOut] = useState(false);
    const [isManifestoOpen, setIsManifestoOpen] = useState(false);

    // Profile state
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [streakNotifsEnabled, setStreakNotifsEnabled] = useState(false);
    const [streakNotifTime, setStreakNotifTimeState] = useState('21:00');
    const nameDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) setTheme(savedTheme);
        setStreakNotifsEnabled(isNotificationsEnabled());
        setStreakNotifTimeState(getNotificationTime());
        fetchStats();
    }, []);

    useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
            setAvatarUrl(user.user_metadata?.avatar_url || null);
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const { count: logsCount } = await supabase
                .from('daily_logs')
                .select('id', { count: 'exact' });
            setTotalLogs(logsCount ?? 0);

            const { data: allLogs } = await supabase
                .from('daily_logs')
                .select('created_at, goal_id')
                .order('created_at', { ascending: true });

            if (allLogs && allLogs.length > 0) {
                const logsByGoal = allLogs.reduce((acc: Record<string, string[]>, log) => {
                    if (!acc[log.goal_id]) acc[log.goal_id] = [];
                    acc[log.goal_id].push(log.created_at);
                    return acc;
                }, {});

                let absoluteMaxStreak = 0;
                Object.values(logsByGoal).forEach(dates => {
                    const toLocalDateStr = (isoStr: string) => {
                        const d = new Date(isoStr);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    };
                    const uniqueDates = Array.from(new Set(dates.map(toLocalDateStr))).sort();
                    if (uniqueDates.length === 0) return;
                    let currentStreak = 1;
                    let localMaxStreak = 1;
                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prevDate = new Date(uniqueDates[i - 1]);
                        prevDate.setDate(prevDate.getDate() + 1);
                        if (toLocalDateStr(prevDate.toISOString()) === uniqueDates[i]) {
                            currentStreak++;
                            localMaxStreak = Math.max(localMaxStreak, currentStreak);
                        } else {
                            currentStreak = 1;
                        }
                    }
                    absoluteMaxStreak = Math.max(absoluteMaxStreak, localMaxStreak);
                });
                setMaxStreak(absoluteMaxStreak);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };


    const handleThemeChange = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
    };

    const handleToggleStreakNotifs = async () => {
        const next = !streakNotifsEnabled;
        const granted = await setNotificationsEnabled(next);
        setStreakNotifsEnabled(granted);
    };

    const handleTimeChange = (time: string) => {
        setNotificationTime(time);
        setStreakNotifTimeState(time);
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        await supabase.auth.signOut();
        window.location.href = '/login';
    };


    const persistDisplayName = async (name: string) => {
        if (!user) return;
        setIsSavingName(true);
        const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() || null } });
        setIsSavingName(false);
        if (error) {
            setProfileMessage({ type: 'error', text: error.message });
        } else {
            await onProfileUpdated?.();
        }
    };

    const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDisplayName(val);
        if (nameDebounceTimer.current) clearTimeout(nameDebounceTimer.current);
        nameDebounceTimer.current = setTimeout(() => {
            persistDisplayName(val);
        }, 1200);
    };

    const handleDisplayNameBlur = () => {
        if (nameDebounceTimer.current) {
            clearTimeout(nameDebounceTimer.current);
            nameDebounceTimer.current = null;
        }
        persistDisplayName(displayName);
    };

    const handleSelectPresetAvatar = async (url: string) => {
        if (!user) return;
        setUpdatingProfile(true);
        setProfileMessage(null);
        try {
            const { error } = await supabase.auth.updateUser({ data: { avatar_url: url } });
            if (error) {
                setProfileMessage({ type: 'error', text: error.message });
            } else {
                setAvatarUrl(url);
                setProfileMessage({ type: 'success', text: isArabic ? 'تم تحديث الصورة الشخصية' : 'Avatar updated' });
                setTimeout(() => setProfileMessage(null), 2500);
                setIsAvatarModalOpen(false);
                await onProfileUpdated?.();
            }
        } catch (err) {
            setProfileMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        if (!file.type.startsWith('image/')) {
            setProfileMessage({ type: 'error', text: isArabic ? 'يرجى اختيار صورة' : 'Please select an image' });
            return;
        }
        setUpdatingProfile(true);
        setProfileMessage(null);
        try {
            let urlToUse: string;
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `${user.id}/avatar.${ext}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
            if (uploadError) {
                urlToUse = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            } else {
                const { data } = supabase.storage.from('avatars').getPublicUrl(path);
                urlToUse = data.publicUrl;
            }
            const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: urlToUse } });
            if (updateError) {
                setProfileMessage({ type: 'error', text: updateError.message });
            } else {
                setAvatarUrl(urlToUse);
                setProfileMessage({ type: 'success', text: isArabic ? 'تم رفع الصورة' : 'Photo updated' });
                setTimeout(() => setProfileMessage(null), 2500);
                await onProfileUpdated?.();
            }
        } catch (err) {
            setProfileMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setUpdatingProfile(false);
        }
        e.target.value = '';
    };

    const handleRemovePhoto = async () => {
        if (!user) return;
        setUpdatingProfile(true);
        setProfileMessage(null);
        const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
        setUpdatingProfile(false);
        if (error) {
            setProfileMessage({ type: 'error', text: error.message });
        } else {
            setAvatarUrl(null);
            setProfileMessage({ type: 'success', text: isArabic ? 'تم حذف الصورة' : 'Photo removed' });
            setTimeout(() => setProfileMessage(null), 2500);
            await onProfileUpdated?.();
        }
    };

    const completedGoals = goals.filter(g => g.current_points >= g.target_points).length;
    const totalPointsEarned = goals.reduce((sum, g) => sum + (g.current_points || 0), 0);

    // Export state
    const [exportingGoalId, setExportingGoalId] = useState<string | null>(null);

    const handleExportGoal = async (goal: Goal) => {
        if (exportingGoalId) return;
        setExportingGoalId(goal.id);
        try {
            // Fetch tasks and log dates in parallel (minimal columns)
            const [{ data: taskRows }, { data: logRows }] = await Promise.all([
                supabase
                    .from('sub_layers')
                    .select('id, goal_id, task_description, impact_weight, frequency, task_type, parent_task_id, sort_order, icon')
                    .eq('goal_id', goal.id)
                    .order('sort_order', { ascending: true }),
                supabase
                    .from('daily_logs')
                    .select('created_at, ai_score')
                    .eq('goal_id', goal.id)
                    .order('created_at', { ascending: true }),
            ]);

            const tasks = (taskRows || []) as TaskRow[];
            const logs = (logRows || []) as { created_at: string; ai_score: number }[];
            const hierarchy = buildTaskHierarchy(tasks);

            const progress = goal.target_points > 0
                ? Math.round((goal.current_points / goal.target_points) * 100)
                : 0;

            const formatDate = (dateStr: string | null | undefined) => {
                if (!dateStr) return '—';
                const d = new Date(dateStr);
                return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
            };

            // --- Build Markdown ---
            const lines: string[] = [];
            lines.push(`# 🎯 ${goal.title}`);
            lines.push('');

            // Summary table
            lines.push(`## ${isArabic ? 'ملخص الهدف' : 'Goal Summary'}`);
            lines.push('');
            lines.push(`| ${isArabic ? 'العنصر' : 'Field'} | ${isArabic ? 'القيمة' : 'Value'} |`);
            lines.push('|---|---|');
            lines.push(`| ${t.progressLabel} | **${goal.current_points}** / ${goal.target_points} (${progress}%) |`);
            lines.push(`| ${t.statusLabel} | ${goal.status || '—'} |`);
            if (goal.domain) lines.push(`| ${t.goalDomain} | ${goal.domain} |`);
            lines.push(`| ${t.createdAtLabel} | ${formatDate(goal.created_at)} |`);
            if (goal.estimated_completion_date) lines.push(`| ${t.estimatedEnd} | ${formatDate(goal.estimated_completion_date)} |`);
            if (goal.total_days) lines.push(`| ${t.totalDays} | ${goal.total_days} |`);
            lines.push(`| ${t.daysActive} | ${logs.length} |`);
            lines.push(`| ${t.totalPointsEarned} | ${goal.current_points} |`);
            lines.push('');

            // Progress bar visualization
            const barLength = 20;
            const filledLength = Math.round((progress / 100) * barLength);
            const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
            lines.push(`> ${t.progressLabel}: \`${bar}\` ${progress}%`);
            lines.push('');

            // AI Summary
            if (goal.ai_summary) {
                lines.push(`## ${t.aiSummary}`);
                lines.push('');
                lines.push(goal.ai_summary);
                lines.push('');
            }

            // Tasks hierarchy
            lines.push(`## ${t.tasksOverview}`);
            lines.push('');
            if (hierarchy.length === 0) {
                lines.push(`*${t.noTasks}*`);
            } else {
                for (const main of hierarchy) {
                    const freq = main.frequency === 'weekly' ? (isArabic ? 'أسبوعي' : 'Weekly') : (isArabic ? 'يومي' : 'Daily');
                    lines.push(`### 📋 ${main.task_description}`);
                    lines.push(`> ${t.weightLabel}: ${main.impact_weight} · ${t.frequencyLabel}: ${freq}`);
                    lines.push('');
                    if (main.subtasks.length > 0) {
                        for (const sub of main.subtasks) {
                            const subFreq = sub.frequency === 'weekly' ? (isArabic ? 'أسبوعي' : 'Weekly') : (isArabic ? 'يومي' : 'Daily');
                            lines.push(`- **${sub.task_description}** — ${t.weightLabel}: ${sub.impact_weight}, ${t.frequencyLabel}: ${subFreq}`);
                        }
                        lines.push('');
                    }
                }
            }
            lines.push('');

            // Activity Calendar
            lines.push(`## ${t.activityCalendar}`);
            lines.push('');

            if (logs.length === 0) {
                lines.push(`*${t.noLogs}*`);
            } else {
                // Build set of logged dates
                const loggedDates = new Set<string>();
                for (const log of logs) {
                    const d = new Date(log.created_at);
                    loggedDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }

                // Month-by-month calendar from goal creation to today
                const startDate = new Date(goal.created_at);
                startDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);

                while (currentMonth <= endMonth) {
                    const year = currentMonth.getFullYear();
                    const month = currentMonth.getMonth();
                    const monthName = currentMonth.toLocaleDateString(isArabic ? 'ar' : 'en', { month: 'long', year: 'numeric' });
                    const daysInMonth = new Date(year, month + 1, 0).getDate();

                    lines.push(`### 📅 ${monthName}`);
                    lines.push('');

                    // Week header
                    const dayNames = isArabic
                        ? ['سبت', 'أحد', 'إثن', 'ثلا', 'أربع', 'خمي', 'جمع']
                        : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    lines.push(`| ${dayNames.join(' | ')} |`);
                    lines.push(`| ${dayNames.map(() => '---').join(' | ')} |`);

                    // Find the day of week for day 1 (Saturday = 0)
                    const firstDayOfMonth = new Date(year, month, 1);
                    const dayOfWeek = (firstDayOfMonth.getDay() + 1) % 7; // Shift so Saturday=0

                    let row: string[] = Array(dayOfWeek).fill('');
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dateObj = new Date(year, month, day);

                        let cell = '';
                        if (dateObj > today) {
                            cell = `${day}`;
                        } else if (dateObj < startDate) {
                            cell = `${day}`;
                        } else if (loggedDates.has(dateKey)) {
                            cell = `✅ ${day}`;
                        } else {
                            cell = `❌ ${day}`;
                        }
                        row.push(cell);

                        if (row.length === 7) {
                            lines.push(`| ${row.join(' | ')} |`);
                            row = [];
                        }
                    }
                    // Fill remaining cells
                    if (row.length > 0) {
                        while (row.length < 7) row.push('');
                        lines.push(`| ${row.join(' | ')} |`);
                    }
                    lines.push('');

                    // Move to next month
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                }

                // Legend
                lines.push(`> ✅ = ${t.logged} · ❌ = ${t.missed}`);
                lines.push('');
            }

            // Footer
            lines.push('---');
            lines.push(`*${isArabic ? 'تم التصدير بواسطة METRIX' : 'Exported by METRIX'} — ${new Date().toLocaleDateString(isArabic ? 'ar' : 'en', { year: 'numeric', month: 'long', day: 'numeric' })}*`);

            const markdown = lines.join('\n');

            // Download
            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = goal.title.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_').slice(0, 50);
            a.download = `${safeName}_Export.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProfileMessage({ type: 'success', text: t.goalExportedSuccess });
            setTimeout(() => setProfileMessage(null), 2500);
        } catch (err) {
            console.error('Export error:', err);
            setProfileMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setExportingGoalId(null);
        }
    };

    return (
        <div
            className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex-1 flex flex-col gap-4"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <MatrixManifestoDialog
                open={isManifestoOpen}
                onOpenChange={setIsManifestoOpen}
            />

            <div className={cn(WELL_SURFACE, "p-3 sm:p-4 rounded-2xl sm:rounded-[22px] flex-1 flex flex-col min-h-0")}>
                {/* Tabs */}
                <div className="relative flex gap-1 mb-3 p-1 rounded-xl bg-muted/60 border border-border/70 h-11">
                    {/* Sliding active background indicator */}
                    <div 
                        className="absolute top-1 bottom-1 rounded-lg bg-card shadow-sm ring-1 ring-border/45"
                        style={{
                            width: 'calc((100% - 12px) / 2)',
                            left: isArabic 
                              ? 'auto' 
                              : `calc(4px + ${activeTab === 'profile' ? 1 : 0} * ((100% - 12px) / 2 + 4px))`,
                            right: isArabic 
                              ? `calc(4px + ${activeTab === 'profile' ? 1 : 0} * ((100% - 12px) / 2 + 4px))` 
                              : 'auto',
                            transition: 'all 300ms cubic-bezier(0.25, 1, 0.5, 1)'
                        }}
                    />
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "relative z-10 flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95",
                            activeTab === 'general'
                                ? "text-foreground font-bold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Globe className="w-4 h-4 opacity-80" />
                        {t.generalSettings}
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={cn(
                            "relative z-10 flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95",
                            activeTab === 'profile'
                                ? "text-foreground font-bold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <User className="w-4 h-4 opacity-80" />
                        {t.profileSettings}
                    </button>
                </div>

                <ScrollArea className="flex-1 min-h-0 pr-1" dir={isArabic ? 'rtl' : 'ltr'}>
                    {activeTab === 'general' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out-quart">
                    <div className={cn(PANEL_SURFACE, "rounded-2xl overflow-hidden divide-y divide-border/45")}>
                        {/* Appearance */}
                        <div className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3 hover:bg-muted/12 transition-colors">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="shrink-0 w-8 h-8 rounded-[10px] bg-primary/12 border border-primary/15 flex items-center justify-center">
                                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-primary" /> : <Sun className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <p className="font-bold text-foreground text-sm">{t.appearance}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 bg-muted/60 p-0.5 rounded-lg">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        theme === 'light' ? "bg-card text-primary shadow-sm ring-1 ring-border/45" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.lightMode}
                                >
                                    <Sun className="w-3.5 h-3.5 sm:me-1" />
                                    <span className="hidden sm:inline">{t.lightMode}</span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        theme === 'dark' ? "bg-card text-primary shadow-sm ring-1 ring-border/45" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.darkMode}
                                >
                                    <Moon className="w-3.5 h-3.5 sm:me-1" />
                                    <span className="hidden sm:inline">{t.darkMode}</span>
                                </button>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3 hover:bg-muted/12 transition-colors">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="shrink-0 w-8 h-8 rounded-[10px] bg-primary/12 border border-primary/15 flex items-center justify-center">
                                    <Globe className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <p className="font-bold text-foreground text-sm">{t.language}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 bg-muted/60 p-0.5 rounded-lg">
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        language === 'en' ? "bg-card text-foreground shadow-sm ring-1 ring-border/45" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.english}
                                >
                                    <span className="sm:hidden font-bold">EN</span>
                                    <span className="hidden sm:inline">{t.english}</span>
                                </button>
                                <button
                                    onClick={() => handleLanguageChange('ar')}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all duration-200",
                                        language === 'ar' ? "bg-card text-foreground shadow-sm ring-1 ring-border/45" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.arabic}
                                >
                                    <span className="sm:hidden font-bold">AR</span>
                                    <span className="hidden sm:inline">{t.arabic}</span>
                                </button>
                            </div>
                        </div>

                        {/* Daily Streak Reminder */}
                        <div className="p-3 sm:p-4 flex flex-col gap-3 hover:bg-muted/12 transition-colors">
                            <div className="flex flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <div className="shrink-0 w-8 h-8 rounded-[10px] bg-primary/12 border border-primary/15 flex items-center justify-center">
                                        <Bell className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-foreground text-sm">
                                            {isArabic ? "تنبيه السلسلة اليومي" : "Daily Streak Reminder"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {isArabic
                                                ? "إشعار خفيف على جهازك إذا لم تسجل نشاطك قبل نهاية اليوم"
                                                : "A gentle notification on your device if you haven't logged today"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggleStreakNotifs}
                                    type="button"
                                    className={cn(
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                        streakNotifsEnabled ? "bg-primary" : "bg-muted-foreground/30"
                                    )}
                                    role="switch"
                                    aria-checked={streakNotifsEnabled}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                                            streakNotifsEnabled ? (isArabic ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>

                            {streakNotifsEnabled && (
                                <div className="mt-1 pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <label className="block font-semibold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-primary" />
                                            <span>{isArabic ? "وقت التنبيه المفضل:" : "Preferred Alert Time:"}</span>
                                        </label>
                                        <select
                                            value={streakNotifTime}
                                            onChange={(e) => handleTimeChange(e.target.value)}
                                            className="w-full bg-card border border-border/70 rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                                        >
                                            <option value="20:00">{isArabic ? "8:00 مساءً (قبل النهاية بـ 4 ساعات)" : "8:00 PM (4h before midnight)"}</option>
                                            <option value="21:00">{isArabic ? "9:00 مساءً (الموصى به)" : "9:00 PM (Recommended)"}</option>
                                            <option value="22:00">{isArabic ? "10:00 مساءً (تنبيه متأخر)" : "10:00 PM (Late Reminder)"}</option>
                                            <option value="23:00">{isArabic ? "11:00 مساءً (الفرصة الأخيرة)" : "11:00 PM (Last Chance)"}</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                                            <span>{isArabic ? "نهاية يوم التسجيل:" : "Daily Cutoff Time:"}</span>
                                        </label>
                                        <div className="bg-muted/30 border border-border/60 rounded-xl px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                                            <span>{isArabic ? "منتصف الليل (12:00 ص)" : "Midnight (12:00 AM)"}</span>
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                {isArabic ? "موعد الإغلاق" : "Day Reset"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Matrix Story */}
                    <div className={cn(PANEL_SURFACE, "mt-3 rounded-2xl p-3 sm:p-4")}>
                        <div className="flex items-center gap-2.5">
                            <div className="shrink-0 w-8 h-8 rounded-[10px] bg-primary/12 border border-primary/15 flex items-center justify-center">
                                <ScrollText className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground text-sm">{t.matrixStory}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsManifestoOpen(true)}
                                className="shrink-0 rounded-lg bg-primary/12 border border-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/12 active:scale-[0.97]"
                            >
                                {t.readStory}
                            </button>
                        </div>
                    </div>
                    </div>
                ) : (
                    <div className="space-y-4 px-0.5 py-0.5 sm:px-1 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out-quart">
                        {/* Profile section */}
                        <section className="space-y-3">
                            {profileMessage && (
                                <div className={cn(
                                    "text-xs font-medium px-3 py-2 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200",
                                    profileMessage.type === 'success' ? "bg-primary/12 text-primary border border-primary/15" : "bg-destructive/12 text-destructive border border-destructive/15"
                                )}>
                                    {profileMessage.text}
                                </div>
                            )}

                            {/* Profile Identity Bar — Clean, minimalist, and smart auto-saving */}
                            <div className={cn(PANEL_SURFACE, "rounded-2xl p-3 sm:p-3.5 border border-border/70 shadow-xs")}>
                                <div className="flex items-center gap-3">
                                    {/* Avatar Button — Clicking opens popup to choose presets or upload */}
                                    <button
                                        type="button"
                                        onClick={() => setIsAvatarModalOpen(true)}
                                        className="relative group shrink-0 w-12 h-12 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/25 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        title={isArabic ? "تغيير الصورة الشخصية" : "Change Profile Picture"}
                                    >
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg font-black text-primary">
                                                {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        )}
                                        {/* Subtle hover overlay hint */}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Pencil className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    </button>

                                    {/* Hidden File Input for Custom Upload */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                    />

                                    {/* Inline Display Name with smart auto-save indicator */}
                                    <div className="flex-1 min-w-0">
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={handleDisplayNameChange}
                                                onBlur={handleDisplayNameBlur}
                                                placeholder={user?.email?.split('@')[0] || (isArabic ? 'اكتب اسمك...' : 'Enter your name...')}
                                                className="w-full px-2.5 py-1 rounded-lg border border-transparent hover:border-border/80 focus:border-border/80 bg-transparent hover:bg-card focus:bg-card text-foreground text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                                                title={isArabic ? "اضغط لتعديل الاسم (يُحفظ تلقائياً)" : "Click to edit name (auto-saved)"}
                                            />
                                            {isSavingName && (
                                                <div className="absolute end-2 flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse pointer-events-none">
                                                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 mt-0.5 text-[11px] text-muted-foreground/75 truncate">
                                            <span className="truncate">{user?.email || '—'}</span>
                                            {user?.created_at && (
                                                <>
                                                    <span className="opacity-40">•</span>
                                                    <span className="shrink-0">
                                                        {t.memberSince} {new Date(user.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short' })}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Account Stats — Tactile Duo-style Cards */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                                        {t.account}
                                    </p>
                                    {maxStreak > 0 && (
                                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                            <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                                            <span>{maxStreak} {t.days}</span>
                                            {maxStreak >= 30 && <Crown className="w-3 h-3 ms-0.5" />}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {[
                                        {
                                            label: t.goalsCreated,
                                            value: goals.length,
                                            icon: Target,
                                            color: "text-primary",
                                            bg: "bg-primary/10 border-primary/20",
                                        },
                                        {
                                            label: t.completedGoals,
                                            value: completedGoals,
                                            icon: Trophy,
                                            color: "text-emerald-500",
                                            bg: "bg-emerald-500/10 border-emerald-500/20",
                                        },
                                        {
                                            label: t.totalPointsEarned,
                                            value: totalPointsEarned >= 1000 ? (totalPointsEarned / 1000).toFixed(1) + 'k' : totalPointsEarned,
                                            icon: Zap,
                                            color: "text-amber-500",
                                            bg: "bg-amber-500/10 border-amber-500/20",
                                        },
                                        {
                                            label: t.totalLogsRecorded,
                                            value: totalLogs,
                                            icon: CalendarCheck,
                                            color: "text-sky-500",
                                            bg: "bg-sky-500/10 border-sky-500/20",
                                        },
                                    ].map((stat, i) => {
                                        const StatIcon = stat.icon;
                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    PANEL_SURFACE,
                                                    "rounded-xl p-2.5 flex items-center gap-2.5 border-b-2 border-border/80 transition-all hover:border-primary/30"
                                                )}
                                            >
                                                <div className={cn("w-8 h-8 shrink-0 rounded-xl flex items-center justify-center border", stat.bg)}>
                                                    <StatIcon className={cn("w-4 h-4", stat.color)} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base font-black leading-tight text-foreground tabular-nums">
                                                        {stat.value}
                                                    </p>
                                                    <p className="text-[10px] font-semibold text-muted-foreground truncate">
                                                        {stat.label}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

                        {/* My Goals — Compact Export & Progress Section */}
                        <section>
                            <div className="mb-2.5 flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                                    <Target className="w-3.5 h-3.5 text-primary" />
                                    {t.myGoalsSection}
                                </p>
                                <span className="text-xs font-semibold text-muted-foreground">
                                    {goals.length} {isArabic ? "أهداف" : "Goals"}
                                </span>
                            </div>

                            {goals.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground/75">
                                    <Target className="w-6 h-6 opacity-40" />
                                    <p className="text-xs font-medium">{t.noGoalsProfileHint}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {goals.map((goal) => {
                                        const GoalIcon = getIconComponent(goal.icon || 'Target');
                                        const isExporting = exportingGoalId === goal.id;
                                        const progressPct = goal.target_points > 0 
                                            ? Math.min(100, Math.round((goal.current_points / goal.target_points) * 100))
                                            : 0;

                                        return (
                                            <div
                                                key={goal.id}
                                                className={cn(PANEL_SURFACE, "flex items-center gap-3 rounded-xl p-2.5 transition-colors duration-200 hover:border-border")}
                                            >
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 shadow-2xs">
                                                    <GoalIcon className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <p className="text-xs font-bold text-foreground truncate">{goal.title}</p>
                                                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums shrink-0">
                                                            {progressPct}%
                                                        </span>
                                                    </div>
                                                    {/* Mini Progress Bar */}
                                                    <div className="h-1.5 w-full rounded-full bg-muted/70 overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full bg-primary transition-all duration-300"
                                                            style={{ width: `${progressPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleExportGoal(goal)}
                                                    disabled={!!exportingGoalId}
                                                    className={cn(
                                                        "shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
                                                        isExporting
                                                            ? "bg-primary/10 text-primary cursor-wait"
                                                            : "bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/70 hover:border-primary/20 active:scale-[0.96]"
                                                    )}
                                                    title={t.exportGoal}
                                                >
                                                    {isExporting ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Download className="w-3.5 h-3.5" />
                                                    )}
                                                    <span className="hidden sm:inline">{isExporting ? t.exportingGoal : t.exportGoal}</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

                        {/* Sign Out */}
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all duration-200 font-semibold text-xs shrink-0 cursor-pointer",
                                signingOut
                                    ? "bg-muted/20 border-border/45 text-muted-foreground cursor-not-allowed"
                                    : "border-destructive/25 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive active:scale-[0.98] shadow-xs"
                            )}
                        >
                            {signingOut ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                                    {t.signingOut}
                                </>
                            ) : (
                                <>
                                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                                    {t.signOut}
                                </>
                            )}
                        </button>
                    </div>
                )}
                </ScrollArea>
            </div>

            {/* Avatar Selector Dialog (Presets + Custom Upload) */}
            <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
                <DialogContent className="max-w-sm p-5 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-foreground">
                            {isArabic ? "اختر صورة للملف الشخصي" : "Choose Profile Avatar"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {isArabic ? "اختر شخصية تعبر عنك أو ارفع صورة خاصة من جهازك" : "Pick an avatar or upload your own custom photo"}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Preset Avatars Grid */}
                    <div className="py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                            {isArabic ? "الشخصيات الجاهزة" : "Preset Characters"}
                        </p>
                        <div className="grid grid-cols-4 gap-2.5">
                            {PRESET_AVATARS.map((preset) => {
                                const isSelected = avatarUrl === preset.url;
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => handleSelectPresetAvatar(preset.url)}
                                        disabled={updatingProfile}
                                        className={cn(
                                            "relative aspect-square rounded-2xl p-1 border-2 transition-all hover:scale-105 active:scale-95 bg-muted/40 cursor-pointer overflow-hidden flex items-center justify-center",
                                            isSelected
                                                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                                                : "border-border/70 hover:border-primary/40"
                                        )}
                                        title={preset.label}
                                    >
                                        <img src={preset.url} alt={preset.label} className="w-full h-full object-contain" />
                                        {isSelected && (
                                            <div className="absolute top-1 end-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                                                <Check className="w-2.5 h-2.5" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="h-px bg-border/60 my-1" />

                    {/* Action buttons: Upload Custom or Remove */}
                    <div className="flex items-center gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={updatingProfile}
                            className="flex-1 flex items-center justify-center gap-2 text-xs font-bold rounded-xl h-10 border-b-2 active:translate-y-0.5 cursor-pointer"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isArabic ? "رفع صورة خاصة" : "Upload Custom"}</span>
                        </Button>

                        {avatarUrl && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    handleRemovePhoto();
                                    setIsAvatarModalOpen(false);
                                }}
                                disabled={updatingProfile}
                                className="text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl h-10 px-3 cursor-pointer"
                                title={t.removePhoto}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
