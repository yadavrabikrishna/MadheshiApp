import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';

import { AppNavigator } from '../navigation/AppNavigator';
import { getNavigationTheme, useAppTheme } from '../theme';

/** The themed app UI. Must render inside the Redux provider. */
export function AppRoot() {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar barStyle={theme.statusBarStyle} />
      <NavigationContainer theme={getNavigationTheme(theme)}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}
