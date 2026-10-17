'use client';

import * as React from 'react';
import { Home, User, Target } from 'lucide-react';
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
                              "group relative flex h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-150 ease-out cursor-pointer select-none active:scale-95 touch-manipulation",
                              isActive
                                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                                  : "bg-card text-muted-foreground border border-border/70 shadow-xs hover:bg-muted/80 hover:text-foreground"
                        )}
                    >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="hidden pointer-fine:block bg-popover text-popover-foreground border-border shadow-md">
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
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex h-[calc(4.5rem+env(safe-area-inset-bottom))] w-full items-end justify-center px-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom))] transition-all duration-500 sm:h-[calc(6rem+env(safe-area-inset-bottom))] sm:px-2 sm:pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:inset-x-auto lg:bottom-auto lg:left-6 lg:top-1/2 lg:h-auto lg:w-auto lg:max-w-none lg:-translate-y-1/2 lg:px-0 lg:pb-0 rtl:lg:left-auto rtl:lg:right-6 rtl:lg:translate-x-0">
            <div className="pointer-events-auto relative flex w-auto max-w-full items-center gap-1 sm:gap-2.5 overflow-x-auto rounded-2xl border border-border/70 bg-card/95 px-1.5 py-1.5 min-[360px]:px-2 min-[360px]:py-2 shadow-md backdrop-blur-xl transition-all duration-300 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-[400px]:gap-2 min-[400px]:px-2.5 sm:justify-start sm:px-3 sm:pb-2.5 sm:pt-2 lg:max-h-[calc(100dvh-4rem)] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:px-2 lg:py-2.5">
                <DockItem
                    icon={Home}
                    label={language === 'ar' ? 'الرئيسية' : 'Home'}
                    isActive={activeTab === 'home'}
                    onClick={() => handleTabChange('home')}
                />

                <DockItem
                    icon={Target}
                    label={t.myGoals}
                    isActive={activeTab === 'goals' || activeTab === 'create-goal-manual'}
                    onClick={() => handleTabChange('goals')}
                />

                <div className="w-px h-6 sm:h-8 lg:w-8 lg:h-px bg-border/60 mx-0.5 sm:mx-1 lg:mx-0 lg:my-1 shrink-0" />

                {/* PINNED GOALS */}
                {pinnedGoals.length > 0 && (
                    <>
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

                        <div className="w-px h-6 sm:h-8 lg:w-8 lg:h-px bg-border/60 mx-0.5 sm:mx-1 lg:mx-0 lg:my-1 shrink-0" />
                    </>
                )}

                <DockItem
                    icon={User}
                    label={t.orbitProfile}
                    isActive={activeTab === 'settings'}
                    onClick={() => handleTabChange('settings')}
                />
            </div>
        </div>
    );
}
