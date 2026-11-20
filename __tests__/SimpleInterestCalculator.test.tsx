/**
 * Simple Interest calculator UI (Issue #26): the real app tree, Redux store, i18n
 * and the real calculation engine, on a Node SQLite database.
 */
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap, AppRoot } from '../src/app';
import { en } from '../src/i18n/resources/en';
import { np } from '../src/i18n/resources/np';
import { themes } from '../src/theme';
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

jest.setTimeout(60000);

async function launchSimpleInterest() {
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

const field = (label: string) => screen.getByLabelText(label);
const calculate = (user: Awaited<ReturnType<typeof launchSimpleInterest>>) =>
  user.press(
    screen.getByRole('button', { name: en['simpleInterest.calculate'] }),
  );

async function fillForm(values: {
  principal?: string;
  rate?: string;
  start?: string;
  end?: string;
}) {
  if (values.principal !== undefined) {
    await fireEvent.changeText(
      field(en['simpleInterest.principal.label']),
      values.principal,
    );
  }
  if (values.rate !== undefined) {
    await fireEvent.changeText(
      field(en['simpleInterest.rate.label']),
      values.rate,
    );
  }
  if (values.start !== undefined) {
    await fireEvent.changeText(
      field(en['simpleInterest.startDate.label']),
      values.start,
    );
  }
  if (values.end !== undefined) {
    await fireEvent.changeText(
      field(en['simpleInterest.endDate.label']),
      values.end,
    );
  }
}

describe('Simple Interest calculator', () => {
  it('shows the form with no result and no errors at first', async () => {
    await launchSimpleInterest();

    expect(field(en['simpleInterest.principal.label'])).toBeOnTheScreen();
    expect(field(en['simpleInterest.rate.label'])).toBeOnTheScreen();
    expect(field(en['simpleInterest.startDate.label'])).toBeOnTheScreen();
    expect(field(en['simpleInterest.endDate.label'])).toBeOnTheScreen();
    expect(screen.queryByText(en['simpleInterest.result.title'])).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('offers exactly two rate modes, % per month selected by default', async () => {
    await launchSimpleInterest();

    expect(
      screen.getByRole('radio', {
        name: en['simpleInterest.rateMode.percent'],
        selected: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', {
        name: en['simpleInterest.rateMode.rupees'],
        selected: false,
      }),
    ).toBeOnTheScreen();
  });

  it('uses neutral dates: no AD/BS/Gregorian labels and a single numeric input per date', async () => {
    await launchSimpleInterest();

    expect(screen.queryByText(/\b(AD|BS|Gregorian|Bikram)\b/i)).toBeNull();
    expect(field(en['simpleInterest.startDate.label']).props.keyboardType).toBe(
      'number-pad',
    );
  });

  it('calculates with the real engine and shows every result row', async () => {
    const user = await launchSimpleInterest();

    await fillForm({
      principal: '100000',
      rate: '2',
      start: '20250101',
      end: '20250401',
    });
    expect(field(en['simpleInterest.principal.label']).props.value).toBe(
      '1,00,000',
    );
    expect(field(en['simpleInterest.startDate.label']).props.value).toBe(
      '2025/01/01',
    );
    await calculate(user);

    expect(
      screen.getByText(en['simpleInterest.result.title']),
    ).toBeOnTheScreen();
    expect(screen.getByText('Rs. 1,00,000')).toBeOnTheScreen();
    expect(screen.getByText('2% per month')).toBeOnTheScreen();
    expect(screen.getByText('2% per month (0.02)')).toBeOnTheScreen();
    expect(screen.getByText('0 Years, 3 Months, 0 Days')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 6,000')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
    expect(screen.getByText('2025/01/01')).toBeOnTheScreen();
    expect(screen.getByText('2025/04/01')).toBeOnTheScreen();
  });

  it('gives the same numbers for Rs. per Rs. 100 and shows the entered mode', async () => {
    const user = await launchSimpleInterest();

    await user.press(
      screen.getByRole('radio', { name: en['simpleInterest.rateMode.rupees'] }),
    );
    await fillForm({
      principal: '100000',
      rate: '2',
      start: '20250101',
      end: '20250401',
    });
    await calculate(user);

    expect(screen.getByText('Rs. 2 per Rs. 100 per month')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 6,000')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
  });

  it('rounds money half-up for display only', async () => {
    const user = await launchSimpleInterest();

    // 1,000 at 0.5% for 10 days = 1000 * 0.005 * (10/30) = 1.6666...
    await fillForm({
      principal: '1000',
      rate: '0.5',
      start: '20250101',
      end: '20250111',
    });
    await calculate(user);

    expect(screen.getByText('Rs. 1.67')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 1,001.67')).toBeOnTheScreen();
  });

  it('removes the result as soon as any input is edited', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '1000',
      rate: '2',
      start: '20250101',
      end: '20250201',
    });
    await calculate(user);
    expect(
      screen.getByText(en['simpleInterest.result.title']),
    ).toBeOnTheScreen();

    await fillForm({ principal: '2000' });
    expect(screen.queryByText(en['simpleInterest.result.title'])).toBeNull();

    await calculate(user);
    expect(
      screen.getByText(en['simpleInterest.result.title']),
    ).toBeOnTheScreen();
    await user.press(
      screen.getByRole('radio', { name: en['simpleInterest.rateMode.rupees'] }),
    );
    expect(screen.queryByText(en['simpleInterest.result.title'])).toBeNull();
  });

  it('shows a field-level message beside each invalid field', async () => {
    const user = await launchSimpleInterest();

    await calculate(user);

    expect(
      screen.getByText(en['simpleInterest.error.principalInvalid']),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(en['simpleInterest.error.rateInvalid']),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(en['simpleInterest.error.startDateInvalid']),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(en['simpleInterest.error.endDateInvalid']),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(en['simpleInterest.error.summary']),
    ).toBeOnTheScreen();
    expect(screen.queryByText(en['simpleInterest.result.title'])).toBeNull();
  });

  it('shows the not-positive principal error and clears it on edit', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '0',
      rate: '2',
      start: '20250101',
      end: '20250201',
    });
    await calculate(user);
    expect(
      screen.getByText(en['simpleInterest.error.principalNotPositive']),
    ).toBeOnTheScreen();

    await fillForm({ principal: '10' });
    expect(
      screen.queryByText(en['simpleInterest.error.principalNotPositive']),
    ).toBeNull();
  });

  it('shows the reversed-range error beside End Date only', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '1000',
      rate: '2',
      start: '20250101',
      end: '20241231',
    });
    await calculate(user);

    expect(
      screen.getByText(en['simpleInterest.error.endBeforeStart']),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(en['simpleInterest.error.startDateInvalid']),
    ).toBeNull();
    expect(screen.queryByText(en['simpleInterest.result.title'])).toBeNull();
  });

  it('rejects an incomplete date', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '1000',
      rate: '2',
      start: '2025',
      end: '20250201',
    });
    await calculate(user);

    expect(
      screen.getByText(en['simpleInterest.error.startDateInvalid']),
    ).toBeOnTheScreen();
  });

  it('turns a leading "." into "0." and rejects a ninth date digit', async () => {
    await launchSimpleInterest();

    await fillForm({ rate: '.5' });
    expect(field(en['simpleInterest.rate.label']).props.value).toBe('0.5');

    await fillForm({ start: '20250101' });
    await fillForm({ start: '2025/01/019' });
    expect(field(en['simpleInterest.startDate.label']).props.value).toBe(
      '2025/01/01',
    );
  });

  it('renders in Nepali with Nepali labels, messages and result text', async () => {
    const user = await launchSimpleInterest();
    await user.press(screen.getByRole('button', { name: /^Change language$/ }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));

    expect(field(np['simpleInterest.principal.label'])).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: np['simpleInterest.calculate'] }),
    );
    expect(
      screen.getByText(np['simpleInterest.error.principalInvalid']),
    ).toBeOnTheScreen();

    await fireEvent.changeText(
      field(np['simpleInterest.principal.label']),
      '100000',
    );
    await fireEvent.changeText(field(np['simpleInterest.rate.label']), '2');
    await fireEvent.changeText(
      field(np['simpleInterest.startDate.label']),
      '20250101',
    );
    await fireEvent.changeText(
      field(np['simpleInterest.endDate.label']),
      '20250401',
    );
    await user.press(
      screen.getByRole('button', { name: np['simpleInterest.calculate'] }),
    );

    expect(
      screen.getByText(np['simpleInterest.result.title']),
    ).toBeOnTheScreen();
    expect(screen.getByText('रु. 6,000')).toBeOnTheScreen();
  });

  it('accepts Devanagari digits typed into a date', async () => {
    await launchSimpleInterest();
    await fillForm({ start: '२०८२०११५' });
    expect(field(en['simpleInterest.startDate.label']).props.value).toBe(
      '2082/01/15',
    );
  });
});

