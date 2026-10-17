'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE } from '@/lib/surfaces';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconPicker } from '../IconPicker';

export interface ManualBasicsStepProps {
    goalTitle: string;
    onGoalTitleChange: (title: string) => void;
    goalIcon: string;
    onGoalIconChange: (icon: string) => void;
    goalDomain?: string;
    onGoalDomainChange?: (domain: string) => void;
    customCategories?: string[];
    isAddingCategory?: boolean;
    setIsAddingCategory?: (val: boolean) => void;
    newCategoryName?: string;
    setNewCategoryName?: (name: string) => void;
    onAddCustomCategory?: () => void;
    onDeleteCustomCategory?: (cat: string) => void;
    onNext: () => void;
    isArabic: boolean;
}

export default function ManualBasicsStep({
    goalTitle,
    onGoalTitleChange,
    goalIcon,
    onGoalIconChange,
    onNext,
    isArabic,
}: ManualBasicsStepProps) {
    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-foreground">
                    {isArabic ? 'ما هو الهدف الذي تريد تحقيقه؟' : 'What goal do you want to achieve?'}
                </h2>
                <p className="text-xs text-muted-foreground">
                    {isArabic ? 'اكتب اسم هدفك واختر له أيقونة مناسبة تمثلك.' : 'Name your goal and pick an icon that represents it.'}
                </p>
            </div>

            <div className={cn(PANEL_SURFACE, "rounded-2xl border border-border/70 p-4 sm:p-5 space-y-4 shadow-xs")}>
                {/* Title and Icon */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>{isArabic ? 'عنوان الهدف' : 'Goal Title'}</span>
                        <span className="text-[10px] text-muted-foreground">
                            {isArabic ? 'مطلوب' : 'Required'}
                        </span>
                    </label>

                    <div className="flex items-center gap-2.5">
                        <IconPicker
                            selectedIcon={goalIcon}
                            onSelectIcon={onGoalIconChange}
                            className="w-12 h-12 shrink-0 border-primary/20 hover:border-primary/40 rounded-xl bg-muted/20"
                        />
                        <Input
                            value={goalTitle}
                            onChange={(e) => onGoalTitleChange(e.target.value)}
                            placeholder={isArabic ? 'مثلاً: إتقان لغة بايثون، قراءة 12 كتاباً، ركض 10 كم...' : 'e.g. Master Python, Read 12 Books...'}
                            className="h-12 rounded-xl text-base font-bold px-3.5 bg-background/80 border-border/80 focus:border-primary"
                            dir={isArabic ? 'rtl' : 'ltr'}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onNext();
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Step 1 Actions */}
            <div className="pt-2 flex justify-end">
                <Button
                    type="button"
                    onClick={onNext}
                    disabled={!goalTitle.trim()}
                    className="h-11 px-4 sm:px-6 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                    <span>
                        <span className="hidden sm:inline">{isArabic ? 'التالي: تحديد المدة والنقاط' : 'Next: Timeline & Points'}</span>
                        <span className="sm:hidden">{isArabic ? 'التالي: المدة' : 'Next'}</span>
                    </span>
                    {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
}
