/**
 * The one place that answers "what language is the UI in?" outside the app
 * shell.
 *
 * `src/app/page.tsx` owns the language for the whole application, but `/login`
 * and `/auth/*` render before that state exists — they read the same persisted
 * value from here so a user who chose English does not get bounced into an
 * Arabic RTL login page on their way back in.
 */

import type { Language } from '@/lib/translations';

/** Arabic is the product default; see DESIGN.md — RTL is not an afterthought. */
export const DEFAULT_LANGUAGE: Language = 'ar';

export const LANGUAGE_STORAGE_KEY = 'language';

export function normalizeLanguage(value: unknown): Language {
  return value === 'en' || value === 'ar' ? value : DEFAULT_LANGUAGE;
}

/** Client only. Returns the default during SSR and before hydration. */
export function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function storeLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // A blocked localStorage is not worth failing a render over.
  }
}

/**
 * `layout.tsx` ships `lang="ar" dir="rtl"` in the HTML, so every page that can
 * render in English has to correct the document itself.
 */
export function applyDocumentLanguage(language: Language): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', language);
}
