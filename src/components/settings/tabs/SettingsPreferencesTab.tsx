'use client';

import { Sun, Moon, Globe, Bell, Clock, Flame, ScrollText } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface SettingsPreferencesTabProps {
    theme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
    language: Language;
    onLanguageChange: (lang: Language) => void;
    onOpenManifesto: () => void;
}

export default function SettingsPreferencesTab({
    theme,
    onThemeChange,
    language,
    onLanguageChange,
    onOpenManifesto,
}: SettingsPreferencesTabProps) {
    const t = translations[language];
    const isArabic = language === 'ar';

    return (
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                {/* Appearance */}
                <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-muted/12 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <p className="font-black text-foreground text-xs sm:text-sm truncate">{t.appearance}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 bg-muted/60 p-0.5 sm:p-1 rounded-xl border border-border/60">
                        <button
                            type="button"
                            onClick={() => onThemeChange('light')}
                            className={cn(
                                "flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                theme === 'light' ? "bg-card text-primary shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                            )}
                            title={t.lightMode}
                        >
                            <Sun className="w-3.5 h-3.5 me-1" />
                            <span>{t.lightMode}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onThemeChange('dark')}
                            className={cn(
                                "flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                theme === 'dark' ? "bg-card text-primary shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                            )}
                            title={t.darkMode}
                        >
                            <Moon className="w-3.5 h-3.5 me-1" />
                            <span>{t.darkMode}</span>
                        </button>
                    </div>
                </div>

                {/* Language */}
                <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-muted/12 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                            <Globe className="w-4 h-4" />
                        </div>
                        <p className="font-black text-foreground text-xs sm:text-sm truncate">{t.language}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 bg-muted/60 p-0.5 sm:p-1 rounded-xl border border-border/60">
                        <button
                            type="button"
                            onClick={() => onLanguageChange('en')}
                            className={cn(
                                "flex items-center justify-center px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
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
                                "flex items-center justify-center px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                language === 'ar' ? "bg-card text-foreground shadow-xs ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                            )}
                            title={t.arabic}
                        >
                            <span>{t.arabic}</span>
                        </button>
                    </div>
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
