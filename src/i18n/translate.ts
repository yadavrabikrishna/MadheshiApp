import type { Language } from '../types/preferences';
import { en, type TranslationKey, type Translations } from './resources/en';
import { np } from './resources/np';

export const resources: Record<Language, Translations> = { en, np };

/** Look up a string. Falls back to English if a translation is ever empty. */
export function translate(language: Language, key: TranslationKey): string {
  return resources[language][key] || resources.en[key];
}
