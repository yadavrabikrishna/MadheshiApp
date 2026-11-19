/**
 * End-to-end preference flows: the real app tree, Redux store, repository and
 * migrations, on a real (Node) SQLite database instead of the device driver.
 *
 * Every test gets its own fresh database and shares no state with the others.
 * A "restart" is a new mount of the app on the SAME database.
 */
import { Appearance } from 'react-native';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap, AppRoot } from '../src/app';
import type { PreferencesRepository } from '../src/storage';
import { runMigrations } from '../src/storage/migrations';
import { createPreferencesRepository } from '../src/storage/preferencesRepository';
import {
  createRawTestDatabase,
  createTestDatabase,
} from '../src/test-utils/createTestDatabase';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Keep the native SQLite module out of Jest. Tests inject their own database via
// <AppBootstrap initializeStorage>, so reaching this stub means a test forgot to.
jest.mock('../src/storage/database', () => ({
  openDatabase: () => {
    throw new Error('The native database must not be used in tests');
  },
}));

// The first render loads React Navigation and every screen, which can take well
// over Jest's 5s default on a slower machine (e.g. Windows). Not a hang.
jest.setTimeout(60000);

const TAB_LABELS = {
  en: ['Home', 'News', 'Calculator', 'Settings'],
  np: ['गृह', 'समाचार', 'क्यालकुलेटर', 'सेटिङ'],
};

type InitializeStorage = () => Promise<PreferencesRepository>;

/** A brand-new database; pass its `initializeStorage` to every launch of one "device". */
function newDevice() {
  const file = createRawTestDatabase();
  const initializeStorage: InitializeStorage = async () => {
    const db = createTestDatabase(file);
    await runMigrations(db);
    return createPreferencesRepository(db);
  };
  return { initializeStorage };
}

async function launch(initializeStorage: InitializeStorage) {
  const user = userEvent.setup();
  await render(
    <SafeAreaProvider>
      <AppBootstrap initializeStorage={initializeStorage}>
        <AppRoot />
      </AppBootstrap>
    </SafeAreaProvider>,
  );
  // Waits for storage + hydration to finish and the real UI to appear.
  await screen.findByRole('button', { name: /, tab, 1 of 4/ });
  return user;
}

/** React Navigation labels tab buttons like "Home, tab, 1 of 4". */
function tab(label: string) {
  return screen.getByRole('button', { name: new RegExp(`^${label}, tab`) });
}

function expectTabLabels(language: 'en' | 'np') {
  for (const label of TAB_LABELS[language]) {
    expect(tab(label)).toBeOnTheScreen();
  }
}

const themeButton = () =>
  screen.queryByRole('button', { name: /^Switch to (dark|light) theme$/ });
const languageButton = () =>
  screen.queryByRole('button', { name: 'Change language' });
const showThemeSwitch = () =>
  screen.getByRole('switch', { name: 'Show theme button in header' });
const showLanguageSwitch = () =>
  screen.getByRole('switch', { name: 'Show language button in header' });

const darkToggle = () =>
  screen.getByRole('button', { name: 'Switch to dark theme' });
const lightToggle = () =>
  screen.getByRole('button', { name: 'Switch to light theme' });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('first launch', () => {
  it('uses English and the system theme (light)', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    await launch(newDevice().initializeStorage);

    expectTabLabels('en');
    expect(darkToggle()).toBeOnTheScreen();
  });

  it('uses the system theme when it is dark', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    await launch(newDevice().initializeStorage);

    expect(lightToggle()).toBeOnTheScreen();
  });
});

describe('language', () => {
  it('changing it in the header translates the tabs and Settings immediately', async () => {
    const user = await launch(newDevice().initializeStorage);

    await user.press(screen.getByRole('button', { name: 'Change language' }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));
    expectTabLabels('np');

    await user.press(tab('सेटिङ'));
    expect(
      screen.getByRole('radio', { name: 'नेपाली', selected: true }),
    ).toBeOnTheScreen();
    expect(screen.getByText('देखावट')).toBeOnTheScreen();
  });

  it('changing it in Settings updates the header and tabs too', async () => {
    const user = await launch(newDevice().initializeStorage);

    await user.press(tab('Settings'));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));
    expectTabLabels('np');
    // The header menu agrees: Nepali is the selected choice.
    await user.press(
      screen.getByRole('button', { name: 'भाषा परिवर्तन गर्नुहोस्' }),
    );
    expect(
      screen.getAllByRole('radio', { name: 'नेपाली', selected: true }).length,
    ).toBeGreaterThan(0);
  });
});

describe('theme', () => {
  it('Settings and the header toggle always show the same mode', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const user = await launch(newDevice().initializeStorage);
    await user.press(tab('Settings'));

    expect(
      screen.getByRole('radio', { name: 'Light', selected: true }),
    ).toBeOnTheScreen();

    // Header -> Settings
    await user.press(darkToggle());
    expect(
      screen.getByRole('radio', { name: 'Dark', selected: true }),
    ).toBeOnTheScreen();
    expect(lightToggle()).toBeOnTheScreen();

    // Settings -> header
    await user.press(screen.getByRole('radio', { name: 'Light' }));
    expect(darkToggle()).toBeOnTheScreen();

    // Repeated switching stays consistent.
    for (let i = 0; i < 3; i++) {
      await user.press(screen.getByRole('radio', { name: 'Dark' }));
      await user.press(screen.getByRole('radio', { name: 'Light' }));
    }
    await user.press(screen.getByRole('radio', { name: 'Dark' }));
    expect(lightToggle()).toBeOnTheScreen();
  });
});

