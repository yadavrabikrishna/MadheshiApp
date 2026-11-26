/** The BS Age calculator UI (Issue #65). */
import {
  render,
  screen,
  userEvent,
  within,
  act,
} from '@testing-library/react-native';
import { Dimensions, FlatList, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';

import { calculateAge } from '../../../../features/age';
import { setLanguage, setTheme } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
import { appColors } from '../../../../theme/colors';
import { toDevanagariDigits } from '../../../../utils';
import { visibleRowCount } from '../../../../components/common/Dropdown';
import { BsAgeView } from '../BsAgeView';

jest.mock('../../../../features/age', () => {
  const actual = jest.requireActual('../../../../features/age');
  return { ...actual, calculateAge: jest.fn(actual.calculateAge) };
});

jest.setTimeout(30000);

type Lang = Record<keyof typeof en, string>;

function setup(systemTheme: 'light' | 'dark' = 'light') {
  const store = createAppStore({
    preferencesRepository: {
      saveLanguage: jest.fn().mockResolvedValue(undefined),
      saveTheme: jest.fn().mockResolvedValue(undefined),
      saveInterestRateConfig: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => systemTheme,
  });
  return {
    store,
    user: userEvent.setup(),
    ui: (
      <Provider store={store}>
        <BsAgeView />
      </Provider>
    ),
  };
}

const L: Lang = en;
const START = L['age.bs.startDate'];
const END = L['age.bs.endDate'];

/** The dropdown button of one part of one date, whatever it shows now. */
const dropdown = (group: string, part: string) =>
  screen.getByRole('button', {
    name: new RegExp(`^${group} – ${part}:`),
  });

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  group: string,
  part: string,
  option: string,
) {
  await user.press(dropdown(group, part));
  await pressOption(user, option);
}

async function pressOption(
  user: ReturnType<typeof userEvent.setup>,
  option: string,
) {
  await user.press(screen.getByRole('radio', { name: option }));
}

async function pickDate(
  user: ReturnType<typeof userEvent.setup>,
  group: string,
  year: string,
  month: string,
  day: string,
  monthName: string,
  lang: Lang = L,
) {
  // The options show Devanagari digits in Nepali; the values stay ASCII.
  const show = lang === np ? toDevanagariDigits : (text: string) => text;
  await choose(user, group, lang['age.field.year'], show(year));
  await choose(
    user,
    group,
    lang['age.field.month'],
    `${show(month)} – ${monthName}`,
  );
  await choose(user, group, lang['age.field.day'], show(day));
}

const calculate = () =>
  screen.getByRole('button', { name: L['age.calculate'] });
const result = () => screen.queryByTestId('age-result');
const radios = () =>
  screen.getAllByRole('radio').map(node => node.props.accessibilityLabel);

/** Every option the open list holds (not just the rows built so far). */
const listData = () =>
  (
    screen.getByTestId('dropdown-list').props.data as {
      value: string;
      label: string;
    }[]
  ).map(option => option.label);

/**
 * The list builds only the rows around its opening position. These tests pick
 * options anywhere in the range, so by default they run on a window tall
 * enough to show every row; the "list position" tests use the real size.
 */
const NORMAL_WINDOW = { ...Dimensions.get('window') };
const setWindowHeight = (height: number) =>
  Dimensions.set({ window: { ...NORMAL_WINDOW, height } });

beforeEach(() => {
  setWindowHeight(20000);
  jest.mocked(calculateAge).mockClear();
});

describe('BsAgeView: fields', () => {
  it('shows Start Date then End Date, each with Year, Month and Day dropdowns', async () => {
    await render(setup().ui);

    const headings = screen.getAllByRole('header').map(h => h.props.children);
    expect(headings).toEqual([START, END]);
    for (const group of [START, END]) {
      for (const part of ['year', 'month', 'day'] as const) {
        expect(
          dropdown(group, L[`age.field.${part}`]).props.accessibilityLabel,
        ).toBe(
          `${group} – ${L[`age.field.${part}`]}: ${L['age.field.placeholder']}`,
        );
      }
    }
    expect(screen.queryByRole('radio')).toBeNull();
    expect(result()).toBeNull();
  });

  it('Year lists every year 1900 to 2100 inclusive, in order', async () => {
    const { ui, user } = setup();
    await render(ui);

    await user.press(dropdown(START, L['age.field.year']));

    // The list renders only what is near the top at first; its data is all 201.
    const years = listData();
    expect(years).toHaveLength(201);
    expect(years[0]).toBe('1900');
    expect(years[200]).toBe('2100');
    expect(years[100]).toBe('2000');
    expect(years.every((y, i) => y === String(1900 + i))).toBe(true);
  });

  it.each(['1900', '2100'])('selects the boundary year %s', async year => {
    const { ui, user } = setup();
    await render(ui);

    await choose(user, START, L['age.field.year'], year);

    expect(dropdown(START, L['age.field.year']).props.accessibilityLabel).toBe(
      `${START} – ${L['age.field.year']}: ${year}`,
    );
    expect(screen.queryByRole('radio')).toBeNull(); // the list closed
  });

  it('Month lists the 12 BS months in calendar order with two-digit numbers (English)', async () => {
    const { ui, user } = setup();
    await render(ui);

    await user.press(dropdown(START, L['age.field.month']));

    expect(radios()).toEqual([
      '01 – Baishakh',
      '02 – Jestha',
      '03 – Ashadh',
      '04 – Shrawan',
      '05 – Bhadra',
      '06 – Ashwin',
      '07 – Kartik',
      '08 – Mangsir',
      '09 – Poush',
      '10 – Magh',
      '11 – Falgun',
      '12 – Chaitra',
    ]);
  });

  it('Month names and numbers are Nepali when the language is Nepali', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    await user.press(dropdown(np['age.bs.startDate'], np['age.field.month']));

    expect(radios()).toEqual([
      '०१ – वैशाख',
      '०२ – जेठ',
      '०३ – असार',
      '०४ – साउन',
      '०५ – भदौ',
      '०६ – असोज',
      '०७ – कात्तिक',
      '०८ – मंसिर',
      '०९ – पुस',
      '१० – माघ',
      '११ – फागुन',
      '१२ – चैत',
    ]);
  });

  it('Day lists 01 to 32 in every month: nothing depends on month or year', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2080');
    await choose(user, START, L['age.field.month'], '02 – Jestha');

    await user.press(dropdown(START, L['age.field.day']));

    const days = radios();
    expect(days).toHaveLength(32);
    expect(days[0]).toBe('01');
    expect(days[31]).toBe('32');
  });

  it('shows the chosen value in the dropdown and relabels it with the language', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await choose(user, END, L['age.field.month'], '03 – Ashadh');
    expect(dropdown(END, L['age.field.month']).props.accessibilityLabel).toBe(
      `${END} – ${L['age.field.month']}: 03 – Ashadh`,
    );

    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(
      dropdown(np['age.bs.endDate'], np['age.field.month']).props
        .accessibilityLabel,
    ).toBe(`${np['age.bs.endDate']} – ${np['age.field.month']}: ०३ – असार`);
    expect(
      dropdown(np['age.bs.startDate'], np['age.field.year']).props
        .accessibilityLabel,
    ).toContain(np['age.field.placeholder']);
  });
});

