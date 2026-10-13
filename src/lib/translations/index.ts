import { en, type Translations, type TranslationKey } from "./en.ts";
import { ar } from "./ar.ts";
import type { Language } from "./types.ts";


export { en, ar };
export type { Language, Translations, TranslationKey };

export const translations: Record<Language, Translations> = {
  en,
  ar,
};

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key] || translations.en[key];
}
