/**
 * The shared Interest UI (Issue #45): the same form for Simple and Compound
 * Interest, with the calculation supplied through `config.engine`.
 */
import { render, screen, userEvent, act } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Provider } from 'react-redux';

import { calculateSimpleInterest } from '../../../../features/interest';
import { updateInterestRateConfigFor } from '../../../../features/interestRateConfig';
import { setLanguage } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
import type {
  InterestCalculatorKind,
  InterestRateConfigPatch,
} from '../../../../types/interestRateConfig';
import { InterestCalculatorForm } from '../InterestCalculatorForm';
import {
  INTEREST_CALCULATOR_CONFIGS,
  type InterestCalculatorConfig,
} from '../interestCalculatorConfig';

jest.mock('../../../../features/interest', () => {
  const actual = jest.requireActual('../../../../features/interest');
  return {
    ...actual,
    calculateSimpleInterest: jest.fn(actual.calculateSimpleInterest),
  };
});

jest.setTimeout(30000);

/** Reads the entered rate as a monthly percentage, like the engines do. */
function MonthlyRates({ store }: { store: ReturnType<typeof createAppStore> }) {
  useEffect(() => {
    for (const calculator of ['simple', 'compound'] as const) {
      store
        .dispatch(
          updateInterestRateConfigFor({
            calculator,
            patch: { period: 'monthly' },
          }),
        )
        .catch(() => undefined);
    }
  }, [store]);
  return null;
}

function setup(config: InterestCalculatorConfig, monthly = true) {
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
        {monthly ? <MonthlyRates store={store} /> : null}
        <InterestCalculatorForm config={config} />
      </Provider>
    ),
  };
}

const { simple, compound } = INTEREST_CALCULATOR_CONFIGS;
const L = en;

const field = (label: string) => screen.getByLabelText(label);
const calculateButton = () =>
  screen.getByRole('button', { name: L['simpleInterest.calculate'] });
const type = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  text: string,
) => {
  await user.clear(field(label));
  await user.type(field(label), text);
};
async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await type(user, L['simpleInterest.principal.label'], '100000');
  await type(user, L['simpleInterest.rate.label'], '2');
  await type(user, L['simpleInterest.startDate.label'], '20250101');
  await type(user, L['simpleInterest.endDate.label'], '20250401');
}
/** What the user can see and operate, in order, independent of the mode. */
function formStructure() {
  return {
    textboxes: screen
      .getAllByLabelText(/./)
      .filter(node => node.props.placeholder !== undefined)
      .map(node => [node.props.accessibilityLabel, node.props.placeholder]),
    radios: screen
      .queryAllByRole('radio')
      .map(node => node.props.accessibilityLabel),
    buttons: screen
      .getAllByRole('button')
      .map(node => node.props.accessibilityLabel),
    labels: [
      L['simpleInterest.principal.label'],
      L['simpleInterest.rate.label'],
      L['simpleInterest.startDate.label'],
      L['simpleInterest.endDate.label'],
    ].map(label => screen.queryAllByText(label).length),
  };
}

beforeEach(() => {
  jest.mocked(calculateSimpleInterest).mockClear();
});

describe('InterestCalculatorForm: one UI for both interest types', () => {
  it('shows the same fields, labels, placeholders and field order in both modes', async () => {
    const first = await render(setup(simple).ui);
    const simpleStructure = formStructure();
    await first.unmount();

    await render(setup(compound).ui);

    expect(formStructure()).toEqual(simpleStructure);
    expect(simpleStructure.textboxes.map(([label]) => label)).toEqual([
      L['simpleInterest.principal.label'],
      L['simpleInterest.rate.label'],
      L['simpleInterest.startDate.label'],
      L['simpleInterest.endDate.label'],
    ]);
    // One Interest Rate input: no rate-mode selector or period control.
    expect(simpleStructure.radios).toEqual([]);
    expect(simpleStructure.buttons).toContain(L['simpleInterest.calculate']);
  });

  it('formats the same way in both modes (grouped principal, masked dates)', async () => {
    for (const config of [simple, compound]) {
      const { ui, user } = setup(config);
      const view = await render(ui);

      await type(user, L['simpleInterest.principal.label'], '1234567');
      await type(user, L['simpleInterest.startDate.label'], '20250101');

      expect(field(L['simpleInterest.principal.label']).props.value).toBe(
        '12,34,567',
      );
      expect(field(L['simpleInterest.startDate.label']).props.value).toBe(
        '2025/01/01',
      );
      await view.unmount();
    }
  });
});

