/** The BS Age calculator UI (Issue #65). */
import {
  render,
  screen,
  userEvent,
  within,
  act,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';

import { calculateAge } from '../../../../features/age';
import { setLanguage, setTheme } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
import { appColors } from '../../../../theme/colors';
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
  await choose(user, group, lang['age.field.year'], year);
  await choose(user, group, lang['age.field.month'], `${month} – ${monthName}`);
  await choose(user, group, lang['age.field.day'], day);
}

const calculate = () =>
  screen.getByRole('button', { name: L['age.calculate'] });
const result = () => screen.queryByTestId('age-result');
const radios = () =>
  screen.getAllByRole('radio').map(node => node.props.accessibilityLabel);

beforeEach(() => {
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

    const years = radios();
    expect(years).toHaveLength(201);
    expect(years[0]).toBe('1900');
    expect(years[200]).toBe('2100');
    expect(years[100]).toBe('2000');
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

  it('Month names are Nepali when the language is Nepali, numbers unchanged', async () => {
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    await user.press(dropdown(np['age.bs.startDate'], np['age.field.month']));

    expect(radios()).toEqual([
      '01 – वैशाख',
      '02 – जेठ',
      '03 – असार',
      '04 – साउन',
      '05 – भदौ',
      '06 – असोज',
      '07 – कात्तिक',
      '08 – मंसिर',
      '09 – पुस',
      '10 – माघ',
      '11 – फागुन',
      '12 – चैत',
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
    ).toBe(`${np['age.bs.endDate']} – ${np['age.field.month']}: 03 – असार`);
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
      card.getByLabelText(`${np['age.result.years']}: 10`),
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
