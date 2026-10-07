'use client';

import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Sun, Moon, Globe, Flame, Crown, LogOut, Loader2, ScrollText, Camera,
    Bell, Clock, Settings, ArrowRight, ArrowLeft, Target,
    Plus, CheckCircle2, Calendar, Bot, Brain, Sparkles, Download
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { cn, formatNumberEn } from '@/lib/utils';
import { PANEL_SURFACE, WELL_SURFACE } from '@/lib/surfaces';
import { getGoalIcon } from '@/components/goal/IconPicker';
import { getGoalEndDaysChip } from '@/lib/goal-dates';
import {
    isNotificationsEnabled,
    setNotificationsEnabled,
    getNotificationTime,
    setNotificationTime
} from '@/hooks/useStreakReminder';

const PRESET_AVATARS = [
    { id: 'notion-1', label: 'Aiden', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Aiden' },
    { id: 'notion-2', label: 'Sarah', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sarah' },
    { id: 'notion-3', label: 'Marcus', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Marcus' },
    { id: 'notion-4', label: 'Amaya', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Amaya' },
];
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
    onSelectGoal?: (goalId: string) => void;
    onNavigateToCreate?: () => void;
}

type SettingsTab = 'general' | 'profile';

export default function SettingsPage({
    user,
    language,
    setLanguage,
    goals,
    onProfileUpdated,
    onGoalsDeleted,
    onSelectGoal,
    onNavigateToCreate,
}: SettingsPageProps) {
    const t = translations[language];
    const isArabic = language === 'ar';
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
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
    const [exportingGoalId, setExportingGoalId] = useState<string | null>(null);
    const [coachPersona, setCoachPersona] = useState<'strict' | 'balanced' | 'analytical'>('balanced');
    const nameDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) setTheme(savedTheme);
        const savedPersona = localStorage.getItem('metrix:coach_persona') as 'strict' | 'balanced' | 'analytical' | null;
        if (savedPersona) setCoachPersona(savedPersona);
        setStreakNotifsEnabled(isNotificationsEnabled());
        setStreakNotifTimeState(getNotificationTime());
        fetchStats();
    }, []);

    useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
            setAvatarUrl(user.user_metadata?.avatar_url || null);
            if (user.user_metadata?.coach_persona && !localStorage.getItem('metrix:coach_persona')) {
                setCoachPersona(user.user_metadata.coach_persona);
            }
        }
    }, [user]);

    const handlePersonaChange = async (newPersona: 'strict' | 'balanced' | 'analytical') => {
        setCoachPersona(newPersona);
        if (typeof window !== 'undefined') {
            localStorage.setItem('metrix:coach_persona', newPersona);
        }
        try {
            await supabase.auth.updateUser({
                data: { coach_persona: newPersona },
            });
        } catch {
            // Non-fatal
        }
    };

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

    const handleExportGoal = async (goalItem: Goal) => {
        try {
            setExportingGoalId(goalItem.id);

            // Fetch tasks/sub_layers
            const { data: tasks, error: tasksError } = await supabase
                .from('sub_layers')
                .select('id, task_description, task_type, parent_task_id, frequency, impact_weight, time_required_minutes, completion_criteria, sort_order')
                .eq('goal_id', goalItem.id)
                .order('sort_order', { ascending: true });

            if (tasksError) {
                console.error('Error fetching tasks for export:', tasksError);
            }

            // Fetch recent logs
            const { data: logs, error: logsError } = await supabase
                .from('daily_logs')
                .select('id, created_at, user_input, ai_score, ai_feedback')
                .eq('goal_id', goalItem.id)
                .order('created_at', { ascending: false })
                .limit(30);

            if (logsError) {
                console.error('Error fetching logs for export:', logsError);
            }

            const progress = goalItem.target_points > 0
                ? Math.min(100, Math.round((goalItem.current_points / goalItem.target_points) * 100))
                : 0;

            const mainTasks = (tasks || []).filter((t: { task_type: string }) => t.task_type === 'main');
            const subTasksByParent = (tasks || []).reduce<Record<string, Array<{ id: string; task_description: string; frequency?: string | null; time_required_minutes?: number | null; completion_criteria?: string | null }>>>((acc, t: { id: string; task_description: string; parent_task_id?: string | null; frequency?: string | null; time_required_minutes?: number | null; completion_criteria?: string | null }) => {
                if (t.parent_task_id) {
                    if (!acc[t.parent_task_id]) acc[t.parent_task_id] = [];
                    acc[t.parent_task_id].push(t);
                }
                return acc;
            }, {});

            let md = `# ${goalItem.title}\n\n`;
            md += `> **${isArabic ? 'حالة الهدف' : 'Status'}**: ${goalItem.status || 'active'} | **${isArabic ? 'التقدّم' : 'Progress'}**: ${goalItem.current_points} / ${goalItem.target_points} pts (${progress}%)\n`;
            if (goalItem.estimated_completion_date) {
                md += `> **${isArabic ? 'تاريخ الإنجاز المستهدف' : 'Target Date'}**: ${goalItem.estimated_completion_date} | **${isArabic ? 'إجمالي الأيام' : 'Total Days'}**: ${goalItem.total_days || '-'}\n`;
            }
            md += `> **${isArabic ? 'تاريخ الإنشاء' : 'Created At'}**: ${new Date(goalItem.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}\n\n`;

            if (goalItem.ai_summary) {
                md += `## ${isArabic ? 'ملخص الخطة والهدف' : 'Overview & AI Plan'}\n\n`;
                md += `${goalItem.ai_summary}\n\n`;
            }

            md += `## ${isArabic ? 'هيكل المهام والمسارات' : 'Tasks & Hierarchy'}\n\n`;
            if (mainTasks.length === 0 && (!tasks || tasks.length === 0)) {
                md += `*${isArabic ? 'لا توجد مهام محددة لهذا الهدف.' : 'No tasks defined for this goal.'}*\n\n`;
            } else {
                mainTasks.forEach((mt: { id: string; task_description: string; impact_weight: number | null; completion_criteria?: string | null }, idx: number) => {
                    const subs = subTasksByParent[mt.id] || [];
                    md += `### ${idx + 1}. ${mt.task_description}\n`;
                    md += `- **${isArabic ? 'الوزن النسبي' : 'Impact Weight'}**: ${mt.impact_weight || 0}%\n`;
                    if (mt.completion_criteria) {
                        md += `- **${isArabic ? 'معيار الإنجاز' : 'Completion Criteria'}**: ${mt.completion_criteria}\n`;
                    }
                    if (subs.length > 0) {
                        md += `\n**${isArabic ? 'المهام الفرعية:' : 'Subtasks:'}**\n`;
                        subs.forEach((st) => {
                            const freqLabel = st.frequency === 'weekly' ? (isArabic ? 'أسبوعي' : 'Weekly') : (isArabic ? 'يومي' : 'Daily');
                            const timeStr = st.time_required_minutes ? ` (~${st.time_required_minutes} ${isArabic ? 'دقيقة' : 'min'})` : '';
                            md += `  - [ ] **${st.task_description}** [${freqLabel}${timeStr}]\n`;
                            if (st.completion_criteria) {
                                md += `    - *${isArabic ? 'المعيار' : 'Criteria'}*: ${st.completion_criteria}\n`;
                            }
                        });
                    }
                    md += `\n`;
                });
            }

            if (logs && logs.length > 0) {
                md += `## ${isArabic ? 'سجل النشاط والتقييمات الأخيرة' : 'Recent Activity & Daily Logs'}\n\n`;
                logs.forEach((log: { created_at: string; ai_score: number | null; user_input: string | null; ai_feedback: string | null }) => {
                    const dateStr = new Date(log.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US');
                    md += `### 📅 ${dateStr} - ${log.ai_score !== null ? `${log.ai_score} / 100` : (isArabic ? 'بدون تقييم' : 'Unrated')}\n`;
                    if (log.user_input) {
                        md += `**${isArabic ? 'تقرير المستخدم:' : 'Report:'}**\n${log.user_input}\n\n`;
                    }
                    if (log.ai_feedback) {
                        md += `> **${isArabic ? 'تقييم الذكاء الاصطناعي:' : 'AI Feedback:'}**\n> ${log.ai_feedback.replace(/\n/g, '\n> ')}\n\n`;
                    }
                });
            }

            // Create download
            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const cleanTitle = (goalItem.title || 'goal').trim().replace(/[/\\?%*:|"<>]/g, '-').slice(0, 50);
            a.href = url;
            a.download = `${cleanTitle}-METRIX.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProfileMessage({
                type: 'success',
                text: isArabic ? 'تم تصدير ملف الهدف بنجاح' : 'Goal dossier exported successfully'
            });
            setTimeout(() => setProfileMessage(null), 3000);
        } catch (err) {
            console.error('Error exporting goal:', err);
            setProfileMessage({
                type: 'error',
                text: isArabic ? 'فشل تصدير الهدف' : 'Failed to export goal'
            });
            setTimeout(() => setProfileMessage(null), 3000);
        } finally {
            setExportingGoalId(null);
        }
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
    const completionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;





    return (
        <div
            className="w-full max-w-3xl mx-auto flex-1 flex flex-col gap-4"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <MatrixManifestoDialog
                open={isManifestoOpen}
                onOpenChange={setIsManifestoOpen}
            />

            {/* Top Bar Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                {activeTab === 'profile' ? (
                    <>
                        <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                            {t.orbitProfile}
                        </h1>

                        <button
                            type="button"
                            onClick={() => setActiveTab('general')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/70 hover:border-primary/40 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span>{t.orbitSettings}</span>
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/60 hover:bg-muted text-foreground border border-border/70 hover:border-primary/30 transition-all cursor-pointer shadow-xs"
                        >
                            {isArabic ? (
                                <ArrowRight className="w-3.5 h-3.5" />
                            ) : (
                                <ArrowLeft className="w-3.5 h-3.5" />
                            )}
                            <span>{t.backToProfile}</span>
                        </button>
                        <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                            {t.generalSettings}
                        </h1>
                    </div>
                )}
            </div>

            {profileMessage && (
                <div className={cn(
                    "text-xs font-bold px-3.5 py-2 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs",
                    profileMessage.type === 'success'
                        ? "bg-primary/10 text-primary border-primary/25"
                        : "bg-destructive/10 text-destructive border-destructive/25"
                )}>
                    {profileMessage.text}
                </div>
            )}

            {/* Hidden File Input for Custom Upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
            />

            {activeTab === 'profile' ? (
                <div className="w-full space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Minimal Identity Bar */}
                    <div className="h-[72px] rounded-xl border border-border/70 bg-card px-3.5 sm:px-4 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3.5 min-w-0">
                            {/* Avatar with subtle hover camera indicator */}
                            <div className="relative group shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsAvatarModalOpen(true)}
                                    className="w-12 h-12 rounded-full overflow-hidden bg-muted/80 border border-border/70 flex items-center justify-center transition-all hover:ring-2 hover:ring-primary/40 hover:scale-105 active:scale-95 cursor-pointer relative shadow-xs"
                                    title={t.editAvatar}
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black text-foreground">
                                            {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                                        <Camera className="w-4 h-4 text-white" />
                                    </div>
                                </button>
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={handleDisplayNameChange}
                                        onBlur={handleDisplayNameBlur}
                                        placeholder={user?.email?.split('@')[0] || (isArabic ? 'الاسم...' : 'Name...')}
                                        className="font-black text-foreground text-sm sm:text-base tracking-tight bg-transparent hover:bg-muted/40 focus:bg-card px-1 py-0.5 rounded-md border border-transparent hover:border-border/60 focus:border-primary/50 focus:outline-none transition-all truncate"
                                    />
                                    {isSavingName && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate px-1">
                                    {user?.email || '—'}
                                </p>
                            </div>
                        </div>

                        {user?.created_at && (
                            <div className={cn(
                                "shrink-0 flex flex-col px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] sm:text-xs font-semibold text-muted-foreground leading-snug",
                                isArabic ? "text-right items-start" : "text-left items-start"
                            )}>
                                <span>{t.memberSince}</span>
                                <span>{new Date(user.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' })}</span>
                            </div>
                        )}
                    </div>

                    {/* Minimal Stats Row (Clean typography, no icon clutter) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { value: `${maxStreak} ${t.days}`, label: t.bestStreak },
                            { value: totalPointsEarned >= 1000 ? (totalPointsEarned / 1000).toFixed(1) + 'k' : totalPointsEarned.toString(), label: isArabic ? 'النقاط' : 'Points' },
                            { value: totalLogs.toString(), label: isArabic ? 'التسجيلات' : 'Logs' },
                            { value: `${completedGoals} / ${goals.length}`, label: t.completedGoals },
                        ].map((stat, idx) => (
                            <div
                                key={idx}
                                className="rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 text-center shadow-xs"
                            >
                                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums tracking-tight">
                                    {stat.value}
                                </p>
                                <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* AI Coach Persona Selector */}
                    <div className="rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                                    <Bot className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="font-bold text-xs sm:text-sm text-foreground tracking-tight">
                                        {isArabic ? 'شخصية مدرب الذكاء الاصطناعي' : 'AI Coach Persona'}
                                    </h3>
                                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                        {isArabic ? '— أسلوب التقييم ومستوى الصرامة' : '— Critique tone & rigor'}
                                    </span>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                {coachPersona === 'strict'
                                    ? (isArabic ? 'صارم' : 'Strict')
                                    : coachPersona === 'analytical'
                                        ? (isArabic ? 'تحليلي' : 'Analytical')
                                        : (isArabic ? 'متوازن' : 'Balanced')}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2" dir={isArabic ? 'rtl' : 'ltr'}>
                            {[
                                {
                                    id: 'strict' as const,
                                    titleAr: 'صارم وحازم',
                                    titleEn: 'Strict & Direct',
                                    descAr: 'انضباط صارم ومباشر بدون مجاملة.',
                                    descEn: 'Uncompromising rigor focused on discipline.',
                                    icon: Flame,
                                },
                                {
                                    id: 'balanced' as const,
                                    titleAr: 'متوازن ومشجع',
                                    titleEn: 'Balanced & Motivating',
                                    descAr: 'تقييم محفز يعزز الاستمرارية والجهد.',
                                    descEn: 'Encouraging yet honest, builds momentum.',
                                    icon: Sparkles,
                                },
                                {
                                    id: 'analytical' as const,
                                    titleAr: 'واقعي وتحليلي',
                                    titleEn: 'Analytical & Pragmatic',
                                    descAr: 'يركز على الأرقام والمخرجات الملموسة.',
                                    descEn: 'Pragmatic breakdown of time and outputs.',
                                    icon: Brain,
                                },
                            ].map((persona) => {
                                const Icon = persona.icon;
                                const isSelected = coachPersona === persona.id;
                                return (
                                    <button
                                        key={persona.id}
                                        type="button"
                                        onClick={() => handlePersonaChange(persona.id)}
                                        className={cn(
                                            'px-2.5 py-1.5 sm:py-2 rounded-xl border text-start transition-all duration-200 cursor-pointer active:scale-[0.98] flex flex-col justify-center gap-0.5',
                                            isSelected
                                                ? 'border-primary/50 bg-primary/[0.08] shadow-xs ring-1 ring-primary/25'
                                                : 'border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border'
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={cn(
                                                    'p-1 rounded-md border flex items-center justify-center shrink-0',
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-muted/60 text-muted-foreground border-border/70'
                                                )}>
                                                    <Icon className="w-3 h-3" />
                                                </span>
                                                <span className="font-extrabold text-xs text-foreground truncate">
                                                    {isArabic ? persona.titleAr : persona.titleEn}
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1">
                                            {isArabic ? persona.descAr : persona.descEn}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Goals Showcase Section */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between pb-0.5">
                            <h2 className="text-xs sm:text-sm font-bold text-muted-foreground tracking-tight">
                                {isArabic ? 'الأهداف' : 'Goals'}
                                <span className="ms-1.5 text-[11px] font-medium opacity-60 tabular-nums">
                                    ({goals.length})
                                </span>
                            </h2>
                        </div>

                        {goals.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-4 text-center">
                                <p className="text-xs text-muted-foreground">
                                    {isArabic ? 'لا توجد أهداف نشطة حالياً' : 'No active goals yet'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {goals.map((goalItem) => {
                                    const progress = goalItem.target_points > 0
                                        ? Math.min(100, Math.round((goalItem.current_points / goalItem.target_points) * 100))
                                        : 0;
                                    const isDone = progress >= 100;
                                    const endDaysChip = getGoalEndDaysChip(goalItem.estimated_completion_date, isArabic);

                                    return (
                                        <div
                                            key={goalItem.id}
                                            onClick={() => onSelectGoal?.(goalItem.id)}
                                            role={onSelectGoal ? 'button' : undefined}
                                            tabIndex={onSelectGoal ? 0 : undefined}
                                            onKeyDown={(e) => {
                                                if (onSelectGoal && (e.key === 'Enter' || e.key === ' ')) {
                                                    e.preventDefault();
                                                    onSelectGoal(goalItem.id);
                                                }
                                            }}
                                            className={cn(
                                                "group rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 transition-all duration-150 hover:border-primary/40 hover:shadow-xs shadow-2xs select-none",
                                                onSelectGoal && "cursor-pointer"
                                            )}
                                        >
                                            {/* Header Row: Icon + Title + Actions */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 p-1.5 shadow-2xs">
                                                        {getGoalIcon(goalItem.icon || 'Target')}
                                                    </span>

                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                        <h3 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                                            {goalItem.title}
                                                        </h3>

                                                        {isDone && (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 shrink-0">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span>{isArabic ? 'مكتمل' : 'Done'}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Button: Export (Icon-only) */}
                                                <div
                                                    className="flex items-center gap-1 shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleExportGoal(goalItem);
                                                        }}
                                                        disabled={exportingGoalId === goalItem.id}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/60 hover:border-primary/40 transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50"
                                                        title={exportingGoalId === goalItem.id ? (isArabic ? 'جارٍ التصدير...' : 'Exporting...') : (isArabic ? 'تصدير الهدف' : 'Export Goal')}
                                                    >
                                                        {exportingGoalId === goalItem.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                                        ) : (
                                                            <Download className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Progress Bar & Stats (Compact single-level) */}
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                                    <span className="flex items-center gap-1 tabular-nums">
                                                        <span className="text-foreground font-black">+{formatNumberEn(goalItem.current_points)}</span>
                                                        <span className="opacity-60">/ {formatNumberEn(goalItem.target_points)}</span>
                                                    </span>

                                                    <div className="flex items-center gap-2">
                                                        {endDaysChip && (
                                                            <span className={cn(
                                                                "text-[10px] font-semibold",
                                                                endDaysChip.tone === 'late' && "text-destructive",
                                                                endDaysChip.tone === 'soon' && "text-amber-500"
                                                            )} title={endDaysChip.title}>
                                                                {endDaysChip.text}
                                                            </span>
                                                        )}
                                                        <span className={cn(
                                                            "font-bold tabular-nums text-xs",
                                                            isDone ? "text-emerald-500" : "text-primary"
                                                        )}>
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/60 border border-border/50">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-500 ease-out",
                                                            isDone
                                                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                                                : "bg-primary"
                                                        )}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* GENERAL SETTINGS TAB */
                <div className="max-w-3xl mx-auto w-full space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                        {/* Appearance */}
                        <div className="p-4 sm:p-5 flex flex-row items-center justify-between gap-3 hover:bg-muted/12 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="font-black text-foreground text-sm">{t.appearance}</p>
                                    <p className="text-xs text-muted-foreground">{t.appearanceDesc}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0 bg-muted/60 p-1 rounded-xl border border-border/60">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={cn(
                                        "flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        theme === 'light' ? "bg-card text-primary shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.lightMode}
                                >
                                    <Sun className="w-3.5 h-3.5 me-1.5" />
                                    <span>{t.lightMode}</span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={cn(
                                        "flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        theme === 'dark' ? "bg-card text-primary shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.darkMode}
                                >
                                    <Moon className="w-3.5 h-3.5 me-1.5" />
                                    <span>{t.darkMode}</span>
                                </button>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="p-4 sm:p-5 flex flex-row items-center justify-between gap-3 hover:bg-muted/12 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-black text-foreground text-sm">{t.language}</p>
                                    <p className="text-xs text-muted-foreground">{t.languageDesc}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0 bg-muted/60 p-1 rounded-xl border border-border/60">
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    className={cn(
                                        "flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        language === 'en' ? "bg-card text-foreground shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.english}
                                >
                                    <span>{t.english}</span>
                                </button>
                                <button
                                    onClick={() => handleLanguageChange('ar')}
                                    className={cn(
                                        "flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        language === 'ar' ? "bg-card text-foreground shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={t.arabic}
                                >
                                    <span>{t.arabic}</span>
                                </button>
                            </div>
                        </div>

                        {/* Daily Streak Reminder */}
                        <div className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-muted/12 transition-colors">
                            <div className="flex flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-foreground text-sm">
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
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
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
                                <div className="mt-2 pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <label className="block font-bold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-primary" />
                                            <span>{isArabic ? "وقت التنبيه المفضل:" : "Preferred Alert Time:"}</span>
                                        </label>
                                        <select
                                            value={streakNotifTime}
                                            onChange={(e) => handleTimeChange(e.target.value)}
                                            className="w-full bg-card border border-border/70 rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary/30 focus:outline-none"
                                        >
                                            <option value="20:00">{isArabic ? "8:00 مساءً (قبل النهاية بـ 4 ساعات)" : "8:00 PM (4h before midnight)"}</option>
                                            <option value="21:00">{isArabic ? "9:00 مساءً (الموصى به)" : "9:00 PM (Recommended)"}</option>
                                            <option value="22:00">{isArabic ? "10:00 مساءً (تنبيه متأخر)" : "10:00 PM (Late Reminder)"}</option>
                                            <option value="23:00">{isArabic ? "11:00 مساءً (الفرصة الأخيرة)" : "11:00 PM (Last Chance)"}</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                                            <Flame className="w-3.5 h-3.5 text-primary" />
                                            <span>{isArabic ? "نهاية يوم التسجيل:" : "Daily Cutoff Time:"}</span>
                                        </label>
                                        <div className="bg-muted/40 border border-border/60 rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center justify-between font-medium">
                                            <span>{isArabic ? "منتصف الليل (12:00 ص)" : "Midnight (12:00 AM)"}</span>
                                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                                {isArabic ? "موعد الإغلاق" : "Day Reset"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Matrix Story Card */}
                    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                                <ScrollText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-foreground text-sm">{t.matrixStory}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{t.matrixStoryDesc}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsManifestoOpen(true)}
                                className="shrink-0 rounded-lg bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium transition-all hover:bg-primary/90 active:scale-95 cursor-pointer shadow-xs"
                            >
                                {t.readStory}
                            </button>
                        </div>
                    </div>

                    {/* Sign Out Card */}
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all duration-200 font-medium text-xs cursor-pointer shadow-xs",
                            signingOut
                                ? "bg-muted/20 border-border/45 text-muted-foreground cursor-not-allowed"
                                : "border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive active:scale-[0.98]"
                        )}
                    >
                        {signingOut ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                                {t.signingOut}
                            </>
                        ) : (
                            <>
                                <LogOut className="w-4 h-4 shrink-0" />
                                {t.signOut}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Minimalist Avatar Dialog */}
            <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
                <DialogContent className="max-w-xs p-5 rounded-2xl" dir={isArabic ? 'rtl' : 'ltr'}>
                    <DialogHeader className="pb-1 text-center">
                        <DialogTitle className="text-base font-bold text-foreground">
                            {isArabic ? "الصورة الشخصية" : "Profile Picture"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Current Preview */}
                    <div className="flex justify-center my-2">
                        <div className="w-18 h-18 rounded-full overflow-hidden bg-muted/80 border border-border/70 shadow-xs flex items-center justify-center">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black text-foreground">
                                    {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Primary Action: Upload Photo */}
                    <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={updatingProfile}
                        className="w-full flex items-center justify-center gap-2 text-xs font-medium rounded-lg h-9 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                    >
                        <Camera className="w-4 h-4" />
                        <span>{isArabic ? "رفع صورتك من جهازك" : "Upload your photo"}</span>
                    </Button>

                    {/* Subtle divider */}
                    <div className="flex items-center gap-2 my-2 text-[10px] text-muted-foreground">
                        <div className="h-px flex-1 bg-border/60" />
                        <span>{isArabic ? "أو اختر رسماً مبسطاً" : "Or choose a sketch"}</span>
                        <div className="h-px flex-1 bg-border/60" />
                    </div>

                    {/* Minimalist sketches */}
                    <div className="grid grid-cols-4 gap-2">
                        {PRESET_AVATARS.map((preset) => {
                            const isSelected = avatarUrl === preset.url;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelectPresetAvatar(preset.url)}
                                    disabled={updatingProfile}
                                    className={cn(
                                        "aspect-square rounded-full p-1 border-2 transition-transform active:scale-95 bg-muted/40 cursor-pointer overflow-hidden flex items-center justify-center",
                                        isSelected
                                            ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                                            : "border-border/70 hover:border-primary/40"
                                    )}
                                    title={preset.label}
                                >
                                    <img src={preset.url} alt="" className="w-full h-full object-contain" />
                                </button>
                            );
                        })}
                    </div>

                    {avatarUrl && (
                        <button
                            type="button"
                            onClick={() => {
                                handleRemovePhoto();
                                setIsAvatarModalOpen(false);
                            }}
                            disabled={updatingProfile}
                            className="text-[11px] font-semibold text-destructive hover:underline text-center pt-2 cursor-pointer w-full"
                        >
                            {isArabic ? "إزالة الصورة واستخدام الحرف الأول" : "Remove photo (use initials)"}
                        </button>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
