'use client';

import { useState } from 'react';
import { Crown, Check, Sparkles, Target } from 'lucide-react';
import type { Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Goal } from '../types';

interface SettingsSubscriptionTabProps {
    goals: Goal[];
    language: Language;
    onUpgradeClick?: () => void;
    tier?: 'free' | 'plus' | 'pro';
}

export default function SettingsSubscriptionTab({
    goals,
    language,
    tier = 'free',
    onUpgradeClick,
}: SettingsSubscriptionTabProps) {
    const isArabic = language === 'ar';
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
    const [selectedPlanId, setSelectedPlanId] = useState<string>('plus');

    const activeGoalsCount = goals.filter((g) => g.status !== 'completed').length;
    const currentTier = tier;

    const plans = [
        {
            id: 'free',
            name: isArabic ? 'المجاني' : 'Free',
            priceMonthly: 0,
            priceYearly: 0,
            desc: isArabic ? 'البداية لتنظيم أهدافك الشخصية' : 'Essential tools to track personal ambition',
            features: isArabic
                ? [
                      'هدف واحد نشط في نفس الوقت',
                      '5 تقييمات ذكية بالذكاء الاصطناعي شهرياً',
                      'تتبع سلسلة الإنجاز والتذكيرات اليومية',
                      'إحصاءات أساسية للتقدم',
                  ]
                : [
                      '1 active goal at a time',
                      '5 smart AI evaluations per month',
                      'Streak tracking & daily reminders',
                      'Basic progress metrics',
                  ],
            isCurrent: currentTier === 'free',
        },
        {
            id: 'plus',
            name: 'Plus',
            priceMonthly: 4.99,
            priceYearly: 3.99,
            popular: true,
            desc: isArabic ? 'للجديّين في الالتزام والنمو اليومي' : 'For committed individuals aiming higher',
            features: isArabic
                ? [
                      'حتى 50 هدفاً نشطاً',
                      'تقييم يومي وتسجيل صوتي غير محدود',
                      'تحديات تنافسية ولوحة شرف أسبوعية',
                      'تقارير أسبوعية وتحليل الاتجاهات',
                  ]
                : [
                      'Up to 50 active goals',
                      'Unlimited daily evaluations & voice logs',
                      'Competitive challenges & weekly ranks',
                      'Weekly retrospectives & trend insights',
                  ],
            isCurrent: currentTier === 'plus',
        },
        {
            id: 'pro',
            name: 'Pro',
            priceMonthly: 9.99,
            priceYearly: 7.99,
            desc: isArabic ? 'أقصى قوة للتحليل والإنجاز المتواصل' : 'Ultimate intelligence & unconstrained power',
            features: isArabic
                ? [
                      'أهداف نشطة غير محدودة بالكامل',
                      'كل مميزات باقة Plus',
                      'تحليل عميق بالذكاء الاصطناعي وإعادة موازنة الخطط',
                      'تصدير ملفات Dossier وتكامل متقدم',
                  ]
                : [
                      'Unlimited active goals',
                      'All Plus features included',
                      'Deep AI coaching & adaptive plan rebalancing',
                      'Dossier exports & priority AI processing',
                  ],
            isCurrent: currentTier === 'pro',
        },
    ];

    const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[1] || plans[0];
    const selectedPrice = billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly;

    return (
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200" dir={isArabic ? 'rtl' : 'ltr'}>
            {/* Current Subscription Status Banner — Ultra-compact & distinctive */}
            <div className="rounded-xl border border-border/70 bg-card p-2.5 sm:px-4 sm:py-2.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    {/* Top Row on mobile / Left section on desktop: Tier Identity + Action */}
                    <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                                <Crown className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {isArabic ? 'الباقة المجانية' : 'Free Tier'}
                                </h2>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/15 text-primary border border-primary/25 shrink-0">
                                    {isArabic ? 'نشط' : 'Active'}
                                </span>
                            </div>
                        </div>

                        {/* Upgrade Button on mobile (integrated cleanly on the same line) */}
                        <Button
                            type="button"
                            onClick={onUpgradeClick}
                            className="sm:hidden h-7 px-2.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0 cursor-pointer"
                        >
                            <Sparkles className="w-3 h-3 me-1" />
                            <span>{isArabic ? 'ترقية' : 'Upgrade'}</span>
                        </Button>
                    </div>

                    {/* Quota Chips: 2-column grid on mobile, inline flex on desktop */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 min-w-0">
                        {/* Active Goals Metric */}
                        <div className="flex items-center justify-between sm:justify-start gap-1.5 px-2 py-1 rounded-lg bg-muted/40 border border-border/40 text-xs min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                                <Target className="w-3 h-3 text-primary shrink-0" />
                                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                                    {isArabic ? 'الأهداف' : 'Goals'}
                                </span>
                            </div>
                            <span className="font-bold text-foreground tabular-nums text-[11px] sm:text-xs shrink-0">
                                {activeGoalsCount}
                                <span className="text-muted-foreground/60 font-normal text-[9px] sm:text-[10px]"> / 1</span>
                            </span>
                        </div>

                        {/* AI Evaluations Metric */}
                        <div className="flex items-center justify-between sm:justify-start gap-1.5 px-2 py-1 rounded-lg bg-muted/40 border border-border/40 text-xs min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                                <Sparkles className="w-3 h-3 text-primary shrink-0" />
                                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                                    {isArabic ? 'التقييمات' : 'AI Review'}
                                </span>
                            </div>
                            <span className="font-bold text-foreground tabular-nums text-[11px] sm:text-xs shrink-0">
                                {isArabic ? '5 شهرياً' : '5 / mo'}
                            </span>
                        </div>
                    </div>

                    {/* Desktop Upgrade Button */}
                    <div className="hidden sm:flex items-center shrink-0">
                        <Button
                            type="button"
                            onClick={onUpgradeClick}
                            className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 me-1" />
                            <span>{isArabic ? 'ترقية الباقة' : 'Upgrade Plan'}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Plans Comparison */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {isArabic ? 'خطط الاشتراك والترقية' : 'Available Plans'}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden min-[400px]:block">
                            {isArabic
                                ? 'اختر الخطة المناسبة لتحقيق أهدافك'
                                : 'Choose the plan that fits your growth ambitions'}
                        </p>
                    </div>

                    {/* Monthly / Yearly Switch */}
                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={cn(
                                'px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] sm:text-xs',
                                billingCycle === 'monthly'
                                    ? 'bg-card text-foreground shadow-xs font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {isArabic ? 'شهري' : 'Monthly'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle('yearly')}
                            className={cn(
                                'px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs',
                                billingCycle === 'yearly'
                                    ? 'bg-card text-primary shadow-xs font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <span>{isArabic ? 'سنوي' : 'Yearly'}</span>
                            <span className="text-[9px] bg-primary/15 text-primary px-1 rounded-full font-bold">
                                -20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Mobile View (< md): Contained Plan Box with Segmented Tabs */}
                <div className="md:hidden rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs space-y-3">
                    {/* Segmented Plan Switcher */}
                    <div className="grid grid-cols-3 p-1 rounded-xl bg-muted/50 border border-border/60 gap-1 text-xs font-bold">
                        {plans.map((p) => {
                            const isSelected = selectedPlan.id === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedPlanId(p.id)}
                                    className={cn(
                                        'py-1.5 px-1 rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 text-center select-none',
                                        isSelected
                                            ? 'bg-card text-foreground shadow-xs border border-border/70'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <span className="text-xs font-bold truncate w-full">{p.name}</span>
                                    {p.popular ? (
                                        <span className="text-[9px] font-bold text-primary leading-none">
                                            {isArabic ? 'الأكثر طلباً' : 'Popular'}
                                        </span>
                                    ) : p.isCurrent ? (
                                        <span className="text-[9px] font-bold text-muted-foreground leading-none">
                                            {isArabic ? 'الحالية' : 'Current'}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-transparent leading-none">·</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Plan Content inside the Container */}
                    <div key={selectedPlan.id} className="animate-in fade-in duration-200 space-y-3 pt-0.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-base text-foreground">{selectedPlan.name}</h4>
                                    {selectedPlan.isCurrent && (
                                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                            {isArabic ? 'باقتك الحالية' : 'Current'}
                                        </span>
                                    )}
                                    {selectedPlan.popular && (
                                        <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                                            {isArabic ? 'الأكثر اختياراً' : 'Most Popular'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {selectedPlan.desc}
                                </p>
                            </div>

                            <div className="text-end shrink-0">
                                <span className="text-2xl font-black text-foreground tabular-nums">
                                    {selectedPrice === 0 ? (isArabic ? 'مجاناً' : 'Free') : `$${selectedPrice}`}
                                </span>
                                {selectedPrice > 0 && (
                                    <span className="block text-[10px] text-muted-foreground font-semibold">
                                        {isArabic ? '/ شهرياً' : '/ month'}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* Feature List */}
                        <ul className="space-y-1.5">
                            {selectedPlan.features.map((feat, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
                                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Action Button */}
                        <Button
                            type="button"
                            variant={selectedPlan.isCurrent ? 'outline' : selectedPlan.popular ? 'default' : 'outline'}
                            disabled={selectedPlan.isCurrent}
                            onClick={onUpgradeClick}
                            className={cn(
                                'w-full h-9 rounded-xl text-xs font-bold cursor-pointer mt-2',
                                selectedPlan.isCurrent && 'cursor-default opacity-60'
                            )}
                        >
                            {selectedPlan.isCurrent
                                ? isArabic ? 'باقتك النشطة' : 'Active Plan'
                                : isArabic ? `ترقية إلى ${selectedPlan.name}` : `Upgrade to ${selectedPlan.name}`}
                        </Button>
                    </div>
                </div>

                {/* Desktop View (>= md): Full 3-Column Comparison Grid */}
                <div className="hidden md:grid md:grid-cols-3 gap-3">
                    {plans.map((p) => {
                        const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;
                        return (
                            <div
                                key={p.id}
                                className={cn(
                                    'rounded-xl border p-4 flex flex-col justify-between transition-all bg-card shadow-xs relative',
                                    p.popular
                                        ? 'border-primary ring-1 ring-primary/30 shadow-sm'
                                        : 'border-border/70 hover:border-primary/40'
                                )}
                            >
                                {p.popular && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-2xs">
                                        {isArabic ? 'الأكثر اختياراً' : 'Most Popular'}
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-sm text-foreground">{p.name}</h4>
                                        {p.isCurrent && (
                                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                                {isArabic ? 'باقتك الحالية' : 'Current'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mb-3 min-h-[28px]">
                                        {p.desc}
                                    </p>

                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-2xl font-black text-foreground tabular-nums">
                                            {price === 0 ? (isArabic ? 'مجاناً' : 'Free') : `$${price}`}
                                        </span>
                                        {price > 0 && (
                                            <span className="text-[11px] text-muted-foreground font-semibold">
                                                {isArabic ? '/ شهرياً' : '/ month'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="h-px bg-border/60 mb-3" />

                                    <ul className="space-y-2 mb-4">
                                        {p.features.map((feat, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
                                                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Button
                                    type="button"
                                    variant={p.isCurrent ? 'outline' : p.popular ? 'default' : 'outline'}
                                    disabled={p.isCurrent}
                                    onClick={onUpgradeClick}
                                    className={cn(
                                        'w-full h-9 rounded-lg text-xs font-bold cursor-pointer',
                                        p.isCurrent && 'cursor-default opacity-60'
                                    )}
                                >
                                    {p.isCurrent
                                        ? isArabic ? 'باقتك النشطة' : 'Active Plan'
                                        : isArabic ? `ترقية إلى ${p.name}` : `Upgrade to ${p.name}`}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