describe('BsAgeView: calculation', () => {
  it('passes YYYY/MM/DD built from the chosen parts to the shared calculateAge and shows the result', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2080', '01', '20', 'Baishakh');
    await pickDate(user, END, '2080', '03', '10', 'Ashadh');

    await user.press(calculate());

    expect(calculateAge).toHaveBeenCalledTimes(1);
    expect(calculateAge).toHaveBeenCalledWith({
      startDate: '2080/01/20',
      endDate: '2080/03/10',
    });
    // days 10 - 20 = -10 -> 20; months 3 - 1 - 1 = 1
    const card = within(screen.getByTestId('age-result'));
    expect(card.getByLabelText('Years: 0')).toBeOnTheScreen();
    expect(card.getByLabelText('Months: 1')).toBeOnTheScreen();
    expect(card.getByLabelText('Days: 20')).toBeOnTheScreen();
  });

  it('the boundary values 1900/01/01 and 2100/12/32 are passed as written', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '1900', '01', '01', 'Baishakh');
    await pickDate(user, END, '2100', '12', '32', 'Chaitra');

    await user.press(calculate());

    expect(calculateAge).toHaveBeenCalledWith({
      startDate: '1900/01/01',
      endDate: '2100/12/32',
    });
    // 200 years, 11 months, 31 days (day 32 is kept, not normalized)
    const card = within(screen.getByTestId('age-result'));
    expect(card.getByLabelText('Years: 200')).toBeOnTheScreen();
    expect(card.getByLabelText('Months: 11')).toBeOnTheScreen();
    expect(card.getByLabelText('Days: 31')).toBeOnTheScreen();
  });

  it('the same date shows 0 years, 0 months and 0 days', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2081', '06', '15', 'Ashwin');
    await pickDate(user, END, '2081', '06', '15', 'Ashwin');

    await user.press(calculate());

    const card = within(screen.getByTestId('age-result'));
    expect(card.getByLabelText('Years: 0')).toBeOnTheScreen();
    expect(card.getByLabelText('Months: 0')).toBeOnTheScreen();
    expect(card.getByLabelText('Days: 0')).toBeOnTheScreen();
  });

  it('shows the result labels in Nepali', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    const s = np['age.bs.startDate'];
    const e = np['age.bs.endDate'];
    await pickDate(user, s, '2070', '04', '05', 'साउन', np);
    await pickDate(user, e, '2080', '04', '05', 'साउन', np);

    await user.press(screen.getByRole('button', { name: np['age.calculate'] }));

    const card = within(screen.getByTestId('age-result'));
    expect(
      card.getByLabelText(`${np['age.result.years']}: १०`),
    ).toBeOnTheScreen();
    expect(card.getByText(np['age.notice.body'])).toBeOnTheScreen();
  });
});

