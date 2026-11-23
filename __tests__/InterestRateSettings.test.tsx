/**
 * Interest rate-entry controls in Calculator Settings (Issue #50), end to end:
 * the real app tree, Redux store, configuration layer and migrations on a real
 * (Node) SQLite database. A "restart" is a new mount on the SAME database.
 */
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap, AppRoot } from '../src/app';
import { setLanguage, setTheme } from '../src/features/preferences';
import { en } from '../src/i18n/resources/en';
import { np } from '../src/i18n/resources/np';
import { InterestRateSettingsSection } from '../src/screens/Settings/InterestRateSettingsSection';
import { runMigrations } from '../src/storage/migrations';
import { createPreferencesRepository } from '../src/storage/preferencesRepository';
import { createAppStore } from '../src/store';
import {
  createRawTestDatabase,
  createTestDatabase,
} from '../src/test-utils/createTestDatabase';
import { themes } from '../src/theme';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  type InterestRateConfig,
} from '../src/types/interestRateConfig';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../src/storage/database', () => ({
  openDatabase: () => {
    throw new Error('The native database must not be used in tests');
  },
}));
jest.setTimeout(60000);

type User = ReturnType<typeof userEvent.setup>;

function newDevice() {
  const file = createRawTestDatabase();
  const open = async () => {
    const db = createTestDatabase(file);
    await runMigrations(db);
    return createPreferencesRepository(db);
  };
  return {
    open,
    async seed(simple?: InterestRateConfig, compound?: InterestRateConfig) {
      const repository = await open();
      if (simple) {
        await repository.saveInterestRateConfig('simple', simple);
      }
      if (compound) {
        await repository.saveInterestRateConfig('compound', compound);
      }
    },
    async saved() {
      return (await open()).loadInterestRateConfigs();
    },
  };
}
type Device = ReturnType<typeof newDevice>;

async function launchSettings(device: Device): Promise<User> {
  const user = userEvent.setup();
  await render(
    <SafeAreaProvider>
      <AppBootstrap initializeStorage={device.open}>
        <AppRoot />
      </AppBootstrap>
    </SafeAreaProvider>,
  );
  await screen.findByRole('button', { name: /, tab, 1 of 4/ });
  await user.press(screen.getByRole('button', { name: /^Settings, tab/ }));
  await user.press(screen.getByRole('button', { name: 'Calculator Settings' }));
  return user;
}

const SIMPLE = 0;
const COMPOUND = 1;
const KINDS = ['simple', 'compound'] as const;

/** Queries scoped to one calculator's section (the two share every label). */
const sectionOf = (section: number) =>
  within(screen.getByTestId(`interest-rate-section-${KINDS[section]}`));
const radio = (name: string, section: number, selected?: boolean) =>
  sectionOf(section).getByRole('radio', { name, selected });
const modeRadio = radio;
const periodButton = (label: string, section: number) =>
  sectionOf(section).getByRole('button', { name: new RegExp(`^${label}: `) });
const customField = (section = 0) =>
  sectionOf(section).getByLabelText('Custom amount');

async function choosePeriod(
  user: User,
  section: number,
  field: 'Percentage period' | 'Rupees period',
  period: string,
) {
  await user.press(periodButton(field, section));
  await user.press(screen.getByRole('radio', { name: period }));
}

const PERIODS = [
  'Yearly',
  'Half-yearly',
  'Quarterly',
  'Monthly',
  'Weekly',
  'Daily',
];

afterEach(cleanup);

