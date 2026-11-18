import { useEffect, useState, type ReactNode } from 'react';
import {
  Appearance,
  StatusBar,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { Provider } from 'react-redux';

import { hydratePreferences } from '../features/preferences';
import {
  createUnavailablePreferencesRepository,
  initializePreferencesStorage,
  type PreferencesRepository,
} from '../storage';
import { createAppStore, type AppStore } from '../store';
import { themes } from '../theme';
import type { ThemeMode } from '../types/preferences';

const getSystemTheme = (): ThemeMode =>
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

/**
 * Opens storage, loads the saved theme and language into Redux, and only then
 * renders `children`. Until that finishes it shows a blank screen in the system
 * color, so the app never paints the wrong theme or language first.
 */
interface AppBootstrapProps {
  children: ReactNode;
  /** Opens storage. Defaults to the real SQLite database; tests inject their own. */
  initializeStorage?: () => Promise<PreferencesRepository>;
}

export function AppBootstrap({
  children,
  initializeStorage = initializePreferencesStorage,
}: AppBootstrapProps) {
  const [store, setStore] = useState<AppStore | null>(null);
  const systemMode = useColorScheme() === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    let cancelled = false;

    async function start() {
      let preferencesRepository;
      try {
        preferencesRepository = await initializeStorage();
      } catch (error) {
        preferencesRepository = createUnavailablePreferencesRepository(error);
      }
      const appStore = createAppStore({
        preferencesRepository,
        getSystemTheme,
      });
      await appStore.dispatch(hydratePreferences());
      if (!cancelled) {
        setStore(appStore);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [initializeStorage]);

  if (store === null) {
    const waiting = themes[systemMode];
    return (
      <View
        style={[styles.waiting, { backgroundColor: waiting.colors.background }]}
      >
        <StatusBar barStyle={waiting.statusBarStyle} />
      </View>
    );
  }

  return <Provider store={store}>{children}</Provider>;
}

const styles = StyleSheet.create({ waiting: { flex: 1 } });
