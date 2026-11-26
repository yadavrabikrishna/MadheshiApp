/** The AD Age calculator UI (Issue #69). */
import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';

import { visibleRowCount } from '../../../../components/common/Dropdown';
import { calculateAge } from '../../../../features/age';
import { setLanguage } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
import { toDevanagariDigits } from '../../../../utils';
import { AdAgeView } from '../AdAgeView';

jest.mock('../../../../features/age', () => {
  const actual = jest.requireActual('../../../../features/age');
  return { ...actual, calculateAge: jest.fn(actual.calculateAge) };
});

jest.setTimeout(30000);

type Lang = Record<keyof typeof en, string>;

function setup() {
  const store = createAppStore({
    preferencesRepository: {
      saveLanguage: jest.fn().mockResolvedValue(undefined),
      saveTheme: jest.fn().mockResolvedValue(undefined),
      saveInterestRateConfig: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
  return {
    store,
    user: userEvent.setup(),
    ui: (
      <Provider store={store}>
        <AdAgeView />
      </Provider>
    ),
  };
}

const L: Lang = en;
const START = L['age.bs.startDate'];
const END = L['age.bs.endDate'];
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_NP = [
  'जनवरी',
  'फेब्रुअरी',
  'मार्च',
  'अप्रिल',
  'मे',
  'जुन',
  'जुलाई',
  'अगस्ट',
  'सेप्टेम्बर',
  'अक्टोबर',
  'नोभेम्बर',
  'डिसेम्बर',
];

const dropdown = (group: string, part: string) =>
  screen.getByRole('button', { name: new RegExp(`^${group} – ${part}:`) });
const radios = () =>
  screen.getAllByRole('radio').map(node => node.props.accessibilityLabel);
const calculate = () =>
  screen.getByRole('button', { name: L['age.calculate'] });
const result = () => screen.queryByTestId('age-result');

// The list builds only the rows around its opening position, so by default
// these tests run on a window tall enough to show every row; the position
// tests use the real size.
const NORMAL_WINDOW = { ...Dimensions.get('window') };
const setWindowHeight = (height: number) =>
  Dimensions.set({ window: { ...NORMAL_WINDOW, height } });
const visible = () => visibleRowCount(201, NORMAL_WINDOW.height);
const middle = () => Math.floor(visible() / 2);

beforeEach(() => {
  setWindowHeight(20000);
  jest.mocked(calculateAge).mockClear();
});
afterAll(() => setWindowHeight(NORMAL_WINDOW.height));

type User = ReturnType<typeof userEvent.setup>;

async function choose(user: User, group: string, part: string, option: string) {
  await user.press(dropdown(group, part));
  await user.press(screen.getByRole('radio', { name: option }));
}

async function pickDate(
  user: User,
  group: string,
  year: string,
  month: string,
  day: string,
  monthName: string,
  lang: Lang = L,
) {
  const show = lang === np ? toDevanagariDigits : (x: string) => x;
  await choose(user, group, lang['age.field.year'], show(year));
  await choose(
    user,
    group,
    lang['age.field.month'],
    `${show(month)} – ${monthName}`,
  );
  await choose(user, group, lang['age.field.day'], show(day));
}

describe('AdAgeView: fields', () => {
  it('shows Start Date then End Date, each with Year, Month and Day', async () => {
    const { ui } = setup();
    await render(ui);
    for (const group of [START, END]) {
      for (const part of ['year', 'month', 'day'] as const) {
        expect(dropdown(group, L[`age.field.${part}`])).toBeOnTheScreen();
      }
    }
    expect(screen.getAllByText(L['age.field.placeholder'])).toHaveLength(6);
  });

  it('is not the placeholder screen and shows its own approximation hint at the bottom', async () => {
    const { ui } = setup();
    await render(ui);
    expect(screen.getByText(L['age.notice.title'])).toBeOnTheScreen();
    expect(screen.getByText(L['age.ad.notice.body'])).toBeOnTheScreen();
    // The AD hint is not the BS wording.
    expect(screen.queryByText(L['age.notice.body'])).toBeNull();
    expect(screen.queryByText(L['calculator.age.ad.description'])).toBeNull();
  });

  it('Year lists 1900 to 2100 inclusive, in order', async () => {
    const { ui, user } = setup();
    await render(ui);
    await user.press(dropdown(START, L['age.field.year']));
    const years = radios();
    expect(years).toHaveLength(201);
    expect(years[0]).toBe('1900');
    expect(years[200]).toBe('2100');
    expect(years.every((y, i) => y === String(1900 + i))).toBe(true);
  });

  it.each(['1900', '2100'])('selects the boundary year %s', async year => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], year);
    expect(dropdown(START, L['age.field.year']).props.accessibilityLabel).toBe(
      `${START} – ${L['age.field.year']}: ${year}`,
    );
  });

  it('Month lists January to December in calendar order (English)', async () => {
    const { ui, user } = setup();
    await render(ui);
    await user.press(dropdown(START, L['age.field.month']));
    expect(radios()).toEqual(
      MONTHS_EN.map((m, i) => `${String(i + 1).padStart(2, '0')} – ${m}`),
    );
  });

  it('Month lists the same months in Nepali with Devanagari numbers', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    await user.press(dropdown(np['age.bs.startDate'], np['age.field.month']));
    expect(radios()).toEqual(
      MONTHS_NP.map(
        (m, i) =>
          `${toDevanagariDigits(String(i + 1).padStart(2, '0'))} – ${m}`,
      ),
    );
  });

  it('Day lists 01 to 30 for every month and year', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2024');
    await choose(user, START, L['age.field.month'], '02 – February');
    await user.press(dropdown(START, L['age.field.day']));
    const days = radios();
    expect(days).toHaveLength(30);
    expect(days[0]).toBe('01');
    expect(days[29]).toBe('30');
    expect(days).not.toContain('31');
  });

  it.each([START, END])(
    '%s: Year, Month and Day columns are exactly equal width in one row',
    async group => {
      const { ui } = setup();
      await render(ui);
      // The dropdown sits in a column wrapper that carries the width share;
      // find it by walking up to the first node with a flex value.
      const columnOf = (part: 'year' | 'month' | 'day') => {
        let node = dropdown(group, L[`age.field.${part}`]).parent;
        while (
          node &&
          StyleSheet.flatten(node.props.style)?.flex === undefined
        ) {
          node = node.parent;
        }
        return node;
      };
      const columns = (['year', 'month', 'day'] as const).map(columnOf);

      const styles = columns.map(c => StyleSheet.flatten(c?.props.style));
      expect(styles[0]).toMatchObject({ flex: 1, flexBasis: 0, minWidth: 0 });
      expect(styles[1]).toEqual(styles[0]);
      expect(styles[2]).toEqual(styles[0]);
      // All three share one row container.
      const row = columns[0]?.parent;
      expect(columns[1]?.parent).toBe(row);
      expect(columns[2]?.parent).toBe(row);
      expect(StyleSheet.flatten(row?.props.style)).toMatchObject({
        flexDirection: 'row',
      });
    },
  );
});