describe('rendering and defaults', () => {
  it('shows a separate Simple and Compound section under Calculator Settings', async () => {
    await launchSettings(newDevice());

    expect(screen.getByText('Interest rate entry')).toBeOnTheScreen();
    expect(screen.getAllByText('Rate entry mode')).toHaveLength(2);
    expect(screen.getAllByText('Simple Interest').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Compound Interest').length).toBeGreaterThan(0);
  });

  it('defaults both calculators to Percentage and Yearly, without denominator controls', async () => {
    await launchSettings(newDevice());

    for (const section of [SIMPLE, COMPOUND]) {
      expect(modeRadio('Percentage', section, true)).toBeOnTheScreen();
      expect(modeRadio('Rupees per amount', section, false)).toBeOnTheScreen();
      expect(
        periodButton('Percentage period', section).props.accessibilityLabel,
      ).toBe('Percentage period: Yearly');
    }
    expect(screen.queryByText('Rupees per')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Per 100' })).toBeNull();
    expect(screen.queryByLabelText('Custom amount')).toBeNull();
    expect(
      screen.getAllByText(
        'The rate is entered as a percentage per year. For example, 2 means 2% per year.',
      ),
    ).toHaveLength(2);
  });

  it('offers exactly the six periods in Percentage mode', async () => {
    const user = await launchSettings(newDevice());

    await user.press(periodButton('Percentage period', SIMPLE));

    expect(
      screen.getAllByRole('radio').map(n => n.props.accessibilityLabel),
    ).toEqual(expect.arrayContaining(PERIODS));
    const labels = screen
      .getAllByRole('radio')
      .map(n => n.props.accessibilityLabel)
      .filter(label => PERIODS.includes(label));
    expect(labels).toEqual(PERIODS);
    expect(
      screen.getByRole('radio', { name: 'Yearly', selected: true }),
    ).toBeOnTheScreen();
  });

  it('offers the same six periods in Rupees mode, defaulting to Monthly', async () => {
    const user = await launchSettings(newDevice());
    await user.press(modeRadio('Rupees per amount', SIMPLE));

    expect(periodButton('Rupees period', SIMPLE).props.accessibilityLabel).toBe(
      'Rupees period: Monthly',
    );
    await user.press(periodButton('Rupees period', SIMPLE));
    const labels = screen
      .getAllByRole('radio')
      .map(n => n.props.accessibilityLabel)
      .filter(label => PERIODS.includes(label));
    expect(labels).toEqual(PERIODS);
    expect(
      screen.getByRole('radio', { name: 'Monthly', selected: true }),
    ).toBeOnTheScreen();
  });
});

describe('mode and period', () => {
  it('updates from the shared state at once and persists', async () => {
    const device = newDevice();
    const user = await launchSettings(device);

    await choosePeriod(user, SIMPLE, 'Percentage period', 'Quarterly');

    expect(
      periodButton('Percentage period', SIMPLE).props.accessibilityLabel,
    ).toBe('Percentage period: Quarterly');
    expect(
      screen.getByText(
        'The rate is entered as a percentage per quarter. For example, 2 means 2% per quarter.',
      ),
    ).toBeOnTheScreen();
    expect((await device.saved()).simple?.percentagePeriod).toBe('quarterly');
  });

  it("restores each mode's previously selected period when switching", async () => {
    const user = await launchSettings(newDevice());

    await choosePeriod(user, SIMPLE, 'Percentage period', 'Half-yearly');
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    expect(periodButton('Rupees period', SIMPLE).props.accessibilityLabel).toBe(
      'Rupees period: Monthly',
    ); // never customised: its default
    await choosePeriod(user, SIMPLE, 'Rupees period', 'Weekly');

    await user.press(modeRadio('Percentage', SIMPLE));
    expect(
      periodButton('Percentage period', SIMPLE).props.accessibilityLabel,
    ).toBe('Percentage period: Half-yearly');
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    expect(periodButton('Rupees period', SIMPLE).props.accessibilityLabel).toBe(
      'Rupees period: Weekly',
    );
  });

  it('keeps Simple and Compound independent', async () => {
    const device = newDevice();
    const user = await launchSettings(device);

    await user.press(modeRadio('Rupees per amount', COMPOUND));
    await choosePeriod(user, COMPOUND, 'Rupees period', 'Daily');

    expect(modeRadio('Percentage', SIMPLE, true)).toBeOnTheScreen();
    expect(
      periodButton('Percentage period', SIMPLE).props.accessibilityLabel,
    ).toBe('Percentage period: Yearly');
    const saved = await device.saved();
    expect(saved.compound).toMatchObject({
      rateInputMode: 'rupees',
      rupeesPeriod: 'daily',
    });
    expect(saved.simple).toBeNull();
  });
});

describe('rupees denominator', () => {
  it('shows Per 100 (selected), Per 1,000 and Custom only in Rupees mode', async () => {
    const user = await launchSettings(newDevice());
    await user.press(modeRadio('Rupees per amount', SIMPLE));

    expect(radio('Per 100', SIMPLE, true)).toBeOnTheScreen();
    expect(radio('Per 1,000', SIMPLE, false)).toBeOnTheScreen();
    expect(radio('Custom', SIMPLE, false)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Custom amount')).toBeNull();
    expect(screen.getByText(/for every Rs\. 100, per month/)).toBeOnTheScreen();

    await user.press(modeRadio('Percentage', SIMPLE));
    expect(screen.queryByRole('radio', { name: 'Per 100' })).toBeNull();
  });

  it('selects and persists Per 1,000', async () => {
    const device = newDevice();
    const user = await launchSettings(device);
    await user.press(modeRadio('Rupees per amount', SIMPLE));

    await user.press(radio('Per 1,000', SIMPLE));

    expect(radio('Per 1,000', SIMPLE, true)).toBeOnTheScreen();
    expect(
      screen.getByText(/for every Rs\. 1,000, per month/),
    ).toBeOnTheScreen();
    expect((await device.saved()).simple?.denominatorMode).toBe('per1000');
  });

  it('shows the custom input only for Custom, with a prompt and no error yet', async () => {
    const user = await launchSettings(newDevice());
    await user.press(modeRadio('Rupees per amount', SIMPLE));

    await user.press(radio('Custom', SIMPLE));

    expect(customField()).toBeOnTheScreen();
    expect(
      screen.getByText('Enter a custom amount below to use rupees per amount.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Enter a custom amount.')).toBeNull();

    await user.press(radio('Per 100', SIMPLE));
    expect(screen.queryByLabelText('Custom amount')).toBeNull();
  });

  it('saves a valid custom amount and uses it in the helper text', async () => {
    const device = newDevice();
    const user = await launchSettings(device);
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    await user.press(radio('Custom', SIMPLE));

    await user.type(customField(), '250');

    expect(screen.getByText(/for every Rs\. 250, per month/)).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
    expect((await device.saved()).simple).toMatchObject({
      denominatorMode: 'custom',
      customDenominator: '250',
    });
  });

  it.each([
    ['abc', 'Enter a number, for example 250 or 12.5.'],
    ['1e3', 'Enter a number, for example 250 or 12.5.'],
    ['.5', 'Enter a number, for example 250 or 12.5.'],
    ['0', 'The amount must be greater than zero.'],
    ['0.0', 'The amount must be greater than zero.'],
    ['-5', 'The amount must be greater than zero.'],
  ])('shows a message for the custom amount %j', async (text, message) => {
    const device = newDevice();
    const user = await launchSettings(device);
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    await user.press(radio('Custom', SIMPLE));

    await user.type(customField(), text);

    expect(screen.getByText(message)).toBeOnTheScreen();
  });

  it.each(['abc', '0', '-5', '0.0'])(
    'never saves the invalid custom amount %j as a usable configuration',
    async text => {
      const device = newDevice();
      const user = await launchSettings(device);
      await user.press(modeRadio('Rupees per amount', SIMPLE));
      await user.press(radio('Custom', SIMPLE));

      await user.type(customField(), text);

      const saved = (await device.saved()).simple;
      expect(saved?.denominatorMode ?? 'per100').not.toBe('custom');
      expect(saved?.customDenominator ?? null).toBeNull();
    },
  );

  it('keeps the last valid amount saved while an edit is invalid, and shows the error', async () => {
    const device = newDevice();
    const user = await launchSettings(device);
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    await user.press(radio('Custom', SIMPLE));
    await user.type(customField(), '250');

    await user.type(customField(), 'x');
    expect(
      screen.getByText('Enter a number, for example 250 or 12.5.'),
    ).toBeOnTheScreen();
    expect((await device.saved()).simple?.customDenominator).toBe('250');

    await user.clear(customField());
    expect(screen.getByText('Enter a custom amount.')).toBeOnTheScreen();
    expect((await device.saved()).simple?.customDenominator).toBe('250');
  });

  it('shows the empty message after leaving an untouched Custom field', async () => {
    const user = await launchSettings(newDevice());
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    await user.press(radio('Custom', SIMPLE));

    await act(async () => {
      customField().props.onBlur();
    });

    expect(screen.getByText('Enter a custom amount.')).toBeOnTheScreen();
  });

  it('preserves the custom value when switching to another option and back', async () => {
    const device = newDevice();
    const user = await launchSettings(device);
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    await user.press(radio('Custom', SIMPLE));
    await user.type(customField(), '12.5');

    await user.press(radio('Per 1,000', SIMPLE));
    expect((await device.saved()).simple?.customDenominator).toBe('12.5');
    await user.press(radio('Custom', SIMPLE));

    expect(customField().props.value).toBe('12.5');
    expect((await device.saved()).simple).toMatchObject({
      denominatorMode: 'custom',
      customDenominator: '12.5',
    });
  });

  it('keeps denominators independent per calculator', async () => {
    const device = newDevice();
    const user = await launchSettings(device);
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    await user.press(radio('Per 1,000', SIMPLE));
    await user.press(modeRadio('Rupees per amount', COMPOUND));

    expect(radio('Per 100', COMPOUND, true)).toBeOnTheScreen();
    expect(radio('Per 1,000', SIMPLE, true)).toBeOnTheScreen();
  });
});

describe('persistence', () => {
  it('restores everything after an app restart', async () => {
    const device = newDevice();
    const user = await launchSettings(device);
    await user.press(modeRadio('Rupees per amount', SIMPLE));
    await choosePeriod(user, SIMPLE, 'Rupees period', 'Daily');
    await user.press(radio('Custom', SIMPLE));
    await user.type(customField(), '250');
    await choosePeriod(user, COMPOUND, 'Percentage period', 'Quarterly');
    await cleanup();

    await launchSettings(device);

    expect(modeRadio('Rupees per amount', SIMPLE, true)).toBeOnTheScreen();
    expect(periodButton('Rupees period', SIMPLE).props.accessibilityLabel).toBe(
      'Rupees period: Daily',
    );
    expect(radio('Custom', SIMPLE, true)).toBeOnTheScreen();
    expect(customField().props.value).toBe('250');
    expect(modeRadio('Percentage', COMPOUND, true)).toBeOnTheScreen();
    expect(
      periodButton('Percentage period', COMPOUND).props.accessibilityLabel,
    ).toBe('Percentage period: Quarterly');
  });

  it('shows saved settings for an existing installation that has none (defaults)', async () => {
    const device = newDevice();
    await (await device.open()).saveTheme('light'); // older data, no interest config
    await launchSettings(device);

    expect(modeRadio('Percentage', SIMPLE, true)).toBeOnTheScreen();
    expect(
      periodButton('Percentage period', COMPOUND).props.accessibilityLabel,
    ).toBe('Percentage period: Yearly');
  });

  it('shows repaired defaults for invalid stored data without crashing', async () => {
    const device = newDevice();
    const repository = await device.open();
    await repository.saveInterestRateConfig('simple', {
      ...DEFAULT_INTEREST_RATE_CONFIG,
      percentagePeriod: 'fortnightly' as never,
      denominatorMode: 'custom',
      customDenominator: null,
    });

    await launchSettings(device);

    expect(
      periodButton('Percentage period', SIMPLE).props.accessibilityLabel,
    ).toBe('Percentage period: Yearly');
  });
});

describe('localization and themes (section on its own)', () => {
  async function renderSection() {
    const device = newDevice();
    const repository = await device.open();
    const store = createAppStore({
      preferencesRepository: repository,
      getSystemTheme: () => 'light',
    });
    const user = userEvent.setup();
    await render(
      <Provider store={store}>
        <InterestRateSettingsSection calculator="simple" />
      </Provider>,
    );
    return { store, user };
  }

  it('shows every visible string in Nepali', async () => {
    const { store, user } = await renderSection();
    await user.press(screen.getByRole('radio', { name: 'Rupees per amount' }));
    await user.press(screen.getByRole('radio', { name: 'Custom' }));
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    for (const text of [
      np['interestRate.mode.label'],
      np['interestRate.denominator.label'],
      np['interestRate.custom.label'],
      np['interestRate.helper.customPending'],
    ]) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    for (const name of [
      np['interestRate.mode.percentage'],
      np['interestRate.mode.rupees'],
      np['interestRate.denominator.per100'],
      np['interestRate.denominator.per1000'],
      np['interestRate.denominator.custom'],
    ]) {
      expect(screen.getByRole('radio', { name })).toBeOnTheScreen();
    }
    expect(screen.queryByText(en['interestRate.mode.label'])).toBeNull();

    await user.press(
      screen.getByRole('button', {
        name: new RegExp(`^${np['interestRate.period.label.rupees']}: `),
      }),
    );
    for (const key of [
      'yearly',
      'halfYearly',
      'quarterly',
      'monthly',
      'weekly',
      'daily',
    ] as const) {
      expect(
        screen.getByRole('radio', { name: np[`interestRate.period.${key}`] }),
      ).toBeOnTheScreen();
    }
  });

  it('shows Nepali validation messages', async () => {
    const { store, user } = await renderSection();
    await user.press(screen.getByRole('radio', { name: 'Rupees per amount' }));
    await user.press(screen.getByRole('radio', { name: 'Custom' }));
    await user.type(screen.getByLabelText('Custom amount'), '0');
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(
      screen.getByText(np['interestRate.error.notPositive']),
    ).toBeOnTheScreen();
  });

  it.each(['light', 'dark'] as const)(
    'uses the %s theme tokens',
    async mode => {
      const { store } = await renderSection();
      await act(async () => {
        await store.dispatch(setTheme(mode));
      });
      const { colors } = themes[mode];

      expect(screen.getByText(en['interestRate.mode.label'])).toHaveStyle({
        color: colors.text,
      });
      expect(screen.getByText('Simple Interest')).toHaveStyle({
        color: colors.text,
      });
      expect(
        screen.getByRole('radio', { name: 'Percentage', selected: true }),
      ).toHaveStyle({ backgroundColor: colors.primary });
      expect(
        within(screen.getByRole('radio', { name: 'Percentage' })).getByText(
          'Percentage',
        ),
      ).toHaveStyle({
        color: colors.onPrimary,
      });
    },
  );
});
