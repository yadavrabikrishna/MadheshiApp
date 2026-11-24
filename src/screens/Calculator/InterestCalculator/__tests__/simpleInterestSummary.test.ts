import {
  calculateCompoundInterest,
  calculateSimpleInterest,
} from '../../../../features/interest';
import { translate, type TranslationKey } from '../../../../i18n';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  type InterestRateConfig,
} from '../../../../types/interestRateConfig';
import type { Language } from '../../../../types/preferences';
import { getSimpleInterestDisplay } from '../simpleInterestDisplay';
import { buildSimpleInterestSummary } from '../simpleInterestSummary';

const MONTHLY: InterestRateConfig = {
  ...DEFAULT_INTEREST_RATE_CONFIG,
  percentagePeriod: 'monthly',
};
const RUPEES_PER_100: InterestRateConfig = {
  ...DEFAULT_INTEREST_RATE_CONFIG,
  rateInputMode: 'rupees',
};

function summary(
  input: {
    principal: string;
    rate: string;
    config?: InterestRateConfig;
    startDate: string;
    endDate: string;
  },
  language: Language = 'en',
) {
  const config = input.config ?? MONTHLY;
  // The engine is given the monthly rate; these tests use equivalent monthly values.
  const outcome = calculateSimpleInterest({
    ...input,
    rateMode: 'percentPerMonth',
  });
  if (!outcome.ok) {
    throw new Error(`expected a valid result: ${outcome.errors.join(', ')}`);
  }
  const t = (key: TranslationKey) => translate(language, key);
  return {
    text: buildSimpleInterestSummary(outcome.value, input.rate, config, t),
    display: getSimpleInterestDisplay(outcome.value, input.rate, config, t),
  };
}

const base = {
  principal: '100000',
  rate: '2',
  startDate: '2025/01/01',
  endDate: '2025/04/01',
};

describe('buildSimpleInterestSummary', () => {
  it('lists the inputs, then the results, in English', () => {
    expect(summary(base).text).toBe(
      [
        'Simple Interest result',
        '',
        'Principal: Rs. 1,00,000',
        'Interest Rate: 2% per month',
        'Start Date: 2025/01/01',
        'End Date: 2025/04/01',
        'Duration: 0 Years, 3 Months, 0 Days',
        '',
        'Simple Interest: Rs. 6,000',
        'Total Amount: Rs. 1,06,000',
      ].join('\n'),
    );
  });

  it('is fully translated in Nepali', () => {
    expect(summary(base, 'np').text).toBe(
      [
        'घरेलु ब्याजको नतिजा',
        '',
        'मूलधन: रु. 1,00,000',
        'ब्याज दर: 2% प्रति महिना',
        'सुरु मिति: 2025/01/01',
        'अन्तिम मिति: 2025/04/01',
        'अवधि: 0 वर्ष, 3 महिना, 0 दिन',
        '',
        'घरेलु ब्याज: रु. 6,000',
        'जम्मा रकम: रु. 1,06,000',
      ].join('\n'),
    );
  });

  it('shows the rate as entered, with its mode', () => {
    expect(
      summary({ ...base, rate: '2', config: RUPEES_PER_100 }).text,
    ).toContain('Interest Rate: Rs. 2 per Rs. 100 per month');
    expect(
      summary({ ...base, rate: '2', config: RUPEES_PER_100 }, 'np').text,
    ).toContain('ब्याज दर: रु. 2 प्रति रु. 100 प्रति महिना');
    expect(summary({ ...base, rate: '0.75' }).text).toContain(
      'Interest Rate: 0.75% per month',
    );
  });

  it('uses the displayed money format: Indian grouping and half-up rounding', () => {
    const { text } = summary({
      principal: '1234567',
      rate: '2',
      startDate: '2025/01/01',
      endDate: '2025/02/01',
    });
    expect(text).toContain('Principal: Rs. 12,34,567');
    expect(text).toContain('Simple Interest: Rs. 24,691.34');
    expect(text).toContain('Total Amount: Rs. 12,59,258.34');

    // 1,000 at 0.5% for 10 days = 1.6666... shown as 1.67
    const rounded = summary({
      principal: '1000',
      rate: '0.5',
      startDate: '2025/01/01',
      endDate: '2025/01/11',
    }).text;
    expect(rounded).toContain('Simple Interest: Rs. 1.67');
    expect(rounded).toContain('Total Amount: Rs. 1,001.67');
  });

  it('handles a zero rate and identical dates', () => {
    const { text } = summary({
      principal: '5000',
      rate: '0',
      startDate: '2025/01/15',
      endDate: '2025/01/15',
    });
    expect(text).toContain('Interest Rate: 0% per month');
    expect(text).toContain('Duration: 0 Years, 0 Months, 0 Days');
    expect(text).toContain('Simple Interest: Rs. 0');
    expect(text).toContain('Total Amount: Rs. 5,000');
  });

  it('copies exactly the values the result card shows', () => {
    const { text, display } = summary(base);

    for (const value of Object.values(display)) {
      expect(text).toContain(value);
    }
  });

  it('is plain text: no markup and no trailing line break', () => {
    const { text } = summary(base);

    expect(text).not.toMatch(/[*_#<>]/);
    expect(text.endsWith('\n')).toBe(false);
  });
});

describe('buildSimpleInterestSummary: Compound Interest', () => {
  const compoundSummary = (language: Language) => {
    const outcome = calculateCompoundInterest({
      principal: '100000',
      rate: '2',
      rateMode: 'percentPerMonth',
      startDate: '2025/01/01',
      endDate: '2026/04/01',
    });
    if (!outcome.ok) {
      throw new Error('expected ok');
    }
    const t = (key: TranslationKey) => translate(language, key);
    return buildSimpleInterestSummary(
      outcome.value,
      '2',
      MONTHLY,
      t,
      'compound',
    );
  };

  it('uses Compound wording and keeps Duration, in English', () => {
    expect(compoundSummary('en')).toBe(
      [
        'Compound Interest result',
        '',
        'Principal: Rs. 1,00,000',
        'Interest Rate: 2% per month',
        'Start Date: 2025/01/01',
        'End Date: 2026/04/01',
        'Duration: 1 Years, 3 Months, 0 Days',
        '',
        'Total Interest: Rs. 31,440',
        'Total Amount: Rs. 1,31,440',
      ].join('\n'),
    );
  });

  it.each([
    ['en', 'Duration: 1 Years, 3 Months, 0 Days'],
    ['np', 'अवधि: 1 वर्ष, 3 महिना, 0 दिन'],
  ] as const)(
    'has Duration but no periods or remaining-period line in %s',
    (language, durationLine) => {
      const text = compoundSummary(language);

      expect(text).toContain(durationLine);
      expect(text).not.toContain('Completed 12-month periods');
      expect(text).not.toContain('Remaining period');
      expect(text).not.toContain('पूरा भएका १२ महिनाका अवधि');
      expect(text).not.toContain('बाँकी अवधि');
    },
  );
});
