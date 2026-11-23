import { InterestCalculatorForm } from './InterestCalculatorForm';
import { INTEREST_CALCULATOR_CONFIGS } from './interestCalculatorConfig';

/**
 * Compound Interest: the same shared Interest UI, calculated by the Compound
 * Interest engine.
 */
export function CompoundInterestView() {
  return (
    <InterestCalculatorForm config={INTEREST_CALCULATOR_CONFIGS.compound} />
  );
}
