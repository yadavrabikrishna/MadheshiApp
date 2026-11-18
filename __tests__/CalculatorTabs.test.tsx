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
    simple:
      'The simple interest calculator will be implemented in a later task.',
    compound:
      'The compound interest calculator will be implemented in a later task.',
    ageAd: 'The AD age calculator will be implemented in a later task.',
    ageBs: 'The BS age calculator will be implemented in a later task.',
    land: 'The land calculator will be implemented in a later task.',
  },
  np: {
    simple: 'घरेलु ब्याज क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    compound: 'साहु ब्याज क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    ageAd: 'इस्वी संवत उमेर क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    ageBs: 'विक्रम संवत उमेर क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    land: 'जमिन क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
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
    expect(screen.getByText(DESCRIPTIONS.en.compound)).toBeOnTheScreen();
  });

  it('shows the matching view for each tab, one at a time', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Age'));
    expect(topTab('Age').props.accessibilityState.selected).toBe(true);
    expect(topTab('Interest').props.accessibilityState.selected).toBe(false);
    expect(screen.getByText(DESCRIPTIONS.en.ageBs)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull();

    await user.press(topTab('Land'));
    expect(screen.getByText(DESCRIPTIONS.en.land)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.ageBs)).toBeNull();

    await user.press(topTab('Interest'));
    expect(screen.getByText(DESCRIPTIONS.en.compound)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.land)).toBeNull();
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
    expect(screen.getByText(DESCRIPTIONS.np.compound)).toBeOnTheScreen();
  });

  it('keeps the selected tab when the language changes, in both directions', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Land'));
    await changeLanguage(user, 'नेपाली');
    expect(topTab('जमिन').props.accessibilityState.selected).toBe(true);
    expect(topTab('ब्याज').props.accessibilityState.selected).toBe(false);
    expect(screen.getByText(DESCRIPTIONS.np.land)).toBeOnTheScreen();

    await user.press(topTab('उमेर'));
    await changeLanguage(user, 'English');
    expect(topTab('Age').props.accessibilityState.selected).toBe(true);
    expect(screen.getByText(DESCRIPTIONS.en.ageBs)).toBeOnTheScreen();
  });
});

describe('Interest type selector', () => {
  it('shows Simple Interest and Compound Interest, with Compound selected by default', async () => {
    await launchOnCalculator();

    expect(
      screen.getAllByRole('radio').map(node => node.props.accessibilityLabel),
    ).toEqual(['Simple Interest', 'Compound Interest']);
    expect(interestOption('Compound Interest', true)).toBeOnTheScreen();
    expect(interestOption('Simple Interest', false)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.compound)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.simple)).toBeNull();
  });

  it('shows the matching view for each interest type', async () => {
    const user = await launchOnCalculator();

    await user.press(interestOption('Simple Interest'));
    expect(interestOption('Simple Interest', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.compound)).toBeNull();

    await user.press(interestOption('Compound Interest'));
    expect(interestOption('Compound Interest', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.compound)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.simple)).toBeNull();
  });

  it('updates both labels immediately when the language changes', async () => {
    const user = await launchOnCalculator();

    await changeLanguage(user, 'नेपाली');
    expect(
      screen.getAllByRole('radio').map(node => node.props.accessibilityLabel),
    ).toEqual(['घरेलु ब्याज', 'साहु ब्याज']);

    await changeLanguage(user, 'English');
    expect(
      screen.getAllByRole('radio').map(node => node.props.accessibilityLabel),
    ).toEqual(['Simple Interest', 'Compound Interest']);
  });

  it('keeps the selected interest type when the language changes, in both directions', async () => {
    const user = await launchOnCalculator();

    // Default (Compound) survives a language change.
    await changeLanguage(user, 'नेपाली');
    expect(interestOption('साहु ब्याज', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.np.compound)).toBeOnTheScreen();

    // So does an explicit Simple selection.
    await user.press(interestOption('घरेलु ब्याज'));
    await changeLanguage(user, 'English');
    expect(interestOption('Simple Interest', true)).toBeOnTheScreen();
    expect(interestOption('Compound Interest', false)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
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
    expect(screen.getByText(DESCRIPTIONS.en.land)).toBeOnTheScreen();

    await user.press(topTab('Interest'));
    expect(interestOption('Compound Interest', true)).toBeOnTheScreen();
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

  it('appears only inside the Age calculator', async () => {
    const user = await launchOnCalculator();

    // Interest tab: only the Interest selector.
    expect(radioLabels()).toEqual(['Simple Interest', 'Compound Interest']);

    await user.press(topTab('Land'));
    expect(radioLabels()).toEqual([]);

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
    expect(screen.getByText(DESCRIPTIONS.en.land)).toBeOnTheScreen();

    // The Interest choice is kept, and Compound is still the default elsewhere.
    await user.press(topTab('Interest'));
    expect(dateSystemOption('Simple Interest', true)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTIONS.en.simple)).toBeOnTheScreen();
    await user.press(dateSystemOption('Compound Interest'));
    expect(screen.getByText(DESCRIPTIONS.en.compound)).toBeOnTheScreen();
  });
});
