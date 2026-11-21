import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '../../i18n';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';
import { Icon, type IconName } from './Icon';

/** A message about the outcome of an action, already translated. */
export interface ResultActionFeedback {
  type: 'success' | 'error';
  message: string;
}

export interface ResultActionsProps {
  /** Copy the result. The behavior is supplied by the caller. */
  onCopy?: () => void;
  /** Share the result as an image. The behavior is supplied by the caller. */
  onShare?: () => void;
  /** Save the result as an image. The behavior is supplied by the caller. */
  onSaveImage?: () => void;
  /**
   * The outcome of the last action, shown below the row. Only the caller knows
   * whether an action worked, so pass it only once the outcome is known.
   */
  feedback?: ResultActionFeedback | null;
}

/**
 * The Copy / Share / Save Image row at the bottom of a calculator result card.
 *
 * This component implements no clipboard, sharing or saving. It calls the
 * handler it is given, and a press with no handler does nothing. It never
 * decides that an action succeeded: it shows `feedback` only when the caller
 * passes it.
 *
 * Render it only while a valid result is on screen, as the last child of the
 * result card. Any calculator's result card can reuse it by passing handlers.
 */
export function ResultActions({
  onCopy,
  onShare,
  onSaveImage,
  feedback,
}: ResultActionsProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const actions: {
    id: string;
    icon: IconName;
    label: string;
    onPress?: () => void;
  }[] = [
    {
      id: 'copy',
      icon: 'copy-outline',
      label: t('resultActions.copy'),
      onPress: onCopy,
    },
    {
      id: 'share',
      icon: 'share-social-outline',
      label: t('resultActions.share'),
      onPress: onShare,
    },
    {
      id: 'saveImage',
      icon: 'download-outline',
      label: t('resultActions.saveImage'),
      onPress: onSaveImage,
    },
  ];

  const feedbackColor =
    feedback?.type === 'error' ? theme.colors.error : theme.colors.text;

  return (
    <View>
      <View style={styles.row}>
        {actions.map(action => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Icon name={action.icon} size={22} color={theme.colors.text} />
            <Text style={styles.label}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
      {/* Always mounted, so a screen reader announces the message when it appears. */}
      <View accessibilityLiveRegion="polite">
        {feedback ? (
          <View style={styles.feedback}>
            <Icon
              name={
                feedback.type === 'error'
                  ? 'alert-circle-outline'
                  : 'checkmark-circle-outline'
              }
              size={16}
              color={feedbackColor}
            />
            <Text
              style={[styles.feedbackText, { color: feedbackColor }]}
              accessibilityRole={
                feedback.type === 'error' ? 'alert' : undefined
              }
            >
              {feedback.message}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  // Separated from the result rows above in the same way the rows are.
  row: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Three equal columns. minHeight (not height) lets longer Nepali labels and
  // larger system font sizes wrap onto more lines instead of being cut off.
  action: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: { opacity: 0.6 },
  feedback: {
    flexDirection: 'row' as const,
    gap: 6,
    paddingTop: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  feedbackText: { flexShrink: 1, fontSize: 13 },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    color: theme.colors.text,
  },
});
