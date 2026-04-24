import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as React from 'react';

const NOTIF_ENABLED_KEY = 'sleepai_notifications_enabled';
const NOTIF_TIME_KEY = 'sleepai_notification_time'; // "HH:MM"

export type NotificationTime = { hour: number; minute: number };

// Configure default handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleReminder(hour: number, minute: number): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  // Cancel existing sleep reminders
  await cancelSleepReminders();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 Время ложиться спать',
      body: 'Откройте SleepMind и запишите свой день. Хороший сон — основа здоровья!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return id;
}

async function cancelSleepReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.title?.includes('SleepMind') || notif.content.title?.includes('ложиться')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

export function useNotifications() {
  const [enabled, setEnabled] = React.useState(false);
  const [time, setTime] = React.useState<NotificationTime>({ hour: 22, minute: 0 });
  const [hasPermission, setHasPermission] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Load saved state
  React.useEffect(() => {
    const load = async () => {
      try {
        const [enabledVal, timeVal] = await Promise.all([
          AsyncStorage.getItem(NOTIF_ENABLED_KEY),
          AsyncStorage.getItem(NOTIF_TIME_KEY),
        ]);
        if (enabledVal === 'true') setEnabled(true);
        if (timeVal) {
          const [h, m] = timeVal.split(':').map(Number);
          setTime({ hour: h, minute: m });
        }
        if (Platform.OS !== 'web') {
          const { status } = await Notifications.getPermissionsAsync();
          setHasPermission(status === 'granted');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = React.useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestPermissions();
      if (!granted) {
        setHasPermission(false);
        return false;
      }
      setHasPermission(true);
      await scheduleReminder(time.hour, time.minute);
      await AsyncStorage.setItem(NOTIF_ENABLED_KEY, 'true');
    } else {
      await cancelSleepReminders();
      await AsyncStorage.setItem(NOTIF_ENABLED_KEY, 'false');
    }
    setEnabled(value);
    return true;
  }, [time]);

  const updateTime = React.useCallback(async (newTime: NotificationTime) => {
    setTime(newTime);
    const timeStr = `${String(newTime.hour).padStart(2, '0')}:${String(newTime.minute).padStart(2, '0')}`;
    await AsyncStorage.setItem(NOTIF_TIME_KEY, timeStr);
    if (enabled) {
      await scheduleReminder(newTime.hour, newTime.minute);
    }
  }, [enabled]);

  const sendTestNotification = React.useCallback(async () => {
    if (Platform.OS === 'web') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 SleepMind — тест',
        body: 'Уведомления работают! Ложитесь спать вовремя 💤',
        sound: true,
      },
      trigger: null, // send immediately
    });
  }, []);

  const timeString = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

  return { enabled, time, timeString, hasPermission, loading, toggle, updateTime, sendTestNotification };
}
