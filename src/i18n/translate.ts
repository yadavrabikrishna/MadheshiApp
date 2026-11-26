import type { Language } from '../types/preferences';
import { en, type TranslationKey, type Translations } from './resources/en';
import { localizeDigits } from './localizeDigits';
import { np } from './resources/np';

export const resources: Record<Language, Translations> = { en, np };

/**
 * Look up a string. Falls back to English if a translation is ever empty.
 * Nepali text shows Devanagari digits, so every label, hint, placeholder and
 * message that contains a number is localized here, in one place.
 */
export function translate(language: Language, key: TranslationKey): string {
  return localizeDigits(
    language,
    resources[language][key] || resources.en[key],
  );
}
