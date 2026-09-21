'use client';

import * as React from 'react';
import { Home, Settings, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIconComponent } from './goal/IconPicker';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { translations, type Language } from '@/lib/translations';

interface DockItemProps {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    onClick: () => void;
}

const DockItem = ({ icon: Icon, label, isActive, onClick }: DockItemProps) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        aria-label={label}
                        className={cn(
                              "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-150 ease-out after:absolute after:-inset-1 cursor-pointer select-none",
                              isActive
                                  ? "bg-primary text-primary-foreground shadow-[0_3px_0_0_color-mix(in_oklch,var(--primary)_70%,black)] active:translate-y-[2px]"
                                  : "bg-card text-muted-foreground border-2 border-border/70 shadow-[0_2px_0_0_var(--border)] hover:-translate-y-0.5 hover:bg-muted/60 hover:text-foreground active:translate-y-[1px]"
                        )}
                    >
                        <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border shadow-md">
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

interface OrbitDockProps {
    goals?: DockGoal[];
    selectedGoalId?: string | null;
    onSelectGoal?: (id: string | null) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    language?: Language;
}

interface DockGoal {
    id: string;
    title: string;
    icon?: string;
    is_pinned?: boolean;
}

export default function OrbitDock({
    goals = [],
    selectedGoalId,
    onSelectGoal,
    activeTab = 'home',
    onTabChange,
    language = 'ar'
}: OrbitDockProps) {
    const t = translations[language];
    const pinnedGoals = goals.filter(g => g.is_pinned).slice(0, 2);

    const handleTabChange = (tab: string) => {
        if (onTabChange) onTabChange(tab);
    };

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex h-[calc(5rem+env(safe-area-inset-bottom))] w-full items-end justify-center px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-all duration-500 sm:h-24 lg:inset-x-auto lg:bottom-auto lg:left-6 lg:top-1/2 lg:h-auto lg:w-auto lg:max-w-none lg:-translate-y-1/2 lg:px-0 lg:pb-0 rtl:lg:left-auto rtl:lg:right-6 rtl:lg:translate-x-0">
            <div className="pointer-events-auto relative flex max-w-full items-center gap-1.5 overflow-x-auto rounded-[2rem] border-2 border-border/80 bg-card/95 px-2 pb-2.5 pt-2 shadow-lg backdrop-blur-xl transition-all duration-300 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-[400px]:gap-2 min-[400px]:px-2.5 min-[480px]:w-full min-[480px]:justify-center sm:w-auto sm:justify-start sm:gap-2.5 sm:px-3 sm:pb-3 sm:pt-2.5 lg:max-h-[calc(100dvh-4rem)] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:px-2.5 lg:py-3">
                <DockItem
                    icon={Home}
                    label={language === 'ar' ? 'الرئيسية' : 'Home'}
                    isActive={activeTab === 'home'}
                    onClick={() => handleTabChange('home')}
                />

                <DockItem
                    icon={Target}
                    label={t.myGoals}
                    isActive={activeTab === 'goals'}
                    onClick={() => handleTabChange('goals')}
                />

                <div className="w-px h-6 sm:h-8 lg:w-8 lg:h-px bg-border/60 mx-0.5 sm:mx-1 lg:mx-0 lg:my-1 shrink-0" />

                {/* PINNED GOALS */}
                <div className="flex lg:flex-col items-center gap-2 sm:gap-3 shrink-0">
                    {pinnedGoals.map(goal => {
                        const GoalIcon = getIconComponent(goal.icon || 'Target');
                        return (
                            <DockItem
                                key={goal.id}
                                icon={GoalIcon}
                                label={goal.title}
                                isActive={activeTab === 'dashboard' && selectedGoalId === goal.id}
                                onClick={() => {
                                    if (onSelectGoal) onSelectGoal(goal.id);
                                    handleTabChange('dashboard');
                                }}
                            />
                        );
                    })}
                </div>

                {goals.some(g => g.is_pinned) && (
                    <div className="w-px h-6 sm:h-8 lg:w-8 lg:h-px bg-border/60 mx-0.5 sm:mx-1 lg:mx-0 lg:my-1 shrink-0" />
                )}

                <DockItem
                    icon={Settings}
                    label={t.orbitSettings}
                    isActive={activeTab === 'settings'}
                    onClick={() => handleTabChange('settings')}
                />
            </div>
        </div>
    );
}
