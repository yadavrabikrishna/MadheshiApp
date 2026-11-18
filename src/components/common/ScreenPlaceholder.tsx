import { Text, View } from 'react-native';

import { useThemedStyles, type AppTheme } from '../../theme';
import { Icon, type IconName } from './Icon';

interface ScreenPlaceholderProps {
  title: string;
  description: string;
  iconName: IconName;
}

export function ScreenPlaceholder({
  title,
  description,
  iconName,
}: ScreenPlaceholderProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Icon name={iconName} size={52} color={styles.icon.color} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 24,
  },
  icon: { color: theme.colors.primary },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 21,
  },
});
