import { InterestCalculatorForm } from './InterestCalculatorForm';
import { INTEREST_CALCULATOR_CONFIGS } from './interestCalculatorConfig';

/** Simple Interest: the shared Interest UI with the Simple Interest engine. */
export function SimpleInterestView() {
  return <InterestCalculatorForm config={INTEREST_CALCULATOR_CONFIGS.simple} />;
}