describe('Simple Interest calculator: engine edge cases through the UI', () => {
  it('accepts a zero rate: zero interest, total equals principal', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '1000',
      rate: '0',
      start: '20250101',
      end: '20250201',
    });
    await calculate(user);

    expect(screen.getByText('Rs. 0')).toBeOnTheScreen();
    expect(screen.getAllByText('Rs. 1,000')).toHaveLength(2); // principal + total
    expect(screen.getByText('0% per month (0)')).toBeOnTheScreen();
    expect(
      screen.queryByText(en['simpleInterest.error.rateInvalid']),
    ).toBeNull();
  });

  it('accepts identical dates: zero duration and zero interest', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '5000',
      rate: '2',
      start: '20250115',
      end: '20250115',
    });
    await calculate(user);

    expect(screen.getByText('0 Years, 0 Months, 0 Days')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 0')).toBeOnTheScreen();
    expect(screen.getAllByText('2025/01/15')).toHaveLength(2);
    expect(screen.getAllByText('Rs. 5,000')).toHaveLength(2);
  });

  it('keeps the approved day-32 case: 2025/01/32 to 2025/03/01 is 29 days', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '30000',
      rate: '3',
      start: '20250132',
      end: '20250301',
    });
    await calculate(user);

    expect(
      screen.queryByText(en['simpleInterest.error.endBeforeStart']),
    ).toBeNull();
    expect(screen.getByText('0 Years, 0 Months, 29 Days')).toBeOnTheScreen();
    expect(screen.getByText('2025/01/32')).toBeOnTheScreen();
    // 30000 x 3% x 29/30 = 870
    expect(screen.getByText('Rs. 870')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 30,870')).toBeOnTheScreen();
  });

  it('rejects the reversed range 2025/01/01 to 2024/12/31 beside End Date', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '1000',
      rate: '2',
      start: '20250101',
      end: '20241231',
    });
    await calculate(user);

    expect(
      screen.getByText(en['simpleInterest.error.endBeforeStart']),
    ).toBeOnTheScreen();
    expect(screen.queryByText(en['simpleInterest.result.title'])).toBeNull();
  });
});

