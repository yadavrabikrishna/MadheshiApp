import type { CalculatorsState } from './calculatorsSlice';

// Selectors take the slice's parent shape to avoid a circular import with the store.
type WithCalculators = { calculators: CalculatorsState };

export const selectEnabledCalculators = (state: WithCalculators) =>
  state.calculators.enabled;

export const selectActiveCalculator = (state: WithCalculators) =>
  state.calculators.active;

export const selectCalculatorsLoadError = (state: WithCalculators) =>
  state.calculators.loadError;

/** True when the latest calculator change could not be written to SQLite. */
export const selectCalculatorsSaveError = (state: WithCalculators) =>
  state.calculators.saveError !== null;
