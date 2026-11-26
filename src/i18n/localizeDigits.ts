import type { Language } from '../types/preferences';
import { toDevanagariDigits } from '../utils';

/**
 * Presentation-only digit localization: the one place that decides which
 * digits the user sees. Nepali (`np`) shows Devanagari digits (०-९); every
 * other language returns the text unchanged.
 *
 * Only ever apply this to text that is about to be DISPLAYED. Values used for
 * arithmetic, input state, validation, `YYYY/MM/DD` strings, storage, API
 * data, identifiers and test ids stay ASCII. It is idempotent (already
 * Devanagari digits are left alone), so converting twice is harmless.
 */
export function localizeDigits(language: Language, text: string): string {
  return language === 'np' ? toDevanagariDigits(text) : text;
}
