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
  'calculator.interest.simple.description':
    'घरेलु ब्याज क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
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
