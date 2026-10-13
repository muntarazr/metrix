'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Plus, Tag, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE } from '@/lib/surfaces';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconPicker } from '../IconPicker';
import { DOMAINS } from './manual-goal-types';

export interface ManualBasicsStepProps {
    goalTitle: string;
    onGoalTitleChange: (title: string) => void;
    goalIcon: string;
    onGoalIconChange: (icon: string) => void;
    goalDomain: string;
    onGoalDomainChange: (domain: string) => void;
    customCategories: string[];
    isAddingCategory: boolean;
    setIsAddingCategory: (val: boolean) => void;
    newCategoryName: string;
    setNewCategoryName: (name: string) => void;
    onAddCustomCategory: () => void;
    onDeleteCustomCategory: (cat: string) => void;
    onNext: () => void;
    isArabic: boolean;
}

export default function ManualBasicsStep({
    goalTitle,
    onGoalTitleChange,
    goalIcon,
    onGoalIconChange,
    goalDomain,
    onGoalDomainChange,
    customCategories,
    isAddingCategory,
    setIsAddingCategory,
    newCategoryName,
    setNewCategoryName,
    onAddCustomCategory,
    onDeleteCustomCategory,
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

                {/* Domain / Category pills */}
                <div className="space-y-2.5 pt-1 border-t border-border/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-muted-foreground">
                            {isArabic ? 'تصنيف الهدف' : 'Category'}
                        </label>
                        {!isAddingCategory && (
                            <button
                                type="button"
                                onClick={() => setIsAddingCategory(true)}
                                className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{isArabic ? 'إضافة تصنيف مخصص' : 'Add custom category'}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {DOMAINS.map((dom) => {
                            const DomIcon = dom.icon;
                            const isSelected = goalDomain === dom.key;
                            return (
                                <button
                                    key={dom.key}
                                    type="button"
                                    onClick={() => onGoalDomainChange(dom.key)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                                            : "bg-muted/40 hover:bg-muted border-border/70 text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <DomIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>{isArabic ? dom.labelAr : dom.labelEn}</span>
                                </button>
                            );
                        })}

                        {/* Custom Categories */}
                        {customCategories.map((customCat) => {
                            const isSelected = goalDomain === customCat;
                            return (
                                <div key={customCat} className="inline-flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => onGoalDomainChange(customCat)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95",
                                            isSelected
                                                ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                                                : "bg-muted/40 hover:bg-muted border-border/70 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Tag className="w-3.5 h-3.5 shrink-0" />
                                        <span>{customCat}</span>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteCustomCategory(customCat);
                                            }}
                                            className={cn(
                                                "p-0.5 rounded-md hover:bg-black/20 text-current opacity-60 hover:opacity-100 transition-opacity",
                                                isArabic ? "mr-1 -ml-1" : "ml-1 -mr-1"
                                            )}
                                            title={isArabic ? 'حذف التصنيف' : 'Delete category'}
                                        >
                                            <X className="w-3 h-3" />
                                        </span>
                                    </button>
                                </div>
                            );
                        })}

                        {/* Add Custom Category Pill Trigger */}
                        {!isAddingCategory && (
                            <button
                                type="button"
                                onClick={() => setIsAddingCategory(true)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span>{isArabic ? 'تصنيف مخصص...' : 'Custom...'}</span>
                            </button>
                        )}
                    </div>

                    {/* Inline Add Category Form */}
                    {isAddingCategory && (
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/70 animate-in fade-in duration-200">
                            <Tag className="w-4 h-4 text-primary shrink-0 ms-1" />
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder={isArabic ? 'اكتب اسم التصنيف الجديد (مثلاً: مالية، دراسة، دين)...' : 'Enter category name...'}
                                className="h-9 flex-1 min-w-[140px] text-base sm:text-xs font-medium rounded-lg bg-background/90"
                                dir={isArabic ? 'rtl' : 'ltr'}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onAddCustomCategory();
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setIsAddingCategory(false);
                                        setNewCategoryName('');
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={onAddCustomCategory}
                                disabled={!newCategoryName.trim()}
                                className="h-9 px-3 rounded-lg font-bold text-xs gap-1 shrink-0 bg-primary text-primary-foreground"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isArabic ? 'إضافة' : 'Add'}</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsAddingCategory(false);
                                    setNewCategoryName('');
                                }}
                                className="h-9 px-2 rounded-lg text-xs shrink-0 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
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