describe('BsAgeView: validation', () => {
  const error = (group: string, message: string) =>
    within(screen.getByTestId(group)).getByLabelText(
      `${en['simpleInterest.error.prefix']}: ${message}`,
    );

  it('nothing selected: both dates are reported, beside their own fields, and no result', async () => {
    const { ui, user } = setup();
    await render(ui);

    await user.press(calculate());

    expect(
      error('age-start-date', L['age.error.startDateInvalid']),
    ).toBeOnTheScreen();
    expect(
      error('age-end-date', L['age.error.endDateInvalid']),
    ).toBeOnTheScreen();
    expect(result()).toBeNull();
    expect(calculateAge).toHaveBeenCalledWith({ startDate: '', endDate: '' });
  });

  it('an incomplete start date is reported only for the start date', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2080');
    await pickDate(user, END, '2080', '03', '10', 'Ashadh');

    await user.press(calculate());

    expect(
      error('age-start-date', L['age.error.startDateInvalid']),
    ).toBeOnTheScreen();
    expect(screen.queryByText(L['age.error.endDateInvalid'])).toBeNull();
    expect(result()).toBeNull();
  });

  it('an incomplete end date is reported only for the end date', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2080', '01', '20', 'Baishakh');
    await choose(user, END, L['age.field.month'], '03 – Ashadh');

    await user.press(calculate());

    expect(
      error('age-end-date', L['age.error.endDateInvalid']),
    ).toBeOnTheScreen();
    expect(screen.queryByText(L['age.error.startDateInvalid'])).toBeNull();
  });

  it('an end date earlier than the start date is reported beside the end date', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2080', '05', '10', 'Bhadra');
    await pickDate(user, END, '2080', '05', '09', 'Bhadra');

    await user.press(calculate());

    expect(
      error('age-end-date', L['age.error.endBeforeStart']),
    ).toBeOnTheScreen();
    expect(result()).toBeNull();
  });

  it('shows the errors in Nepali, never a raw message', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    await user.press(screen.getByRole('button', { name: np['age.calculate'] }));

    expect(
      within(screen.getByTestId('age-start-date')).getByLabelText(
        `${np['simpleInterest.error.prefix']}: ${np['age.error.startDateInvalid']}`,
      ),
    ).toBeOnTheScreen();
  });
});

