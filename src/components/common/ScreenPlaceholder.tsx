import type { ComponentProps } from 'react';

import { Ionicons } from '@react-native-vector-icons/ionicons/static';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { appColors } from '../theme/colors';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface ScreenPlaceholderProps {
  title: string;
  description: string;
  iconName: IoniconName;
}

export function ScreenPlaceholder({
  title,
  description,
  iconName,
}: ScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name={iconName}
        size={52}
        color={appColors.brand.crimson}
      />

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.description}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: appColors.light.text,
    marginTop: 16,
  },

  description: {
    fontSize: 14,
    color: appColors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
});
