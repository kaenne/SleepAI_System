import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { I18nProvider } from '@/contexts/i18n-context';
import { ThemeProvider as SleepThemeProvider } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ONBOARDING_KEY } from './onboarding';

// Keep splash visible until app is fully ready
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 600 });

function AppNavigator() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingState, setOnboardingState] = React.useState<'unknown' | 'done' | 'pending'>('unknown');

  React.useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((done) => {
      setOnboardingState(done === 'true' ? 'done' : 'pending');
    });
  }, []);

  // Route once auth + onboarding state are both resolved, then drop the splash.
  React.useEffect(() => {
    if (isLoading || onboardingState === 'unknown') return;
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else if (onboardingState === 'done') {
      router.replace('/welcome');
    }
    // else: first-time unauth user — keep initial /onboarding route.
    SplashScreen.hideAsync();
  }, [isLoading, isAuthenticated, onboardingState]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Body / UI typography
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Numeric / mono typography (numbers, time, version, section headers)
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    // Aliases referenced from constants/theme.ts so existing usages keep working
    Inter: Inter_400Regular,
    JetBrainsMono: JetBrainsMono_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <SleepThemeProvider>
        <I18nProvider>
          <AppNavigator />
        </I18nProvider>
      </SleepThemeProvider>
    </AuthProvider>
  );
}
