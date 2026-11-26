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
  'age.bs.startDate': 'Start Date',
  'age.bs.endDate': 'End Date',
  'age.field.year': 'Year',
  'age.field.month': 'Month',
  'age.field.day': 'Day',
  'age.field.placeholder': 'Select',
  'age.dropdown.close': 'Close',
  'age.calculate': 'Calculate',
  'age.result.title': 'Age (BS)',
  'age.result.years': 'Years',
  'age.result.months': 'Months',
  'age.result.days': 'Days',
  'age.notice.title': 'Approximate result',
  'age.notice.body':
    'Real BS months have different lengths, so this result is approximate. It is calculated in a simplified way: every month is counted as 30 days and every year as 12 months.',
  'age.error.startDateInvalid':
    'Select the year, month and day of the start date.',
  'age.error.endDateInvalid': 'Select the year, month and day of the end date.',
  'age.error.endBeforeStart':
    'The end date cannot be earlier than the start date.',
  'age.ad.month.1': 'January',
  'age.ad.month.2': 'February',
  'age.ad.month.3': 'March',
  'age.ad.month.4': 'April',
  'age.ad.month.5': 'May',
  'age.ad.month.6': 'June',
  'age.ad.month.7': 'July',
  'age.ad.month.8': 'August',
  'age.ad.month.9': 'September',
  'age.ad.month.10': 'October',
  'age.ad.month.11': 'November',
  'age.ad.month.12': 'December',
  'age.month.1': 'Baishakh',
  'age.month.2': 'Jestha',
  'age.month.3': 'Ashadh',
  'age.month.4': 'Shrawan',
  'age.month.5': 'Bhadra',
  'age.month.6': 'Ashwin',
  'age.month.7': 'Kartik',
  'age.month.8': 'Mangsir',
  'age.month.9': 'Poush',
  'age.month.10': 'Magh',
  'age.month.11': 'Falgun',
  'age.month.12': 'Chaitra',
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
  'simpleInterest.rate.label': 'Interest Rate',
  'simpleInterest.rate.placeholder': '2',
  'simpleInterest.startDate.label': 'Start Date',
  'simpleInterest.endDate.label': 'End Date',
  'simpleInterest.date.hint':
    'Type 8 digits (YYYYMMDD). The slashes are added for you.',
  'simpleInterest.date.placeholder': 'YYYY/MM/DD',
  'simpleInterest.duration.mode.label': 'Duration input',
  'simpleInterest.duration.mode.dateRange': 'Date range',
  'simpleInterest.duration.mode.direct': 'Direct duration',
  'simpleInterest.duration.placeholder': '0',
  'simpleInterest.duration.hint':
    'Enter whole numbers. Months and days can be any size; they are converted automatically (1 year = 360 days, 1 month = 30 days).',
  'simpleInterest.duration.normalized': 'Duration',
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
  'simpleInterest.error.rateConfigInvalid':
    'The saved rate setting cannot be used. Check Interest rate entry in Calculator Settings.',
  'simpleInterest.error.rateModeInvalid': 'Choose how the rate is entered.',
  'simpleInterest.error.startDateInvalid':
    'Enter a complete start date as YYYY/MM/DD, with month 01 to 12 and day 01 to 32.',
  'simpleInterest.error.endDateInvalid':
    'Enter a complete end date as YYYY/MM/DD, with month 01 to 12 and day 01 to 32.',
  'simpleInterest.error.durationInvalid':
    'Enter years, months and days as whole numbers, for example 15 or 0.',
  'simpleInterest.error.durationZero':
    'The duration must be greater than zero. Enter at least one year, month or day.',
  'simpleInterest.error.durationTooLong':
    'The duration is too long. Enter fewer than 10,000 years.',
  'simpleInterest.error.endBeforeStart':
    'The end date cannot be earlier than the start date.',

  'simpleInterest.result.title': 'Simple Interest result',
  'simpleInterest.result.principal': 'Principal',
  'simpleInterest.result.interestRate': 'Interest Rate',
  'simpleInterest.result.duration': 'Duration',
  'simpleInterest.result.interest': 'Simple Interest',
  'simpleInterest.result.total': 'Total Amount',
  'simpleInterest.rateText.percent': '{rate}% {unit}',
  'simpleInterest.rateText.rupees': 'Rs. {rate} per Rs. {amount} {unit}',
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
  'interestRate.title': 'Interest rate entry',
  'interestRate.intro':
    'Choose how the rate is entered in each interest calculator. Changes here apply and save immediately; Cancel does not undo them.',
  'interestRate.mode.label': 'Rate entry mode',
  'interestRate.mode.percentage': 'Percentage',
  'interestRate.mode.rupees': 'Rupees per amount',
  'interestRate.period.label.percentage': 'Percentage period',
  'interestRate.period.label.rupees': 'Rupees period',
  'interestRate.period.yearly': 'Yearly',
  'interestRate.period.halfYearly': 'Half-yearly',
  'interestRate.period.quarterly': 'Quarterly',
  'interestRate.period.monthly': 'Monthly',
  'interestRate.period.weekly': 'Weekly',
  'interestRate.period.daily': 'Daily',
  'interestRate.unit.yearly': 'per year',
  'interestRate.unit.halfYearly': 'per half-year',
  'interestRate.unit.quarterly': 'per quarter',
  'interestRate.unit.monthly': 'per month',
  'interestRate.unit.weekly': 'per week',
  'interestRate.unit.daily': 'per day',
  'interestRate.helper.percentage':
    'The rate is entered as a percentage {unit}. For example, 2 means 2% {unit}.',
  'interestRate.helper.rupees':
    'The rate is entered as rupees for every Rs. {amount}, {unit}. For example, 2 means Rs. 2 for every Rs. {amount}, {unit}.',
  'interestRate.helper.customPending':
    'Enter a custom amount below to use rupees per amount.',
  'interestRate.denominator.label': 'Rupees per',
  'interestRate.denominator.per100': 'Per 100',
  'interestRate.denominator.per1000': 'Per 1,000',
  'interestRate.denominator.custom': 'Custom',
  'interestRate.custom.label': 'Custom amount',
  'interestRate.custom.placeholder': '250',
  'interestRate.custom.hint':
    'The amount the rupees are counted for. For example, 250 means rupees for every Rs. 250.',
  'interestRate.error.empty': 'Enter a custom amount.',
  'interestRate.error.notNumber': 'Enter a number, for example 250 or 12.5.',
  'interestRate.error.notPositive': 'The amount must be greater than zero.',
  'interestRate.field.hint.percentage.yearly':
    'Enter annual interest rate (%).',
  'interestRate.field.hint.percentage.halfYearly':
    'Enter half-yearly interest rate (%).',
  'interestRate.field.hint.percentage.quarterly':
    'Enter quarterly interest rate (%).',
  'interestRate.field.hint.percentage.monthly':
    'Enter monthly interest rate (%).',
  'interestRate.field.hint.percentage.weekly':
    'Enter weekly interest rate (%).',
  'interestRate.field.hint.percentage.daily': 'Enter daily interest rate (%).',
  'interestRate.field.hint.rupees': 'Enter rupees per Rs. {amount} {unit}.',
  'interestRate.dropdown.close': 'Close',
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
