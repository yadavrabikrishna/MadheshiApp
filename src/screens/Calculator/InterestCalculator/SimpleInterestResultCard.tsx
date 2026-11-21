import { Text, View } from 'react-native';

import { ResultActions, type ResultActionsProps } from '../../../components';
import type {
  RateEntryMode,
  SimpleInterestResult,
} from '../../../features/interest';
import {
  useCopyResult,
  useShareResultImage,
} from '../../../features/resultActions';
import { useTranslation } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { getSimpleInterestDisplay } from './simpleInterestDisplay';
import { buildSimpleInterestSummary } from './simpleInterestSummary';

export { formatNeutralDate } from './simpleInterestDisplay';

/**
 * Copy (a text summary) and Share (the card as an image) are handled here.
 * `onSaveImage` is still an integration point that is passed straight to the
 * action row; it is not wired up yet.
 */
interface SimpleInterestResultCardProps
  extends Omit<ResultActionsProps, 'onCopy' | 'onShare' | 'feedback'> {
  result: SimpleInterestResult;
  /** The rate exactly as entered, and how it was entered. */
  enteredRate: string;
  rateMode: RateEntryMode;
}

export function SimpleInterestResultCard({
  result,
  enteredRate,
  rateMode,
  onSaveImage,
}: SimpleInterestResultCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { copy, feedback } = useCopyResult(() =>
    buildSimpleInterestSummary(result, enteredRate, rateMode, t),
  );

  const { captureRef, share, feedback: shareFeedback } = useShareResultImage();

  const display = getSimpleInterestDisplay(result, enteredRate, rateMode, t);
  const dateRangeText = `${display.startDate} – ${display.endDate}`;
  const durationLine = `${t('simpleInterest.result.duration')}: ${
    display.duration
  }`;

  /** Rows before the dates/duration block, and the emphasised rows after it. */
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: t('simpleInterest.result.principal'), value: display.principal },
    {
      label: t('simpleInterest.result.interestRate'),
      value: display.interestRate,
    },
    {
      label: t('simpleInterest.result.interest'),
      value: display.interest,
      strong: true,
    },
    {
      label: t('simpleInterest.result.total'),
      value: display.total,
      strong: true,
    },
  ];

  const renderRow = (row: (typeof rows)[number]) => (
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
  );

  return (
    <View style={styles.card}>
      {/* Only this view becomes the shared image; the action row is outside. */}
      <View
        ref={captureRef}
        collapsable={false}
        testID="result-card-image"
        style={styles.capture}
      >
        <Text style={styles.title} accessibilityRole="header">
          {t('simpleInterest.result.title')}
        </Text>
        {rows.slice(0, 2).map(renderRow)}
        {/* One compact block: "Start - End", then "Duration: ..." */}
        <View
          style={styles.row}
          accessible
          accessibilityLabel={`${dateRangeText}. ${durationLine}`}
        >
          <Text style={styles.value}>{dateRangeText}</Text>
          <Text style={styles.durationLine}>{durationLine}</Text>
        </View>
        {rows.slice(2).map(renderRow)}
      </View>
      <View style={styles.actions}>
        <ResultActions
          onCopy={copy}
          onShare={share}
          onSaveImage={onSaveImage}
          feedback={shareFeedback ?? feedback}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  card: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden' as const,
  },
  /** The image: its own background, so it is readable in light and dark. */
  capture: {
    padding: 16,
    paddingBottom: 0,
    backgroundColor: theme.colors.surface,
  },
  actions: { paddingHorizontal: 16, paddingBottom: 16 },
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
  durationLine: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  valueStrong: { fontSize: 22, fontWeight: '700' as const },
});
