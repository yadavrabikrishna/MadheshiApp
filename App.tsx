
import { NavigationContainer } from '@react-navigation/native';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import { StatusBar } from 'react-native';

import { AppNavigator } from './src/navigation/AppNavigator';

import { navigationTheme } from './src/theme/navigationTheme';


function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content" />

      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
