import {
  DefaultTheme,
  type Theme,
} from '@react-navigation/native';

import { appColors } from './colors';

const light = appColors.light;

export const navigationTheme: Theme = {
  ...DefaultTheme,

  dark: false,

  colors: {
    ...DefaultTheme.colors,

    primary: light.primary,
    background: light.background,
    card: light.surface,
    text: light.text,
    border: light.border,
    notification: light.primary,
  },
};
