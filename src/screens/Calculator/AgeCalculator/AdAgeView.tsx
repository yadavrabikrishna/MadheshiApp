import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Dropdown, FieldError } from '../../../components';
import { calculateAge, type AgeErrorCode } from '../../../features/age';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';

/**
 * Age calculator for AD (Gregorian) dates. Each date is three dropdowns
 * (year, month, day); the chosen parts are joined into `YYYY/MM/DD` and handed
 * to the shared `calculateAge`, which owns all validation and arithmetic.
 * State is local to this view: nothing is stored or sent anywhere.
 */

/** Where each Year list opens until a year is chosen (not preselected). */
const DEFAULT_SCROLL_YEAR = { start: '2025', end: '2026' } as const;

const FIRST_YEAR = 1900;
const LAST_YEAR = 2100;
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) =>
  String(FIRST_YEAR + i),
);
const pad = (n: number) => String(n).padStart(2, '0');
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => pad(i + 1));
// The AD form offers day 01-30 in every month; the shared calculation does
// no calendar lookup (no real month lengths or leap years).
const DAY_NUMBERS = Array.from({ length: 30 }, (_, i) => pad(i + 1));

const MONTH_KEYS: readonly TranslationKey[] = [
  'age.ad.month.1',
  'age.ad.month.2',
  'age.ad.month.3',
  'age.ad.month.4',
  'age.ad.month.5',
  'age.ad.month.6',
  'age.ad.month.7',
  'age.ad.month.8',
  'age.ad.month.9',
  'age.ad.month.10',
  'age.ad.month.11',
  'age.ad.month.12',
];

/** One date's chosen parts; '' means not chosen yet. */
interface DateParts {
  year: string;
  month: string;
  day: string;
}
type DateName = 'start' | 'end';

const EMPTY_DATE: DateParts = { year: '', month: '', day: '' };

/** `YYYY/MM/DD`, or '' while any part is missing (calculateAge rejects it). */
function joinDate({ year, month, day }: DateParts): string {
  return year && month && day ? `${year}/${month}/${day}` : '';
}

/** Which date each error belongs beside. */
const ERROR_DATE: Record<AgeErrorCode, DateName> = {
  startDateInvalid: 'start',
  endDateInvalid: 'end',
  endBeforeStart: 'end',
};

interface Result {
  years: number;
  months: number;
  days: number;
}

export function AdAgeView() {
  const { t, formatDigits } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [dates, setDates] = useState<Record<DateName, DateParts>>({
    start: EMPTY_DATE,
    end: EMPTY_DATE,
  });
  const [errors, setErrors] = useState<readonly AgeErrorCode[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  const change = (name: DateName, part: keyof DateParts, value: string) => {
    // Any edit makes a shown result or error stale.
    setResult(null);
    setErrors([]);
    setDates(current => ({
      ...current,
      [name]: { ...current[name], [part]: value },
    }));
  };

  const calculate = () => {
    const outcome = calculateAge({
      startDate: joinDate(dates.start),
      endDate: joinDate(dates.end),
    });
    if (outcome.ok) {
      const { years, months, days } = outcome.value;
      setErrors([]);
      setResult({ years, months, days });
    } else {
      setResult(null);
      setErrors(outcome.errors);
    }
  };

  // Option labels carry plain ASCII digits; the shared Dropdown shows them in
  // the active language's digits. Values and the YYYY/MM/DD string stay ASCII.
  const yearOptions = YEARS.map(value => ({ value, label: value }));
  const monthOptions = MONTH_NUMBERS.map((value, index) => ({
    value,
    label: `${value} – ${t(MONTH_KEYS[index])}`,
  }));
  const dayOptions = DAY_NUMBERS.map(value => ({ value, label: value }));

  const renderDate = (name: DateName, label: string) => {
    const parts = dates[name];
    const own = errors.filter(code => ERROR_DATE[code] === name);
    const common = {
      groupLabel: label,
      compact: true,
      closeLabel: t('age.dropdown.close'),
      placeholder: t('age.field.placeholder'),
    };
    return (
      <View style={styles.group} testID={`age-${name}-date`}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {label}
        </Text>
        <View style={styles.row}>
          <View style={styles.year}>
            <Dropdown
              {...common}
              label={t('age.field.year')}
              options={yearOptions}
              defaultScrollValue={DEFAULT_SCROLL_YEAR[name]}
              value={parts.year}
              onChange={value => change(name, 'year', value)}
            />
          </View>
          <View style={styles.month}>
            <Dropdown
              {...common}
              label={t('age.field.month')}
              options={monthOptions}
              value={parts.month}
              onChange={value => change(name, 'month', value)}
            />
          </View>
          <View style={styles.day}>
            <Dropdown
              {...common}
              label={t('age.field.day')}
              options={dayOptions}
              value={parts.day}
              onChange={value => change(name, 'day', value)}
            />
          </View>
        </View>
        {own.map(code => (
          <FieldError
            key={code}
            message={t(`age.error.${code}`)}
            prefix={t('simpleInterest.error.prefix')}
          />
        ))}
      </View>
    );
  };

  // One notice, always visible; with a result it sits inside the result card.
  const notice = (
    <View style={styles.notice} testID="age-approximation-notice">
      <Text style={styles.noticeTitle}>{t('age.notice.title')}</Text>
      <Text style={styles.noticeBody}>{t('age.ad.notice.body')}</Text>
    </View>
  );

  return (
    <ScrollView
      testID="age-ad-view"
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {renderDate('start', t('age.bs.startDate'))}
      {renderDate('end', t('age.bs.endDate'))}

      <Button
        variant="primary"
        label={t('age.calculate')}
        onPress={calculate}
      />

      {result ? (
        <View
          style={styles.card}
          testID="age-result"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.cardTitle}>{t('calculator.title.age.ad')}</Text>
          <View style={styles.units}>
            {(
              [
                ['age.result.years', result.years],
                ['age.result.months', result.months],
                ['age.result.days', result.days],
              ] as const
            ).map(([key, value]) => (
              <View
                key={key}
                style={styles.unit}
                accessible
                accessibilityLabel={`${t(key)}: ${formatDigits(String(value))}`}
              >
                <Text style={styles.unitValue}>
                  {formatDigits(String(value))}
                </Text>
                <Text style={styles.unitLabel}>{t(key)}</Text>
              </View>
            ))}
          </View>
          {notice}
        </View>
      ) : (
        <View style={styles.standaloneNotice}>{notice}</View>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 32 },
    group: { marginBottom: 16 },
    groupTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    row: { flexDirection: 'row', gap: 8 },
    // Three exactly equal columns (same flex, zero basis, no intrinsic width).
    year: { flex: 1, flexBasis: 0, minWidth: 0 },
    month: { flex: 1, flexBasis: 0, minWidth: 0 },
    day: { flex: 1, flexBasis: 0, minWidth: 0 },
    card: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
    },
    units: { flexDirection: 'row', gap: 8 },
    unit: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    unitValue: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
    unitLabel: { fontSize: 13, color: theme.colors.textSecondary },
    standaloneNotice: { marginTop: 16 },
    notice: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    noticeTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    noticeBody: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
  });
