'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/translations';

const MIN_PASSWORD_LENGTH = 8;

type Mode = 'signin' | 'signup';

const copy = {
  ar: {
    signin: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    name: 'الاسم',
    namePlaceholder: 'اسمك الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    passwordHint: `${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    submitSignin: 'دخول',
    submitSignup: 'إنشاء الحساب',
    backToSignin: 'الرجوع لتسجيل الدخول',
    errorShortPassword: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
    errorNoName: 'اكتب اسمك',
    errorNoEmail: 'اكتب بريدك الإلكتروني أولاً، ثم اضغط "نسيت كلمة المرور"',
    confirmationSent: (email: string) =>
      `أرسلنا رابط تأكيد إلى ${email} — افتحه لتفعيل حسابك`,
    resetSent: (email: string) =>
      `أرسلنا رابط إعادة تعيين كلمة المرور إلى ${email}`,
  },
  en: {
    signin: 'Sign in',
    signup: 'Create account',
    name: 'Name',
    namePlaceholder: 'Your full name',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters`,
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submitSignin: 'Sign in',
    submitSignup: 'Create account',
    backToSignin: 'Back to sign in',
    errorShortPassword: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    errorNoName: 'Enter your name',
    errorNoEmail: 'Enter your email first, then tap "Forgot password"',
    confirmationSent: (email: string) =>
      `We sent a confirmation link to ${email} — open it to activate your account`,
    resetSent: (email: string) =>
      `We sent a password reset link to ${email}`,
  },
} as const;

interface EmailAuthFormProps {
  language?: Language;
}

export function EmailAuthForm({ language = 'ar' }: EmailAuthFormProps) {
  const t = copy[language];
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.errorShortPassword);
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError(t.errorNoName);
      return;
    }

    setPending(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(getAuthErrorMessage(error.message, language));
        setPending(false);
        return;
      }

      // refresh() so server components re-read the freshly set session cookie
      router.push('/');
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(getAuthErrorMessage(error.message, language));
      setPending(false);
      return;
    }

    // Supabase returns a session only when email confirmation is turned off.
    if (data.session) {
      router.push('/');
      router.refresh();
      return;
    }

    setNotice(t.confirmationSent(email.trim()));
    setPending(false);
  };

  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError(t.errorNoEmail);
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    setPending(false);

    if (error) {
      setError(getAuthErrorMessage(error.message, language));
      return;
    }

    setNotice(t.resetSent(email.trim()));
  };

  if (notice) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/8">
            <MailCheck className="size-6 text-primary" />
          </div>
        </div>
        <p className="text-sm text-foreground">{notice}</p>
        <button
          type="button"
          onClick={() => switchMode('signin')}
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t.backToSignin}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ['signin', t.signin],
            ['signup', t.signup],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={cn(
              'rounded-lg py-2 text-sm font-medium transition-all',
              mode === value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="name">{t.name}</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="h-11"
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t.email}</Label>
        <Input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 text-start"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t.password}</Label>
          {mode === 'signin' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={pending}
              className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
            >
              {t.forgotPassword}
            </button>
          )}
        </div>
        {/*
          The input is dir="ltr" (passwords are not Arabic text), so its `pe-10`
          reserves space on the RIGHT. The wrapper has to be LTR too, or `end-0`
          resolves against the page's RTL and parks the reveal button on the
          LEFT — on top of the typed characters, with the reserved space left
          empty. Same markup then works in both languages.
        */}
        <div className="relative" dir="ltr">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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
        {mode === 'signup' && (
          <p className="text-xs text-muted-foreground">{t.passwordHint}</p>
        )}
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
        {mode === 'signin' ? t.submitSignin : t.submitSignup}
      </button>
    </form>
  );
}
