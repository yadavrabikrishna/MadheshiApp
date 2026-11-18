import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HeaderActions, Icon, type IconName } from '../components';
import { useTranslation, type TranslationKey } from '../i18n';
import { CalculatorScreen } from '../screens/Calculator/CalculatorScreen';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { NewsScreen } from '../screens/News/NewsScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { useAppTheme } from '../theme';
import type { RootTabParamList } from './navigation.types';

const Tab = createBottomTabNavigator<RootTabParamList>();

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

export function AppNavigator() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { colors } = theme;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'left',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        headerRight: renderHeaderActions,

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