describe('AdAgeView: default opening positions', () => {
  const noSelectedRow = () =>
    screen
      .getAllByRole('radio')
      .some(row => row.props.accessibilityState?.selected);

  beforeEach(() => setWindowHeight(NORMAL_WINDOW.height));

  it.each([
    ['Start', START, '2025'],
    ['End', END, '2026'],
  ])(
    '%s Year opens around %s with nothing selected and keeps the placeholder',
    async (_name, group, year) => {
      const { ui, user } = setup();
      await render(ui);
      expect(
        dropdown(group, L['age.field.year']).props.accessibilityLabel,
      ).toBe(
        `${group} – ${L['age.field.year']}: ${L['age.field.placeholder']}`,
      );

      await user.press(dropdown(group, L['age.field.year']));

      expect(radios()[middle()]).toBe(year);
      expect(radios()).not.toContain('1900');
      expect(noSelectedRow()).toBe(false);
    },
  );

  it('a chosen year overrides the default, independently for Start and End', async () => {
    const { ui, user } = setup();
    await render(ui);

    await user.press(dropdown(START, L['age.field.year']));
    await user.press(screen.getByRole('radio', { name: '2025' }));
    await user.press(dropdown(END, L['age.field.year']));
    await user.press(screen.getByRole('radio', { name: '2026' }));

    // Change Start to a year that is visible from its default position.
    await user.press(dropdown(START, L['age.field.year']));
    await user.press(screen.getByRole('radio', { name: '2020' }));

    await user.press(dropdown(START, L['age.field.year']));
    expect(radios()[middle()]).toBe('2020');
    await user.press(screen.getByRole('radio', { name: '2020' }));

    await user.press(dropdown(END, L['age.field.year']));
    expect(radios()[middle()]).toBe('2026');
  });

  it('End keeps its default while only Start has a chosen year', async () => {
    const { ui, user } = setup();
    await render(ui);
    await user.press(dropdown(START, L['age.field.year']));
    await user.press(screen.getByRole('radio', { name: '2025' }));

    await user.press(dropdown(END, L['age.field.year']));
    expect(radios()[middle()]).toBe('2026');
  });

  it('Nepali: the default position shows Devanagari digits', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    await user.press(dropdown(np['age.bs.endDate'], np['age.field.year']));
    expect(radios()[middle()]).toBe('२०२६');
    expect(radios().every(y => /^[०-९]{4}$/.test(y))).toBe(true);
  });
});

