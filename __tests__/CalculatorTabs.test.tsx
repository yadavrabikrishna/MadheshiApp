/**
 * Calculator top tabs (Interest / Age / Land): the real app tree, Redux store and
 * i18n, on a real (Node) SQLite database instead of the device driver.
 */
import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap, AppRoot } from '../src/app';
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

jest.mock('../src/storage/database', () => ({
  openDatabase: () => {
    throw new Error('The native database must not be used in tests');
  },
}));

// The first render loads React Navigation and every screen (see App.test.tsx).
jest.setTimeout(60000);

const DESCRIPTIONS = {
  en: {
    simple: 'Principal amount',
    compound:
      'The compound interest calculator will be implemented in a later task.',
    ageAd: 'The AD age calculator will be implemented in a later task.',
    ageBs: 'The BS age calculator will be implemented in a later task.',
    landTerai: 'The Terai land calculator will be implemented in a later task.',
    landHill:
      'The Hill / Mountain land calculator will be implemented in a later task.',
  },
  np: {
    simple: 'मूलधन रकम',
    compound: 'साहु ब्याज क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    ageAd: 'इस्वी संवत उमेर क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    ageBs: 'विक्रम संवत उमेर क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    landTerai: 'तराई जमिन क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    landHill: 'पहाड / हिमाल जमिन क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
  },
};

async function launchOnCalculator() {
  const file = createRawTestDatabase();
  const user = userEvent.setup();
  await render(
    <SafeAreaProvider>
      <AppBootstrap
        initializeStorage={async () => {
          const db = createTestDatabase(file);
          await runMigrations(db);
          return createPreferencesRepository(db);
        }}
      >
        <AppRoot />
      </AppBootstrap>
    </SafeAreaProvider>,
  );
  await screen.findByRole('button', { name: /, tab, 1 of 4/ });
  await user.press(screen.getByRole('button', { name: /^Calculator, tab/ }));
  return user;
}

const topTab = (name: string) => screen.getByRole('tab', { name });
const interestOption = (name: string, selected?: boolean) =>
  screen.getByRole('radio', { name, selected });
const dateSystemOption = interestOption; // same shared SegmentedControl (radio) pattern
const radioLabels = () =>
  screen.queryAllByRole('radio').map(node => node.props.accessibilityLabel);
const tabLabels = () =>
  screen.getAllByRole('tab').map(node => node.props.accessibilityLabel);

async function changeLanguage(
  user: Awaited<ReturnType<typeof launchOnCalculator>>,
  label: 'नेपाली' | 'English',
) {
  await user.press(
    screen.getByRole('button', {
      name: /^(Change language|भाषा परिवर्तन गर्नुहोस्)$/,
    }),
  );
  await user.press(screen.getByRole('radio', { name: label }));
}

describe('Calculator top tabs', () => {
  it('shows Interest, Age and Land in a row, with Interest selected by default', async () => {
    await launchOnCalculator();

    expect(tabLabels()).toEqual(['Interest', 'Age', 'Land']);

    expect(topTab('Interest').props.accessibilityState.selected).toBe(true);
    expect(topTab('Age').props.accessibilityState.selected).toBe(false);
    expect(topTab('Land').props.accessibilityState.selected).toBe(false);
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
  });

  it('shows the matching view for each tab, one at a time', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Age'));
    expect(topTab('Age').props.accessibilityState.selected).toBe(true);
    expect(topTab('Interest').props.accessibilityState.selected).toBe(false);
    expect(screen.getByText(DESCRIPTIONS.en.ageBs)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.simple)).toBeNull();

    await user.press(topTab('Land'));
    expect(screen.getByText(DESCRIPTIONS.en.landTerai)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.ageBs)).toBeNull();

    await user.press(topTab('Interest'));
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.landTerai)).toBeNull();
  });

  it('does not add the three tabs to the bottom navigation', async () => {
    await launchOnCalculator();

    expect(
      screen.getAllByRole('button', { name: /, tab, \d of 4/ }),
    ).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /^Interest, tab/ })).toBeNull();
  });

  it('shows the Nepali labels after switching to Nepali, immediately', async () => {
    const user = await launchOnCalculator();

    await changeLanguage(user, 'नेपाली');

    expect(tabLabels()).toEqual(['ब्याज', 'उमेर', 'जमिन']);
    expect(screen.getByText(DESCRIPTIONS.np.simple)).toBeOnTheScreen();
  });

  it('keeps the selected tab when the language changes, in both directions', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Land'));
    await changeLanguage(user, 'नेपाली');
    expect(topTab('जमिन').props.accessibilityState.selected).toBe(true);
    expect(topTab('ब्याज').props.accessibilityState.selected).toBe(false);
    expect(screen.getByText(DESCRIPTIONS.np.landTerai)).toBeOnTheScreen();

    await user.press(topTab('उमेर'));
    await changeLanguage(user, 'English');
    expect(topTab('Age').props.accessibilityState.selected).toBe(true);
    expect(screen.getByText(DESCRIPTIONS.en.ageBs)).toBeOnTheScreen();
  });
});

