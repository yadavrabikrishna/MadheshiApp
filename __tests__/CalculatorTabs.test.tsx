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
    interest: 'The interest calculator will be implemented in a later task.',
    age: 'The age calculator will be implemented in a later task.',
    land: 'The land calculator will be implemented in a later task.',
  },
  np: {
    interest: 'ब्याज क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
    age: 'उमेर क्यालकुलेटर पछिको कार्यमा तयार गरिनेछ।',
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
    expect(screen.getByText(DESCRIPTIONS.en.interest)).toBeOnTheScreen();
  });

  it('shows the matching view for each tab, one at a time', async () => {
    const user = await launchOnCalculator();

    await user.press(topTab('Age'));
    expect(topTab('Age').props.accessibilityState.selected).toBe(true);
    expect(topTab('Interest').props.accessibilityState.selected).toBe(false);
    expect(screen.getByText(DESCRIPTIONS.en.age)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.interest)).toBeNull();

    await user.press(topTab('Land'));
    expect(screen.getByText(DESCRIPTIONS.en.land)).toBeOnTheScreen();
    expect(screen.queryByText(DESCRIPTIONS.en.age)).toBeNull();

    await user.press(topTab('Interest'));
    expect(screen.getByText(DESCRIPTIONS.en.interest)).toBeOnTheScreen();
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
    expect(screen.getByText(DESCRIPTIONS.np.interest)).toBeOnTheScreen();
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
    expect(screen.getByText(DESCRIPTIONS.en.age)).toBeOnTheScreen();
  });
});
