import type { Language } from '../types/preferences';
import { en, type TranslationKey, type Translations } from './resources/en';
import { ne } from './resources/ne';

export const resources: Record<Language, Translations> = { en, ne };

/** Look up a string. Falls back to English if a translation is ever empty. */
export function translate(language: Language, key: TranslationKey): string {
  return resources[language][key] || resources.en[key];
}
