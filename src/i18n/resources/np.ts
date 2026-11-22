import type { Translations } from './en';

/** Nepali strings. Typed against the English keys: a missing key fails to compile. */
export const np: Translations = {
  'tabs.home': 'गृह',
  'tabs.news': 'समाचार',
  'tabs.calculator': 'क्यालकुलेटर',
  'tabs.settings': 'सेटिङ',

  'screens.home.description':
    'तपाईंको मधेशी एपको गृहपृष्ठ पछिको कार्यमा तयार गरिनेछ।',
  'screens.news.description': 'समाचार सामग्री पछिको कार्यमा तयार गरिनेछ।',

  'calculator.tabs.label': 'क्यालकुलेटरको प्रकार',
  'calculator.tabs.interest': 'ब्याज',
  'calculator.tabs.age': 'उमेर',
  'calculator.tabs.land': 'जमिन',
  'calculator.interest.type.label': 'ब्याजको प्रकार',
  'calculator.interest.type.simple': 'घरेलु ब्याज',
  'calculator.interest.type.compound': 'साहु ब्याज',
  'calculator.interest.compound.description':
    'साहु ब्याज क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
  'calculator.age.system.label': 'मिति प्रणाली',
  'calculator.age.system.ad': 'इस्वी संवत',
  'calculator.age.system.bs': 'विक्रम संवत',
  'calculator.age.ad.description':
    'इस्वी संवत उमेर क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
  'calculator.age.bs.description':
    'विक्रम संवत उमेर क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
  'calculator.title.age.ad': 'उमेर (इस्वी संवत)',
  'calculator.title.age.bs': 'उमेर (विक्रम संवत)',
  'calculator.title.land.terai': 'जमिन (तराई)',
  'calculator.title.land.hillMountain': 'जमिन (पहाड / हिमाल)',
  'calculator.land.type.label': 'जमिनको प्रकार',
  'calculator.land.type.terai': 'तराई',
  'calculator.land.type.hillMountain': 'पहाड / हिमाल',
  'calculator.land.terai.description':
    'तराई जमिन क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
  'calculator.land.hillMountain.description':
    'पहाड / हिमाल जमिन क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',

  'calculator.basic.title': 'सामान्य क्यालकुलेटर',
  'calculator.basic.description':
    'सामान्य क्यालकुलेटरको इन्टरफेस र सञ्चालनहरू भविष्यको अपडेटमा तयार गरिनेछन्।',

  'simpleInterest.currency': 'रु.',
  'simpleInterest.principal.label': 'मूलधन रकम',
  'simpleInterest.principal.hint': 'ऋण दिएको वा लिएको रकम, रुपैयाँमा।',
  'simpleInterest.principal.placeholder': '100000',
  'simpleInterest.rate.label': 'मासिक ब्याजदर',
  'simpleInterest.rate.hint.percent':
    'प्रति महिना प्रतिशत। जस्तै, २ को अर्थ हरेक महिना २% हो।',
  'simpleInterest.rate.hint.rupees':
    'प्रति रु. १०० मा प्रति महिना रुपैयाँ। जस्तै, २ को अर्थ हरेक महिना रु. १०० मा रु. २ हो।',
  'simpleInterest.rate.placeholder': '2',
  'simpleInterest.rateMode.label': 'दर राख्ने तरिका',
  'simpleInterest.rateMode.percent': '% प्रति महिना',
  'simpleInterest.rateMode.rupees': 'रु. प्रति रु. १००',
  'simpleInterest.startDate.label': 'सुरु मिति',
  'simpleInterest.endDate.label': 'अन्तिम मिति',
  'simpleInterest.date.hint':
    '८ अङ्क टाइप गर्नुहोस् (YYYYMMDD)। स्ल्याश आफैँ थपिन्छ।',
  'simpleInterest.date.placeholder': 'YYYY/MM/DD',
  'simpleInterest.calculate': 'हिसाब गर्नुहोस्',

  'simpleInterest.error.prefix': 'त्रुटि',
  'simpleInterest.error.summary': 'तल चिन्ह लगाइएका क्षेत्रहरू सच्याउनुहोस्।',
  'simpleInterest.error.principalInvalid':
    'मूलधन सङ्ख्यामा राख्नुहोस्, जस्तै 100000 वा 2500.50।',
  'simpleInterest.error.principalNotPositive': 'मूलधन शून्यभन्दा बढी हुनुपर्छ।',
  'simpleInterest.error.rateInvalid':
    'दर सङ्ख्यामा राख्नुहोस्, जस्तै 2 वा 1.5। शून्य मान्य छ।',
  'simpleInterest.error.rateNegative': 'दर ऋणात्मक हुन सक्दैन।',
  'simpleInterest.error.rateModeInvalid': 'दर कसरी राख्ने भनेर छान्नुहोस्।',
  'simpleInterest.error.startDateInvalid':
    'सुरु मिति पूरा YYYY/MM/DD मा राख्नुहोस्; महिना 01 देखि 12 र गते 01 देखि 32।',
  'simpleInterest.error.endDateInvalid':
    'अन्तिम मिति पूरा YYYY/MM/DD मा राख्नुहोस्; महिना 01 देखि 12 र गते 01 देखि 32।',
  'simpleInterest.error.endBeforeStart':
    'अन्तिम मिति सुरु मितिभन्दा अगाडि हुन सक्दैन।',

  'simpleInterest.result.title': 'घरेलु ब्याजको नतिजा',
  'simpleInterest.result.principal': 'मूलधन',
  'simpleInterest.result.interestRate': 'ब्याज दर',
  'simpleInterest.result.duration': 'अवधि',
  'simpleInterest.result.interest': 'घरेलु ब्याज',
  'simpleInterest.result.total': 'जम्मा रकम',
  'simpleInterest.rateText.percent': '{rate}% प्रति महिना',
  'simpleInterest.rateText.rupees': 'रु. {rate} प्रति रु. १०० प्रति महिना',
  'simpleInterest.unit.years': 'वर्ष',
  'simpleInterest.unit.months': 'महिना',
  'simpleInterest.unit.days': 'दिन',

  'resultActions.copy': 'कपी गर्नुहोस्',
  'resultActions.share': 'सेयर गर्नुहोस्',
  'resultActions.saveImage': 'तस्बिर सुरक्षित गर्नुहोस्',
  'resultActions.copied': 'क्लिपबोर्डमा कपी गरियो',
  'resultActions.copyFailed': 'कपी गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।',
  'resultActions.shareTitle': 'नतिजा सेयर गर्नुहोस्',
  'resultActions.shareFailed': 'सेयर गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।',
  'resultActions.saved': 'तस्बिर ग्यालरीमा सुरक्षित गरियो',
  'resultActions.saveFailed':
    'तस्बिर सुरक्षित गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।',
  'resultActions.savePermissionDenied':
    'तस्बिर सुरक्षित गर्न भण्डारण पहुँचको अनुमति दिनुहोस्।',

  'calculatorSettings.title': 'क्यालकुलेटर सेटिङ',
  'calculatorSettings.entry.description':
    'कुन क्यालकुलेटरहरू उपलब्ध हुने छनौट गर्नुहोस्',
  'calculatorSettings.intro':
    'क्यालकुलेटरहरू खोल्नुहोस् वा बन्द गर्नुहोस्। परिवर्तनहरू सुरक्षित गर्नुहोस् थिचेपछि लागू हुन्छन्।',
  'calculatorSettings.specialist': 'विशेष क्यालकुलेटरहरू',
  'calculatorSettings.selectAll': 'सबै छनौट गर्नुहोस्',
  'calculatorSettings.deselectAll': 'सबै हटाउनुहोस्',
  'calculatorSettings.save': 'सुरक्षित गर्नुहोस्',
  'calculatorSettings.cancel': 'रद्द गर्नुहोस्',
  'calculatorSettings.atLeastOne':
    'कम्तीमा एउटा क्यालकुलेटर सक्रिय रहनुपर्छ, त्यसैले सामान्य क्यालकुलेटर स्वतः सक्रिय गरिएको छ।',

  'settings.appearance': 'देखावट',
  'settings.theme': 'थिम',
  'settings.theme.light': 'उज्यालो',
  'settings.theme.dark': 'अँध्यारो',
  'settings.language': 'भाषा',
  'settings.headerShortcuts': 'हेडर सर्टकट',
  'settings.showThemeShortcut': 'हेडरमा थिम बटन देखाउनुहोस्',
  'settings.showLanguageShortcut': 'हेडरमा भाषा बटन देखाउनुहोस्',
  'settings.saveError':
    'यो सेटिङ यो उपकरणमा सुरक्षित गर्न सकिएन। एप बन्द गर्दा यो रिसेट हुन सक्छ।',
  'settings.loadError':
    'तपाईंका सुरक्षित सेटिङ लोड गर्न सकिएन। पूर्वनिर्धारित सेटिङ प्रयोग गरिँदैछ।',

  'header.switchToLight': 'उज्यालो थिममा बदल्नुहोस्',
  'header.switchToDark': 'अँध्यारो थिममा बदल्नुहोस्',
  'header.changeLanguage': 'भाषा परिवर्तन गर्नुहोस्',
};
