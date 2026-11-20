import { Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import type {
  NeutralDate,
  RateEntryMode,
  SimpleInterestResult,
} from '../../../features/interest';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { fillTemplate, formatMoney } from '../../../utils';

interface SimpleInterestResultCardProps {
  result: SimpleInterestResult;
  /** The rate exactly as entered, and how it was entered. */
  enteredRate: string;
  rateMode: RateEntryMode;
}

const pad = (value: number, width: number) =>
  String(value).padStart(width, '0');

/** Neutral display only: no calendar name, no conversion. */
export function formatNeutralDate(date: NeutralDate): string {
  return `${pad(date.year, 4)}/${pad(date.month, 2)}/${pad(date.day, 2)}`;
}

export function SimpleInterestResultCard({
  result,
  enteredRate,
  rateMode,
}: SimpleInterestResultCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const enteredRateText = fillTemplate(
    t(
      rateMode === 'percentPerMonth'
        ? 'simpleInterest.rateText.percent'
        : 'simpleInterest.rateText.rupees',
    ),
    { rate: enteredRate },
  );
  const monthlyRateText = fillTemplate(t('simpleInterest.rateText.monthly'), {
    percent: result.monthlyRatePercent.toFixed(),
    fraction: result.monthlyRate.toFixed(),
  });
  const { years, months, days } = result.duration;
  const durationText = [
    `${years} ${t('simpleInterest.unit.years')}`,
    `${months} ${t('simpleInterest.unit.months')}`,
    `${days} ${t('simpleInterest.unit.days')}`,
  ].join(', ');
  const rs = t('simpleInterest.currency');

  const rows: { label: string; value: string; strong?: boolean }[] = [
    {
      label: t('simpleInterest.result.principal'),
      value: `${rs} ${formatMoney(result.principal)}`,
    },
    { label: t('simpleInterest.result.enteredRate'), value: enteredRateText },
    { label: t('simpleInterest.result.monthlyRate'), value: monthlyRateText },
    {
      label: t('simpleInterest.result.startDate'),
      value: formatNeutralDate(result.startDate),
    },
    {
      label: t('simpleInterest.result.endDate'),
      value: formatNeutralDate(result.endDate),
    },
    { label: t('simpleInterest.result.duration'), value: durationText },
    {
      label: t('simpleInterest.result.interest'),
      value: `${rs} ${formatMoney(result.interest)}`,
      strong: true,
    },
    {
      label: t('simpleInterest.result.total'),
      value: `${rs} ${formatMoney(result.total)}`,
      strong: true,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        {t('simpleInterest.result.title')}
      </Text>
      {rows.map(row => (
        <View
          key={row.label}
          style={[styles.row, row.strong && styles.rowStrong]}
          accessible
          accessibilityLabel={`${row.label}: ${row.value}`}
        >
          <Text style={styles.label}>{row.label}</Text>
          <Text style={[styles.value, row.strong && styles.valueStrong]}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowStrong: { paddingVertical: 12 },
  label: { fontSize: 13, color: theme.colors.textSecondary },
  value: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 2,
  },
  valueStrong: { fontSize: 22, fontWeight: '700' as const },
});
