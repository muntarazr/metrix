import type { Language } from '@/lib/translations';

/**
 * Maps Supabase auth errors to a message in the user's language.
 * Falls back to a generic message so a raw English error never reaches the user.
 */

type ErrorKey =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'alreadyRegistered'
  | 'passwordTooShort'
  | 'invalidEmail'
  | 'rateLimited'
  | 'samePassword'
  | 'network'
  | 'unknown';

const MESSAGES: Record<Language, Record<ErrorKey, string>> = {
  ar: {
    invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    emailNotConfirmed: 'لم تؤكّد بريدك بعد — افتح رسالة التأكيد في إيميلك',
    alreadyRegistered: 'هذا البريد مسجّل مسبقاً — سجّل الدخول بدلاً من إنشاء حساب',
    passwordTooShort: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    invalidEmail: 'صيغة البريد الإلكتروني غير صحيحة',
    rateLimited: 'محاولات كثيرة خلال وقت قصير — انتظر دقيقة وحاول مرة أخرى',
    samePassword: 'كلمة المرور الجديدة يجب أن تختلف عن القديمة',
    network: 'تعذّر الاتصال بالخادم — تحقّق من الإنترنت',
    unknown: 'صار خطأ غير متوقّع — حاول مرة أخرى',
  },
  en: {
    invalidCredentials: 'Wrong email or password',
    emailNotConfirmed: "You haven't confirmed your email yet — open the confirmation message in your inbox",
    alreadyRegistered: 'This email is already registered — sign in instead of creating an account',
    passwordTooShort: 'Password must be at least 8 characters',
    invalidEmail: "That email address isn't valid",
    rateLimited: 'Too many attempts in a short time — wait a minute and try again',
    samePassword: 'The new password must be different from the old one',
    network: "Couldn't reach the server — check your connection",
    unknown: 'Something went wrong — please try again',
  },
};

function classify(message: string): ErrorKey {
  const m = message.toLowerCase();

  if (m.includes('invalid login credentials')) return 'invalidCredentials';
  if (m.includes('email not confirmed')) return 'emailNotConfirmed';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'alreadyRegistered';
  }
  if (m.includes('password should be at least')) return 'passwordTooShort';
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'invalidEmail';
  }
  if (m.includes('for security purposes') || m.includes('rate limit')) {
    return 'rateLimited';
  }
  if (m.includes('new password should be different')) return 'samePassword';
  if (m.includes('failed to fetch') || m.includes('network')) return 'network';

  return 'unknown';
}

export function getAuthErrorMessage(
  message: string,
  language: Language = 'ar'
): string {
  return MESSAGES[language][classify(message)];
}