describe('Interest type selector', () => {
  it('shows Simple Interest and Compound Interest, with Simple selected on the first launch', async () => {
    await launchOnCalculator();

    expect(
      screen.getAllByRole('radio').map(node => node.props.accessibilityLabel),
    ).toEqual([
      'Simple Interest',
      'Compound Interest',
      // The Simple Interest view's own rate-mode selector follows the type selector.
      '% per month',
      'Rs. per Rs. 100',
    ]);
    expect(interestOption('Simple Interest', true)).toBeOnTheScreen();
    expect(interestOption('Compound Interest', false)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull();
  });

  it('shows the matching view for each interest type', async () => {
    const user = await launchOnCalculator();

    await user.press(interestOption('Simple Interest'));
    expect(interestOption('Simple Interest', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull();

    await user.press(interestOption('Compound Interest'));
    expect(interestOption('Compound Interest', true)).toBeOnTheScreen();
    // Compound uses the same form as Simple and now has a working engine, so
    // the old "not implemented yet" note is gone.
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull(); // no \"not implemented\" note
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();

    await user.press(interestOption('Simple Interest'));
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull();
  });

  it('updates both labels immediately when the language changes', async () => {
    const user = await launchOnCalculator();

    await changeLanguage(user, 'नेपाली');
    expect(
      screen.getAllByRole('radio').map(node => node.props.accessibilityLabel),
    ).toEqual([
      'घरेलु ब्याज',
      'साहु ब्याज',
      '% प्रति महिना',
      'रु. प्रति रु. १००',
    ]);

    await changeLanguage(user, 'English');
    expect(
      screen.getAllByRole('radio').map(node => node.props.accessibilityLabel),
    ).toEqual([
      'Simple Interest',
      'Compound Interest',
      // The Simple Interest view's own rate-mode selector follows the type selector.
      '% per month',
      'Rs. per Rs. 100',
    ]);
  });

  it('keeps the selected interest type when the language changes, in both directions', async () => {
    const user = await launchOnCalculator();

    // The first-launch selection (Simple) survives a language change.
    await changeLanguage(user, 'नेपाली');
    expect(interestOption('घरेलु ब्याज', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.np.simple)).toBeOnTheScreen();

    // So does an explicit Compound selection.
    await user.press(interestOption('साहु ब्याज'));
    await changeLanguage(user, 'English');
    expect(interestOption('Compound Interest', true)).toBeOnTheScreen();
    expect(interestOption('Simple Interest', false)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull(); // no \"not implemented\" note
  });

  it('is shown only on the Interest tab, and the other Calculator tabs still work', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Age'));
    expect(screen.queryAllByRole('radio', { name: /Interest/ })).toHaveLength(
      0,
    );
    expect(screen.getByText(DESCRIPTIONS.en.ageBs)).toBeOnTheScreen();

    await user.press(topTab('Land'));
    expect(screen.queryAllByRole('radio', { name: /Interest/ })).toHaveLength(
      0,
    );
    expect(screen.getByText(DESCRIPTIONS.en.landTerai)).toBeOnTheScreen();

    await user.press(topTab('Interest'));
    expect(interestOption('Simple Interest', true)).toBeOnTheScreen();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});

describe('Age date system selector', () => {
  it('shows BS first and AD second, with BS selected by default', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Age'));

    expect(radioLabels()).toEqual(['BS (Bikram Sambat)', 'AD (Gregorian)']);
    expect(dateSystemOption('BS (Bikram Sambat)', true)).toBeOnTheScreen();
    expect(dateSystemOption('AD (Gregorian)', false)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.ageBs)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.ageAd)).toBeNull();
  });

  it('shows the matching placeholder for each date system', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Age'));

    await user.press(dateSystemOption('AD (Gregorian)'));
    expect(dateSystemOption('AD (Gregorian)', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.ageAd)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.ageBs)).toBeNull();

    await user.press(dateSystemOption('BS (Bikram Sambat)'));
    expect(dateSystemOption('BS (Bikram Sambat)', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.ageBs)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.ageAd)).toBeNull();
  });

  it('updates both labels immediately when the language changes', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Age'));

    await changeLanguage(user, 'नेपाली');
    expect(radioLabels()).toEqual(['विक्रम संवत', 'इस्वी संवत']);

    await changeLanguage(user, 'English');
    expect(radioLabels()).toEqual(['BS (Bikram Sambat)', 'AD (Gregorian)']);
  });

  it('keeps the selected date system when the language changes, in both directions', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Age'));

    // Default (BS) survives a language change.
    await changeLanguage(user, 'नेपाली');
    expect(dateSystemOption('विक्रम संवत', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.np.ageBs)).toBeOnTheScreen();

    // So does an explicit AD selection.
    await user.press(dateSystemOption('इस्वी संवत'));
    await changeLanguage(user, 'English');
    expect(dateSystemOption('AD (Gregorian)', true)).toBeOnTheScreen();
    expect(dateSystemOption('BS (Bikram Sambat)', false)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.ageAd)).toBeOnTheScreen();
  });

  it('appears only inside the Age calculator, not the Interest or Land selectors', async () => {
    const user = await launchOnCalculator();

    // Interest tab: only the Interest selector.
    expect(radioLabels()).toEqual([
      'Simple Interest',
      'Compound Interest',
      // The Simple Interest view's own rate-mode selector follows the type selector.
      '% per month',
      'Rs. per Rs. 100',
    ]);

    await user.press(topTab('Land'));
    expect(radioLabels()).toEqual(['Terai', 'Hill / Mountain']);

    await user.press(topTab('Age'));
    expect(radioLabels()).toEqual(['BS (Bikram Sambat)', 'AD (Gregorian)']);
  });

  it('keeps the selected date system when switching to another Calculator tab and back', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Age'));
    await user.press(dateSystemOption('AD (Gregorian)'));
    await user.press(topTab('Land'));
    await user.press(topTab('Interest'));
    await user.press(topTab('Age'));

    expect(dateSystemOption('AD (Gregorian)', true)).toBeOnTheScreen();
    expect(dateSystemOption('BS (Bikram Sambat)', false)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.ageAd)).toBeOnTheScreen();
  });

  it('keeps the selected date system when navigating to another app tab and back', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Age'));
    await user.press(dateSystemOption('AD (Gregorian)'));
    await user.press(screen.getByRole('button', { name: /^Home, tab/ }));
    await user.press(screen.getByRole('button', { name: /^Calculator, tab/ }));

    expect(topTab('Age').props.accessibilityState.selected).toBe(true);
    expect(dateSystemOption('AD (Gregorian)', true)).toBeOnTheScreen();
  });

  it("keeps each calculator's own selection independently while switching tabs", async () => {
    const user = await launchOnCalculator();

    await user.press(dateSystemOption('Simple Interest'));
    await user.press(topTab('Age'));
    await user.press(dateSystemOption('AD (Gregorian)'));

    await user.press(topTab('Interest'));
    expect(dateSystemOption('Simple Interest', true)).toBeOnTheScreen();
    await user.press(topTab('Age'));
    expect(dateSystemOption('AD (Gregorian)', true)).toBeOnTheScreen();
  });

  it('leaves the Interest selector and the Interest and Land tabs working', async () => {
    const user = await launchOnCalculator();

    await user.press(dateSystemOption('Simple Interest'));
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();

    await user.press(topTab('Age'));
    await user.press(topTab('Land'));
    expect(screen.getByText(DESCRIPTIONS.en.landTerai)).toBeOnTheScreen();

    // The Interest choice is kept, and Compound is still the default elsewhere.
    await user.press(topTab('Interest'));
    expect(dateSystemOption('Simple Interest', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
    await user.press(dateSystemOption('Compound Interest'));
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull(); // no \"not implemented\" note
  });
});

