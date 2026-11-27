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
  'age.bs.startDate': 'सुरु मिति',
  'age.bs.endDate': 'अन्तिम मिति',
  'age.field.year': 'वर्ष',
  'age.field.month': 'महिना',
  'age.field.day': 'दिन',
  'age.field.placeholder': 'छान्नुहोस्',
  'age.dropdown.close': 'बन्द गर्नुहोस्',
  'age.calculate': 'हिसाब गर्नुहोस्',
  'age.result.title': 'उमेर (बि.सं.)',
  'age.result.years': 'वर्ष',
  'age.result.months': 'महिना',
  'age.result.days': 'दिन',
  'age.notice.title': 'अनुमानित नतिजा',
  'age.notice.body':
    'वास्तविक बि.सं. महिनाका दिन फरक-फरक हुन्छन्, त्यसैले यो नतिजा अनुमानित हो। यो सरल तरिकाले निकालिएको हो: हरेक महिना ३० दिन र हरेक वर्ष १२ महिना मानिएको छ।',
  'age.error.startDateInvalid': 'सुरु मितिको वर्ष, महिना र दिन छान्नुहोस्।',
  'age.error.endDateInvalid': 'अन्तिम मितिको वर्ष, महिना र दिन छान्नुहोस्।',
  'age.error.endBeforeStart': 'अन्तिम मिति सुरु मितिभन्दा अगाडि हुन सक्दैन।',
  'age.ad.notice.body':
    'यो नतिजा अनुमानित हो। यो सरल तरिकाले निकालिएको हो: हरेक महिना ३० दिन र हरेक वर्ष १२ महिना मानिएको छ, वास्तविक पात्रो अनुसार होइन।',
  'age.ad.month.1': 'जनवरी',
  'age.ad.month.2': 'फेब्रुअरी',
  'age.ad.month.3': 'मार्च',
  'age.ad.month.4': 'अप्रिल',
  'age.ad.month.5': 'मे',
  'age.ad.month.6': 'जुन',
  'age.ad.month.7': 'जुलाई',
  'age.ad.month.8': 'अगस्ट',
  'age.ad.month.9': 'सेप्टेम्बर',
  'age.ad.month.10': 'अक्टोबर',
  'age.ad.month.11': 'नोभेम्बर',
  'age.ad.month.12': 'डिसेम्बर',
  'age.month.1': 'वैशाख',
  'age.month.2': 'जेठ',
  'age.month.3': 'असार',
  'age.month.4': 'साउन',
  'age.month.5': 'भदौ',
  'age.month.6': 'असोज',
  'age.month.7': 'कात्तिक',
  'age.month.8': 'मंसिर',
  'age.month.9': 'पुस',
  'age.month.10': 'माघ',
  'age.month.11': 'फागुन',
  'age.month.12': 'चैत',
  'calculator.title.age.ad': 'उमेर (इस्वी संवत)',
  'calculator.title.age.bs': 'उमेर (विक्रम संवत)',
  'calculator.title.land.terai': 'जमिन (तराई)',
  'calculator.title.land.hillMountain': 'जमिन (पहाड / हिमाल)',
  'calculator.land.type.label': 'जमिनको प्रकार',
  'calculator.land.type.terai': 'तराई',
  'calculator.land.type.hillMountain': 'पहाड / हिमाल',
  'calculator.land.terai.description':
    'तराई जमिन क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
  'land.terai.input.label': 'जग्गाको क्षेत्रफल',
  'land.terai.input.hint': 'सङ्ख्या राख्नुहोस्, जस्तै 1 वा 2.5।',
  'land.terai.input.placeholder': '2.5',
  'land.terai.unit.label': 'एकाइ',
  'land.terai.calculate': 'हिसाब गर्नुहोस्',
  'land.unit.bigha': 'बिघा',
  'land.unit.kattha': 'कठ्ठा',
  'land.unit.dhur': 'धुर',
  'land.unit.ropani': 'रोपनी',
  'land.unit.aana': 'आना',
  'land.unit.paisa': 'पैसा',
  'land.unit.daam': 'दाम',
  'land.unit.squareFeet': 'वर्ग फिट',
  'land.unit.squareMetres': 'वर्ग मिटर',
  'land.unit.hectare': 'हेक्टर',
  'land.unit.acre': 'एकड',
  'land.group.hilly': 'पहाडी · रोपनी',
  'land.group.terai': 'तराई · बिघा',
  'land.group.other': 'अन्य एकाइ',
  'land.result.input': 'इनपुट',
  'land.quickRef.title': 'तराई एकाइ सन्दर्भ',
  'land.quickRef.body': '1 बिघा = 20 कठ्ठा = 400 धुर',
  'land.error.empty': 'जग्गाको क्षेत्रफल राख्नुहोस्।',
  'land.error.malformed': 'मान्य सङ्ख्या राख्नुहोस्, जस्तै 1 वा 2.5।',
  'land.error.negative': 'जग्गाको क्षेत्रफल ऋणात्मक हुन सक्दैन।',
  'calculator.land.hillMountain.description':
    'पहाड / हिमाल जमिन क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',

  'calculator.basic.title': 'सामान्य क्यालकुलेटर',
  'calculator.basic.description':
    'सामान्य क्यालकुलेटरको इन्टरफेस र सञ्चालनहरू भविष्यको अपडेटमा तयार गरिनेछन्।',

  'simpleInterest.currency': 'रु.',
  'simpleInterest.principal.label': 'मूलधन रकम',
  'simpleInterest.principal.hint': 'ऋण दिएको वा लिएको रकम, रुपैयाँमा।',
  'simpleInterest.principal.placeholder': '100000',
  'simpleInterest.rate.label': 'ब्याज दर',
  'simpleInterest.rate.placeholder': '2',
  'simpleInterest.startDate.label': 'सुरु मिति',
  'simpleInterest.endDate.label': 'अन्तिम मिति',
  'simpleInterest.date.hint':
    '८ अङ्क टाइप गर्नुहोस् (YYYYMMDD)। स्ल्याश आफैँ थपिन्छ।',
  'simpleInterest.date.placeholder': 'YYYY/MM/DD',
  'simpleInterest.duration.mode.label': 'अवधि प्रविष्टि',
  'simpleInterest.duration.mode.dateRange': 'मिति दायरा',
  'simpleInterest.duration.mode.direct': 'सिधा अवधि',
  'simpleInterest.duration.placeholder': '0',
  'simpleInterest.duration.hint':
    'पूर्ण संख्या लेख्नुहोस्। महिना र दिन जतिसुकै हुन सक्छन्; ती आफैं रूपान्तरण हुन्छन् (१ वर्ष = ३६० दिन, १ महिना = ३० दिन)।',
  'simpleInterest.duration.normalized': 'अवधि',
  'simpleInterest.calculate': 'हिसाब गर्नुहोस्',

  'simpleInterest.error.prefix': 'त्रुटि',
  'simpleInterest.error.summary': 'तल चिन्ह लगाइएका क्षेत्रहरू सच्याउनुहोस्।',
  'simpleInterest.error.principalInvalid':
    'मूलधन सङ्ख्यामा राख्नुहोस्, जस्तै 100000 वा 2500.50।',
  'simpleInterest.error.principalNotPositive': 'मूलधन शून्यभन्दा बढी हुनुपर्छ।',
  'simpleInterest.error.rateInvalid':
    'दर सङ्ख्यामा राख्नुहोस्, जस्तै 2 वा 1.5। शून्य मान्य छ।',
  'simpleInterest.error.rateNegative': 'दर ऋणात्मक हुन सक्दैन।',
  'simpleInterest.error.rateConfigInvalid':
    'सुरक्षित गरिएको दर सेटिङ प्रयोग गर्न मिल्दैन। क्याल्कुलेटर सेटिङमा ब्याजदर राख्ने तरिका जाँच्नुहोस्।',
  'simpleInterest.error.rateModeInvalid': 'दर कसरी राख्ने भनेर छान्नुहोस्।',
  'simpleInterest.error.startDateInvalid':
    'सुरु मिति पूरा YYYY/MM/DD मा राख्नुहोस्; महिना 01 देखि 12 र गते 01 देखि 32।',
  'simpleInterest.error.endDateInvalid':
    'अन्तिम मिति पूरा YYYY/MM/DD मा राख्नुहोस्; महिना 01 देखि 12 र गते 01 देखि 32।',
  'simpleInterest.error.durationInvalid':
    'वर्ष, महिना र दिन पूर्ण संख्यामा लेख्नुहोस्, जस्तै १५ वा ०।',
  'simpleInterest.error.durationZero':
    'अवधि शून्यभन्दा बढी हुनुपर्छ। कम्तीमा एक वर्ष, महिना वा दिन लेख्नुहोस्।',
  'simpleInterest.error.durationTooLong':
    'अवधि धेरै लामो छ। १०,००० वर्षभन्दा कम लेख्नुहोस्।',
  'simpleInterest.error.endBeforeStart':
    'अन्तिम मिति सुरु मितिभन्दा अगाडि हुन सक्दैन।',

  'simpleInterest.result.title': 'घरेलु ब्याजको नतिजा',
  'simpleInterest.result.principal': 'मूलधन',
  'simpleInterest.result.interestRate': 'ब्याज दर',
  'simpleInterest.result.duration': 'अवधि',
  'simpleInterest.result.interest': 'घरेलु ब्याज',
  'simpleInterest.result.total': 'जम्मा रकम',
  'simpleInterest.rateText.percent': '{rate}% {unit}',
  'simpleInterest.rateText.rupees': 'रु. {rate} प्रति रु. {amount} {unit}',
  'compoundInterest.result.title': 'साहु ब्याजको नतिजा',
  'compoundInterest.result.interest': 'जम्मा ब्याज',
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
  'interestRate.title': 'ब्याजदर राख्ने तरिका',
  'interestRate.intro':
    'हरेक ब्याज क्याल्कुलेटरमा दर कसरी राख्ने भनी छान्नुहोस्। यहाँका परिवर्तन तुरुन्तै लागू भई सुरक्षित हुन्छन्; रद्द गर्नुले तिनलाई फर्काउँदैन।',
  'interestRate.mode.label': 'दर राख्ने तरिका',
  'interestRate.mode.percentage': 'प्रतिशत',
  'interestRate.mode.rupees': 'रकम अनुसार रुपैयाँ',
  'interestRate.period.label.percentage': 'प्रतिशतको अवधि',
  'interestRate.period.label.rupees': 'रुपैयाँको अवधि',
  'interestRate.period.yearly': 'वार्षिक',
  'interestRate.period.halfYearly': 'अर्धवार्षिक',
  'interestRate.period.quarterly': 'त्रैमासिक',
  'interestRate.period.monthly': 'मासिक',
  'interestRate.period.weekly': 'साप्ताहिक',
  'interestRate.period.daily': 'दैनिक',
  'interestRate.unit.yearly': 'प्रति वर्ष',
  'interestRate.unit.halfYearly': 'प्रति ६ महिना',
  'interestRate.unit.quarterly': 'प्रति ३ महिना',
  'interestRate.unit.monthly': 'प्रति महिना',
  'interestRate.unit.weekly': 'प्रति हप्ता',
  'interestRate.unit.daily': 'प्रति दिन',
  'interestRate.helper.percentage':
    'दर प्रतिशतमा {unit} राखिन्छ। जस्तै, २ को अर्थ {unit} २% हो।',
  'interestRate.helper.rupees':
    'दर हरेक रु. {amount} मा {unit} रुपैयाँमा राखिन्छ। जस्तै, २ को अर्थ हरेक रु. {amount} मा {unit} रु. २ हो।',
  'interestRate.helper.customPending':
    'रकम अनुसार रुपैयाँ प्रयोग गर्न तल अनुकूल रकम राख्नुहोस्।',
  'interestRate.denominator.label': 'रुपैयाँ प्रति',
  'interestRate.denominator.per100': 'प्रति १००',
  'interestRate.denominator.per1000': 'प्रति १,०००',
  'interestRate.denominator.custom': 'अनुकूल',
  'interestRate.custom.label': 'अनुकूल रकम',
  'interestRate.custom.placeholder': '250',
  'interestRate.custom.hint':
    'रुपैयाँ गणना गरिने रकम। जस्तै, 250 को अर्थ हरेक रु. 250 मा रुपैयाँ हो।',
  'interestRate.error.empty': 'अनुकूल रकम राख्नुहोस्।',
  'interestRate.error.notNumber': 'सङ्ख्या राख्नुहोस्, जस्तै 250 वा 12.5।',
  'interestRate.error.notPositive': 'रकम शून्यभन्दा बढी हुनुपर्छ।',
  'interestRate.field.hint.percentage.yearly':
    'वार्षिक ब्याज दर (%) राख्नुहोस्।',
  'interestRate.field.hint.percentage.halfYearly':
    'अर्धवार्षिक ब्याज दर (%) राख्नुहोस्।',
  'interestRate.field.hint.percentage.quarterly':
    'त्रैमासिक ब्याज दर (%) राख्नुहोस्।',
  'interestRate.field.hint.percentage.monthly':
    'मासिक ब्याज दर (%) राख्नुहोस्।',
  'interestRate.field.hint.percentage.weekly':
    'साप्ताहिक ब्याज दर (%) राख्नुहोस्।',
  'interestRate.field.hint.percentage.daily': 'दैनिक ब्याज दर (%) राख्नुहोस्।',
  'interestRate.field.hint.rupees':
    'रु. {amount} मा {unit} रुपैयाँ राख्नुहोस्।',
  'interestRate.dropdown.close': 'बन्द गर्नुहोस्',
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
