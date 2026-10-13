import Link from "next/link";
import {
  Target,
  Sparkles,
  Flame,
  Trophy,
  Mic,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { SpotlightCard, ShinyText, Magnet } from "@/components/reactbits";
import PricingSection from "./PricingSection";

/*
 * Public marketing landing page at /home. Reachable without signing in —
 * see the `/home` entry in src/proxy.ts `isPublicPath`.
 *
 * Design constraints (DESIGN.md / BRAND.md):
 * - Semantic tokens only, no raw Tailwind palette classes.
 * - Teal (text-primary) is the single accent; neutrals carry the rest.
 * - Arabic-first copy; the logo stays METRIX via the generated lockup.
 */

const features = [
  {
    icon: Target,
    title: "أهداف بنظام نقاط",
    description:
      "كل هدف يتحول إلى خطة مقسمة مراحل ومهام بنقاط محسوبة. لا قوائم مهام عابرة — نظام محاسبة صارم يقيس تقدمك بالأرقام.",
  },
  {
    icon: Sparkles,
    title: "تسجيل يومي يقيّمه الذكاء الاصطناعي",
    description:
      "اكتب أو سجّل تقدمك اليومي، والذكاء الاصطناعي يقيّم صدقه ويحسب نقاطك. لا تنصّب على نفسك.",
  },
  {
    icon: Flame,
    title: "سلاسل إنجاز",
    description:
      "التزامك اليومي يبني سلسلة تتصاعد كلما واصلت. كسرها يعني خسارة ما جمعت — تمامًا كما في الحياة.",
  },
  {
    icon: Trophy,
    title: "تحديات تنافسية",
    description:
      "نافس أشخاصًا آخرين على أهداف حقيقية، وشاهد أين تقف على لوحة الصدارة.",
  },
  {
    icon: Mic,
    title: "تسجيل صوتي",
    description:
      "لا وقت للكتابة؟ سجّل تقدمك بصوتك ودعه يتحول إلى نص ومن ثم إلى نقاط.",
  },
  {
    icon: BarChart3,
    title: "إحصاءات دقيقة",
    description:
      "رسوم ومؤشرات أسبوعية وشهرية بمحاذاة رقمية مضبوطة — تقدمك أمامك بأرقام لا كلام.",
  },
];

const steps = [
  {
    num: "01",
    title: "اكتب هدفك",
    description:
      "اكتب ما تريد تحقيقه بلغتك الطبيعية، والذكاء الاصطناعي يفككه إلى خطة مرحلية بمهام ونقاط.",
  },
  {
    num: "02",
    title: "سجّل تقدمك يوميًا",
    description:
      "يوميًا، سجّل ما أنجزت. تقييم صارم يمنحك نقاطًا على أساس الإنجاز الحقيقي فقط.",
  },
  {
    num: "03",
    title: "اجمع النقاط واخترق",
    description:
      "السلاسل، النقاط، والتحديات تحافظ على انتظامك حتى الوصول إلى قمة هدفك.",
  },
];


const faqs = [
  {
    q: "كيف يُحسب التقدم؟",
    a: "كل هدف يُقسم إلى مهام بنقاط. تسجّل ما أنجزته يوميًا، ويقيّم الذكاء الاصطناعي ما أنجزته فعليًا ويمنحك النقاط المستحقة — لا نقاط على التمنّي.",
  },
  {
    q: "ماذا يحدث إذا كسرت سلسلتي؟",
    a: "تمامًا كما في الأنظمة الصارمة، كسر السلسلة يعني خسارة تقدمها. لكن هدفك ونقاطك المكتسبة تبقى — غدك فرصة لتعويض ما فات.",
  },
  {
    q: "هل يمكنني تغيير خطتي لاحقًا؟",
    a: "نعم. يمكنك الترقية أو التخفيض في أي وقت، وتحتفظ ببياناتك وأهدافك دائمًا.",
  },
  {
    q: "هل بياناتي آمنة؟",
    a: "بياناتك مشفّرة ومخزّنة بأمان، ولا تُستخدم إلا لتقييم تقدمك وخططك. يمكنك حذف كل شيء في أي وقت.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-svh overflow-x-clip bg-canvas text-foreground">
      {/* Hero — clean canvas with a fading grid and a single soft accent glow */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Fading grid lines, token-driven */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_left,var(--color-border)/35%_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)/35%_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_75%)]"
          />
          {/* One restrained accent glow */}
          <div
            className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_55%_100%_at_50%_0%,--alpha(var(--color-primary)/10%),transparent)]"
          />
        </div>
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 sm:px-6 pt-[max(3rem,calc(env(safe-area-inset-top)+1.5rem))] pb-14 text-center sm:pt-28 sm:pb-20">
          <BrandLockup className="h-auto w-36 sm:w-40 text-foreground" />
          <h1 className="mt-6 sm:mt-8 text-2xl min-[380px]:text-3xl font-bold leading-tight tracking-tight sm:text-5xl text-balance">
            حوّل أي هدف إلى{" "}
            <span className="text-primary">
              (خطة تستطيع فعلًا إتمامها)
            </span>
          </h1>
          <p className="mt-4 sm:mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground text-balance">
            نظام صارم قائم على النقاط: خطة تلقائية، تسجيل يومي يقيّمه الذكاء
            الاصطناعي، وسلاسل إنجاز تحاسبك على التزامك.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col items-center gap-3 w-full max-w-xs sm:max-w-none sm:w-auto sm:flex-row">
            <Magnet padding={35} magnetStrength={3} className="w-full sm:w-auto">
              <Button size="lg" asChild className="gap-2 w-full sm:w-auto">
                <Link href="/login">
                  ابدأ مجانًا الآن
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            </Magnet>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="#pricing">اطّلع على الأسعار</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            بلا بطاقة ائتمانية · ألغِ في أي وقت ·{" "}
            <ShinyText text="(المجاني للأبد)" className="font-semibold text-primary whitespace-nowrap" />
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20">
        <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight">
          لماذا ماتريكس؟
        </h2>
        <p className="mx-auto mt-2 sm:mt-3 max-w-xl text-center text-sm sm:text-base text-muted-foreground text-balance">
          لست بحاجة إلى قائمة مهام أخرى. تحتاج إلى نظام يحاسبك.
        </p>
        <div className="mt-8 sm:mt-12 grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <SpotlightCard
              key={f.title}
              className="p-5 sm:p-6"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </SpotlightCard>
          ))}
        </div>
      </section>
      {/* How it works */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-20">
          <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight">
            كيف يعمل؟
          </h2>
          <div className="mt-8 sm:mt-12 grid gap-6 sm:gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-primary/25 bg-primary/12 font-mono text-sm font-bold text-primary tabular-nums">
                  {s.num}
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-balance">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />
      {/* FAQ */}
      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
          <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight">
            أسئلة شائعة
          </h2>
          <div className="mt-8 sm:mt-10 space-y-3 sm:space-y-4">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-sm sm:text-base [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-balance">
            هدفك يستحق أكثر من نية حسنة
          </h2>
          <p className="mx-auto mt-3 sm:mt-4 max-w-md text-sm sm:text-base text-muted-foreground text-balance">
            أنشئ هدفك الأول اليوم وشاهد كيف يحوّل النظام نيّتك إلى إنجاز مقيس.
          </p>
          <div className="mx-auto mt-6 sm:mt-8 max-w-xs sm:max-w-none">
            <Magnet padding={35} magnetStrength={3} className="w-full sm:w-auto">
              <Button size="lg" asChild className="gap-2 w-full sm:w-auto">
                <Link href="/login">
                  ابدأ مجانًا الآن
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            </Magnet>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 pt-8 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] sm:py-8 sm:flex-row">
          <BrandLockup className="h-auto w-24 sm:w-28 text-foreground" />
          <nav className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="py-1.5 px-1 sm:p-0 hover:text-foreground">
              الخصوصية
            </Link>
            <Link href="/terms" className="py-1.5 px-1 sm:p-0 hover:text-foreground">
              الشروط
            </Link>
            <Link href="/login" className="py-1.5 px-1 sm:p-0 hover:text-foreground">
              تسجيل الدخول
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} METRIX
          </p>
        </div>
      </footer>
    </main>
  );
}