describe('InterestCalculatorForm: Simple Interest', () => {
  it('uses the Simple Interest engine and shows its unchanged result', async () => {
    const { ui, user } = setup(simple);
    await render(ui);
    expect(calculateButton().props.accessibilityState).toEqual({
      disabled: false,
    });

    await fillValid(user);
    await user.press(calculateButton());

    expect(calculateSimpleInterest).toHaveBeenCalledTimes(1);
    expect(calculateSimpleInterest).toHaveBeenCalledWith({
      principal: '100000',
      rate: '2',
      rateMode: 'percentPerMonth',
      startDate: '2025/01/01',
      endDate: '2025/04/01',
    });
    expect(screen.getByText('Rs. 6,000')).toBeOnTheScreen();
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
  });

  it('shows no "not available" note', async () => {
    await render(setup(simple).ui);

    expect(
      screen.queryByText(en['calculator.interest.compound.description']),
    ).toBeNull();
  });
});

describe('InterestCalculatorForm: Compound Interest', () => {
  const C = {
    title: en['compoundInterest.result.title'],
    interest: en['compoundInterest.result.interest'],
    periods: 'Completed 12-month periods',
    remaining: 'Remaining period',
  };

  async function calculateYearAndQuarter(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    await type(user, L['simpleInterest.principal.label'], '100000');
    await type(user, L['simpleInterest.rate.label'], '2');
    await type(user, L['simpleInterest.startDate.label'], '20250101');
    // One completed 12-month period (balance 1,24,000) + 3 months simple on it.
    await type(user, L['simpleInterest.endDate.label'], '20260401');
    await user.press(calculateButton());
  }

  it('has Calculate enabled and no "not implemented" note', async () => {
    await render(setup(compound).ui);

    expect(calculateButton().props.accessibilityState).toEqual({
      disabled: false,
    });
    expect(
      screen.queryByText(en['calculator.interest.compound.description']),
    ).toBeNull();
  });

  it('shows the Compound result with Compound wording, never calling the Simple engine', async () => {
    const { ui, user } = setup(compound);
    await render(ui);

    await calculateYearAndQuarter(user);

    expect(calculateSimpleInterest).not.toHaveBeenCalled();
    expect(screen.getByText(C.title)).toBeOnTheScreen();
    expect(screen.queryByText(L['simpleInterest.result.title'])).toBeNull();
    // Duration shows the whole elapsed time; there are no extra period rows.
    expect(
      screen.getByText(
        `${L['simpleInterest.result.duration']}: 1 Years, 3 Months, 0 Days`,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(C.periods)).toBeNull();
    expect(screen.queryByText(C.remaining)).toBeNull();
    expect(
      screen.getByLabelText(`${C.interest}: Rs. 31,440`),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        `${L['simpleInterest.result.total']}: Rs. 1,31,440`,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Principal: Rs. 1,00,000')).toBeOnTheScreen();
    expect(screen.queryByText(L['simpleInterest.result.interest'])).toBeNull();
  });

  it('shows the Simple result with Simple wording and no Compound rows', async () => {
    const { ui, user } = setup(simple);
    await render(ui);

    await calculateYearAndQuarter(user);

    expect(
      screen.getByText(L['simpleInterest.result.title']),
    ).toBeOnTheScreen();
    // 100000 x 2% x 15 months
    expect(
      screen.getByLabelText(
        `${L['simpleInterest.result.interest']}: Rs. 30,000`,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(C.title)).toBeNull();
    expect(screen.queryByText(C.periods)).toBeNull();
  });

  it('uses Nepali Compound labels in Nepali', async () => {
    const { ui, user, store } = setup(compound);
    await render(ui);
    await calculateYearAndQuarter(user);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(
      screen.getByText(np['compoundInterest.result.title']),
    ).toBeOnTheScreen();
    expect(screen.queryByText('पूरा भएका १२ महिनाका अवधि')).toBeNull();
    expect(screen.queryByText('बाँकी अवधि')).toBeNull();
    expect(
      screen.getByText(np['compoundInterest.result.interest']),
    ).toBeOnTheScreen();
  });

  it('shows the same errors as Simple for invalid input', async () => {
    const { ui, user } = setup(compound);
    await render(ui);

    await user.press(calculateButton());

    expect(screen.queryByText(C.title)).toBeNull();
    expect(
      screen.getByText(L['simpleInterest.error.summary']),
    ).toBeOnTheScreen();
  });
});

describe('InterestCalculatorForm: an interest type without an engine', () => {
  const noEngine: InterestCalculatorConfig = {
    type: 'compound',
    engine: null,
  };

  it('keeps Calculate unavailable and says the calculator is not available', async () => {
    await render(setup(noEngine).ui);

    expect(calculateButton().props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(
      screen.getByText(en['calculator.interest.compound.description']),
    ).toBeOnTheScreen();
  });

  it('never calculates, shows no result or error, and never calls the Simple engine', async () => {
    const { ui, user } = setup(noEngine);
    await render(ui);
    await fillValid(user);

    await user.press(calculateButton());

    expect(calculateSimpleInterest).not.toHaveBeenCalled();
    expect(screen.queryByText(L['simpleInterest.result.title'])).toBeNull();
    expect(screen.queryByText('Rs. 6,000')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(field(L['simpleInterest.principal.label']).props.value).toBe(
      '1,00,000',
    );
  });

  it('shows the note in Nepali', async () => {
    const { ui, store } = setup(noEngine);
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(
      screen.getByText(np['calculator.interest.compound.description']),
    ).toBeOnTheScreen();
  });
});

describe('InterestCalculatorForm: plugging in an engine', () => {
  it('calculates with whatever engine the config supplies, and only that one', async () => {
    const engine = jest.fn(calculateSimpleInterest);
    jest.mocked(calculateSimpleInterest).mockClear();
    const { ui, user } = setup({ type: 'compound', engine });
    await render(ui);
    expect(calculateButton().props.accessibilityState).toEqual({
      disabled: false,
    });
    expect(
      screen.queryByText(en['calculator.interest.compound.description']),
    ).toBeNull();

    await fillValid(user);
    await user.press(calculateButton());

    expect(engine).toHaveBeenCalledTimes(1);
    // `engine` wraps the real function; the form itself must not call it too.
    expect(calculateSimpleInterest).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Rs. 1,06,000')).toBeOnTheScreen();
  });

  it('shows the same error presentation for the errors an engine returns', async () => {
    const engine = jest
      .fn()
      .mockReturnValue({ ok: false, errors: ['rateInvalid'] });
    const { ui, user } = setup({ type: 'compound', engine });
    await render(ui);

    await user.press(calculateButton());

    expect(
      screen.getByText(L['simpleInterest.error.rateInvalid']),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(L['simpleInterest.error.summary']),
    ).toBeOnTheScreen();
    expect(screen.queryByText(L['simpleInterest.result.title'])).toBeNull();
  });
});

describe('InterestCalculatorForm: Interest Rate field and saved configuration', () => {
  const rateField = () => field(L['simpleInterest.rate.label']);

  async function configure(
    store: ReturnType<typeof setup>['store'],
    calculator: InterestCalculatorKind,
    patch: InterestRateConfigPatch,
  ) {
    await act(async () => {
      await store.dispatch(updateInterestRateConfigFor({ calculator, patch }));
    });
  }

  it('always labels the one field "Interest Rate", with no mode or period control', async () => {
    for (const config of [simple, compound]) {
      const view = await render(setup(config).ui);

      expect(L['simpleInterest.rate.label']).toBe('Interest Rate');
      expect(screen.getAllByLabelText('Interest Rate')).toHaveLength(1);
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
      expect(screen.queryByText('Rate entry mode')).toBeNull();
      await view.unmount();
    }
  });

  it('explains the default: annual percentage', async () => {
    await render(setup(simple, false).ui);

    expect(
      screen.getByText('Enter annual interest rate (%).'),
    ).toBeOnTheScreen();
  });

  it.each([
    ['yearly', 'Enter annual interest rate (%).'],
    ['halfYearly', 'Enter half-yearly interest rate (%).'],
    ['quarterly', 'Enter quarterly interest rate (%).'],
    ['monthly', 'Enter monthly interest rate (%).'],
    ['weekly', 'Enter weekly interest rate (%).'],
    ['daily', 'Enter daily interest rate (%).'],
  ] as const)('describes Percentage + %s', async (period, text) => {
    const { ui, store } = setup(simple);
    await render(ui);

    await configure(store, 'simple', { period });

    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it.each([
    ['yearly', 'per year'],
    ['halfYearly', 'per half-year'],
    ['quarterly', 'per quarter'],
    ['monthly', 'per month'],
    ['weekly', 'per week'],
    ['daily', 'per day'],
  ] as const)(
    'describes Rupees + %s for every denominator',
    async (period, unit) => {
      const { ui, store } = setup(simple);
      await render(ui);
      await configure(store, 'simple', { rateInputMode: 'rupees', period });

      expect(
        screen.getByText(`Enter rupees per Rs. 100 ${unit}.`),
      ).toBeOnTheScreen();

      await configure(store, 'simple', { denominatorMode: 'per1000' });
      expect(
        screen.getByText(`Enter rupees per Rs. 1,000 ${unit}.`),
      ).toBeOnTheScreen();

      await configure(store, 'simple', {
        customDenominator: '5000',
        denominatorMode: 'custom',
      });
      expect(
        screen.getByText(`Enter rupees per Rs. 5,000 ${unit}.`),
      ).toBeOnTheScreen();
    },
  );

  it('uses the saved period of the active mode, as Settings restores it', async () => {
    const { ui, store } = setup(simple);
    await render(ui);
    await configure(store, 'simple', { period: 'quarterly' });
    await configure(store, 'simple', {
      rateInputMode: 'rupees',
      period: 'daily',
    });
    expect(
      screen.getByText('Enter rupees per Rs. 100 per day.'),
    ).toBeOnTheScreen();

    await configure(store, 'simple', { rateInputMode: 'percentage' });
    expect(
      screen.getByText('Enter quarterly interest rate (%).'),
    ).toBeOnTheScreen();
  });

  it('updates the open form at once when the settings change (no restart)', async () => {
    const { ui, store } = setup(simple, false);
    await render(ui);
    expect(
      screen.getByText('Enter annual interest rate (%).'),
    ).toBeOnTheScreen();

    await configure(store, 'simple', { period: 'monthly' });

    expect(screen.queryByText('Enter annual interest rate (%).')).toBeNull();
    expect(
      screen.getByText('Enter monthly interest rate (%).'),
    ).toBeOnTheScreen();
  });

  it('Simple and Compound use only their own configuration', async () => {
    const simpleView = setup(simple, false);
    const view = await render(simpleView.ui);
    await configure(simpleView.store, 'compound', { period: 'weekly' });
    expect(
      screen.getByText('Enter annual interest rate (%).'),
    ).toBeOnTheScreen();
    await view.unmount();

    const compoundView = setup(compound, false);
    await render(compoundView.ui);
    await configure(compoundView.store, 'compound', { period: 'weekly' });
    await configure(compoundView.store, 'simple', { period: 'daily' });
    expect(
      screen.getByText('Enter weekly interest rate (%).'),
    ).toBeOnTheScreen();
  });

  it('shows the hint in Nepali', async () => {
    const { ui, store } = setup(simple);
    await render(ui);
    await configure(store, 'simple', {
      rateInputMode: 'rupees',
      period: 'monthly',
    });
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(
      screen.getByText(
        np['interestRate.field.hint.rupees']
          .replace('{amount}', '100')
          .replace('{unit}', np['interestRate.unit.monthly']),
      ),
    ).toBeOnTheScreen();
    expect(field(np['simpleInterest.rate.label'])).toBeOnTheScreen();
    expect(np['simpleInterest.rate.label']).toBe('ब्याज दर');
  });

  it('keeps the entered rate when the settings change, and drops a shown result when its reading changes', async () => {
    const { ui, user, store } = setup(simple);
    await render(ui);
    await type(user, L['simpleInterest.principal.label'], '100000');
    await type(user, L['simpleInterest.rate.label'], '2');
    await type(user, L['simpleInterest.startDate.label'], '20250101');
    await type(user, L['simpleInterest.endDate.label'], '20250401');
    await user.press(calculateButton());
    expect(
      screen.getByText(L['simpleInterest.result.title']),
    ).toBeOnTheScreen();

    await configure(store, 'simple', { rateInputMode: 'rupees' });

    expect(rateField().props.value).toBe('2');
    expect(screen.queryByText(L['simpleInterest.result.title'])).toBeNull();
  });

  it('normalizes the entered rate to a monthly percentage before the engine', async () => {
    const { ui, user, store } = setup(simple);
    await render(ui);
    await configure(store, 'simple', { period: 'yearly' });
    await type(user, L['simpleInterest.principal.label'], '1000');
    await type(user, L['simpleInterest.rate.label'], '12');
    await type(user, L['simpleInterest.startDate.label'], '20250101');
    await type(user, L['simpleInterest.endDate.label'], '20250401');

    await user.press(calculateButton());

    // 12% a year is 1% a month.
    expect(calculateSimpleInterest).toHaveBeenLastCalledWith({
      principal: '1000',
      rate: '1',
      rateMode: 'percentPerMonth',
      startDate: '2025/01/01',
      endDate: '2025/04/01',
    });

    // Rupees has its own period (default monthly): Rs. 12 per Rs. 100 a month.
    await configure(store, 'simple', { rateInputMode: 'rupees' });
    await user.press(calculateButton());
    expect(calculateSimpleInterest).toHaveBeenLastCalledWith(
      expect.objectContaining({ rate: '12', rateMode: 'percentPerMonth' }),
    );
  });

  it('reads Simple and Compound rates through their own configurations', async () => {
    const simpleView = setup(simple);
    await configureAndFill(simpleView, 'yearly', '24');
    await simpleView.user.press(calculateButton());
    // 24% a year = 2% a month: 12 months of interest = 24,000.
    expect(screen.getByText('Rs. 24,000')).toBeOnTheScreen();
  });

  it('keeps Compound capitalization yearly whatever period the rate is entered in', async () => {
    const view = setup(compound);
    await configureAndFill(view, 'weekly', '7', 'compound');
    await view.user.press(calculateButton());
    // Weekly 7% = 30% a month = 360% a year; one capitalization: 100000 x 4.6.
    expect(screen.getByText('Rs. 4,60,000')).toBeOnTheScreen();
  });

  async function configureAndFill(
    view: ReturnType<typeof setup>,
    period: 'yearly' | 'weekly',
    rate: string,
    calculator: InterestCalculatorKind = 'simple',
  ) {
    await render(view.ui);
    await configure(view.store, calculator, { period });
    await type(view.user, L['simpleInterest.principal.label'], '100000');
    await type(view.user, L['simpleInterest.rate.label'], rate);
    await type(view.user, L['simpleInterest.startDate.label'], '20250101');
    await type(view.user, L['simpleInterest.endDate.label'], '20260101');
  }
});
