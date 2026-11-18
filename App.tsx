import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { AppProvider } from './src/store/AppContext';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { AuthStackParamList, RootStackParamList } from './src/navigation/types';
import MainTabs from './src/navigation/MainTabs';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingLevelScreen from './src/screens/OnboardingLevelScreen';
import OnboardingDailyScreen from './src/screens/OnboardingDailyScreen';
import OnboardingReadyScreen from './src/screens/OnboardingReadyScreen';
import LessonDetailScreen from './src/screens/LessonDetailScreen';
import LessonQuizScreen from './src/screens/LessonQuizScreen';
import MockTestScreen from './src/screens/MockTestScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

/**
 * Auth flow.
 * - restoring session -> Splash
 * - signed in         -> Main (tabs) straight away
 * - signed out        -> Login -> Onboarding 1-3 -> Main
 */
function AuthNavigator() {
  const { user, initializing, pendingOnboarding } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
      initialRouteName={user ? (pendingOnboarding ? 'OnboardingLevel' : 'Main') : 'Login'}
    >
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="OnboardingLevel" component={OnboardingLevelScreen} />
      <AuthStack.Screen name="OnboardingDaily" component={OnboardingDailyScreen} />
      <AuthStack.Screen name="OnboardingReady" component={OnboardingReadyScreen} />
      <AuthStack.Screen name="Main" component={MainTabs} />
    </AuthStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <NavigationContainer theme={theme}>
            <StatusBar style="dark" />
            <RootStack.Navigator
              screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
            >
              <RootStack.Screen name="Auth" component={AuthNavigator} />
              <RootStack.Screen name="LessonDetail" component={LessonDetailScreen} />
              <RootStack.Screen name="LessonQuiz" component={LessonQuizScreen} />
              <RootStack.Screen name="MockTest" component={MockTestScreen} />
              <RootStack.Screen
                name="Conversation"
                component={ConversationScreen}
                options={{ animation: 'slide_from_bottom' }}
              />
              <RootStack.Screen name="Progress" component={ProgressScreen} />
              <RootStack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ animation: 'slide_from_bottom' }}
              />
              <RootStack.Screen name="Settings" component={SettingsScreen} />
            </RootStack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
