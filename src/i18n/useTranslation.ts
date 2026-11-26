import { useCallback } from 'react';

import { selectLanguage } from '../features/preferences';
import { useAppSelector } from '../store';
import type { Language } from '../types/preferences';
import type { TranslationKey } from './resources/en';
import { localizeDigits } from './localizeDigits';
import { translate } from './translate';

/** Translation function bound to the active language; re-renders on language change. */
export function useTranslation(): {
  t: (key: TranslationKey) => string;
  language: Language;
  /** Digits of display text in the active language (Devanagari in Nepali). */
  formatDigits: (text: string) => string;
} {
  const language = useAppSelector(selectLanguage);
  const t = useCallback(
    (key: TranslationKey) => translate(language, key),
    [language],
  );
  const formatDigits = useCallback(
    (text: string) => localizeDigits(language, text),
    [language],
  );
  return { t, language, formatDigits };
}
