import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider as SleepThemeProvider, useColorScheme } from '@/contexts/theme-context';
import { ONBOARDING_KEY } from './onboarding';

export const unstable_settings = {
  initialRouteName: 'onboarding',
};

function AppNavigator() {
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((done) => {
      if (done === 'true') {
        router.replace('/welcome');
      }
    });
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'light'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SleepThemeProvider>
        <AppNavigator />
      </SleepThemeProvider>
    </AuthProvider>
  );
}
