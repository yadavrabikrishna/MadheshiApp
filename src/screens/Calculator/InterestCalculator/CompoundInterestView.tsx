import { InterestCalculatorForm } from './InterestCalculatorForm';
import { INTEREST_CALCULATOR_CONFIGS } from './interestCalculatorConfig';

/**
 * Compound Interest: the same shared Interest UI. It has no engine yet (a
 * separate issue), so Calculate is unavailable and nothing is calculated.
 */
export function CompoundInterestView() {
  return (
    <InterestCalculatorForm config={INTEREST_CALCULATOR_CONFIGS.compound} />
  );
}
