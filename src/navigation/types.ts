import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  OnboardingLevel: undefined;
  OnboardingDaily: undefined;
  OnboardingReady: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  Home: undefined;
  Speak: undefined;
  Learn: undefined;
  Jlpt: undefined;
  Cards: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  LessonDetail: { lessonId: string; title: string; level: string };
  LessonQuiz: { lessonId: string; title: string; level: string };
  MockTest: undefined;
  Conversation: { topic: string; level: string };
  Progress: undefined;
  Notifications: undefined;
  Settings: undefined;
};
