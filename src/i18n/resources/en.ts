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

  'calculator.basic.title': 'Basic Calculator',
  'calculator.basic.description':
    'The Basic Calculator interface and operations will be implemented in a future update.',

  'simpleInterest.currency': 'Rs.',
  'simpleInterest.principal.label': 'Principal amount',
  'simpleInterest.principal.hint': 'The amount borrowed or lent, in Rs.',
  'simpleInterest.principal.placeholder': '100000',
  'simpleInterest.rate.label': 'Monthly interest rate',
  'simpleInterest.rate.hint.percent':
    'Percent per month. For example, 2 means 2% every month.',
  'simpleInterest.rate.hint.rupees':
    'Rupees per Rs. 100 per month. For example, 2 means Rs. 2 on every Rs. 100 each month.',
  'simpleInterest.rate.placeholder': '2',
  'simpleInterest.rateMode.label': 'Rate entry mode',
  'simpleInterest.rateMode.percent': '% per month',
  'simpleInterest.rateMode.rupees': 'Rs. per Rs. 100',
  'simpleInterest.startDate.label': 'Start Date',
  'simpleInterest.endDate.label': 'End Date',
  'simpleInterest.date.hint':
    'Type 8 digits (YYYYMMDD). The slashes are added for you.',
  'simpleInterest.date.placeholder': 'YYYY/MM/DD',
  'simpleInterest.calculate': 'Calculate',

  'simpleInterest.error.prefix': 'Error',
  'simpleInterest.error.summary': 'Please correct the fields marked below.',
  'simpleInterest.error.principalInvalid':
    'Enter the principal as a number, for example 100000 or 2500.50.',
  'simpleInterest.error.principalNotPositive':
    'The principal must be greater than zero.',
  'simpleInterest.error.rateInvalid':
    'Enter the rate as a number, for example 2 or 1.5. Zero is allowed.',
  'simpleInterest.error.rateNegative': 'The rate cannot be negative.',
  'simpleInterest.error.rateModeInvalid': 'Choose how the rate is entered.',
  'simpleInterest.error.startDateInvalid':
    'Enter a complete start date as YYYY/MM/DD, with month 01 to 12 and day 01 to 32.',
  'simpleInterest.error.endDateInvalid':
    'Enter a complete end date as YYYY/MM/DD, with month 01 to 12 and day 01 to 32.',
  'simpleInterest.error.endBeforeStart':
    'The end date cannot be earlier than the start date.',

  'simpleInterest.result.title': 'Simple Interest result',
  'simpleInterest.result.principal': 'Principal',
  'simpleInterest.result.interestRate': 'Interest Rate',
  'simpleInterest.result.duration': 'Duration',
  'simpleInterest.result.interest': 'Simple Interest',
  'simpleInterest.result.total': 'Total Amount',
  'simpleInterest.rateText.percent': '{rate}% per month',
  'simpleInterest.rateText.rupees': 'Rs. {rate} per Rs. 100 per month',
  'compoundInterest.result.title': 'Compound Interest result',
  'compoundInterest.result.interest': 'Total Interest',
  'simpleInterest.unit.years': 'Years',
  'simpleInterest.unit.months': 'Months',
  'simpleInterest.unit.days': 'Days',

  'resultActions.copy': 'Copy',
  'resultActions.share': 'Share',
  'resultActions.saveImage': 'Save Image',
  'resultActions.copied': 'Copied to clipboard',
  'resultActions.copyFailed': "Couldn't copy. Please try again.",
  'resultActions.shareTitle': 'Share result',
  'resultActions.shareFailed': "Couldn't share. Please try again.",
  'resultActions.saved': 'Image saved to gallery',
  'resultActions.saveFailed': "Couldn't save the image. Please try again.",
  'resultActions.savePermissionDenied':
    'Allow storage access to save the image.',

  'calculatorSettings.title': 'Calculator Settings',
  'calculatorSettings.entry.description':
    'Choose which calculators are available',
  'calculatorSettings.intro':
    'Turn calculators on or off. Changes apply when you press Save.',
  'calculatorSettings.specialist': 'Specialist calculators',
  'calculatorSettings.selectAll': 'Select All',
  'calculatorSettings.deselectAll': 'Deselect All',
  'calculatorSettings.save': 'Save',
  'calculatorSettings.cancel': 'Cancel',
  'calculatorSettings.atLeastOne':
    'At least one calculator must remain enabled, so Basic Calculator was turned on automatically.',

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
