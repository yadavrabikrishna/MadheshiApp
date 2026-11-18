/** Supported app languages. `np` is this project's approved internal code for Nepali. */
export const LANGUAGES = ['en', 'np'] as const;
export type Language = (typeof LANGUAGES)[number];

export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Names shown to the user, each in its own language. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  np: 'नेपाली',
};

export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some(language => language === value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.some(mode => mode === value);
}
