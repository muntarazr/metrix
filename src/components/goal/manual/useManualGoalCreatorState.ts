'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { DifficultyLevel } from '../goal-creator-types';
import {
    DRAFT_STORAGE_KEY,
    CUSTOM_CATEGORIES_STORAGE_KEY,
    DOMAINS,
    SIMPLE_DIFFICULTIES,
    type ManualTaskDraft,
    type SavedDraft,
} from './manual-goal-types';

export function useManualGoalCreatorState(
    initialGoalText: string = '',
    onGuardStateChange?: (active: boolean) => void,
    language: string = 'ar'
) {
    const isArabic = language === 'ar';
    const supabase = useMemo(() => createClient(), []);

    // Step state: 1: Goal, 2: Timeline & Points, 3: Tasks & Launch
    const [step, setStep] = useState<number>(1);
    const [draftRestored, setDraftRestored] = useState<boolean>(false);

    // Goal Identity
    const [goalTitle, setGoalTitle] = useState(initialGoalText);
    const [goalIcon, setGoalIcon] = useState('Target');
    const [goalDomain, setGoalDomain] = useState<string>('skills');

    // Custom Categories
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Timeline & Points
    const [totalDays, setTotalDays] = useState<number>(90);
    const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
    const [isCustomPoints, setIsCustomPoints] = useState<boolean>(false);
    const [customPoints, setCustomPoints] = useState<number>(9000);

    // Tasks list
    const [tasks, setTasks] = useState<ManualTaskDraft[]>([
        {
            id: 'task_1',
            task_description: '',
            frequency: 'daily',
            schedule_days: null,
            impact_weight: 3,
            time_required_minutes: 30,
            completion_criteria: '',
        },
    ]);

    // Status
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    // --- 0. LOAD CUSTOM CATEGORIES ---
    useEffect(() => {
        try {
            const raw = localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setCustomCategories(parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0));
                }
            }
        } catch (e) {
            console.error('Failed to parse custom categories from localStorage', e);
        }

        // Also fetch distinct custom domains from user goals in database
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data: goalsData } = await supabase
                    .from('goals')
                    .select('domain')
                    .eq('user_id', user.id);

                if (goalsData && Array.isArray(goalsData)) {
                    const defaultKeys = new Set(DOMAINS.map((d) => d.key));
                    const dbCustomDomains = goalsData
                        .map((g) => g.domain?.trim())
                        .filter((d): d is string => Boolean(d && !defaultKeys.has(d as any)));

                    if (dbCustomDomains.length > 0) {
                        setCustomCategories((prev) => {
                            const merged = Array.from(new Set([...prev, ...dbCustomDomains]));
                            try {
                                localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(merged));
                            } catch {
                                // ignore
                            }
                            return merged;
                        });
                    }
                }
            } catch {
                // ignore
            }
        })();
    }, [supabase]);

    // --- 1. LOCAL STORAGE RESTORE ON MOUNT ---
    useEffect(() => {
        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (rawDraft) {
                const parsed: SavedDraft = JSON.parse(rawDraft);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.goalTitle || (parsed.tasks && parsed.tasks.length > 0)) {
                        setGoalTitle(parsed.goalTitle || initialGoalText || '');
                        setGoalIcon(parsed.goalIcon || 'Target');
                        const restoredDomain = parsed.goalDomain || 'skills';
                        setGoalDomain(restoredDomain);
                        const defaultKeys = new Set(DOMAINS.map((d) => d.key));
                        if (!defaultKeys.has(restoredDomain as any)) {
                            setCustomCategories((prev) => {
                                if (prev.includes(restoredDomain)) return prev;
                                const next = [...prev, restoredDomain];
                                try {
                                    localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
                                } catch {
                                    // ignore
                                }
                                return next;
                            });
                        }
                        setTotalDays(parsed.totalDays || 90);
                        setDifficulty(parsed.difficulty || 'medium');
                        setIsCustomPoints(Boolean(parsed.isCustomPoints));
                        setCustomPoints(parsed.customPoints || 9000);
                        if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
                            setTasks(parsed.tasks);
                        }
                        if (parsed.step && parsed.step >= 1 && parsed.step <= 3) {
                            setStep(parsed.step);
                        }
                        setDraftRestored(true);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to parse goal draft from localStorage', err);
        }
    }, [initialGoalText]);

    // --- 2. LOCAL STORAGE AUTO-SAVE ON CHANGE ---
    useEffect(() => {
        try {
            const draft: SavedDraft = {
                step,
                goalTitle,
                goalIcon,
                goalDomain,
                totalDays,
                difficulty,
                isCustomPoints,
                customPoints,
                tasks,
            };
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (err) {
            console.error('Failed to save goal draft to localStorage', err);
        }
    }, [step, goalTitle, goalIcon, goalDomain, totalDays, difficulty, isCustomPoints, customPoints, tasks]);

    // Reset draft
    const handleResetDraft = useCallback(() => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
            // ignore
        }
        setStep(1);
        setGoalTitle('');
        setGoalIcon('Target');
        setGoalDomain('skills');
        setTotalDays(90);
        setDifficulty('medium');
        setIsCustomPoints(false);
        setCustomPoints(9000);
        setTasks([
            {
                id: `task_${Date.now()}`,
                task_description: '',
                frequency: 'daily',
                schedule_days: null,
                impact_weight: 3,
                time_required_minutes: 30,
                completion_criteria: '',
            },
        ]);
        setDraftRestored(false);
        setErrorMessage(null);
    }, []);

    // Calculate Target Points
    const targetPoints = useMemo(() => {
        if (isCustomPoints) {
            return Math.max(1, customPoints);
        }
        const diffConfig = SIMPLE_DIFFICULTIES.find(d => d.key === difficulty) || SIMPLE_DIFFICULTIES[1];
        return Math.max(10, totalDays * diffConfig.rate);
    }, [isCustomPoints, customPoints, difficulty, totalDays]);

    // Calculate Completion Date
    const targetDateFormatted = useMemo(() => {
        const targetDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000);
        return targetDate.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
        });
    }, [totalDays, isArabic]);

    // Navigation guard
    const isDirty = useMemo(() => {
        return (
            goalTitle.trim().length > 0 ||
            tasks.some((t) => t.task_description.trim().length > 0)
        );
    }, [goalTitle, tasks]);

    useEffect(() => {
        if (!showCelebration) {
            onGuardStateChange?.(isDirty);
        } else {
            onGuardStateChange?.(false);
        }
    }, [isDirty, showCelebration, onGuardStateChange]);

    // Custom category handlers
    const handleAddCustomCategory = useCallback(() => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;

        const matchedDefault = DOMAINS.find(
            (d) =>
                d.key.toLowerCase() === trimmed.toLowerCase() ||
                d.labelAr.toLowerCase() === trimmed.toLowerCase() ||
                d.labelEn.toLowerCase() === trimmed.toLowerCase()
        );

        if (matchedDefault) {
            setGoalDomain(matchedDefault.key);
        } else {
            setCustomCategories((prev) => {
                const next = prev.includes(trimmed) ? prev : [...prev, trimmed];
                try {
                    localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
                } catch {
                    // ignore
                }
                return next;
            });
            setGoalDomain(trimmed);
        }

        setNewCategoryName('');
        setIsAddingCategory(false);
    }, [newCategoryName]);

    const handleDeleteCustomCategory = useCallback((categoryToDelete: string) => {
        setCustomCategories((prev) => {
            const next = prev.filter((c) => c !== categoryToDelete);
            try {
                localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });

        setGoalDomain((current) => (current === categoryToDelete ? 'skills' : current));
    }, []);

    // Step Validation
    const handleNextStep = () => {
        setErrorMessage(null);
        if (step === 1) {
            if (!goalTitle.trim()) {
                setErrorMessage(isArabic ? 'يرجى كتابة عنوان للهدف للمتابعة.' : 'Please enter a goal title to proceed.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = () => {
        setErrorMessage(null);
        if (step > 1) {
            setStep(step - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Task handlers
    const handleAddTask = () => {
        const newTask: ManualTaskDraft = {
            id: `task_${Date.now()}`,
            task_description: '',
            frequency: 'daily',
            schedule_days: null,
            impact_weight: 3,
            time_required_minutes: 30,
            completion_criteria: '',
        };
        setTasks((prev) => [...prev, newTask]);
    };

    const handleUpdateTask = (id: string, patch: Partial<ManualTaskDraft>) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
        );
    };

    const handleDeleteTask = (id: string) => {
        if (tasks.length <= 1) {
            setTasks([
                {
                    id: `task_${Date.now()}`,
                    task_description: '',
                    frequency: 'daily',
                    schedule_days: null,
                    impact_weight: 3,
                    time_required_minutes: 30,
                    completion_criteria: '',
                },
            ]);
            return;
        }
        setTasks((prev) => prev.filter((t) => t.id !== id));
    };

    return {
        supabase,
        isArabic,
        step,
        setStep,
        draftRestored,
        handleResetDraft,
        goalTitle,
        setGoalTitle,
        goalIcon,
        setGoalIcon,
        goalDomain,
        setGoalDomain,
        customCategories,
        isAddingCategory,
        setIsAddingCategory,
        newCategoryName,
        setNewCategoryName,
        handleAddCustomCategory,
        handleDeleteCustomCategory,
        totalDays,
        setTotalDays,
        difficulty,
        setDifficulty,
        isCustomPoints,
        setIsCustomPoints,
        customPoints,
        setCustomPoints,
        tasks,
        handleAddTask,
        handleUpdateTask,
        handleDeleteTask,
        saving,
        setSaving,
        errorMessage,
        setErrorMessage,
        showCelebration,
        setShowCelebration,
        targetPoints,
        targetDateFormatted,
        handleNextStep,
        handlePrevStep,
    };
}
