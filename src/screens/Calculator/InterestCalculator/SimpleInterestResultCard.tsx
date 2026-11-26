import { Text, View } from 'react-native';

import { ResultActions } from '../../../components';
import type { InterestRateConfig } from '../../../types/interestRateConfig';
import {
  useCopyResult,
  useSaveResultImage,
  useShareResultImage,
} from '../../../features/resultActions';
import { useTranslation } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import type {
  InterestCalculationResult,
  InterestType,
} from './interestCalculatorConfig';
import { INTEREST_MODE_TEXT } from './interestModeText';
import { getSimpleInterestDisplay } from './simpleInterestDisplay';
import { buildSimpleInterestSummary } from './simpleInterestSummary';

export { formatNeutralDate } from './simpleInterestDisplay';

/**
 * Copy (a text summary), Share and Save Image (the card as an image) are all
 * handled here, so the action row gets no handlers from outside.
 */
interface SimpleInterestResultCardProps {
  result: InterestCalculationResult;
  /** Which calculator produced it; decides title, labels and file name. */
  type?: InterestType;
  /** The rate exactly as entered, and how it was entered. */
  enteredRate: string;
  rateConfig: InterestRateConfig;
  /** False for a direct duration: only the duration is shown, no dates. */
  showDates?: boolean;
}

export function SimpleInterestResultCard({
  result,
  type = 'simple',
  enteredRate,
  rateConfig,
  showDates = true,
}: SimpleInterestResultCardProps) {
  const { t, formatDigits } = useTranslation();
  const mode = INTEREST_MODE_TEXT[type];
  const styles = useThemedStyles(createStyles);
  const { copy, feedback } = useCopyResult(() =>
    formatDigits(
      buildSimpleInterestSummary(
        result,
        enteredRate,
        rateConfig,
        t,
        type,
        showDates,
      ),
    ),
  );

  const {
    captureRef,
    share,
    feedback: shareFeedback,
  } = useShareResultImage(mode.fileNamePrefix);
  const { save, feedback: saveFeedback } = useSaveResultImage(
    captureRef,
    mode.fileNamePrefix,
  );

  // The display text is localized here (Nepali digits); the result itself and
  // the entered rate stay ASCII.
  const display = Object.fromEntries(
    Object.entries(
      getSimpleInterestDisplay(result, enteredRate, rateConfig, t),
    ).map(([key, text]) => [key, formatDigits(text)]),
  ) as unknown as ReturnType<typeof getSimpleInterestDisplay>;
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
      label: t(mode.interestKey),
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
          {t(mode.titleKey)}
        </Text>
        {rows.slice(0, 2).map(renderRow)}
        {/* One compact block: "Start - End", then "Duration: ..." */}
        <View
          style={styles.row}
          accessible
          accessibilityLabel={
            showDates ? `${dateRangeText}. ${durationLine}` : durationLine
          }
        >
          {showDates ? <Text style={styles.value}>{dateRangeText}</Text> : null}
          <Text style={styles.durationLine}>{durationLine}</Text>
        </View>
        {rows.slice(2).map(renderRow)}
      </View>
      <View style={styles.actions}>
        <ResultActions
          onCopy={copy}
          onShare={share}
          onSaveImage={save}
          feedback={shareFeedback ?? saveFeedback ?? feedback}
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
