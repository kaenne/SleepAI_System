import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as React from 'react';
import { useTranslation } from '@/contexts/i18n-context';
import { StorageKeys, NotificationChannel } from '@/constants/storage';

const NOTIF_ENABLED_KEY = StorageKeys.NOTIF_ENABLED;
const NOTIF_TIME_KEY = StorageKeys.NOTIF_TIME; // "HH:MM"
const WAKE_UP_NOTIF_ID_KEY = StorageKeys.WAKE_UP_NOTIF_ID;
const SLEEP_REMINDER_ID_KEY = StorageKeys.SLEEP_REMINDER_ID;

export type NotificationTime = { hour: number; minute: number };

// Configure default handler — show even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

// Create Android channel for alarms (must be HIGH importance)
async function ensureAlarmChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NotificationChannel.ALARM, {
    name: '⏰ SleepAI Alarm',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    enableVibrate: true,
    enableLights: true,
    lightColor: '#a855f7',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,         // bypass Do Not Disturb
  });
}

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    android: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status === 'granted';
}

/** Returns the next Date when the given hour:minute will occur (today or tomorrow) */
function nextAlarmDate(hour: number, minute: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  // If the time has already passed today — schedule for tomorrow
  if (candidate.getTime() <= now.getTime() + 30_000) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

async function scheduleReminder(hour: number, minute: number, title: string, body: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  await cancelSleepReminders();
  await ensureAlarmChannel();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: NotificationChannel.ALARM }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  await AsyncStorage.setItem(SLEEP_REMINDER_ID_KEY, id);
  return id;
}

async function cancelSleepReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const id = await AsyncStorage.getItem(SLEEP_REMINDER_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(SLEEP_REMINDER_ID_KEY);
    }
  } catch { /* ignore */ }
}

export async function scheduleWakeUpAlarm(hour: number, minute: number, title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelWakeUpAlarm();
  await ensureAlarmChannel();

  const alarmDate = nextAlarmDate(hour, minute);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      priority: 'max',
      ...(Platform.OS === 'android' && { channelId: NotificationChannel.ALARM }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alarmDate,
    },
  });
  await AsyncStorage.setItem(WAKE_UP_NOTIF_ID_KEY, id);
  console.log(`✅ Alarm scheduled for ${alarmDate.toLocaleTimeString()}`);
}

export async function cancelWakeUpAlarm(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const id = await AsyncStorage.getItem(WAKE_UP_NOTIF_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(WAKE_UP_NOTIF_ID_KEY);
    }
  } catch { /* ignore */ }
}


export function useNotifications() {
  const [enabled, setEnabled] = React.useState(false);
  const [time, setTime] = React.useState<NotificationTime>({ hour: 22, minute: 0 });
  const [hasPermission, setHasPermission] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { t } = useTranslation();

  // Load saved state + ensure channel exists
  React.useEffect(() => {
    const load = async () => {
      try {
        await ensureAlarmChannel();
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
      await scheduleReminder(time.hour, time.minute, t('notifications.bedtimeTitle'), t('notifications.bedtimeBody'));
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
      await scheduleReminder(newTime.hour, newTime.minute, t('notifications.bedtimeTitle'), t('notifications.bedtimeBody'));
    }
  }, [enabled, t]);

  const sendTestNotification = React.useCallback(async () => {
    if (Platform.OS === 'web') return;
    await ensureAlarmChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.testTitle'),
        body: t('notifications.testBody'),
        sound: 'default',
        priority: 'max',
        ...(Platform.OS === 'android' && { channelId: NotificationChannel.ALARM }),
      },
      trigger: null, // send immediately
    });
  }, [t]);

  const timeString = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

  return { enabled, time, timeString, hasPermission, loading, toggle, updateTime, sendTestNotification };
}