describe('AdAgeView: calculation', () => {
  it('passes YYYY/MM/DD built from the chosen parts to the shared calculateAge and shows the result', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2024', '01', '20', 'January');
    await pickDate(user, END, '2024', '03', '10', 'March');

    await user.press(calculate());

    expect(calculateAge).toHaveBeenCalledTimes(1);
    expect(calculateAge).toHaveBeenCalledWith({
      startDate: '2024/01/20',
      endDate: '2024/03/10',
    });
    const card = within(screen.getByTestId('age-result'));
    expect(card.getByText(L['calculator.title.age.ad'])).toBeOnTheScreen();
    expect(card.getByLabelText('Years: 0')).toBeOnTheScreen();
    expect(card.getByLabelText('Months: 1')).toBeOnTheScreen();
    expect(card.getByLabelText('Days: 20')).toBeOnTheScreen();
    // The hint moves inside the result card, once.
    expect(
      within(screen.getByTestId('age-result')).getByText(
        L['age.ad.notice.body'],
      ),
    ).toBeOnTheScreen();
    expect(screen.getAllByText(L['age.ad.notice.body'])).toHaveLength(1);
  });

  it('the boundary values 1900/01/01 and 2100/12/30 are passed as written', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '1900', '01', '01', 'January');
    await pickDate(user, END, '2100', '12', '30', 'December');
    await user.press(calculate());
    expect(calculateAge).toHaveBeenCalledWith({
      startDate: '1900/01/01',
      endDate: '2100/12/30',
    });
    const card = within(screen.getByTestId('age-result'));
    expect(card.getByLabelText('Years: 200')).toBeOnTheScreen();
    expect(card.getByLabelText('Months: 11')).toBeOnTheScreen();
    expect(card.getByLabelText('Days: 29')).toBeOnTheScreen();
  });

  it('the same date shows 0 years, 0 months and 0 days', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2026', '02', '28', 'February');
    await pickDate(user, END, '2026', '02', '28', 'February');
    await user.press(calculate());
    const card = within(screen.getByTestId('age-result'));
    expect(card.getByLabelText('Years: 0')).toBeOnTheScreen();
    expect(card.getByLabelText('Months: 0')).toBeOnTheScreen();
    expect(card.getByLabelText('Days: 0')).toBeOnTheScreen();
  });

  it('Nepali: Devanagari display, ASCII values to calculateAge', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    const s = np['age.bs.startDate'];
    const e = np['age.bs.endDate'];
    await pickDate(user, s, '2024', '01', '09', 'जनवरी', np);
    await pickDate(user, e, '2026', '05', '30', 'मे', np);

    expect(dropdown(s, np['age.field.year']).props.accessibilityLabel).toBe(
      `${s} – ${np['age.field.year']}: २०२४`,
    );
    expect(dropdown(e, np['age.field.day']).props.accessibilityLabel).toBe(
      `${e} – ${np['age.field.day']}: ३०`,
    );

    await user.press(screen.getByRole('button', { name: np['age.calculate'] }));
    expect(calculateAge).toHaveBeenCalledWith({
      startDate: '2024/01/09',
      endDate: '2026/05/30',
    });
    expect(
      within(screen.getByTestId('age-result')).getByText(
        np['calculator.title.age.ad'],
      ),
    ).toBeOnTheScreen();
  });
});

