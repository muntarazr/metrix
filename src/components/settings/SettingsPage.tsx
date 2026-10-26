'use client';

import { useState, useEffect } from 'react';
import { User as UserIcon, Sliders } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { WELL_SURFACE } from '@/lib/surfaces';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { exportGoalMarkdownDirect } from '@/lib/goal-exporter';
import AvatarDialog from './AvatarDialog';
import SettingsProfileTab from './tabs/SettingsProfileTab';
import SettingsPreferencesTab from './tabs/SettingsPreferencesTab';
import SettingsDangerZone from './tabs/SettingsDangerZone';
import { useSettingsProfile } from './useSettingsProfile';
import type { Goal, SettingsTab, SettingsPageProps } from './types';

export type { Goal, SettingsPageProps };

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

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [signingOut, setSigningOut] = useState(false);
    const [isManifestoOpen, setIsManifestoOpen] = useState(false);
    const [exportingGoalId, setExportingGoalId] = useState<string | null>(null);

    const {
        supabase,
        displayName,
        avatarUrl,
        updatingProfile,
        isSavingName,
        isAvatarModalOpen,
        setIsAvatarModalOpen,
        profileMessage,
        setProfileMessage,
        totalLogs,
        maxStreak,
        coachPersona,
        fileInputRef,
        handlePersonaChange,
        handleDisplayNameChange,
        handleDisplayNameBlur,
        handleSelectPresetAvatar,
        handlePhotoUpload,
        handleRemovePhoto,
    } = useSettingsProfile({
        user,
        language,
        onProfileUpdated,
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) setTheme(savedTheme);
    }, []);

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

    const handleSignOut = async () => {
        setSigningOut(true);
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const handleExportGoal = async (goalItem: Goal) => {
        try {
            setExportingGoalId(goalItem.id);
            await exportGoalMarkdownDirect(supabase, goalItem, isArabic);
            setProfileMessage({
                type: 'success',
                text: isArabic ? 'تم تصدير ملف الهدف بنجاح' : 'Goal dossier exported successfully',
            });
            setTimeout(() => setProfileMessage(null), 3000);
        } catch (err) {
            console.error('Error exporting goal:', err);
            setProfileMessage({
                type: 'error',
                text: isArabic ? 'فشل تصدير الهدف' : 'Failed to export goal',
            });
            setTimeout(() => setProfileMessage(null), 3000);
        } finally {
            setExportingGoalId(null);
        }
    };

    const completedGoals = goals.filter((g) => g.current_points >= g.target_points).length;
    const totalPointsEarned = goals.reduce((sum, g) => sum + (g.current_points || 0), 0);

    return (
        <div
            className="w-full max-w-4xl lg:max-w-[1041px] mx-auto flex-1 flex flex-col gap-4"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <MatrixManifestoDialog
                open={isManifestoOpen}
                onOpenChange={setIsManifestoOpen}
                language={language}
            />

            <div className={cn(WELL_SURFACE, "p-3 sm:p-4 rounded-2xl sm:rounded-[22px] flex-1 flex flex-col min-h-0")}>
                {/* Tabs Bar Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex flex-1 gap-1 p-1 rounded-xl bg-muted/60 border border-border/70 h-11">
                        <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className={cn(
                                "flex flex-1 min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer touch-manipulation",
                                activeTab === 'profile'
                                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/45"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                            )}
                        >
                            <UserIcon className="w-4 h-4 opacity-80 shrink-0" />
                            <span className="truncate">{isArabic ? "الملف الشخصي" : "Profile"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('general')}
                            className={cn(
                                "flex flex-1 min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer touch-manipulation",
                                activeTab === 'general'
                                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/45"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                            )}
                        >
                            <Sliders className="w-4 h-4 opacity-80 shrink-0" />
                            <span className="truncate">{isArabic ? "التفضيلات" : "Preferences"}</span>
                        </button>
                    </div>
                </div>

                {profileMessage && (
                    <div
                        className={cn(
                            "text-xs font-bold px-3.5 py-2 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs mb-3",
                            profileMessage.type === 'success'
                                ? "bg-primary/10 text-primary border-primary/25"
                                : "bg-destructive/10 text-destructive border-destructive/25"
                        )}
                    >
                        {profileMessage.text}
                    </div>
                )}

                {/* Tab Content inside ScrollArea */}
                <ScrollArea className="flex-1 min-h-0 pe-1" dir={isArabic ? 'rtl' : 'ltr'}>
                    <div className="pb-1">
                        {activeTab === 'profile' ? (
                            <SettingsProfileTab
                                user={user}
                                displayName={displayName}
                                onDisplayNameChange={handleDisplayNameChange}
                                onDisplayNameBlur={handleDisplayNameBlur}
                                isSavingName={isSavingName}
                                avatarUrl={avatarUrl}
                                onOpenAvatarModal={() => setIsAvatarModalOpen(true)}
                                maxStreak={maxStreak}
                                totalPointsEarned={totalPointsEarned}
                                totalLogs={totalLogs}
                                completedGoals={completedGoals}
                                goals={goals}
                                coachPersona={coachPersona}
                                onPersonaChange={handlePersonaChange}
                                onSelectGoal={onSelectGoal}
                                onExportGoal={handleExportGoal}
                                exportingGoalId={exportingGoalId}
                                language={language}
                            />
                        ) : (
                            <div className="space-y-4">
                                <SettingsPreferencesTab
                                    theme={theme}
                                    onThemeChange={handleThemeChange}
                                    language={language}
                                    onLanguageChange={handleLanguageChange}
                                    onOpenManifesto={() => setIsManifestoOpen(true)}
                                />
                                <SettingsDangerZone
                                    signingOut={signingOut}
                                    onSignOut={handleSignOut}
                                    language={language}
                                />
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Hidden File Input for Custom Upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
            />

            {/* Avatar Dialog */}
            <AvatarDialog
                isOpen={isAvatarModalOpen}
                onOpenChange={setIsAvatarModalOpen}
                avatarUrl={avatarUrl}
                displayName={displayName}
                userEmail={user?.email}
                updatingProfile={updatingProfile}
                onSelectPresetAvatar={handleSelectPresetAvatar}
                onUploadClick={() => fileInputRef.current?.click()}
                onRemovePhoto={handleRemovePhoto}
                language={language}
            />
        </div>
    );
}
