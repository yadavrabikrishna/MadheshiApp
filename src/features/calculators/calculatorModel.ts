import {
  CALCULATOR_IDS,
  DEFAULT_ENABLED_CALCULATORS,
  type CalculatorId,
  type EnabledCalculators,
} from '../../types/calculators';

/**
 * Pure calculator rules (no React, Redux or storage), so every navigation and
 * fallback combination can be unit tested.
 */

/** A top-level destination of the Calculator screen. `basic` is standalone. */
export type CalculatorGroup = 'interest' | 'age' | 'land' | 'basic';

/** Top-level destinations, in display order. Basic Calculator is always last. */
export const GROUP_ORDER: readonly CalculatorGroup[] = [
  'interest',
  'age',
  'land',
  'basic',
];

/** The calculators of each group, in the order shown in its selector. */
export const GROUP_CALCULATORS: Record<
  CalculatorGroup,
  readonly CalculatorId[]
> = {
  interest: ['simpleInterest', 'compoundInterest'],
  age: ['ageBs', 'ageAd'],
  land: ['terai', 'hillMountain'],
  basic: ['basic'],
};

/**
 * Which calculator a group opens first when nothing was chosen in it yet
 * (the selector defaults of the earlier Calculator issues).
 */
const GROUP_ENTRY_ORDER: Record<CalculatorGroup, readonly CalculatorId[]> = {
  interest: ['compoundInterest', 'simpleInterest'],
  age: ['ageBs', 'ageAd'],
  land: ['terai', 'hillMountain'],
  basic: ['basic'],
};

export function groupOf(id: CalculatorId): CalculatorGroup {
  return GROUP_ORDER.find(group => GROUP_CALCULATORS[group].includes(id))!;
}

export function countEnabled(enabled: EnabledCalculators): number {
  return CALCULATOR_IDS.filter(id => enabled[id]).length;
}

/** The first enabled calculator in the app-wide fallback order, if any. */
export function firstEnabledCalculator(
  enabled: EnabledCalculators,
): CalculatorId | null {
  return CALCULATOR_IDS.find(id => enabled[id]) ?? null;
}

/**
 * Never allow "everything off": if no calculator is enabled, Basic Calculator is
 * turned on. `basicAutoEnabled` reports that this happened.
 */
export function normalizeEnabled(enabled: EnabledCalculators): {
  enabled: EnabledCalculators;
  basicAutoEnabled: boolean;
} {
  if (countEnabled(enabled) > 0) {
    return { enabled, basicAutoEnabled: false };
  }
  return { enabled: { ...enabled, basic: true }, basicAutoEnabled: true };
}

/**
 * The calculator to show: the active one while it is enabled, else the last
 * saved selection if that is enabled, else the first enabled in fallback order.
 */
export function resolveActiveCalculator(input: {
  enabled: EnabledCalculators;
  active: CalculatorId | null;
  lastSelected: CalculatorId | null;
}): CalculatorId {
  const { enabled, active, lastSelected } = input;
  if (active !== null && enabled[active]) {
    return active;
  }
  if (lastSelected !== null && enabled[lastSelected]) {
    return lastSelected;
  }
  return firstEnabledCalculator(enabled) ?? 'basic';
}

/** Combine whatever was stored with the first-run defaults. */
export function restoreCalculators(stored: {
  enabled: Partial<Record<CalculatorId, boolean>> | null;
  active: CalculatorId | null;
}): { enabled: EnabledCalculators; active: CalculatorId } {
  const merged = { ...DEFAULT_ENABLED_CALCULATORS, ...stored.enabled };
  const { enabled } = normalizeEnabled(merged);
  return {
    enabled,
    active: resolveActiveCalculator({
      enabled,
      active: stored.active,
      lastSelected: null,
    }),
  };
}

/**
 * Apply a saved Settings draft. An all-off draft turns Basic Calculator on and
 * activates it; otherwise the active calculator is kept while enabled, then the
 * previous last-selected one, then the fallback order.
 */
export function applyCalculatorSettings(
  current: {
    enabled: EnabledCalculators;
    active: CalculatorId;
    lastSelected: CalculatorId | null;
  },
  draft: EnabledCalculators,
): {
  enabled: EnabledCalculators;
  active: CalculatorId;
  basicAutoEnabled: boolean;
} {
  const { enabled, basicAutoEnabled } = normalizeEnabled(draft);
  if (basicAutoEnabled) {
    return { enabled, active: 'basic', basicAutoEnabled };
  }
  return {
    enabled,
    active: resolveActiveCalculator({
      enabled,
      active: current.active,
      lastSelected: current.lastSelected,
    }),
    basicAutoEnabled,
  };
}

export interface CalculatorDestination {
  group: CalculatorGroup;
  /** The enabled calculators of the group, in selector order. */
  calculators: CalculatorId[];
}

export type CalculatorLayout =
  /** Exactly one calculator is enabled: no navigation, render it directly. */
  | { mode: 'single'; calculator: CalculatorId }
  /** Top-level navigation over the groups that have an enabled calculator. */
  | { mode: 'tabs'; destinations: CalculatorDestination[] };

export function getCalculatorLayout(
  enabled: EnabledCalculators,
): CalculatorLayout {
  const destinations = GROUP_ORDER.map(group => ({
    group,
    calculators: GROUP_CALCULATORS[group].filter(id => enabled[id]),
  })).filter(destination => destination.calculators.length > 0);

  if (countEnabled(enabled) === 1) {
    return { mode: 'single', calculator: destinations[0].calculators[0] };
  }
  return { mode: 'tabs', destinations };
}

/**
 * The calculator to open when a top-level destination is chosen: the one last
 * used in that group if it is still enabled, else the group's default.
 */
export function pickCalculatorForGroup(
  group: CalculatorGroup,
  enabled: EnabledCalculators,
  remembered: CalculatorId | undefined,
): CalculatorId | null {
  if (remembered !== undefined && enabled[remembered]) {
    return remembered;
  }
  return GROUP_ENTRY_ORDER[group].find(id => enabled[id]) ?? null;
}