describe('Land type selector', () => {
  const landOption = interestOption; // same shared SegmentedControl (radio) pattern

  it('shows Terai first and Hill / Mountain second, with Terai selected by default', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Land'));

    expect(radioLabels()).toEqual(['Terai', 'Hill / Mountain']);
    expect(landOption('Terai', true)).toBeOnTheScreen();
    expect(landOption('Hill / Mountain', false)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.landTerai)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.landHill)).toBeNull();
  });

  it('shows the matching placeholder for each land type', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Land'));

    await user.press(landOption('Hill / Mountain'));
    expect(landOption('Hill / Mountain', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.landHill)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.landTerai)).toBeNull();

    await user.press(landOption('Terai'));
    expect(landOption('Terai', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.landTerai)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.landHill)).toBeNull();
  });

  it('updates both labels immediately when the language changes', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Land'));

    await changeLanguage(user, 'नेपाली');
    expect(radioLabels()).toEqual(['तराई', 'पहाड / हिमाल']);

    await changeLanguage(user, 'English');
    expect(radioLabels()).toEqual(['Terai', 'Hill / Mountain']);
  });

  it('keeps the selected land type when the language changes, in both directions', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Land'));

    // Default (Terai) survives a language change.
    await changeLanguage(user, 'नेपाली');
    expect(landOption('तराई', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.np.landTerai)).toBeOnTheScreen();

    // So does an explicit Hill / Mountain selection.
    await user.press(landOption('पहाड / हिमाल'));
    await changeLanguage(user, 'English');
    expect(landOption('Hill / Mountain', true)).toBeOnTheScreen();
    expect(landOption('Terai', false)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.landHill)).toBeOnTheScreen();
  });

  it('appears only inside the Land calculator', async () => {
    const user = await launchOnCalculator();

    expect(radioLabels()).not.toContain('Terai');
    await user.press(topTab('Age'));
    expect(radioLabels()).not.toContain('Terai');
    await user.press(topTab('Land'));
    expect(radioLabels()).toContain('Terai');
  });

  it('keeps the selected land type when switching Calculator tabs and back', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Land'));
    await user.press(landOption('Hill / Mountain'));
    await user.press(topTab('Age'));
    await user.press(topTab('Interest'));
    await user.press(topTab('Land'));

    expect(landOption('Hill / Mountain', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.landHill)).toBeOnTheScreen();
  });

  it('leaves the Interest and Age selectors and tabs unchanged', async () => {
    const user = await launchOnCalculator();

    // Interest: Simple on the first launch, then Compound.
    expect(landOption('Simple Interest', true)).toBeOnTheScreen();
    await user.press(landOption('Compound Interest'));
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull(); // no \"not implemented\" note

    // Age: BS default, then AD.
    await user.press(topTab('Age'));
    expect(landOption('BS (Bikram Sambat)', true)).toBeOnTheScreen();
    await user.press(landOption('AD (Gregorian)'));
    expect(screen.getByText(DESCRIPTIONS.en.ageAd)).toBeOnTheScreen();

    // Each keeps its own choice, independent of the Land selector.
    await user.press(topTab('Land'));
    await user.press(landOption('Hill / Mountain'));
    await user.press(topTab('Interest'));
    expect(landOption('Compound Interest', true)).toBeOnTheScreen();
    await user.press(topTab('Age'));
    expect(landOption('AD (Gregorian)', true)).toBeOnTheScreen();
  });
});

