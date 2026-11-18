/** English strings. This file defines the set of translation keys. */
export const en = {
  'tabs.home': 'Home',
  'tabs.news': 'News',
  'tabs.calculator': 'Calculator',
  'tabs.settings': 'Settings',

  'screens.home.description':
    'Your Madheshi App home screen will be implemented in a later task.',
  'screens.news.description':
    'News content will be implemented in a later task.',
  'screens.calculator.description':
    'Calculator tools will be implemented in a later task.',

  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.language': 'Language',
  'settings.saveError':
    'This setting could not be saved on this device. It may reset when you close the app.',
  'settings.loadError':
    'Your saved settings could not be loaded. Default settings are being used.',

  'header.switchToLight': 'Switch to light theme',
  'header.switchToDark': 'Switch to dark theme',
  'header.changeLanguage': 'Change language',
} as const;

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;
