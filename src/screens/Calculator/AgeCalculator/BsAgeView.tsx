import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Dropdown, FieldError } from '../../../components';
import { calculateAge, type AgeErrorCode } from '../../../features/age';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { toDevanagariDigits } from '../../../utils';

/**
 * Age calculator for BS (Bikram Sambat) dates. Each date is three dropdowns
 * (year, month, day); the chosen parts are joined into `YYYY/MM/DD` and handed
 * to the shared `calculateAge`, which owns all validation and arithmetic.
 * State is local to this view: nothing is stored or sent anywhere.
 */

/** Relative widths of the three dropdowns in a date row. */
export const YEAR_DAY_FLEX = 1.2;
export const MONTH_FLEX = 1;

const FIRST_YEAR = 1900;
const LAST_YEAR = 2100;
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) =>
  String(FIRST_YEAR + i),
);
const pad = (n: number) => String(n).padStart(2, '0');
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => pad(i + 1));
// The fixed-date convention allows day 01-32 in every month.
const DAY_NUMBERS = Array.from({ length: 32 }, (_, i) => pad(i + 1));

const MONTH_KEYS: readonly TranslationKey[] = [
  'age.month.1',
  'age.month.2',
  'age.month.3',
  'age.month.4',
  'age.month.5',
  'age.month.6',
  'age.month.7',
  'age.month.8',
  'age.month.9',
  'age.month.10',
  'age.month.11',
  'age.month.12',
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

export function BsAgeView() {
  const { t, language } = useTranslation();
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

  // Digits are converted for display only: the option values (and the
  // YYYY/MM/DD passed to calculateAge) stay ASCII in every language.
  const show = (text: string) =>
    language === 'np' ? toDevanagariDigits(text) : text;
  const yearOptions = YEARS.map(value => ({ value, label: show(value) }));
  const monthOptions = MONTH_NUMBERS.map((value, index) => ({
    value,
    label: `${show(value)} – ${t(MONTH_KEYS[index])}`,
  }));
  const dayOptions = DAY_NUMBERS.map(value => ({ value, label: show(value) }));

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
      <Text style={styles.noticeBody}>{t('age.notice.body')}</Text>
    </View>
  );

  return (
    <ScrollView
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
          <Text style={styles.cardTitle}>{t('age.result.title')}</Text>
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
                accessibilityLabel={`${t(key)}: ${value}`}
              >
                <Text style={styles.unitValue}>{value}</Text>
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
    // Year and Day get a little more room than Month so four-digit years (also
    // in Devanagari) fit; Month stays wide enough for "Select" on one line.
    year: { flex: YEAR_DAY_FLEX, minWidth: 0 },
    month: { flex: MONTH_FLEX, minWidth: 0 },
    day: { flex: YEAR_DAY_FLEX, minWidth: 0 },
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
