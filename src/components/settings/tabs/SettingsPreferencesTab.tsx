'use client';

import { Sun, Moon, Globe, Bell, Clock, Flame, ScrollText } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface SettingsPreferencesTabProps {
    theme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
    language: Language;
    onLanguageChange: (lang: Language) => void;
    streakNotifsEnabled: boolean;
    onToggleStreakNotifs: () => void;
    streakNotifTime: string;
    onTimeChange: (time: string) => void;
    onOpenManifesto: () => void;
}

export default function SettingsPreferencesTab({
    theme,
    onThemeChange,
    language,
    onLanguageChange,
    streakNotifsEnabled,
    onToggleStreakNotifs,
    streakNotifTime,
    onTimeChange,
    onOpenManifesto,
}: SettingsPreferencesTabProps) {
    const t = translations[language];
    const isArabic = language === 'ar';

    return (
        <div className="max-w-3xl mx-auto w-full space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                {/* Appearance */}
                <div className="p-4 sm:p-5 flex flex-col min-[420px]:flex-row items-stretch min-[420px]:items-center justify-between gap-3 hover:bg-muted/12 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-foreground text-sm">{t.appearance}</p>
                            <p className="text-xs text-muted-foreground">{t.appearanceDesc}</p>
                        </div>
                    </div>
                    <div className="flex w-full min-[420px]:w-auto gap-1 shrink-0 bg-muted/60 p-1 rounded-xl border border-border/60">
                        <button
                            type="button"
                            onClick={() => onThemeChange('light')}
                            className={cn(
                                "flex flex-1 min-[420px]:flex-initial items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                theme === 'light' ? "bg-card text-primary shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                            )}
                            title={t.lightMode}
                        >
                            <Sun className="w-3.5 h-3.5 me-1.5" />
                            <span>{t.lightMode}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onThemeChange('dark')}
                            className={cn(
                                "flex flex-1 min-[420px]:flex-initial items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
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
                <div className="p-4 sm:p-5 flex flex-col min-[420px]:flex-row items-stretch min-[420px]:items-center justify-between gap-3 hover:bg-muted/12 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                            <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-foreground text-sm">{t.language}</p>
                            <p className="text-xs text-muted-foreground">{t.languageDesc}</p>
                        </div>
                    </div>
                    <div className="flex w-full min-[420px]:w-auto gap-1 shrink-0 bg-muted/60 p-1 rounded-xl border border-border/60">
                        <button
                            type="button"
                            onClick={() => onLanguageChange('en')}
                            className={cn(
                                "flex flex-1 min-[420px]:flex-initial items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                language === 'en' ? "bg-card text-foreground shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                            )}
                            title={t.english}
                        >
                            <span>{t.english}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onLanguageChange('ar')}
                            className={cn(
                                "flex flex-1 min-[420px]:flex-initial items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
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
                            onClick={onToggleStreakNotifs}
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
                                <label className="font-bold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-primary" />
                                    <span>{isArabic ? "وقت التنبيه المفضل:" : "Preferred Alert Time:"}</span>
                                </label>
                                <select
                                    value={streakNotifTime}
                                    onChange={(e) => onTimeChange(e.target.value)}
                                    className="w-full bg-card border border-border/70 rounded-lg px-3 py-2 text-base sm:text-xs font-medium text-foreground focus:ring-1 focus:ring-primary/30 focus:outline-none cursor-pointer"
                                >
                                    <option value="20:00">{isArabic ? "8:00 مساءً (قبل النهاية بـ 4 ساعات)" : "8:00 PM (4h before midnight)"}</option>
                                    <option value="21:00">{isArabic ? "9:00 مساءً (الموصى به)" : "9:00 PM (Recommended)"}</option>
                                    <option value="22:00">{isArabic ? "10:00 مساءً (تنبيه متأخر)" : "10:00 PM (Late Reminder)"}</option>
                                    <option value="23:00">{isArabic ? "11:00 مساءً (الفرصة الأخيرة)" : "11:00 PM (Last Chance)"}</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-foreground/80 mb-1.5 flex items-center gap-1.5">
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
                        <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1">{t.matrixStoryDesc}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onOpenManifesto}
                        className="shrink-0 rounded-lg bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium transition-all hover:bg-primary/90 active:scale-95 cursor-pointer shadow-xs"
                    >
                        {t.readStory}
                    </button>
                </div>
            </div>
        </div>
    );
}
