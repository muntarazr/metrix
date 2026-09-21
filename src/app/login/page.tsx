'use client';

import Link from 'next/link';
import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { EmailAuthForm } from '@/components/login/EmailAuthForm';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandLockup } from '@/components/brand/Logo';
import { useCapacitorAuth } from '@/hooks/useCapacitorAuth';
import type { Language } from '@/lib/translations';
import {
  applyDocumentLanguage,
  readStoredLanguage,
  storeLanguage,
} from '@/lib/language';

const MANIFESTO_STORAGE_KEY = 'metrix-login-manifesto-seen';

const copy = {
  ar: {
    google: 'تسجيل الدخول باستخدام جوجل',
    or: 'أو',
    manifesto: 'القصة وراء ماتريكس',
    termsPrefix: 'بتسجيل الدخول، أنت توافق على',
    termsLink: 'شروط الخدمة',
    termsAnd: 'و',
    privacyLink: 'سياسة الخصوصية',
      },
  en: {
    google: 'Sign in with Google',
    or: 'or',
    manifesto: 'The story behind METRIX',
    termsPrefix: 'By signing in, you agree to the',
    termsLink: 'Terms of Service',
    termsAnd: 'and',
    privacyLink: 'Privacy Policy',
      },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isManifestoOpen, setIsManifestoOpen] = useState(false);
  // layout.tsx hardcodes lang="ar" dir="rtl", and page.tsx — which normally
  // owns the language — never runs on this route. Without this the user who
  // picked English is handed an Arabic RTL login page on the way back in.
  const [language, setLanguage] = useState<Language>('ar');
  const { signInWithGoogle } = useCapacitorAuth(() => router.push('/'));
  const t = copy[language];
  const isArabic = language === 'ar';

  useEffect(() => {
    // queueMicrotask for the same reason page.tsx does it: the React compiler
    // lint rejects a bare setState inside an effect body.
    const stored = readStoredLanguage();
    queueMicrotask(() => {
      setLanguage(stored);
    });
  }, []);

  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push('/');
      } else {
        if (!window.localStorage.getItem(MANIFESTO_STORAGE_KEY)) {
          window.localStorage.setItem(MANIFESTO_STORAGE_KEY, 'true');
          setIsManifestoOpen(true);
        }
        setLoading(false);
      }
    };

    checkUser();
  }, [router, supabase]);

  const handleGoogleLogin = () => signInWithGoogle();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center justify-center animate-pulse gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/25 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-canvas p-4"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <MatrixManifestoDialog
        open={isManifestoOpen}
        onOpenChange={setIsManifestoOpen}
        language={language}
      />

      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Header with balanced visual alignment */}
          <div className="flex items-center justify-center gap-3">
            <BrandLockup className="h-auto w-48 text-foreground sm:w-52 shrink-0" />
          </div>

          {/* Login Button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-card hover:bg-muted text-foreground font-medium py-3 px-4 rounded-xl border-2 border-border transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{t.google}</span>
            </button>

            {/* Separator */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t.or}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <EmailAuthForm language={language} />

            <button
              type="button"
              onClick={() => setIsManifestoOpen(true)}
              className="w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t.manifesto}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              {t.termsPrefix}{' '}
              <Link href="/terms" className="underline hover:text-foreground">
                {t.termsLink}
              </Link>{' '}
              {t.termsAnd}{' '}
              <Link href="/privacy" className="underline hover:text-foreground">
                {t.privacyLink}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
