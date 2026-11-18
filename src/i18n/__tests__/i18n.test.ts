import { en } from '../resources/en';
import { ne } from '../resources/ne';
import { translate } from '../translate';

describe('translations', () => {
  it('Nepali defines exactly the same keys as English', () => {
    expect(Object.keys(ne).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(ne)]) {
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
        translate('ne', `tabs.${name}`),
      ),
    ).toEqual(['गृह', 'समाचार', 'क्यालकुलेटर', 'सेटिङ']);
  });
});
