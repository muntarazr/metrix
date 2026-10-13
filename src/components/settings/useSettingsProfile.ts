'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import type { CoachPersona } from './types';

interface UseSettingsProfileProps {
    user: SupabaseUser | null;
    language: Language;
    onProfileUpdated?: () => void | Promise<void>;
}

export function useSettingsProfile({
    user,
    language,
    onProfileUpdated,
}: UseSettingsProfileProps) {
    const isArabic = language === 'ar';
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [totalLogs, setTotalLogs] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [coachPersona, setCoachPersona] = useState<CoachPersona>('balanced');
    const nameDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    const fetchStats = useCallback(async () => {
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
                Object.values(logsByGoal).forEach((dates) => {
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
    }, [supabase]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedPersona = localStorage.getItem('metrix:coach_persona') as CoachPersona | null;
        if (savedPersona) setCoachPersona(savedPersona);
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
            setAvatarUrl(user.user_metadata?.avatar_url || null);
            if (user.user_metadata?.coach_persona && !localStorage.getItem('metrix:coach_persona')) {
                setCoachPersona(user.user_metadata.coach_persona);
            }
        }
    }, [user]);

    const handlePersonaChange = async (newPersona: CoachPersona) => {
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

    return {
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
    };
}
