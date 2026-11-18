import { appColors } from '../colors';
import { getNavigationTheme } from '../navigationTheme';
import { themes } from '../themes';

describe('theme tokens', () => {
  it('light and dark define exactly the same semantic tokens', () => {
    expect(Object.keys(themes.dark.colors).sort()).toEqual(
      Object.keys(themes.light.colors).sort(),
    );
  });

  it('keeps the Nepal flag brand colors identical in both themes', () => {
    for (const mode of ['light', 'dark'] as const) {
      expect(themes[mode].colors.primary).toBe(appColors.brand.crimson);
      expect(themes[mode].colors.secondary).toBe(appColors.brand.deepBlue);
    }
  });

  it('uses a readable status bar for each theme', () => {
    expect(themes.light.statusBarStyle).toBe('dark-content');
    expect(themes.dark.statusBarStyle).toBe('light-content');
  });

  it('maps tokens onto the navigation theme for both modes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const navigation = getNavigationTheme(themes[mode]);
      expect(navigation.dark).toBe(themes[mode].isDark);
      expect(navigation.colors.background).toBe(themes[mode].colors.background);
      expect(navigation.colors.card).toBe(themes[mode].colors.surface);
      expect(navigation.colors.text).toBe(themes[mode].colors.text);
    }
  });
});