describe('BsAgeView: stale results and errors', () => {
  async function withResult() {
    const view = setup();
    await render(view.ui);
    await pickDate(view.user, START, '2080', '01', '20', 'Baishakh');
    await pickDate(view.user, END, '2080', '03', '10', 'Ashadh');
    await view.user.press(calculate());
    expect(result()).not.toBeNull();
    return view;
  }

  it.each([
    [START, 'year', '2081'],
    [START, 'month', '02 – Jestha'],
    [START, 'day', '21'],
    [END, 'year', '2081'],
    [END, 'month', '04 – Shrawan'],
    [END, 'day', '11'],
  ] as const)(
    'editing the %s %s clears the shown result',
    async (group, part, option) => {
      const { user } = await withResult();

      await choose(user, group, L[`age.field.${part}`], option);

      expect(result()).toBeNull();
    },
  );

  it('editing either date clears the shown errors', async () => {
    const { ui, user } = setup();
    await render(ui);
    await user.press(calculate());
    expect(screen.getByText(L['age.error.startDateInvalid'])).toBeOnTheScreen();

    await choose(user, START, L['age.field.year'], '2080');

    expect(screen.queryByText(L['age.error.startDateInvalid'])).toBeNull();
    expect(screen.queryByText(L['age.error.endDateInvalid'])).toBeNull();
  });

  it('a new Calculate replaces the old result', async () => {
    const { user } = await withResult();
    await choose(user, END, L['age.field.month'], '05 – Bhadra');

    await user.press(calculate());

    const card = within(screen.getByTestId('age-result'));
    expect(card.getByLabelText('Months: 3')).toBeOnTheScreen();
    expect(card.getByLabelText('Days: 20')).toBeOnTheScreen();
  });
});

describe('BsAgeView: BS approximation notice', () => {
  it('is visible before any calculation, in English', async () => {
    await render(setup().ui);

    expect(screen.getByText(en['age.notice.title'])).toBeOnTheScreen();
    expect(screen.getByText(en['age.notice.body'])).toBeOnTheScreen();
    expect(en['age.notice.body']).toMatch(/30 days/);
    expect(en['age.notice.body']).toMatch(/12 months/);
  });

  it('stays with the result (inside the result card), once', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2080', '01', '20', 'Baishakh');
    await pickDate(user, END, '2080', '03', '10', 'Ashadh');

    await user.press(calculate());

    expect(
      within(screen.getByTestId('age-result')).getByText(en['age.notice.body']),
    ).toBeOnTheScreen();
    expect(screen.getAllByText(en['age.notice.body'])).toHaveLength(1);
  });

  it('is localized in Nepali', async () => {
    const { ui, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(screen.getByText(np['age.notice.title'])).toBeOnTheScreen();
    expect(screen.getByText(np['age.notice.body'])).toBeOnTheScreen();
    expect(screen.queryByText(en['age.notice.body'])).toBeNull();
  });
});

describe('BsAgeView: theme and translations', () => {
  it.each(['light', 'dark'] as const)(
    'renders the result card in the %s theme',
    async mode => {
      const { ui, user, store } = setup(mode);
      await render(ui);
      await act(async () => {
        await store.dispatch(setTheme(mode));
      });
      await pickDate(user, START, '2080', '01', '20', 'Baishakh');
      await pickDate(user, END, '2080', '03', '10', 'Ashadh');

      await user.press(calculate());

      const card = screen.getByTestId('age-result');
      expect(StyleSheet.flatten(card.props.style).backgroundColor).toBe(
        appColors[mode].surface,
      );
    },
  );

  it('every Age key exists in both languages with matching month lists', () => {
    const keys = Object.keys(en).filter(k => k.startsWith('age.'));
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) {
      expect(np[key as keyof typeof np]).toBeTruthy();
    }
    for (let i = 1; i <= 12; i++) {
      expect(en[`age.month.${i}` as keyof typeof en]).toBeTruthy();
      expect(np[`age.month.${i}` as keyof typeof np]).toBeTruthy();
    }
  });
});

