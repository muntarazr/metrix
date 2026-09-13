"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
 * Interactive pricing section: a single billing toggle (monthly / yearly),
 * compact plan cards, and a smart default (yearly selected — better value,
 * but monthly is one tap away). Kept deliberately small so the decision
 * for the user is one glance + one tap.
 */

type Plan = {
  name: string;
  tagline: string;
  monthly: number;
  features: string[];
  cta: string;
  highlighted?: boolean;
  note?: string;
};

const YEARLY_FREE_MONTHS = 2;

const plans: Plan[] = [
  {
    name: "المجاني",
    tagline: "ابدأ بدون أي تكلفة",
    monthly: 0,
    features: [
      "هدف واحد نشط",
      "5 تقييمات ذكية شهريًا",
      "سلسلة إنجاز وتذكيرات",
      "إحصاءات أسبوعية مبسطة",
    ],
    cta: "ابدأ مجانًا",
  },
  {
    name: "Plus",
    tagline: "للجديّين في التزامهم",
    monthly: 4.99,
    highlighted: true,
    note: "الأكثر اختيارًا",
    features: [
      "حتى 50 هدفًا نشطًا",
      "تقييم يومي وصوتي غير محدود",
      "تحديات ولوحة صدارة",
      "إحصاءات ومراجعة أسبوعية",
    ],
    cta: "اشترك في Plus",
  },
  {
    name: "Pro",
    tagline: "قوة كاملة بلا حدود",
    monthly: 9.99,
    features: [
      "أهداف نشطة غير محدودة",
      "كل مميزات Plus",
      "تحليل عميق وتحسين الخطط",
      "أولوية أسرع وتصدير البيانات",
    ],
    cta: "اشترك في Pro",
  },
];

function formatPrice(value: number) {
  return value % 1 === 0 ? `$${value}` : `$${value.toFixed(2)}`;
}

export default function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  const priceFor = (plan: Plan) => {
    if (plan.monthly === 0) return formatPrice(0);
    return billing === "monthly"
      ? formatPrice(plan.monthly)
      : formatPrice(Math.round(plan.monthly * (12 - YEARLY_FREE_MONTHS)));
  };

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight">
        اختر خطتك
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        ابدأ مجانيًا وارتقِ عندما يكبر التزامك. ألغِ في أي وقت.
      </p>

      {/* Billing toggle — yearly preselected as the smarter default */}
      <div className="mt-8 flex justify-center">
        <div
          role="tablist"
          aria-label="دورة الفوترة"
          className="inline-flex rounded-full border border-border bg-card p-1 shadow-xs"
        >
          {(
            [
              { key: "monthly", label: "شهري" },
              { key: "yearly", label: "سنوي" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              role="tab"
              aria-selected={billing === opt.key}
              onClick={() => setBilling(opt.key)}
              className={
                billing === opt.key
                  ? "rounded-full bg-primary px-5 py-1.5 text-sm font-semibold text-primary-foreground transition-colors duration-200"
                  : "rounded-full px-5 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
              }
            >
              {opt.label}
              {opt.key === "yearly" && (
                <span
                  className={
                    billing === "yearly"
                      ? "ms-1.5 text-xs opacity-90"
                      : "ms-1.5 text-xs font-semibold text-primary"
                  }
                >
                  (وفّر شهرين)
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isYearly = billing === "yearly" && plan.monthly > 0;
          const savings =
            isYearly
              ? Math.round(plan.monthly * YEARLY_FREE_MONTHS * 100) / 100
              : 0;
          return (
            <div
              key={plan.name}
              className={
                plan.highlighted
                  ? "relative flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-md"
                  : "relative flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm"
              }
            >
              {plan.note && (
                <span className="absolute -top-3 start-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {plan.note}
                </span>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.tagline}
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums">
                  {priceFor(plan)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.monthly === 0
                    ? "مجانًا للأبد"
                    : billing === "monthly"
                      ? "شهريًا"
                      : "سنويًا"}
                </span>
              </div>
              {isYearly && (
                <p className="mt-1 text-xs font-medium text-primary">
                  بدلًا من {formatPrice(plan.monthly * 12)} سنويًا — توفير{" "}
                  {formatPrice(savings)}
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={
                        plan.highlighted
                          ? "mt-0.5 size-4 shrink-0 text-primary"
                          : "mt-0.5 size-4 shrink-0 text-foreground/50"
                      }
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href="/login">{plan.cta}</Link>
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
