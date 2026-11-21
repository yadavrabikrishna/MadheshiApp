/**
 * Simple Interest calculator UI (Issue #26): the real app tree, Redux store, i18n
 * and the real calculation engine, on a Node SQLite database.
 */
import { Keyboard, ScrollView, TextInput, View } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Share from 'react-native-share';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap, AppRoot } from '../src/app';
import { en } from '../src/i18n/resources/en';
import { np } from '../src/i18n/resources/np';
import { themes } from '../src/theme';
import { installFakeClipboard } from '../src/test-utils/fakeClipboard';
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
    expect(screen.getByText('Interest Rate')).toBeOnTheScreen();
    expect(screen.getByText('2% per month')).toBeOnTheScreen();
    expect(
      screen.getByText('Duration: 0 Years, 3 Months, 0 Days'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Rs. 6,000')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
    expect(screen.getByText('2025/01/01 – 2025/04/01')).toBeOnTheScreen();
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
    expect(screen.getByText('0% per month')).toBeOnTheScreen();
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

    expect(
      screen.getByText('Duration: 0 Years, 0 Months, 0 Days'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Rs. 0')).toBeOnTheScreen();
    expect(screen.getByText('2025/01/15 – 2025/01/15')).toBeOnTheScreen();
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
    expect(
      screen.getByText('Duration: 0 Years, 0 Months, 29 Days'),
    ).toBeOnTheScreen();
    expect(screen.getByText('2025/01/32 – 2025/03/01')).toBeOnTheScreen();
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

describe('Simple Interest calculator: keyboard actions and summary placement', () => {
  const labels = [
    en['simpleInterest.principal.label'],
    en['simpleInterest.rate.label'],
    en['simpleInterest.startDate.label'],
    en['simpleInterest.endDate.label'],
  ];

  /** Every text of the rendered tree, in visual (top to bottom) order. */
  const textsInOrder = () => {
    const out: string[] = [];
    const walk = (node: unknown) => {
      if (typeof node === 'string') {
        out.push(node);
      } else if (node && typeof node === 'object') {
        const { children } = node as { children?: unknown[] | null };
        children?.forEach(walk);
      }
    };
    walk(screen.toJSON());
    return out;
  };

  it('shows "Next" on every field that has a following field and "Done" on the last', async () => {
    await launchSimpleInterest();

    expect(labels.map(label => field(label).props.returnKeyType)).toEqual([
      'next',
      'next',
      'next',
      'done',
    ]);
  });

  it('keeps the keyboard open on Next (submit, not blur-and-submit)', async () => {
    await launchSimpleInterest();

    expect(labels.map(label => field(label).props.submitBehavior)).toEqual([
      'submit',
      'submit',
      'submit',
      'blurAndSubmit',
    ]);
  });

  /**
   * Under Jest, TextInput is a mock class whose `focus` is one shared jest.fn;
   * `mock.contexts` holds the instance of every call, so the focused field is
   * identified by its accessibility label.
   */
  const focusMock = () =>
    (TextInput.prototype as unknown as { focus: jest.Mock }).focus;
  const focusedLabels = () =>
    focusMock().mock.contexts.map(
      (instance: { props: { accessibilityLabel: string } }) =>
        instance.props.accessibilityLabel,
    );

  it('Next moves focus to the following field, in form order, without dismissing the keyboard', async () => {
    await launchSimpleInterest();
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    focusMock().mockClear();

    await fireEvent(field(labels[0]), 'submitEditing');
    await fireEvent(field(labels[1]), 'submitEditing');
    await fireEvent(field(labels[2]), 'submitEditing');

    // Principal -> Rate -> Start Date -> End Date, and nothing else.
    expect(focusedLabels()).toEqual([labels[1], labels[2], labels[3]]);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('Done on the last field dismisses the keyboard and focuses nothing else', async () => {
    await launchSimpleInterest();
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    focusMock().mockClear();

    await fireEvent(field(labels[3]), 'submitEditing');

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(focusedLabels()).toEqual([]);
  });

  it('shows no summary before a failed Calculate', async () => {
    await launchSimpleInterest();

    expect(screen.queryByText(en['simpleInterest.error.summary'])).toBeNull();
  });

  it('shows one summary, immediately above Principal Amount and not above Calculate', async () => {
    const user = await launchSimpleInterest();

    await calculate(user);

    expect(
      screen.getAllByText(en['simpleInterest.error.summary']),
    ).toHaveLength(1);
    const texts = textsInOrder();
    const summary = texts.indexOf(en['simpleInterest.error.summary']);
    const principal = texts.indexOf(en['simpleInterest.principal.label']);
    const calculateLabel = texts.lastIndexOf(en['simpleInterest.calculate']);
    expect(summary).toBeGreaterThanOrEqual(0);
    expect(summary).toBeLessThan(principal);
    expect(principal).toBeLessThan(calculateLabel);
    // Nothing sits between the summary and the Principal Amount label.
    expect(principal - summary).toBe(1);
  });

  it('keeps each field message next to its field and removes the summary on edit', async () => {
    const user = await launchSimpleInterest();
    await calculate(user);

    expect(
      screen.getByText(en['simpleInterest.error.principalInvalid']),
    ).toBeOnTheScreen();

    await fillForm({ principal: '10' });

    expect(screen.queryByText(en['simpleInterest.error.summary'])).toBeNull();
  });
});

describe('Simple Interest calculator: automatic scrolling to the focused field', () => {
  /**
   * A simulated screen behind the real view. Under Jest, View/TextInput/
   * ScrollView are mocks whose measureInWindow/scrollTo are shared jest.fn on
   * the prototype, so they are given positions here. Real Android keyboard and
   * layout behavior is NOT covered; that needs a device.
   */
  const labels = {
    principal: en['simpleInterest.principal.label'],
    rate: en['simpleInterest.rate.label'],
    startDate: en['simpleInterest.startDate.label'],
    endDate: en['simpleInterest.endDate.label'],
  };
  const SCROLL_TOP = 100;
  const SCROLL_HEIGHT = 600;
  const KEYBOARD_TOP = 400;
  const handlers: Record<string, Array<(event: unknown) => void>> = {};
  const world = { scrollY: 0, contentY: {} as Record<string, number> };
  const scrollTo = ScrollView.prototype.scrollTo as unknown as jest.Mock;
  const sharedMeasureInWindow = () =>
    (View.prototype as unknown as { measureInWindow: jest.Mock })
      .measureInWindow;
  const windowY = (label: string) =>
    SCROLL_TOP + world.contentY[label] - world.scrollY;
  const fullyVisible = (label: string) =>
    windowY(label) >= SCROLL_TOP &&
    windowY(label) + 48 <= Math.min(SCROLL_TOP + SCROLL_HEIGHT, KEYBOARD_TOP);

  beforeEach(() => {
    world.scrollY = 0;
    // content y of each field (height 48); End Date is far down the form
    world.contentY = {
      [labels.principal]: 650,
      [labels.rate]: 760,
      [labels.startDate]: 40,
      [labels.endDate]: 900,
    };
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      event: string,
      handler: (e: unknown) => void,
    ) => {
      (handlers[event] ??= []).push(handler);
      return { remove: jest.fn() };
    }) as unknown as typeof Keyboard.addListener);
    // One shared jest.fn serves View, ScrollView and TextInput alike, so a
    // single implementation answers by what is being measured.
    sharedMeasureInWindow().mockImplementation(function (
      this: { props: { accessibilityLabel?: string } },
      callback: (...rect: number[]) => void,
    ) {
      const label = this.props.accessibilityLabel;
      if (label !== undefined && label in world.contentY) {
        callback(0, windowY(label), 300, 48); // an input field
      } else {
        callback(0, SCROLL_TOP, 360, SCROLL_HEIGHT); // the form and its ScrollView
      }
    });
    scrollTo.mockReset();
    // A real ScrollView moves and then reports its offset through onScroll;
    // the hook relies on that to know where the form currently is.
    scrollTo.mockImplementation(function (
      this: {
        props: { onScroll: (event: unknown) => void };
      },
      { y }: { y: number },
    ) {
      world.scrollY = y;
      this.props.onScroll({ nativeEvent: { contentOffset: { x: 0, y } } });
    });
  });

  afterEach(() => {
    for (const key of Object.keys(handlers)) {
      delete handlers[key];
    }
    sharedMeasureInWindow().mockReset();
    scrollTo.mockReset();
  });

  const openKeyboard = async () => {
    const events = ['keyboardWillShow', 'keyboardDidShow'];
    for (const event of events) {
      for (const handler of handlers[event] ?? []) {
        await act(async () =>
          handler({ endCoordinates: { screenY: KEYBOARD_TOP } }),
        );
      }
    }
  };
  const closeKeyboard = async () => {
    for (const event of ['keyboardWillHide', 'keyboardDidHide']) {
      for (const handler of handlers[event] ?? []) {
        await act(async () => handler({}));
      }
    }
  };

  it('scrolls an obscured Principal Amount field fully above the keyboard when it is focused', async () => {
    await launchSimpleInterest();
    await openKeyboard();
    scrollTo.mockClear();

    await fireEvent(field(labels.principal), 'focus');

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(fullyVisible(labels.principal)).toBe(true);
  });

  it('scrolls when the keyboard opens while a field is already focused', async () => {
    await launchSimpleInterest();
    world.scrollY = 0;
    world.contentY[labels.principal] = 350; // visible without a keyboard
    await fireEvent(field(labels.principal), 'focus');
    expect(scrollTo).not.toHaveBeenCalled();

    await openKeyboard();

    expect(scrollTo).toHaveBeenCalled();
    expect(fullyVisible(labels.principal)).toBe(true);
  });

  it('Next: the following field is scrolled into view when it is obscured', async () => {
    await launchSimpleInterest();
    await openKeyboard();
    await fireEvent(field(labels.principal), 'focus');
    await fireEvent(field(labels.principal), 'blur');
    scrollTo.mockClear();

    // Next on Principal focuses Rate (native then reports the focus event).
    await fireEvent(field(labels.principal), 'submitEditing');
    await fireEvent(field(labels.rate), 'focus');

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(fullyVisible(labels.rate)).toBe(true);
  });

  it('every field, including the last ones near the bottom, ends up above the keyboard', async () => {
    await launchSimpleInterest();
    await openKeyboard();

    let previous: string | undefined;
    for (const label of Object.values(labels)) {
      if (previous) {
        await fireEvent(field(previous), 'blur');
      }
      await fireEvent(field(label), 'focus');
      expect(fullyVisible(label)).toBe(true);
      previous = label;
    }
  });

  it('does not scroll when the focused field is already fully visible', async () => {
    await launchSimpleInterest();
    await openKeyboard();
    scrollTo.mockClear();

    await fireEvent(field(labels.startDate), 'focus'); // content y 40: visible

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll again for repeated focus and keyboard events', async () => {
    await launchSimpleInterest();
    await openKeyboard();
    await fireEvent(field(labels.endDate), 'focus');
    const calls = scrollTo.mock.calls.length;
    expect(calls).toBe(1);

    await fireEvent(field(labels.endDate), 'focus');
    await openKeyboard();

    expect(scrollTo).toHaveBeenCalledTimes(calls);
  });

  it('keeps the entered values and the layout intact when the keyboard closes', async () => {
    await launchSimpleInterest();
    await fillForm({ principal: '1000', rate: '2' });
    await openKeyboard();
    await fireEvent(field(labels.endDate), 'focus');

    await closeKeyboard();

    expect(field(labels.principal).props.value).toBe('1,000');
    expect(field(labels.rate).props.value).toBe('2');
  });
});

describe('Simple Interest result card layout', () => {
  const calculateValid = async (rateMode?: 'rupees') => {
    const user = await launchSimpleInterest();
    if (rateMode === 'rupees') {
      await user.press(
        screen.getByRole('radio', {
          name: en['simpleInterest.rateMode.rupees'],
        }),
      );
    }
    await fillForm({
      principal: '100000',
      rate: '2',
      start: '20250101',
      end: '20250401',
    });
    await calculate(user);
    return user;
  };

  it('shows one Interest Rate row with the entered rate, and no converted monthly rate', async () => {
    await calculateValid();

    expect(screen.getAllByText('Interest Rate')).toHaveLength(1);
    expect(screen.getByText('2% per month')).toBeOnTheScreen();
    expect(screen.queryByText(/Entered rate|Monthly rate used/i)).toBeNull();
    expect(screen.queryByText(/\(0\.02\)/)).toBeNull();
  });

  it('keeps the rupees-wise mode and its existing format', async () => {
    await calculateValid('rupees');

    expect(screen.getByText('Interest Rate')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 2 per Rs. 100 per month')).toBeOnTheScreen();
  });

  it('shows the dates and the duration as two lines of one block', async () => {
    await calculateValid();

    const dates = screen.getByText('2025/01/01 – 2025/04/01');
    const duration = screen.getByText('Duration: 0 Years, 3 Months, 0 Days');
    // Same parent View, dates first, and no separate Start/End/Duration rows.
    expect(dates.parent).toBe(duration.parent);
    expect(dates.parent?.children).toEqual([dates, duration]);
    // "Start Date" / "End Date" now appear only as the form's field labels.
    expect(screen.getAllByText('Start Date')).toHaveLength(1);
    expect(screen.getAllByText('End Date')).toHaveLength(1);
    // Announced as one item.
    expect(
      screen.getByLabelText(
        '2025/01/01 – 2025/04/01. Duration: 0 Years, 3 Months, 0 Days',
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the card order: principal, rate, dates and duration, interest, total', async () => {
    await calculateValid();

    const texts: string[] = [];
    const walk = (node: unknown) => {
      if (typeof node === 'string') {
        texts.push(node);
      } else if (node && typeof node === 'object') {
        (node as { children?: unknown[] | null }).children?.forEach(walk);
      }
    };
    walk(screen.toJSON());
    const order = [
      en['simpleInterest.result.principal'],
      en['simpleInterest.result.interestRate'],
      '2025/01/01 – 2025/04/01',
      en['simpleInterest.result.interest'],
      en['simpleInterest.result.total'],
    ].map(text => texts.lastIndexOf(text));
    expect(order.every(index => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('is localized in Nepali (label, rate text, duration line)', async () => {
    const user = await calculateValid();
    await user.press(screen.getByRole('button', { name: /^Change language$/ }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));

    expect(screen.getByText('ब्याज दर')).toBeOnTheScreen();
    expect(screen.getByText('2% प्रति महिना')).toBeOnTheScreen();
    expect(screen.getByText('अवधि: 0 वर्ष, 3 महिना, 0 दिन')).toBeOnTheScreen();
    expect(screen.getByText('2025/01/01 – 2025/04/01')).toBeOnTheScreen();
  });
});

describe('Simple Interest calculator: result actions (Issue #30)', () => {
  const actionLabels = [
    en['resultActions.copy'],
    en['resultActions.share'],
    en['resultActions.saveImage'],
  ];
  const actionButton = (name: string) => screen.queryByRole('button', { name });
  const noActions = () =>
    actionLabels.forEach(l => expect(actionButton(l)).toBeNull());

  /** Every text of the rendered tree, in visual (top to bottom) order. */
  const textsInOrder = () => {
    const out: string[] = [];
    const walk = (node: unknown) => {
      if (typeof node === 'string') {
        out.push(node);
      } else if (node && typeof node === 'object') {
        const { children } = node as { children?: unknown[] | null };
        children?.forEach(walk);
      }
    };
    walk(screen.toJSON());
    return out;
  };

  const validForm = {
    principal: '100000',
    rate: '2',
    start: '20250101',
    end: '20250401',
  };

  it('shows no actions before a calculation or after an invalid one', async () => {
    const user = await launchSimpleInterest();
    noActions();

    await calculate(user); // empty form: invalid
    expect(
      screen.getByText(en['simpleInterest.error.summary']),
    ).toBeOnTheScreen();
    noActions();
  });

  it('shows Copy, Share and Save Image in order at the bottom of a valid result', async () => {
    const user = await launchSimpleInterest();
    await fillForm(validForm);
    await calculate(user);

    const names = screen
      .getAllByRole('button')
      .map(button => button.props.accessibilityLabel);
    const first = names.indexOf(en['resultActions.copy']);
    expect(first).toBeGreaterThan(
      names.indexOf(en['simpleInterest.calculate']),
    );
    expect(names.slice(first, first + 3)).toEqual(actionLabels);

    // Below every result row, including the Total Amount row.
    const texts = textsInOrder();
    const total = texts.indexOf(en['simpleInterest.result.total']);
    expect(total).toBeGreaterThan(-1);
    for (const label of actionLabels) {
      expect(texts.indexOf(label)).toBeGreaterThan(total);
    }
  });

  it('removes the actions together with a stale result when an input is edited', async () => {
    const user = await launchSimpleInterest();
    await fillForm(validForm);
    await calculate(user);
    expect(actionButton(en['resultActions.copy'])).toBeOnTheScreen();

    await fillForm({ principal: '2000' });
    noActions();

    await calculate(user);
    expect(actionButton(en['resultActions.copy'])).toBeOnTheScreen();
  });

  it('shows Nepali action labels with a Nepali result', async () => {
    const user = await launchSimpleInterest();
    await fillForm(validForm);
    await calculate(user);

    await user.press(screen.getByRole('button', { name: /^Change language$/ }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));

    for (const key of [
      'resultActions.copy',
      'resultActions.share',
      'resultActions.saveImage',
    ] as const) {
      expect(screen.getByRole('button', { name: np[key] })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: en[key] })).toBeNull();
    }
  });

  it('keeps the actions, in dark theme tokens, across a theme change', async () => {
    const user = await launchSimpleInterest();
    await fillForm(validForm);
    await calculate(user);

    await user.press(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );

    for (const label of actionLabels) {
      expect(screen.getByText(label)).toHaveStyle({
        color: themes.dark.colors.text,
      });
    }
  });

  it('does not change the result or show any message when Save Image is pressed (not wired up yet)', async () => {
    const user = await launchSimpleInterest();
    await fillForm(validForm);
    await calculate(user);

    await user.press(
      screen.getByRole('button', { name: en['resultActions.saveImage'] }),
    );

    expect(screen.getByText('Rs. 6,000')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/copied|shared|saved|success/i)).toBeNull();
  });
});

describe('Simple Interest calculator: copy result summary (Issue #35)', () => {
  const validForm = {
    principal: '100000',
    rate: '2',
    start: '20250101',
    end: '20250401',
  };
  const englishSummary = [
    'Simple Interest result',
    '',
    'Principal: Rs. 1,00,000',
    'Interest Rate: 2% per month',
    'Start Date: 2025/01/01',
    'End Date: 2025/04/01',
    'Duration: 0 Years, 3 Months, 0 Days',
    '',
    'Simple Interest: Rs. 6,000',
    'Total Amount: Rs. 1,06,000',
  ].join('\n');
  const nepaliSummary = [
    'घरेलु ब्याजको नतिजा',
    '',
    'मूलधन: रु. 1,00,000',
    'ब्याज दर: 2% प्रति महिना',
    'सुरु मिति: 2025/01/01',
    'अन्तिम मिति: 2025/04/01',
    'अवधि: 0 वर्ष, 3 महिना, 0 दिन',
    '',
    'घरेलु ब्याज: रु. 6,000',
    'जम्मा रकम: रु. 1,06,000',
  ].join('\n');

  const copyButton = () =>
    screen.getByRole('button', { name: en['resultActions.copy'] });
  const calculated = async () => {
    const user = await launchSimpleInterest();
    await fillForm(validForm);
    await calculate(user);
    return user;
  };

  it('is not offered until a valid result is shown, and goes with the result', async () => {
    const clipboard = installFakeClipboard();
    const user = await launchSimpleInterest();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();

    await calculate(user); // empty form: invalid
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();

    await fillForm(validForm);
    await calculate(user);
    expect(copyButton()).toBeOnTheScreen();

    await fillForm({ principal: '2000' });
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
    expect(clipboard.setString).not.toHaveBeenCalled();
  });

  it('copies a readable English summary of the inputs and results', async () => {
    const clipboard = installFakeClipboard();
    const user = await calculated();

    await user.press(copyButton());

    expect(clipboard.setString).toHaveBeenCalledTimes(1);
    expect(clipboard.content).toBe(englishSummary);
    expect(
      await screen.findByText(en['resultActions.copied']),
    ).toBeOnTheScreen();
  });

  it('copies the summary in Nepali, with a Nepali message, after a language change', async () => {
    const clipboard = installFakeClipboard();
    const user = await calculated();
    await user.press(screen.getByRole('button', { name: /^Change language$/ }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));

    await user.press(
      screen.getByRole('button', { name: np['resultActions.copy'] }),
    );

    expect(clipboard.content).toBe(nepaliSummary);
    expect(
      await screen.findByText(np['resultActions.copied']),
    ).toBeOnTheScreen();
    expect(screen.queryByText(en['resultActions.copied'])).toBeNull();
  });

  it('copies the entered rate and mode and the displayed (rounded) money', async () => {
    const clipboard = installFakeClipboard();
    const user = await launchSimpleInterest();
    await user.press(
      screen.getByRole('radio', { name: en['simpleInterest.rateMode.rupees'] }),
    );
    // 1,000 at Rs. 0.5 per Rs. 100 per month for 10 days = 1.6666...
    await fillForm({
      principal: '1000',
      rate: '0.5',
      start: '20250101',
      end: '20250111',
    });
    await calculate(user);

    await user.press(copyButton());

    expect(clipboard.content).toContain(
      'Interest Rate: Rs. 0.5 per Rs. 100 per month',
    );
    expect(clipboard.content).toContain('Simple Interest: Rs. 1.67');
    expect(clipboard.content).toContain('Total Amount: Rs. 1,001.67');
    expect(clipboard.content).toContain('Duration: 0 Years, 0 Months, 10 Days');
  });

  it('shows the success message only after the clipboard write has finished', async () => {
    const clipboard = installFakeClipboard();
    const user = await calculated();
    // Hold the read-back that confirms the write, so the write is "in flight".
    let finish: (text: string) => void = () => {};
    jest
      .mocked(Clipboard.getString)
      .mockImplementationOnce(
        () => new Promise<string>(resolve => (finish = resolve)),
      );

    await user.press(copyButton());

    expect(clipboard.setString).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(en['resultActions.copied'])).toBeNull();
    expect(screen.queryByText(en['resultActions.copyFailed'])).toBeNull();

    await act(async () => finish(clipboard.content));

    expect(screen.getByText(en['resultActions.copied'])).toBeOnTheScreen();
  });

  it('shows an error and never success when the native write silently fails', async () => {
    // Android swallows native clipboard errors, so JS sees no exception.
    const clipboard = installFakeClipboard('silentFailure');
    const user = await calculated();

    await user.press(copyButton());

    expect(clipboard.setString).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(en['resultActions.copyFailed']),
    ).toBeOnTheScreen();
    expect(screen.queryByText(en['resultActions.copied'])).toBeNull();
    // The app and the result are unaffected.
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
  });

  it.each(['throwOnWrite', 'rejectOnRead'] as const)(
    'shows an error and does not crash when the clipboard fails (%s)',
    async mode => {
      installFakeClipboard(mode);
      const user = await calculated();

      await user.press(copyButton());

      expect(
        await screen.findByText(en['resultActions.copyFailed']),
      ).toBeOnTheScreen();
      expect(screen.queryByText(en['resultActions.copied'])).toBeNull();
      expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
    },
  );

  it('replaces the error with success when a later copy works', async () => {
    installFakeClipboard('silentFailure');
    const user = await calculated();
    await user.press(copyButton());
    expect(
      await screen.findByText(en['resultActions.copyFailed']),
    ).toBeOnTheScreen();

    installFakeClipboard('working');
    await user.press(copyButton());

    expect(
      await screen.findByText(en['resultActions.copied']),
    ).toBeOnTheScreen();
    expect(screen.queryByText(en['resultActions.copyFailed'])).toBeNull();
  });

  it('does not keep the message when the result is replaced', async () => {
    installFakeClipboard();
    const user = await calculated();
    await user.press(copyButton());
    expect(
      await screen.findByText(en['resultActions.copied']),
    ).toBeOnTheScreen();

    await fillForm({ principal: '2000' });
    await calculate(user);

    expect(screen.queryByText(en['resultActions.copied'])).toBeNull();
    expect(copyButton()).toBeOnTheScreen();
  });
});

describe('Simple Interest calculator: share result as image (Issue #36)', () => {
  const validForm = {
    principal: '100000',
    rate: '2',
    start: '20250101',
    end: '20250401',
  };
  const shareButton = (label: string = en['resultActions.share']) =>
    screen.getByRole('button', { name: label });
  const calculated = async () => {
    const user = await launchSimpleInterest();
    await fillForm(validForm);
    await calculate(user);
    return user;
  };

  /** The view that was handed to the capture call (a class instance). */
  const capturedView = (call = 0) =>
    (
      jest.mocked(captureRef).mock.calls[call][0] as unknown as {
        current: { props: { testID: string; style: unknown } };
      }
    ).current;
  /** The host element of the card image, checked to be what was captured. */
  const cardImage = (call = 0) => {
    expect(capturedView(call).props.testID).toBe('result-card-image');
    return screen.getByTestId('result-card-image');
  };

  beforeEach(() => {
    jest
      .mocked(captureRef)
      .mockReset()
      .mockResolvedValue('file:///cache/a.png');
    jest.mocked(releaseCapture).mockReset();
    jest
      .mocked(Share.open)
      .mockReset()
      .mockResolvedValue({ success: true, message: 'ok' });
  });

  it('is not offered until a valid result is shown', async () => {
    const user = await launchSimpleInterest();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();

    await calculate(user); // empty form: invalid
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();

    await fillForm(validForm);
    await calculate(user);
    expect(shareButton()).toBeOnTheScreen();

    await fillForm({ principal: '2000' });
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
    expect(captureRef).not.toHaveBeenCalled();
  });

  it('captures only the result card content as a PNG and opens the share sheet with it', async () => {
    const user = await calculated();

    await user.press(shareButton());

    expect(captureRef).toHaveBeenCalledTimes(1);
    const [, options] = jest.mocked(captureRef).mock.calls[0];
    expect(options).toMatchObject({
      format: 'png',
      result: 'tmpfile',
      fileName: 'simple-interest-result-',
    });

    // The captured view holds the result, not the inputs or the action row.
    const captured = cardImage();
    expect(within(captured).getByText('Simple Interest result')).toBeTruthy();
    expect(within(captured).getByText('Rs. 6,000')).toBeTruthy();
    expect(within(captured).getByText('Rs. 1,06,000')).toBeTruthy();
    expect(within(captured).queryByRole('button')).toBeNull();
    expect(
      within(captured).queryByText(en['simpleInterest.calculate']),
    ).toBeNull();
    expect(
      within(captured).queryByText(en['simpleInterest.principal.label']),
    ).toBeNull();

    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///cache/a.png',
        type: 'image/png',
        title: en['resultActions.shareTitle'],
        failOnCancel: false,
      }),
    );
    // Opening the sheet is the feedback: no extra message.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/shared|success/i)).toBeNull();
  });

  it('captures the Nepali card in Nepali and uses a Nepali share title', async () => {
    const user = await calculated();
    await user.press(screen.getByRole('button', { name: /^Change language$/ }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));

    await user.press(shareButton(np['resultActions.share']));

    const captured = cardImage();
    expect(within(captured).getByText('घरेलु ब्याजको नतिजा')).toBeTruthy();
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({ title: np['resultActions.shareTitle'] }),
    );
  });

  it('gives the captured card its own themed background in light and dark', async () => {
    const user = await calculated();
    await user.press(shareButton());
    expect(cardImage(0)).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
    });

    await user.press(screen.getByRole('button', { name: /theme/i }));
    await user.press(shareButton());
    expect(cardImage(1)).toHaveStyle({
      backgroundColor: themes.dark.colors.surface,
    });
  });

  it('shows no message when the user closes the share sheet, and removes the temporary file', async () => {
    jest.mocked(Share.open).mockResolvedValue({
      success: false,
      message: 'cancel',
      dismissedAction: true,
    });
    const user = await calculated();

    await user.press(shareButton());

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(en['resultActions.shareFailed'])).toBeNull();
    expect(releaseCapture).toHaveBeenCalledWith('file:///cache/a.png');
  });

  it('shows a localized error, never success, when the capture fails', async () => {
    jest.mocked(captureRef).mockRejectedValue(new Error('capture failed'));
    const user = await calculated();

    await user.press(shareButton());

    expect(
      await screen.findByText(en['resultActions.shareFailed']),
    ).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(Share.open).not.toHaveBeenCalled();
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
  });

  it('shows the error when the share sheet fails, and keeps the card usable', async () => {
    jest.mocked(Share.open).mockRejectedValue(new Error('no activity'));
    const user = await calculated();

    await user.press(shareButton());

    expect(
      await screen.findByText(en['resultActions.shareFailed']),
    ).toBeOnTheScreen();
    expect(releaseCapture).toHaveBeenCalledWith('file:///cache/a.png');
    expect(shareButton()).toBeOnTheScreen();
  });

  it('does not touch Copy: copying still works while sharing is wired up', async () => {
    const clipboard = installFakeClipboard();
    const user = await calculated();

    await user.press(
      screen.getByRole('button', { name: en['resultActions.copy'] }),
    );

    expect(clipboard.content).toContain('Principal: Rs. 1,00,000');
    expect(captureRef).not.toHaveBeenCalled();
    expect(Share.open).not.toHaveBeenCalled();
  });
});
