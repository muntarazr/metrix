'use client';

import { useState } from 'react';
import { Crown, Check, Zap, Sparkles, Shield, ArrowUpRight, HelpCircle } from 'lucide-react';
import type { Language } from '@/lib/translations';
import { translations } from '@/lib/translations';
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
    const t = translations[language];
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

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

    return (
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200" dir={isArabic ? 'rtl' : 'ltr'}>
            {/* Current Subscription Status Banner */}
            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                            <Crown className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-foreground">
                                    {isArabic ? 'الباقة المجانية (Free Tier)' : 'Free Tier'}
                                </h2>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/25">
                                    {isArabic ? 'نشط' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            onClick={onUpgradeClick}
                            className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 me-1.5" />
                            <span>{isArabic ? 'ترقية الباقة' : 'Upgrade Plan'}</span>
                        </Button>
                    </div>
                </div>

                {/* Quota overview */}
                <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                            <span>{isArabic ? 'الأهداف النشطة' : 'Active Goals'}</span>
                            <span className="text-foreground font-bold tabular-nums">
                                {activeGoalsCount} / 1
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all',
                                    activeGoalsCount >= 1 ? 'bg-amber-500 w-full' : 'bg-primary w-0'
                                )}
                            />
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                            <span>{isArabic ? 'التقييمات الذكية' : 'AI Evaluations'}</span>
                            <span className="text-foreground font-bold tabular-nums">
                                {isArabic ? '5 شهرياً' : '5 / mo'}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                            {isArabic ? 'تتجدد مع بداية كل شهر ميلادي' : 'Renews on 1st of every month'}
                        </p>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                            <span>{isArabic ? 'تشفير الفواتير' : 'Billing Security'}</span>
                            <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                                <Shield className="w-3 h-3" />
                                <span>{isArabic ? 'آمن' : 'Secured'}</span>
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                            {isArabic ? 'معالجة مشفرة وآمنة بنسبة 100%' : 'Encrypted billing gateway'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Plans Comparison */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                        <h3 className="text-sm font-bold text-foreground">
                            {isArabic ? 'خطط الاشتراك والترقية' : 'Available Plans'}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {isArabic
                                ? 'اختر الخطة التي تمنحك الحرية الكاملة لتحقيق أهدافك'
                                : 'Choose the plan that fits your growth ambitions'}
                        </p>
                    </div>

                    {/* Monthly / Yearly Switch */}
                    <div className="flex self-start sm:self-auto shrink-0 items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={cn(
                                'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
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
                                'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1',
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