describe('restart', () => {
  it('restores the saved language (np) and theme', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const device = newDevice();

    const user = await launch(device.initializeStorage);
    await user.press(screen.getByRole('button', { name: 'Change language' }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));
    await user.press(
      screen.getByRole('button', { name: 'अँध्यारो थिममा बदल्नुहोस्' }),
    );
    await cleanup();

    // Same database, brand-new app instance.
    await launch(device.initializeStorage);
    expectTabLabels('np');
    expect(
      screen.getByRole('button', { name: 'उज्यालो थिममा बदल्नुहोस्' }),
    ).toBeOnTheScreen();
  });

  it('a saved theme wins over the system theme', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const device = newDevice();

    const user = await launch(device.initializeStorage);
    await user.press(darkToggle());
    await cleanup();

    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    await launch(device.initializeStorage);
    expect(lightToggle()).toBeOnTheScreen(); // still dark, although the system is light
  });
});

describe('header shortcut visibility', () => {
  it('both header shortcuts are shown by default, and Settings shows both switches on', async () => {
    const user = await launch(newDevice().initializeStorage);
    expect(themeButton()).toBeOnTheScreen();
    expect(languageButton()).toBeOnTheScreen();

    await user.press(tab('Settings'));
    expect(showThemeSwitch().props.value).toBe(true);
    expect(showLanguageSwitch().props.value).toBe(true);
  });

  it('hides and shows each header button immediately', async () => {
    const user = await launch(newDevice().initializeStorage);
    await user.press(tab('Settings'));

    await fireEvent(showThemeSwitch(), 'valueChange', false);
    expect(themeButton()).toBeNull();
    expect(languageButton()).toBeOnTheScreen(); // independent

    await fireEvent(showLanguageSwitch(), 'valueChange', false);
    expect(languageButton()).toBeNull();

    await fireEvent(showThemeSwitch(), 'valueChange', true);
    expect(themeButton()).toBeOnTheScreen();
    expect(languageButton()).toBeNull();

    await fireEvent(showLanguageSwitch(), 'valueChange', true);
    expect(languageButton()).toBeOnTheScreen();
  });

  it('theme and language stay changeable in Settings while both header buttons are hidden', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const user = await launch(newDevice().initializeStorage);
    await user.press(tab('Settings'));
    await fireEvent(showThemeSwitch(), 'valueChange', false);
    await fireEvent(showLanguageSwitch(), 'valueChange', false);
    expect(themeButton()).toBeNull();
    expect(languageButton()).toBeNull();

    await user.press(screen.getByRole('radio', { name: 'Dark' }));
    expect(
      screen.getByRole('radio', { name: 'Dark', selected: true }),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));
    expectTabLabels('np');
  });

  it('applies to every tab, not just Settings', async () => {
    const user = await launch(newDevice().initializeStorage);
    await user.press(tab('Settings'));
    await fireEvent(showThemeSwitch(), 'valueChange', false);

    await user.press(tab('News'));
    expect(themeButton()).toBeNull();
    expect(languageButton()).toBeOnTheScreen();
  });

  it('labels the switches in Nepali', async () => {
    const user = await launch(newDevice().initializeStorage);
    await user.press(screen.getByRole('button', { name: 'Change language' }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));
    await user.press(tab('सेटिङ'));

    expect(screen.getByText('हेडर सर्टकट')).toBeOnTheScreen();
    expect(
      screen.getByRole('switch', { name: 'हेडरमा थिम बटन देखाउनुहोस्' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('switch', { name: 'हेडरमा भाषा बटन देखाउनुहोस्' }),
    ).toBeOnTheScreen();
  });

  it('restores hidden shortcuts after a restart', async () => {
    const device = newDevice();
    const user = await launch(device.initializeStorage);
    await user.press(tab('Settings'));
    await fireEvent(showThemeSwitch(), 'valueChange', false);
    await cleanup();

    await launch(device.initializeStorage);
    expect(themeButton()).toBeNull();
    expect(languageButton()).toBeOnTheScreen();
  });

  it('shows both shortcuts when saved settings cannot be loaded', async () => {
    await launch(() => Promise.reject(new Error('db broken')));
    expect(themeButton()).toBeOnTheScreen();
    expect(languageButton()).toBeOnTheScreen();
  });
});

describe('storage problems', () => {
  it('start-up failure: runs on the system theme and English, and Settings shows the load warning', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    const user = await launch(() => Promise.reject(new Error('db broken')));

    expectTabLabels('en');
    expect(lightToggle()).toBeOnTheScreen(); // system theme (dark), not always light

    await user.press(tab('Settings'));
    expect(
      screen.getByText(
        'Your saved settings could not be loaded. Default settings are being used.',
      ),
    ).toBeOnTheScreen();
  });

  it('a failed save keeps the new value but Settings warns that it is not saved', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const user = await launch(async () => ({
      load: async () => ({
        theme: null,
        language: null,
        showThemeShortcut: null,
        showLanguageShortcut: null,
      }),
      saveTheme: () => Promise.reject(new Error('disk full')),
      saveLanguage: async () => {},
      saveShowThemeShortcut: async () => {},
      saveShowLanguageShortcut: async () => {},
      loadCalculators: async () => ({ enabled: null, active: null }),
      saveCalculatorSettings: async () => {},
      saveActiveCalculator: async () => {},
    }));

    await user.press(darkToggle());
    expect(lightToggle()).toBeOnTheScreen(); // applied immediately anyway

    await user.press(tab('Settings'));
    expect(
      screen.getByText(
        'This setting could not be saved on this device. It may reset when you close the app.',
      ),
    ).toBeOnTheScreen();
  });
});