describe('Calculator header title', () => {
  type User = Awaited<ReturnType<typeof launchOnCalculator>>;

  const headerTitle = () => {
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    return headings[0].props.children as string;
  };

  const EN = {
    tabs: { interest: 'Interest', age: 'Age', land: 'Land' },
    simple: 'Simple Interest',
    compound: 'Compound Interest',
    bs: 'BS (Bikram Sambat)',
    ad: 'AD (Gregorian)',
    terai: 'Terai',
    hill: 'Hill / Mountain',
  };
  const NP = {
    tabs: { interest: 'ब्याज', age: 'उमेर', land: 'जमिन' },
    simple: 'घरेलु ब्याज',
    compound: 'साहु ब्याज',
    bs: 'विक्रम संवत',
    ad: 'इस्वी संवत',
    terai: 'तराई',
    hill: 'पहाड / हिमाल',
  };

  /** Opens every calculator type and returns the header title shown for each. */
  async function walkAllSix(user: User, l: typeof EN) {
    const titles: string[] = [];
    await user.press(topTab(l.tabs.interest));
    await user.press(interestOption(l.simple));
    titles.push(headerTitle());
    await user.press(interestOption(l.compound));
    titles.push(headerTitle());
    await user.press(topTab(l.tabs.age));
    await user.press(interestOption(l.ad));
    titles.push(headerTitle());
    await user.press(interestOption(l.bs));
    titles.push(headerTitle());
    await user.press(topTab(l.tabs.land));
    await user.press(interestOption(l.terai));
    titles.push(headerTitle());
    await user.press(interestOption(l.hill));
    titles.push(headerTitle());
    return titles;
  }

  it('shows the Simple Interest title on the first launch instead of "Calculator"', async () => {
    await launchOnCalculator();
    expect(headerTitle()).toBe('Simple Interest');
  });

  it('shows the right title for all six calculators in English', async () => {
    const user = await launchOnCalculator();
    expect(await walkAllSix(user, EN)).toEqual([
      'Simple Interest',
      'Compound Interest',
      'Age (AD)',
      'Age (BS)',
      'Land (Terai)',
      'Land (Hill / Mountain)',
    ]);
  });

  it('shows the right title for all six calculators in Nepali', async () => {
    const user = await launchOnCalculator();
    await changeLanguage(user, 'नेपाली');
    expect(await walkAllSix(user, NP)).toEqual([
      'घरेलु ब्याज',
      'साहु ब्याज',
      'उमेर (इस्वी संवत)',
      'उमेर (विक्रम संवत)',
      'जमिन (तराई)',
      'जमिन (पहाड / हिमाल)',
    ]);
  });

  it("follows each calculator's own selection when switching top-level tabs", async () => {
    const user = await launchOnCalculator();

    await user.press(interestOption(EN.simple));
    await user.press(topTab('Age'));
    expect(headerTitle()).toBe('Age (BS)');
    await user.press(interestOption(EN.ad));
    expect(headerTitle()).toBe('Age (AD)');

    await user.press(topTab('Land'));
    expect(headerTitle()).toBe('Land (Terai)');
    await user.press(interestOption(EN.hill));
    expect(headerTitle()).toBe('Land (Hill / Mountain)');

    // Back to each tab: the title reflects what that tab had selected.
    await user.press(topTab('Interest'));
    expect(headerTitle()).toBe('Simple Interest');
    await user.press(topTab('Age'));
    expect(headerTitle()).toBe('Age (AD)');
    await user.press(topTab('Land'));
    expect(headerTitle()).toBe('Land (Hill / Mountain)');
  });

  it('re-translates the title on a language change without resetting any selection', async () => {
    const user = await launchOnCalculator();

    await user.press(interestOption(EN.simple));
    await user.press(topTab('Age'));
    await user.press(interestOption(EN.ad));
    await user.press(topTab('Land'));
    await user.press(interestOption(EN.hill));

    await changeLanguage(user, 'नेपाली');
    expect(headerTitle()).toBe('जमिन (पहाड / हिमाल)');
    expect(topTab('जमिन').props.accessibilityState.selected).toBe(true);
    expect(interestOption(NP.hill, true)).toBeOnTheScreen();

    await user.press(topTab('उमेर'));
    expect(headerTitle()).toBe('उमेर (इस्वी संवत)');
    expect(interestOption(NP.ad, true)).toBeOnTheScreen();

    await user.press(topTab('ब्याज'));
    expect(headerTitle()).toBe('घरेलु ब्याज');
    expect(interestOption(NP.simple, true)).toBeOnTheScreen();

    await changeLanguage(user, 'English');
    expect(headerTitle()).toBe('Simple Interest');
    expect(topTab('Interest').props.accessibilityState.selected).toBe(true);
  });

  it('keeps the header controls working', async () => {
    const user = await launchOnCalculator();

    const themeToggle = () =>
      screen.getByRole('button', { name: /^Switch to (light|dark) theme$/ });
    const before = themeToggle().props.accessibilityLabel;
    await user.press(themeToggle());
    expect(themeToggle().props.accessibilityLabel).not.toBe(before);
    expect(headerTitle()).toBe('Simple Interest');

    // The language menu still opens and switches the language.
    await changeLanguage(user, 'नेपाली');
    expect(headerTitle()).toBe('घरेलु ब्याज');
  });

  it('leaves the bottom navigation unchanged', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Land'));
    await user.press(interestOption(EN.hill));

    // The bottom tab keeps its own label; only the header title changes.
    expect(
      screen.getAllByRole('button', { name: /, tab, \d of 4/ }),
    ).toHaveLength(4);
    expect(
      screen.getByRole('button', { name: /^Calculator, tab/ }),
    ).toBeOnTheScreen();
    expect(headerTitle()).toBe('Land (Hill / Mountain)');

    await user.press(screen.getByRole('button', { name: /^Home, tab/ }));
    expect(headerTitle()).toBe('Home');

    await user.press(screen.getByRole('button', { name: /^Calculator, tab/ }));
    expect(headerTitle()).toBe('Land (Hill / Mountain)');
    expect(interestOption(EN.hill, true)).toBeOnTheScreen();
  });
});
