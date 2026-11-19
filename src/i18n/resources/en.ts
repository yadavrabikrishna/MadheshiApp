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

  'calculator.tabs.label': 'Calculator type',
  'calculator.tabs.interest': 'Interest',
  'calculator.tabs.age': 'Age',
  'calculator.tabs.land': 'Land',
  'calculator.interest.type.label': 'Interest type',
  'calculator.interest.type.simple': 'Simple Interest',
  'calculator.interest.type.compound': 'Compound Interest',
  'calculator.interest.simple.description':
    'The simple interest calculator will be implemented in a later task.',
  'calculator.interest.compound.description':
    'The compound interest calculator will be implemented in a later task.',
  'calculator.age.system.label': 'Date system',
  'calculator.age.system.ad': 'AD (Gregorian)',
  'calculator.age.system.bs': 'BS (Bikram Sambat)',
  'calculator.age.ad.description':
    'The AD age calculator will be implemented in a later task.',
  'calculator.age.bs.description':
    'The BS age calculator will be implemented in a later task.',
  'calculator.title.age.ad': 'Age (AD)',
  'calculator.title.age.bs': 'Age (BS)',
  'calculator.title.land.terai': 'Land (Terai)',
  'calculator.title.land.hillMountain': 'Land (Hill / Mountain)',
  'calculator.land.type.label': 'Land type',
  'calculator.land.type.terai': 'Terai',
  'calculator.land.type.hillMountain': 'Hill / Mountain',
  'calculator.land.terai.description':
    'The Terai land calculator will be implemented in a later task.',
  'calculator.land.hillMountain.description':
    'The Hill / Mountain land calculator will be implemented in a later task.',

  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.language': 'Language',
  'settings.headerShortcuts': 'Header shortcuts',
  'settings.showThemeShortcut': 'Show theme button in header',
  'settings.showLanguageShortcut': 'Show language button in header',
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
