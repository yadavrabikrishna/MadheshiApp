import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap, AppRoot } from './src/app';

function App() {
  return (
    <SafeAreaProvider>
      <AppBootstrap>
        <AppRoot />
      </AppBootstrap>
    </SafeAreaProvider>
  );
}

export default App;