describe('BsAgeView: dropdown widths', () => {
  const columnStyle = (group: string, part: string) => {
    // The dropdown sits in a column wrapper that carries the width share.
    let node = dropdown(group, part).parent;
    while (node && StyleSheet.flatten(node.props.style)?.flex === undefined) {
      node = node.parent;
    }
    return StyleSheet.flatten(node?.props.style);
  };

  it.each([START, END])(
    '%s: Year, Month and Day are exactly equal in width, in one row',
    async group => {
      await render(setup().ui);

      const columns = ['year', 'month', 'day'].map(part =>
        columnStyle(group, L[`age.field.${part}` as 'age.field.year']),
      );

      // Identical share, no intrinsic width, and allowed to shrink.
      expect(new Set(columns.map(c => JSON.stringify(c))).size).toBe(1);
      expect(columns[0]).toMatchObject({ flex: 1, flexBasis: 0, minWidth: 0 });
      // The three columns share one row container.
      const rows = ['year', 'month', 'day'].map(part => {
        let node = dropdown(
          group,
          L[`age.field.${part}` as 'age.field.year'],
        ).parent;
        while (
          node &&
          StyleSheet.flatten(node.props.style)?.flex === undefined
        ) {
          node = node.parent;
        }
        return node?.parent;
      });
      expect(rows[0]).toBe(rows[1]);
      expect(rows[1]).toBe(rows[2]);
      expect(StyleSheet.flatten(rows[0]?.props.style).flexDirection).toBe(
        'row',
      );
    },
  );

  it("keeps an empty field's placeholder on one line, shrinking if it must", async () => {
    await render(setup().ui);

    const placeholder = within(dropdown(START, L['age.field.month'])).getByText(
      L['age.field.placeholder'],
    );
    expect(placeholder.props.numberOfLines).toBe(1);
    expect(placeholder.props.adjustsFontSizeToFit).toBe(true);
  });
});

