'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BrandLockup } from '@/components/brand/Logo';
import { ArrowLeft, ArrowRight, ListChecks, Sparkles, Swords, TrendingUp } from 'lucide-react';
import type { Language } from '@/lib/translations';

const STORAGE_KEY = 'metrix_onboarding_seen';

interface Slide {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

const SLIDES: Record<Language, Slide[]> = {
  ar: [
    {
      title: 'أهلاً بك في ماتريكس',
      body: 'المكان اللي تحوّل بيه أي هدف — تعلّم مهارة، بناء عادة، إنجاز مشروع — إلى خطة واضحة تتابعها خطوة بخطوة. خلّينا نوريك شلون تشتغل بدقيقة.',
    },
    {
      icon: Sparkles,
      title: 'خطتك تنبني تلقائياً',
      body: 'اكتب هدفك بكلماتك العادية، والذكاء الاصطناعي يبني لك خطة كاملة مقسّمة على أيام وأسابيع. وإذا عندك خطة جاهزة، تكدر تضيفها بنفسك يدوياً.',
    },
    {
      icon: ListChecks,
      title: 'سجّل تقدّمك',
      body: 'كل يوم — أو كل أسبوع حسب نوع خطتك — تسجّل شنو أنجزت. كل مهمة تخلّصها تزيد نقاطك وتبني سلسلة أيامك المتواصلة.',
    },
    {
      icon: TrendingUp,
      title: 'شوف أرقامك',
      body: 'لوحة تعرض لك نقاطك الكلية، سلسلة أيامك، ومسار تقدّمك نحو الهدف. تعرف بالضبط وين واصل، مو بالإحساس، بالأرقام.',
    },
    {
      icon: Swords,
      title: 'تحدّى صديقك',
      body: 'تكدر تسوي تحدّي ثنائي وترسل كود الدعوة لصديقك، وتتنافسون بالنقاط. لا شي يحفّز مثل منافسة حقيقية.',
    },
  ],
  en: [
    {
      title: 'Welcome to METRIX',
      body: 'This is where any goal — learning a skill, building a habit, finishing a project — becomes a clear plan you can actually follow. Here is a one-minute tour.',
    },
    {
      icon: Sparkles,
      title: 'Your plan builds itself',
      body: 'Describe your goal in plain words and AI builds a full plan broken down into days and weeks. Already have a plan? Add it manually instead.',
    },
    {
      icon: ListChecks,
      title: 'Log your progress',
      body: 'Every day — or every week, depending on your plan — log what you got done. Each completed task earns points and builds your streak.',
    },
    {
      icon: TrendingUp,
      title: 'See your numbers',
      body: 'A dashboard shows your total points, your current streak, and your trajectory toward the goal. You know exactly where you stand.',
    },
    {
      icon: Swords,
      title: 'Challenge a friend',
      body: 'Start a 1v1 duel, send an invite code, and compete on points. Nothing motivates like real competition.',
    },
  ],
};

const COPY = {
  ar: { skip: 'تخطّي', next: 'التالي', back: 'السابق', start: 'يلا نبدأ', step: 'خطوة' },
  en: { skip: 'Skip', next: 'Next', back: 'Back', start: "Let's go", step: 'Step' },
} as const;

interface WelcomeDialogProps {
  language?: Language;
}

/**
 * Whether the tour has already been dismissed on this device.
 *
 * Read through useSyncExternalStore rather than a setState-in-effect: the
 * server snapshot reports "already seen", so the markup matches on hydration
 * and the tour never flashes for a returning user.
 */
function useTourSeen() {
  return useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(STORAGE_KEY) !== null,
    () => true,
  );
}

export default function WelcomeDialog({ language = 'ar' }: WelcomeDialogProps) {
  const seen = useTourSeen();
  const [dismissed, setDismissed] = useState(false);
  const [accountChecked, setAccountChecked] = useState(seen);
  const [accountSeen, setAccountSeen] = useState(false);
  const [step, setStep] = useState(0);
  const isVisible = accountChecked && !accountSeen && !seen && !dismissed;

  // Completion is tied to the account, not just this device: a returning
  // user on a new browser should never see the onboarding tour again.
  useEffect(() => {
    if (seen) return;

    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const user = data.user;
        setAccountSeen(Boolean(user?.user_metadata?.onboarding_seen));
        setAccountChecked(true);
      })
      .catch(() => {
        if (!cancelled) {
          setAccountSeen(false);
          setAccountChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [seen]);

  const slides = SLIDES[language] ?? SLIDES.ar;
  const copy = COPY[language] ?? COPY.ar;
  const isRtl = language === 'ar';
  const isLast = step === slides.length - 1;

  // Lock background scrolling only while the tour is on screen.
  useEffect(() => {
    if (!isVisible) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);

    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) return;
        return supabase.auth.updateUser({
          data: { onboarding_seen: true },
        });
      })
      .catch(() => {
        // Keep the device-level fallback; the account flag can be retried on
        // a future visit without blocking dismissal.
      });
  };

  const current = slides[step];
  const Icon = current.icon;
  const NextArrow = isRtl ? ArrowLeft : ArrowRight;
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-2xl" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-500">
        {/* Skip */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {copy.skip}
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          {/* Logo on the opening slide, feature icon on the rest */}
          {step === 0 ? (
            <div className="mb-7 flex h-11 w-40 items-center justify-center">
              <BrandLockup className="h-auto w-full text-foreground" />
            </div>
          ) : (
            Icon && (
              <div className="mb-7 flex size-14 items-center justify-center rounded-2xl bg-primary/8">
                <Icon className="size-7 text-primary" />
              </div>
            )
          )}

          <div key={step} className="min-h-[180px] animate-in fade-in slide-in-from-bottom-3 duration-400">
            <h2 className="mb-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {current.title}
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">{current.body}</p>
          </div>

          {/* Progress dots */}
          <div className="mb-7 flex items-center gap-2">
            {slides.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex w-full items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
              >
                <BackArrow className="size-4" />
                {copy.back}
              </button>
            )}

            <button
              type="button"
              onClick={isLast ? dismiss : () => setStep((s) => s + 1)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              {isLast ? copy.start : copy.next}
              {!isLast && <NextArrow className="size-4" />}
            </button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {copy.step} {step + 1} / {slides.length}
          </p>
        </div>
      </div>
    </div>
  );
}
