/**
 * The shared Interest UI (Issue #45): the same form for Simple and Compound
 * Interest, with the calculation supplied through `config.engine`.
 */
import { render, screen, userEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { calculateSimpleInterest } from '../../../../features/interest';
import { setLanguage } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
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

function setup(config: InterestCalculatorConfig) {
  const store = createAppStore({
    preferencesRepository: {
      saveLanguage: jest.fn().mockResolvedValue(undefined),
      saveTheme: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
  return {
    store,
    user: userEvent.setup(),
    ui: (
      <Provider store={store}>
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
      .getAllByRole('radio')
      .map(node => node.props.accessibilityLabel),
    buttons: screen
      .getAllByRole('button')
      .map(node => node.props.accessibilityLabel),
    labels: [
      L['simpleInterest.principal.label'],
      L['simpleInterest.rateMode.label'],
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
    expect(simpleStructure.radios).toEqual([
      L['simpleInterest.rateMode.percent'],
      L['simpleInterest.rateMode.rupees'],
    ]);
    expect(simpleStructure.buttons).toContain(L['simpleInterest.calculate']);
  });

  it('formats the same way in both modes (grouped principal, masked dates, rate mode)', async () => {
    for (const config of [simple, compound]) {
      const { ui, user } = setup(config);
      const view = await render(ui);

      await type(user, L['simpleInterest.principal.label'], '1234567');
      await type(user, L['simpleInterest.startDate.label'], '20250101');
      await user.press(
        screen.getByRole('radio', {
          name: L['simpleInterest.rateMode.rupees'],
        }),
      );

      expect(field(L['simpleInterest.principal.label']).props.value).toBe(
        '12,34,567',
      );
      expect(field(L['simpleInterest.startDate.label']).props.value).toBe(
        '2025/01/01',
      );
      expect(
        screen.getByRole('radio', {
          name: L['simpleInterest.rateMode.rupees'],
          selected: true,
        }),
      ).toBeOnTheScreen();
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
    periods: en['compoundInterest.result.periods'],
    remaining: en['compoundInterest.result.remaining'],
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
    expect(
      screen.queryByText(np['compoundInterest.result.periods']),
    ).toBeNull();
    expect(
      screen.queryByText(np['compoundInterest.result.remaining']),
    ).toBeNull();
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