describe('BsAgeView: list position', () => {
  // The first frame must already be positioned: nothing may scroll afterwards.
  const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset');
  const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex');
  const scrollToEnd = jest.spyOn(FlatList.prototype, 'scrollToEnd');

  beforeEach(() => {
    scrollToOffset.mockClear();
    scrollToIndex.mockClear();
    scrollToEnd.mockClear();
  });
  afterAll(() => {
    scrollToOffset.mockRestore();
    scrollToIndex.mockRestore();
    scrollToEnd.mockRestore();
  });

  /** Opens a list the way a phone shows it: the real window size. */
  const openNormally = async (
    user: ReturnType<typeof userEvent.setup>,
    group: string,
  ) => {
    await act(async () => {
      setWindowHeight(NORMAL_WINDOW.height);
    });
    await user.press(dropdown(group, L['age.field.year']));
  };
  const backToTall = () =>
    act(async () => {
      setWindowHeight(20000);
    });

  const noCorrection = () => {
    expect(scrollToOffset).not.toHaveBeenCalled();
    expect(scrollToIndex).not.toHaveBeenCalled();
    expect(scrollToEnd).not.toHaveBeenCalled();
  };

  // The list is `visible` rows tall; the first rendered row is the chosen
  // row minus half of that, so the chosen row is in the middle.
  const visible = () => visibleRowCount(201, Dimensions.get('window').height);
  const middle = () => Math.floor(visible() / 2);

  it('the list is exactly the visible rows tall (so centring is exact)', async () => {
    const { ui, user } = setup();
    await render(ui);
    await openNormally(user, START);
    expect(
      StyleSheet.flatten(screen.getByTestId('dropdown-list').props.style),
    ).toMatchObject({ height: visible() * 48 });
  });

  it.each([
    ['2080', START],
    ['2083', END],
  ])(
    'opens the %s year list on the chosen year in the middle, with no later scroll',
    async (year, group) => {
      const { ui, user } = setup();
      await render(ui);
      await choose(user, group, L['age.field.year'], year);

      await openNormally(user, group);

      const shown = radios();
      // First rendered row is the chosen year minus the rows above the middle.
      expect(shown[0]).toBe(String(Number(year) - middle()));
      expect(shown[middle()]).toBe(year);
      expect(shown).not.toContain('1900');
      noCorrection();
    },
  );

  it('opens quickly: only the visible rows plus a small buffer are built', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2080');
    await openNormally(user, START);
    expect(radios().length).toBeLessThan(40);
  });

  it('Start and End years open independently, each around its own year', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2080');
    await choose(user, END, L['age.field.year'], '2083');

    await openNormally(user, END);
    expect(radios()[middle()]).toBe('2083');
    await user.press(screen.getByRole('radio', { name: '2083' }));

    await openNormally(user, START);
    expect(radios()[middle()]).toBe('2080');
    noCorrection();
  });

  it('after choosing a new year the list reopens around it', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2080');

    await user.press(dropdown(START, L['age.field.year']));
    await user.press(screen.getByRole('radio', { name: '2090' }));
    expect(dropdown(START, L['age.field.year']).props.accessibilityLabel).toBe(
      `${START} – ${L['age.field.year']}: 2090`,
    );

    await openNormally(user, START);
    expect(radios()[middle()]).toBe('2090');
    expect(radios()).not.toContain('2080');
  });

  it.each([
    ['Start', START, '2080'],
    ['End', END, '2083'],
  ])(
    '%s Year with nothing chosen opens around %s and keeps the placeholder',
    async (_name, group, year) => {
      const { ui, user } = setup();
      await render(ui);

      await act(async () => {
        setWindowHeight(NORMAL_WINDOW.height);
      });
      await user.press(dropdown(group, L['age.field.year']));

      expect(radios()[middle()]).toBe(year);
      expect(radios()).not.toContain('1900');
      // Nothing is selected: no row is checked.
      expect(
        screen
          .getAllByRole('radio')
          .some(row => row.props.accessibilityState?.selected),
      ).toBe(false);
      noCorrection();
      await user.press(screen.getByRole('radio', { name: year }));
      expect(
        dropdown(group, L['age.field.year']).props.accessibilityLabel,
      ).toBe(`${group} – ${L['age.field.year']}: ${year}`);
    },
  );

  it('the placeholder stays until a year is chosen', async () => {
    const { ui } = setup();
    await render(ui);
    for (const group of [START, END]) {
      expect(
        dropdown(group, L['age.field.year']).props.accessibilityLabel,
      ).toBe(
        `${group} – ${L['age.field.year']}: ${L['age.field.placeholder']}`,
      );
    }
  });

  it('a chosen year overrides the default; the other date keeps its own', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2075');

    await openNormally(user, START);
    expect(radios()[middle()]).toBe('2075');
    await user.press(screen.getByRole('radio', { name: '2075' }));

    await openNormally(user, END);
    expect(radios()[middle()]).toBe('2083');
  });

  it('Nepali: the default position shows Devanagari digits', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
      setWindowHeight(NORMAL_WINDOW.height);
    });
    await user.press(dropdown(np['age.bs.endDate'], np['age.field.year']));
    expect(radios()[middle()]).toBe('२०८३');
  });

  it('keeps the chosen year inside the list at both ends', async () => {
    const { ui, user } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '1900');
    await openNormally(user, START);
    expect(radios()[0]).toBe('1900');
    await user.press(screen.getByRole('radio', { name: '1900' }));

    await backToTall();
    await choose(user, START, L['age.field.year'], '2100');
    await openNormally(user, START);
    expect(radios()[0]).toBe(String(2100 - visible() + 1));
    expect(radios()).toContain('2100');
  });

  it('Nepali: same position, Devanagari labels', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    const group = np['age.bs.startDate'];
    await choose(user, group, np['age.field.year'], '२०८०');

    await act(async () => {
      setWindowHeight(NORMAL_WINDOW.height);
    });
    await user.press(dropdown(group, np['age.field.year']));

    expect(radios()[middle()]).toBe('२०८०');
    expect(radios().every(label => /^[०-९]{4}$/.test(label))).toBe(true);
    noCorrection();
  });
});

afterAll(() => setWindowHeight(NORMAL_WINDOW.height));

