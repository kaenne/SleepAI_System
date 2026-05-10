import { Tabs } from 'expo-router';
import React from 'react';
import { Alert, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { Ico, type IcoName } from '@/components/ui/ico';
import { BorderRadius, Brand, Type } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';

/**
 * Bottom tab bar — flat surface, no blur. Active tab is rendered as an
 * accent-soft pill behind the icon (per spec). Labels sit below in mono caps.
 */
function TabIconPill({ icon, focused, label }: { icon: IcoName; focused: boolean; label: string }) {
  const Icon = Ico[icon];
  const tint = focused ? Brand.accent : Brand.textMuted;

  return (
    <View style={styles.tabSlot}>
      <View
        style={[
          styles.pill,
          focused
            ? { backgroundColor: Brand.accentSoft, borderColor: Brand.accentBorder }
            : { backgroundColor: 'transparent', borderColor: 'transparent' },
        ]}
      >
        <Icon size={20} color={tint} />
      </View>
      <ThemedText
        numberOfLines={1}
        style={[
          styles.label,
          { color: tint },
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export default function TabLayout() {
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
      return true;
    });
    return () => handler.remove();
  }, [t]);

  const tabBarHeight = 64 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Brand.background,
          borderTopWidth: 1,
          borderTopColor: Brand.borderSoft,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.diary'),
          tabBarIcon: ({ focused }) => (
            <TabIconPill icon="Book" focused={focused} label={t('tabs.diary')} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ focused }) => (
            <TabIconPill icon="ChartBar" focused={focused} label={t('tabs.stats')} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.aiTrainer'),
          tabBarIcon: ({ focused }) => (
            <TabIconPill icon="Chat" focused={focused} label={t('tabs.aiTrainer')} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ focused }) => (
            <TabIconPill icon="Settings" focused={focused} label={t('tabs.settings')} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => (
            <TabIconPill icon="User" focused={focused} label={t('tabs.profile')} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  pill: {
    width: 56,
    height: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: '500',
  },
});
