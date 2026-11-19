import {
  CALCULATOR_IDS,
  DEFAULT_ENABLED_CALCULATORS,
  type CalculatorId,
  type EnabledCalculators,
} from '../../../types/calculators';
import {
  applyCalculatorSettings,
  countEnabled,
  firstEnabledCalculator,
  getCalculatorLayout,
  groupOf,
  normalizeEnabled,
  pickCalculatorForGroup,
  resolveActiveCalculator,
  restoreCalculators,
} from '..';

/** Only the given calculators are enabled. */
function only(...ids: CalculatorId[]): EnabledCalculators {
  return Object.fromEntries(
    CALCULATOR_IDS.map(id => [id, ids.includes(id)]),
  ) as EnabledCalculators;
}

const ALL = only(...CALCULATOR_IDS);
const NONE = only();

describe('defaults and ordering', () => {
  it('enables the six specialist calculators and disables Basic Calculator', () => {
    expect(DEFAULT_ENABLED_CALCULATORS).toEqual({
      simpleInterest: true,
      compoundInterest: true,
      ageAd: true,
      ageBs: true,
      terai: true,
      hillMountain: true,
      basic: false,
    });
  });

  it('uses the fallback order from the issue', () => {
    expect(CALCULATOR_IDS).toEqual([
      'simpleInterest',
      'compoundInterest',
      'ageAd',
      'ageBs',
      'terai',
      'hillMountain',
      'basic',
    ]);
  });

  it('counts enabled calculators and finds the first one in fallback order', () => {
    expect(countEnabled(ALL)).toBe(7);
    expect(countEnabled(NONE)).toBe(0);
    expect(firstEnabledCalculator(only('hillMountain', 'ageBs'))).toBe('ageBs');
    expect(firstEnabledCalculator(only('basic', 'terai'))).toBe('terai');
    expect(firstEnabledCalculator(NONE)).toBeNull();
  });

  it('puts Basic Calculator in its own group, never in Interest, Age or Land', () => {
    expect(groupOf('simpleInterest')).toBe('interest');
    expect(groupOf('compoundInterest')).toBe('interest');
    expect(groupOf('ageAd')).toBe('age');
    expect(groupOf('ageBs')).toBe('age');
    expect(groupOf('terai')).toBe('land');
    expect(groupOf('hillMountain')).toBe('land');
    expect(groupOf('basic')).toBe('basic');
  });
});

describe('normalizeEnabled', () => {
  it('turns Basic Calculator on when everything is off', () => {
    const result = normalizeEnabled(NONE);
    expect(result.basicAutoEnabled).toBe(true);
    expect(result.enabled).toEqual(only('basic'));
  });

  it('leaves any selection with at least one calculator unchanged', () => {
    for (const selection of [only('basic'), only('terai'), ALL]) {
      const result = normalizeEnabled(selection);
      expect(result.basicAutoEnabled).toBe(false);
      expect(result.enabled).toBe(selection);
    }
  });
});

describe('resolveActiveCalculator', () => {
  it('keeps the active calculator while it is enabled', () => {
    expect(
      resolveActiveCalculator({
        enabled: ALL,
        active: 'hillMountain',
        lastSelected: 'ageBs',
      }),
    ).toBe('hillMountain');
  });

  it('prefers the last selected calculator when the active one is disabled', () => {
    expect(
      resolveActiveCalculator({
        enabled: only('ageBs', 'terai'),
        active: 'simpleInterest',
        lastSelected: 'terai',
      }),
    ).toBe('terai');
  });

  it('falls back to the first enabled calculator in the fixed order', () => {
    expect(
      resolveActiveCalculator({
        enabled: only('hillMountain', 'ageBs', 'basic'),
        active: 'simpleInterest',
        lastSelected: 'compoundInterest',
      }),
    ).toBe('ageBs');
    expect(
      resolveActiveCalculator({
        enabled: only('basic'),
        active: null,
        lastSelected: null,
      }),
    ).toBe('basic');
  });
});

describe('restoreCalculators (first run and startup)', () => {
  it('uses the defaults and opens Simple Interest when nothing was saved', () => {
    expect(restoreCalculators({ enabled: null, active: null })).toEqual({
      enabled: DEFAULT_ENABLED_CALCULATORS,
      active: 'simpleInterest',
    });
  });

  it('restores the saved selection and the last selected calculator', () => {
    expect(
      restoreCalculators({ enabled: only('terai', 'basic'), active: 'basic' }),
    ).toEqual({ enabled: only('terai', 'basic'), active: 'basic' });
  });

  it('fills calculators missing from storage with the defaults', () => {
    const restored = restoreCalculators({
      enabled: { basic: true },
      active: null,
    });
    expect(restored.enabled).toEqual({
      ...DEFAULT_ENABLED_CALCULATORS,
      basic: true,
    });
  });

  it('ignores a saved active calculator that is no longer enabled', () => {
    expect(
      restoreCalculators({
        enabled: only('ageBs', 'hillMountain'),
        active: 'terai',
      }).active,
    ).toBe('ageBs');
  });

  it('never restores a state with everything disabled', () => {
    expect(restoreCalculators({ enabled: NONE, active: null })).toEqual({
      enabled: only('basic'),
      active: 'basic',
    });
  });
});

