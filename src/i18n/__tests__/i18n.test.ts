import { en } from '../resources/en';
import { np } from '../resources/np';
import { translate } from '../translate';

describe('translations', () => {
  it('Nepali defines exactly the same keys as English', () => {
    expect(Object.keys(np).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(np)]) {
      expect([key, value.trim().length > 0]).toEqual([key, true]);
    }
  });

  it('translates the four tab labels as specified in the issue', () => {
    expect(
      (['home', 'news', 'calculator', 'settings'] as const).map(name =>
        translate('en', `tabs.${name}`),
      ),
    ).toEqual(['Home', 'News', 'Calculator', 'Settings']);
    expect(
      (['home', 'news', 'calculator', 'settings'] as const).map(name =>
        translate('np', `tabs.${name}`),
      ),
    ).toEqual(['गृह', 'समाचार', 'क्यालकुलेटर', 'सेटिङ']);
  });

  it('translates the calculator tab labels as specified in the issue', () => {
    const keys = [
      'calculator.tabs.interest',
      'calculator.tabs.age',
      'calculator.tabs.land',
    ] as const;
    expect(keys.map(key => translate('en', key))).toEqual([
      'Interest',
      'Age',
      'Land',
    ]);
    expect(keys.map(key => translate('np', key))).toEqual([
      'ब्याज',
      'उमेर',
      'जमिन',
    ]);
  });
});
