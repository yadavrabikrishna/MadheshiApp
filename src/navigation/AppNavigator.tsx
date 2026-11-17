
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Ionicons } from '@react-native-vector-icons/ionicons/static';

import type { RootTabParamList } from './navigation.types';

import { HomeScreen } from '../screens/Home/HomeScreen';
import { NewsScreen } from '../screens/News/NewsScreen';
import { CalculatorScreen } from '../screens/Calculator/CalculatorScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';

import { appColors } from '../theme/colors';

const Tab = createBottomTabNavigator<RootTabParamList>();

type TabIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

// Home tab icon
function HomeTabIcon({ focused, color, size }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'home' : 'home-outline'}
      size={size}
      color={color}
    />
  );
}

// News tab icon
function NewsTabIcon({ focused, color, size }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'newspaper' : 'newspaper-outline'}
      size={size}
      color={color}
    />
  );
}

// Calculator tab icon
function CalculatorTabIcon({ focused, color, size }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'calculator' : 'calculator-outline'}
      size={size}
      color={color}
    />
  );
}

// Settings tab icon
function SettingsTabIcon({ focused, color, size }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'settings' : 'settings-outline'}
      size={size}
      color={color}
    />
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,

        headerTitleAlign: 'left',

        headerStyle: {
          backgroundColor: appColors.light.surface,
        },

        headerTintColor: appColors.light.text,

        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },

        tabBarActiveTintColor: appColors.light.primary,

        tabBarInactiveTintColor: appColors.light.tabInactive,

        tabBarStyle: {
          backgroundColor: appColors.light.surface,
          borderTopColor: appColors.light.border,
          paddingTop: 6,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 4,
        },

        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: HomeTabIcon,
        }}
      />

      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{
          title: 'News',
          tabBarLabel: 'News',
          tabBarIcon: NewsTabIcon,
        }}
      />

      <Tab.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{
          title: 'Calculator',
          tabBarLabel: 'Calculator',
          tabBarIcon: CalculatorTabIcon,
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: SettingsTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}