describe('Simple Interest calculator: theme and language changes', () => {
  const themeToggle = (to: 'light' | 'dark') =>
    screen.getByRole('button', { name: `Switch to ${to} theme` });
  const labelColor = () =>
    screen.getByText(en['simpleInterest.principal.label']);

  it('keeps entered values across Light to Dark and Dark to Light', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '100000',
      rate: '2.5',
      start: '20250101',
      end: '20250401',
    });
    expect(labelColor()).toHaveStyle({ color: themes.light.colors.text });

    await user.press(themeToggle('dark')); // Light -> Dark
    expect(labelColor()).toHaveStyle({ color: themes.dark.colors.text });
    expect(field(en['simpleInterest.principal.label']).props.value).toBe(
      '1,00,000',
    );
    expect(field(en['simpleInterest.rate.label']).props.value).toBe('2.5');
    expect(field(en['simpleInterest.startDate.label']).props.value).toBe(
      '2025/01/01',
    );
    expect(field(en['simpleInterest.endDate.label']).props.value).toBe(
      '2025/04/01',
    );

    await user.press(themeToggle('light')); // Dark -> Light
    expect(labelColor()).toHaveStyle({ color: themes.light.colors.text });
    expect(field(en['simpleInterest.principal.label']).props.value).toBe(
      '1,00,000',
    );
    expect(field(en['simpleInterest.rate.label']).props.value).toBe('2.5');
  });

  it('keeps entered values when the language changes to Nepali (values entered first)', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '100000',
      rate: '2.5',
      start: '20250101',
      end: '20250401',
    });

    await user.press(screen.getByRole('button', { name: /^Change language$/ }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));

    expect(field(np['simpleInterest.principal.label']).props.value).toBe(
      '1,00,000',
    );
    expect(field(np['simpleInterest.rate.label']).props.value).toBe('2.5');
    expect(field(np['simpleInterest.startDate.label']).props.value).toBe(
      '2025/01/01',
    );
    expect(field(np['simpleInterest.endDate.label']).props.value).toBe(
      '2025/04/01',
    );
  });

  it('keeps a valid result, and its values, across a language change and a theme change', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '100000',
      rate: '2',
      start: '20250101',
      end: '20250401',
    });
    await calculate(user);
    expect(screen.getByText('Rs. 6,000')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /^Change language$/ }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));

    expect(
      screen.getByText(np['simpleInterest.result.title']),
    ).toBeOnTheScreen();
    expect(screen.getByText('रु. 6,000')).toBeOnTheScreen();
    expect(screen.getByText('रु. 1,06,000')).toBeOnTheScreen();
    expect(field(np['simpleInterest.principal.label']).props.value).toBe(
      '1,00,000',
    );

    await user.press(
      screen.getByRole('button', { name: np['header.switchToDark'] }),
    );
    expect(screen.getByText('रु. 1,06,000')).toBeOnTheScreen();
    expect(
      screen.getByText(np['simpleInterest.result.title']),
    ).toBeOnTheScreen();
    expect(screen.getByText('रु. 6,000')).toBeOnTheScreen();
    expect(field(np['simpleInterest.rate.label']).props.value).toBe('2');
  });

  it('keeps a valid result across a theme change in English', async () => {
    const user = await launchSimpleInterest();
    await fillForm({
      principal: '100000',
      rate: '2',
      start: '20250101',
      end: '20250401',
    });
    await calculate(user);

    await user.press(themeToggle('dark'));

    expect(
      screen.getByText(en['simpleInterest.result.title']),
    ).toBeOnTheScreen();
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
    expect(screen.getByText(en['simpleInterest.result.title'])).toHaveStyle({
      color: themes.dark.colors.text,
    });
  });
});
