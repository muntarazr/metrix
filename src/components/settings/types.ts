import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Language } from '@/lib/translations';

export interface Goal {
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

export type SettingsTab = 'general' | 'profile' | 'subscription';

export type CoachPersona = 'strict' | 'balanced' | 'analytical';

export interface PresetAvatar {
    id: string;
    label: string;
    url: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
    { id: 'notion-1', label: 'Aiden', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Aiden' },
    { id: 'notion-2', label: 'Sarah', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sarah' },
    { id: 'notion-3', label: 'Marcus', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Marcus' },
    { id: 'notion-4', label: 'Amaya', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Amaya' },
];

export interface SettingsPageProps {
    user: SupabaseUser | null;
    language: Language;
    setLanguage: (lang: Language) => void;
    goals: Goal[];
    onProfileUpdated?: () => void | Promise<void>;
    onGoalsDeleted?: () => void;
    onSelectGoal?: (goalId: string) => void;
    onNavigateToCreate?: () => void;
}
