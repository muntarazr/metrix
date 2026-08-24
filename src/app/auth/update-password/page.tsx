'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Language } from '@/lib/translations';
import { applyDocumentLanguage, readStoredLanguage } from '@/lib/language';

const MIN_PASSWORD_LENGTH = 8;

const copy = {
  ar: {
    title: 'تعيين كلمة مرور جديدة',
    subtitle: 'اختر كلمة مرور جديدة لحسابك',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    hint: `${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    submit: 'حفظ كلمة المرور',
    errorShort: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
    errorMismatch: 'كلمتا المرور غير متطابقتين',
  },
  en: {
    title: 'Set a new password',
    subtitle: 'Choose a new password for your account',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    hint: `At least ${MIN_PASSWORD_LENGTH} characters`,
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Save password',
    errorShort: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    errorMismatch: "The passwords don't match",
  },
} as const;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  // Same reason as /login: layout.tsx ships RTL Arabic and page.tsx never runs
  // on this route, so the page has to read the stored choice itself.
  const [language, setLanguage] = useState<Language>('ar');
  const t = copy[language];
  const isArabic = language === 'ar';

  useEffect(() => {
    const stored = readStoredLanguage();
    applyDocumentLanguage(stored);
    // queueMicrotask for the same reason page.tsx does it: the React compiler
    // lint rejects a bare setState inside an effect body.
    queueMicrotask(() => {
      setLanguage(stored);
    });
  }, []);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.errorShort);
      return;
    }
    if (password !== confirm) {
      setError(t.errorMismatch);
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(getAuthErrorMessage(error.message, language));
      setPending(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-canvas p-4"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.newPassword}</Label>
            {/* dir="ltr" here for the same reason as the login form: the input's
                `pe-10` and the button's `end-0` must resolve against the same
                direction, or the reveal icon lands on top of the characters. */}
            <div className="relative" dir="ltr">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 pe-10 text-start"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t.hint}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">{t.confirmPassword}</Label>
            <Input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="h-11 text-start"
              required
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/12 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
