import type { ComponentProps } from 'react';

import { Ionicons } from '@react-native-vector-icons/ionicons/static';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * The app's single icon component (Ionicons). Use it everywhere instead of
 * importing the icon package directly, so the icon library stays swappable.
 */
export function Icon({ name, size = 24, color }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}
