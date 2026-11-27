import { Text, View } from 'react-native';

import { ResultActions } from '../../../components';
import {
  useCopyResult,
  useSaveResultImage,
  useShareResultImage,
} from '../../../features/resultActions';
import { useTranslation } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { buildLandSummary, type LandDisplayGroup } from './teraiLandDisplay';

const FILE_NAME_PREFIX = 'terai-land-result-';

interface TeraiLandResultCardProps {
  /** Already formatted for display (service formatter + the language's digits). */
  groups: LandDisplayGroup[];
  /** "Input: 2.5 Bigha", already formatted. */
  inputLine: string;
}

/**
 * The Terai conversion result: Hilly, Terai and Other Units groups, with Copy,
 * Share and Save Image under them, the same pattern as the Interest result.
 * Copy sends the complete text; Share and Save use the card (not the action
 * row) as the image.
 */
export function TeraiLandResultCard({
  groups,
  inputLine,
}: TeraiLandResultCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const title = t('calculator.title.land.terai');

  const { copy, feedback } = useCopyResult(() =>
    buildLandSummary(title, inputLine, groups),
  );
  const {
    captureRef,
    share,
    feedback: shareFeedback,
  } = useShareResultImage(FILE_NAME_PREFIX);
  const { save, feedback: saveFeedback } = useSaveResultImage(
    captureRef,
    FILE_NAME_PREFIX,
  );

  return (
    <View style={styles.card} testID="land-result">
      <View
        ref={captureRef}
        collapsable={false}
        testID="land-result-image"
        style={styles.capture}
      >
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.inputLine}>{inputLine}</Text>
        {groups.map(group => (
          <View
            key={group.id}
            style={styles.group}
            testID={`land-group-${group.id}`}
          >
            <Text style={styles.groupTitle} accessibilityRole="header">
              {group.title}
            </Text>
            {group.rows.map(row => (
              <View
                key={row.label}
                style={styles.row}
                accessible
                accessibilityLabel={`${row.label}: ${row.value}`}
              >
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.value}>{row.value}</Text>
              </View>
            ))}
          </View>
        ))}
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
  /** The image: its own background, readable in light and dark. */
  capture: {
    padding: 16,
    paddingBottom: 4,
    backgroundColor: theme.colors.surface,
  },
  actions: { paddingHorizontal: 16, paddingBottom: 16 },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  inputLine: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 4,
  },
  group: { marginTop: 12 },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  /** Unit label on the left, value on the right. */
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  label: { flexShrink: 1, fontSize: 14, color: theme.colors.textSecondary },
  value: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'right' as const,
  },
});
