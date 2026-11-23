import {
  calculateCompoundInterest,
  calculateSimpleInterest,
} from '../../../../features/interest';
import { INTEREST_CALCULATOR_CONFIGS } from '../interestCalculatorConfig';

describe('INTEREST_CALCULATOR_CONFIGS', () => {
  it('is keyed by the interest type it describes', () => {
    for (const [key, config] of Object.entries(INTEREST_CALCULATOR_CONFIGS)) {
      expect(config.type).toBe(key);
    }
    expect(Object.keys(INTEREST_CALCULATOR_CONFIGS).sort()).toEqual([
      'compound',
      'simple',
    ]);
  });

  it('gives Simple Interest the existing Simple Interest engine', () => {
    expect(INTEREST_CALCULATOR_CONFIGS.simple.engine).toBe(
      calculateSimpleInterest,
    );
  });

  it('gives Compound Interest the Compound engine, and never the Simple one', () => {
    expect(INTEREST_CALCULATOR_CONFIGS.compound.engine).toBe(
      calculateCompoundInterest,
    );
    expect(INTEREST_CALCULATOR_CONFIGS.compound.engine).not.toBe(
      calculateSimpleInterest,
    );
  });
});
