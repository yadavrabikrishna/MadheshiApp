import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootTabParamList = {
  Home: undefined;
  News: undefined;
  Calculator: undefined;
  Settings: undefined;
};

/** The root stack: the four bottom tabs, plus screens that open above them. */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  CalculatorSettings: undefined;
};