describe('AdAgeView: validation and stale state', () => {
  it('an incomplete start date is reported only beside the start date', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2024');
    await pickDate(user, END, '2025', '01', '01', 'January');
    await user.press(calculate());

    expect(result()).toBeNull();
    expect(
      within(screen.getByTestId('age-start-date')).getByText(
        new RegExp(L['age.error.startDateInvalid']),
      ),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('age-end-date')).queryByText(
        new RegExp(L['age.error.startDateInvalid']),
      ),
    ).toBeNull();
  });

  it('an incomplete end date is reported only beside the end date', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2024', '01', '01', 'January');
    await user.press(calculate());
    expect(
      within(screen.getByTestId('age-end-date')).getByText(
        new RegExp(L['age.error.endDateInvalid']),
      ),
    ).toBeOnTheScreen();
  });

  it('an end date earlier than the start date is reported beside the end date, localized', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await pickDate(user, START, '2026', '05', '10', 'May');
    await pickDate(user, END, '2026', '05', '09', 'May');
    await user.press(calculate());
    expect(result()).toBeNull();
    expect(
      within(screen.getByTestId('age-end-date')).getByText(
        new RegExp(L['age.error.endBeforeStart']),
      ),
    ).toBeOnTheScreen();

    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    expect(
      within(screen.getByTestId('age-end-date')).getByText(
        new RegExp(np['age.error.endBeforeStart']),
      ),
    ).toBeOnTheScreen();
  });

  it.each([
    [START, 'year', '2020'],
    [START, 'month', '07 – July'],
    [START, 'day', '05'],
    [END, 'year', '2030'],
    [END, 'month', '08 – August'],
    [END, 'day', '06'],
  ] as const)(
    'editing %s %s clears the shown result',
    async (group, part, option) => {
      const { ui, user } = setup();
      await render(ui);
      await pickDate(user, START, '2024', '01', '20', 'January');
      await pickDate(user, END, '2025', '03', '10', 'March');
      await user.press(calculate());
      expect(result()).not.toBeNull();

      await choose(user, group, L[`age.field.${part}`], option);
      expect(result()).toBeNull();
    },
  );

  it('editing either date clears the shown errors', async () => {
    const { ui, user } = setup();
    await render(ui);
    await user.press(calculate());
    expect(
      screen.getAllByText(new RegExp(L['age.error.startDateInvalid'])),
    ).not.toHaveLength(0);

    await choose(user, START, L['age.field.year'], '2024');
    expect(
      screen.queryByText(new RegExp(L['age.error.startDateInvalid'])),
    ).toBeNull();
    expect(
      screen.queryByText(new RegExp(L['age.error.endDateInvalid'])),
    ).toBeNull();
  });
});

describe('AdAgeView: approximation hint and Nepali numerals', () => {
  it('shows the hint at the bottom, after the form, explaining 30-day months and 12-month years', async () => {
    const { ui } = setup();
    await render(ui);
    expect(L['age.ad.notice.body']).toMatch(/30 days/);
    expect(L['age.ad.notice.body']).toMatch(/12 months/);
    expect(screen.getByText(L['age.notice.title'])).toBeOnTheScreen();
    expect(screen.getByText(L['age.ad.notice.body'])).toBeOnTheScreen();
    // It is the last thing on the screen, after the Calculate button.
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('age-approximation-notice')).toBeGreaterThan(
      tree.indexOf(L['age.calculate']),
    );
  });

  it('is localized in Nepali (same title wording as BS, AD body)', async () => {
    const { ui, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    expect(screen.getByText(np['age.notice.title'])).toBeOnTheScreen();
    expect(screen.getByText(np['age.ad.notice.body'])).toBeOnTheScreen();
    expect(screen.queryByText(en['age.ad.notice.body'])).toBeNull();
    expect(np['age.ad.notice.body']).toMatch(/३० दिन/);
    expect(np['age.ad.notice.body']).toMatch(/१२ महिना/);
  });

  it('Nepali result values are Devanagari; English stay ASCII; the API gets ASCII dates', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await pickDate(user, START, '1990', '06', '15', 'June');
    await pickDate(user, END, '2026', '11', '25', 'November');
    await user.press(calculate());
    const card = () => within(screen.getByTestId('age-result'));
    expect(card().getByText('36')).toBeOnTheScreen();
    expect(card().getByText('5')).toBeOnTheScreen();
    expect(card().getByText('10')).toBeOnTheScreen();

    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    expect(card().getByText('३६')).toBeOnTheScreen();
    expect(card().getByText('५')).toBeOnTheScreen();
    expect(card().getByText('१०')).toBeOnTheScreen();
    expect(
      card().getByLabelText(`${np['age.result.years']}: ३६`),
    ).toBeOnTheScreen();
    expect(calculateAge).toHaveBeenLastCalledWith({
      startDate: '1990/06/15',
      endDate: '2026/11/25',
    });
  });
});
