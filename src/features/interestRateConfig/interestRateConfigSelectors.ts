import type { InterestCalculatorKind } from '../../types/interestRateConfig';
import type { InterestRateConfigState } from './interestRateConfigSlice';

// Selectors take the slice's parent shape to avoid a circular import with the store.
type WithInterestRateConfig = { interestRateConfig: InterestRateConfigState };

export const selectInterestRateConfig =
  (calculator: InterestCalculatorKind) => (state: WithInterestRateConfig) =>
    state.interestRateConfig.configs[calculator];

export const selectInterestRateConfigLoadError = (
  state: WithInterestRateConfig,
) => state.interestRateConfig.loadError;

/** True when the latest change to this calculator's configuration is not saved. */
export const selectInterestRateConfigSaveError =
  (calculator: InterestCalculatorKind) => (state: WithInterestRateConfig) =>
    state.interestRateConfig.saveErrors[calculator] !== null;