describe('applyCalculatorSettings', () => {
  const current = (
    active: CalculatorId,
    lastSelected: CalculatorId | null = active,
    enabled: EnabledCalculators = ALL,
  ) => ({ enabled, active, lastSelected });

  it('keeps the active calculator while it stays enabled', () => {
    const result = applyCalculatorSettings(
      current('terai'),
      only('terai', 'simpleInterest'),
    );
    expect(result.active).toBe('terai');
    expect(result.enabled).toEqual(only('terai', 'simpleInterest'));
  });

  it('prefers the last selected calculator when the active one is disabled', () => {
    const result = applyCalculatorSettings(
      current('terai', 'ageBs'),
      only('ageBs', 'compoundInterest'),
    );
    expect(result.active).toBe('ageBs');
  });

  it('otherwise uses the fixed order', () => {
    const result = applyCalculatorSettings(
      current('terai'),
      only('hillMountain', 'ageAd', 'basic'),
    );
    expect(result.active).toBe('ageAd');
  });

  it('enables and activates Basic Calculator when the draft is all off', () => {
    const result = applyCalculatorSettings(current('terai'), NONE);
    expect(result).toEqual({
      enabled: only('basic'),
      active: 'basic',
      basicAutoEnabled: true,
    });
  });

  it('retains Basic Calculator as active when specialists are added and Basic stays on', () => {
    const result = applyCalculatorSettings(
      current('basic', 'basic', only('basic')),
      only('basic', 'simpleInterest', 'terai'),
    );
    expect(result.active).toBe('basic');
    expect(result.basicAutoEnabled).toBe(false);
  });
});

describe('getCalculatorLayout', () => {
  const tabsOf = (enabled: EnabledCalculators) => {
    const layout = getCalculatorLayout(enabled);
    if (layout.mode !== 'tabs') {
      throw new Error('expected tabs');
    }
    return layout.destinations.map(d => [d.group, d.calculators]);
  };

  it('renders a single enabled calculator directly, with no navigation', () => {
    expect(getCalculatorLayout(only('compoundInterest'))).toEqual({
      mode: 'single',
      calculator: 'compoundInterest',
    });
    expect(getCalculatorLayout(only('basic'))).toEqual({
      mode: 'single',
      calculator: 'basic',
    });
    expect(getCalculatorLayout(only('hillMountain'))).toEqual({
      mode: 'single',
      calculator: 'hillMountain',
    });
  });

  it('Compound Interest + Age (BS): Interest and Age, one calculator each', () => {
    expect(tabsOf(only('compoundInterest', 'ageBs'))).toEqual([
      ['interest', ['compoundInterest']],
      ['age', ['ageBs']],
    ]);
  });

  it('Simple + Compound Interest + Terai: Interest (both) and Land (one)', () => {
    expect(tabsOf(only('simpleInterest', 'compoundInterest', 'terai'))).toEqual(
      [
        ['interest', ['simpleInterest', 'compoundInterest']],
        ['land', ['terai']],
      ],
    );
  });

  it('Basic Calculator + Compound Interest: two separate destinations', () => {
    expect(tabsOf(only('basic', 'compoundInterest'))).toEqual([
      ['interest', ['compoundInterest']],
      ['basic', ['basic']],
    ]);
  });

  it('the six specialists with Basic off keep the three-group navigation', () => {
    expect(tabsOf(DEFAULT_ENABLED_CALCULATORS)).toEqual([
      ['interest', ['simpleInterest', 'compoundInterest']],
      ['age', ['ageBs', 'ageAd']],
      ['land', ['terai', 'hillMountain']],
    ]);
  });

  it('all seven: Basic Calculator is a fourth, standalone destination', () => {
    expect(tabsOf(ALL)).toEqual([
      ['interest', ['simpleInterest', 'compoundInterest']],
      ['age', ['ageBs', 'ageAd']],
      ['land', ['terai', 'hillMountain']],
      ['basic', ['basic']],
    ]);
  });

  it('never lists a disabled calculator or an empty group', () => {
    const destinations = tabsOf(only('ageAd', 'hillMountain'));
    expect(destinations).toEqual([
      ['age', ['ageAd']],
      ['land', ['hillMountain']],
    ]);
  });
});

describe('pickCalculatorForGroup', () => {
  it('opens the calculator last used in the group while it is enabled', () => {
    expect(pickCalculatorForGroup('interest', ALL, 'simpleInterest')).toBe(
      'simpleInterest',
    );
  });

  it('opens the group defaults (Compound, BS, Terai) when nothing was used yet', () => {
    expect(pickCalculatorForGroup('interest', ALL, undefined)).toBe(
      'compoundInterest',
    );
    expect(pickCalculatorForGroup('age', ALL, undefined)).toBe('ageBs');
    expect(pickCalculatorForGroup('land', ALL, undefined)).toBe('terai');
    expect(pickCalculatorForGroup('basic', ALL, undefined)).toBe('basic');
  });

  it('ignores a remembered calculator that has been disabled', () => {
    expect(
      pickCalculatorForGroup(
        'interest',
        only('simpleInterest'),
        'compoundInterest',
      ),
    ).toBe('simpleInterest');
    expect(pickCalculatorForGroup('age', only('ageAd'), 'ageBs')).toBe('ageAd');
  });

  it('returns null for a group with nothing enabled', () => {
    expect(pickCalculatorForGroup('land', only('basic'), undefined)).toBeNull();
  });
});
