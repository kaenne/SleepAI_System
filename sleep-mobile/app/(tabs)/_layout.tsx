import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Alert, BackHandler, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Android back button — show exit confirmation
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        t('common.exitTitle'),
        t('common.exitMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.exitBtn'), style: 'destructive', onPress: () => BackHandler.exitApp() },
        ],
        { cancelable: true }
      );
      return true; // prevent default back action
    });
    return () => handler.remove();
  }, [t]);

  const tabBarHeight = (Platform.OS === 'ios' ? 88 : 68) + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.icon,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarBackground: () =>
          Platform.OS !== 'android' ? (
            <BlurView
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              intensity={85}
              style={[StyleSheet.absoluteFill, styles.tabBarBlur]}
            />
          ) : undefined,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'android'
            ? colors.cardBackground
            : 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          height: tabBarHeight,
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          // subtle top border via shadow
          shadowColor: colorScheme === 'dark' ? '#000' : '#6366F1',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.08,
          shadowRadius: 12,
          elevation: 16,
        },
        tabBarIconStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginTop: Platform.OS === 'ios' ? (insets.bottom > 0 ? 10 : 0) : 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.diary'),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 32 : 28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 32 : 28} name="chart.bar.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.aiTrainer'),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 32 : 28} name="bubble.left.and.bubble.right.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 32 : 28} name="gearshape.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 32 : 28} name="person.crop.circle.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBlur: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
});
