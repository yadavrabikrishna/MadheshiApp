import { formatNeutralDate } from '../SimpleInterestResultCard';

describe('formatNeutralDate', () => {
  it('pads to YYYY/MM/DD with no calendar name', () => {
    expect(formatNeutralDate({ year: 2025, month: 1, day: 5 })).toBe(
      '2025/01/05',
    );
    expect(formatNeutralDate({ year: 2082, month: 12, day: 31 })).toBe(
      '2082/12/31',
    );
  });

  it('keeps day 32, which the engine accepts', () => {
    expect(formatNeutralDate({ year: 2025, month: 1, day: 32 })).toBe(
      '2025/01/32',
    );
  });

  it('pads short years', () => {
    expect(formatNeutralDate({ year: 999, month: 2, day: 3 })).toBe(
      '0999/02/03',
    );
  });
});