describe('BsAgeView: numerals', () => {
  it('shows English digits in English: values, options and selection', async () => {
    const { ui, user } = setup();
    await render(ui);
    await pickDate(user, START, '2080', '01', '09', 'Baishakh');

    expect(dropdown(START, L['age.field.year']).props.accessibilityLabel).toBe(
      `${START} – ${L['age.field.year']}: 2080`,
    );
    expect(dropdown(START, L['age.field.month']).props.accessibilityLabel).toBe(
      `${START} – ${L['age.field.month']}: 01 – Baishakh`,
    );
    expect(dropdown(START, L['age.field.day']).props.accessibilityLabel).toBe(
      `${START} – ${L['age.field.day']}: 09`,
    );
  });

  it('shows Devanagari digits in Nepali: selected values and every option', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    const s = np['age.bs.startDate'];
    await pickDate(user, s, '2080', '01', '09', 'वैशाख', np);

    expect(dropdown(s, np['age.field.year']).props.accessibilityLabel).toBe(
      `${s} – ${np['age.field.year']}: २०८०`,
    );
    expect(dropdown(s, np['age.field.month']).props.accessibilityLabel).toBe(
      `${s} – ${np['age.field.month']}: ०१ – वैशाख`,
    );
    expect(dropdown(s, np['age.field.day']).props.accessibilityLabel).toBe(
      `${s} – ${np['age.field.day']}: ०९`,
    );

    // The End year has no selection, so its list opens at 1900 with every option.
    const e = np['age.bs.endDate'];
    await user.press(dropdown(e, np['age.field.year']));
    // The option data stays ASCII; only what is shown is Devanagari.
    const years = listData();
    expect(years).toHaveLength(201);
    expect(years[0]).toBe('1900');
    expect(years[200]).toBe('2100');
    expect(years.every(label => /^[0-9]{4}$/.test(label))).toBe(true);
    expect(radios()[0]).toBe('१९००');
    expect(radios().every(label => /^[०-९]{4}$/.test(label))).toBe(true);
    await user.press(screen.getByRole('radio', { name: '२०८०' }));
    // The chosen Start year's list is centred on it and still Devanagari.
    await user.press(dropdown(s, np['age.field.year']));
    expect(radios()).toContain('२०८०');
    await user.press(screen.getByRole('radio', { name: '२०८०' }));

    await user.press(dropdown(s, np['age.field.day']));
    const days = listData();
    expect(days).toHaveLength(32);
    expect(days[0]).toBe('01');
    expect(days[31]).toBe('32');
    expect(days.every(label => /^[0-9]{2}$/.test(label))).toBe(true);
    expect(radios()[0]).toBe('०१');
    expect(radios()[31]).toBe('३२');
    expect(radios().every(label => /^[०-९]{2}$/.test(label))).toBe(true);
  });

  it('only converts the display: calculateAge still gets ASCII YYYY/MM/DD in Nepali', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    await pickDate(
      user,
      np['age.bs.startDate'],
      '2080',
      '01',
      '20',
      'वैशाख',
      np,
    );
    await pickDate(user, np['age.bs.endDate'], '2083', '03', '32', 'असार', np);

    await user.press(screen.getByRole('button', { name: np['age.calculate'] }));

    expect(calculateAge).toHaveBeenCalledWith({
      startDate: '2080/01/20',
      endDate: '2083/03/32',
    });
  });

  it('switches digits live when the language changes', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await choose(user, START, L['age.field.year'], '2080');

    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    expect(
      dropdown(np['age.bs.startDate'], np['age.field.year']).props
        .accessibilityLabel,
    ).toContain('२०८०');

    await act(async () => {
      await store.dispatch(setLanguage('en'));
    });
    expect(
      dropdown(START, L['age.field.year']).props.accessibilityLabel,
    ).toContain('2080');
  });
});

describe('BsAgeView: Nepali result digits', () => {
  it('shows Devanagari result values in Nepali and ASCII in English', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await pickDate(user, START, '2070', '04', '05', 'Shrawan');
    await pickDate(user, END, '2080', '04', '05', 'Shrawan');
    await user.press(screen.getByRole('button', { name: L['age.calculate'] }));
    expect(
      within(screen.getByTestId('age-result')).getByText('10'),
    ).toBeOnTheScreen();

    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    expect(
      within(screen.getByTestId('age-result')).getByText('१०'),
    ).toBeOnTheScreen();
    expect(calculateAge).toHaveBeenLastCalledWith({
      startDate: '2070/04/05',
      endDate: '2080/04/05',
    });
  });
});
