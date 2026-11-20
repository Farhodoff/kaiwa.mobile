import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';
import { MainTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import SpeakScreen from '../screens/SpeakScreen';
import LearnScreen from '../screens/LearnScreen';
import JlptScreen from '../screens/JlptScreen';
import CardsScreen from '../screens/CardsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<
  keyof MainTabParamList,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Speak: { active: 'mic', inactive: 'mic-outline' },
  Learn: { active: 'book', inactive: 'book-outline' },
  Jlpt: { active: 'ribbon', inactive: 'ribbon-outline' },
  Cards: { active: 'albums', inactive: 'albums-outline' },
};

const LABELS: Record<keyof MainTabParamList, string> = {
  Home: 'Home',
  Speak: 'Speak',
  Learn: 'Learn',
  Jlpt: 'JLPT',
  Cards: 'Cards',
};

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 10);
  const tabHeight = 58 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabHeight,
            paddingBottom: bottomInset,
          },
        ],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: { paddingTop: 8 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = ICONS[route.name as keyof MainTabParamList];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
        tabBarLabel: LABELS[route.name as keyof MainTabParamList],
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Speak" component={SpeakScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="Jlpt" component={JlptScreen} />
      <Tab.Screen name="Cards" component={CardsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...shadow.card,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: -2,
  },
});
