import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HeaderActions, Icon, type IconName } from '../components';
import { useTranslation, type TranslationKey } from '../i18n';
import { CalculatorScreen } from '../screens/Calculator/CalculatorScreen';
import { CalculatorSettingsScreen } from '../screens/Settings/CalculatorSettingsScreen';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { NewsScreen } from '../screens/News/NewsScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { useAppTheme, type AppTheme } from '../theme';
import type { RootStackParamList, RootTabParamList } from './navigation.types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
}

/** One stable render function per tab (filled icon when focused, outline otherwise). */
function createTabIcon(filled: IconName, outline: IconName) {
  return function TabIcon({ focused, color, size }: TabIconProps) {
    return <Icon name={focused ? filled : outline} size={size} color={color} />;
  };
}

const TABS: {
  name: keyof RootTabParamList;
  labelKey: TranslationKey;
  component: () => React.JSX.Element;
  icon: (props: TabIconProps) => React.JSX.Element;
}[] = [
  {
    name: 'Home',
    labelKey: 'tabs.home',
    component: HomeScreen,
    icon: createTabIcon('home', 'home-outline'),
  },
  {
    name: 'News',
    labelKey: 'tabs.news',
    component: NewsScreen,
    icon: createTabIcon('newspaper', 'newspaper-outline'),
  },
  {
    name: 'Calculator',
    labelKey: 'tabs.calculator',
    component: CalculatorScreen,
    icon: createTabIcon('calculator', 'calculator-outline'),
  },
  {
    name: 'Settings',
    labelKey: 'tabs.settings',
    component: SettingsScreen,
    icon: createTabIcon('settings', 'settings-outline'),
  },
];

// Module-level so the header does not remount its controls on every render.
const renderHeaderActions = () => <HeaderActions />;

/** The header look shared by the tab screens and the screens above them. */
function getHeaderOptions(colors: AppTheme['colors']) {
  return {
    headerShown: true,
    headerTitleAlign: 'left' as const,
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerTitleStyle: { fontSize: 18, fontWeight: '600' as const },
    headerRight: renderHeaderActions,
  };
}

/** The four bottom tabs. Unchanged; they now sit inside the root stack. */
function TabNavigator() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { colors } = theme;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        ...getHeaderOptions(colors),

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
        tabBarHideOnKeyboard: true,
      }}
    >
      {TABS.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: t(tab.labelKey),
            tabBarLabel: t(tab.labelKey),
            tabBarIcon: tab.icon,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator initialRouteName="Tabs">
      {/* The tabs draw their own headers. */}
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CalculatorSettings"
        component={CalculatorSettingsScreen}
        options={{
          ...getHeaderOptions(theme.colors),
          title: t('calculatorSettings.title'),
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </Stack.Navigator>
  );
}
