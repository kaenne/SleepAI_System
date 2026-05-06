/**
 * Centralised AsyncStorage / SecureStore key names. Single source of truth — never
 * inline these strings in feature code. Two prefixes for historical reasons:
 *   - `sleepMind.*` for auth/session data
 *   - `sleepai_*` for user preferences and onboarding state
 * Adding a new key? Put it here, then import the constant.
 */
export const StorageKeys = {
  // Auth (SecureStore)
  AUTH_TOKEN: 'sleepMind.authToken',
  REFRESH_TOKEN: 'sleepMind.refreshToken',
  // Auth (AsyncStorage — non-secret cached profile)
  USER: 'sleepMind.user',

  // Sleep tracking (AsyncStorage)
  ACTIVE_SESSION: 'sleepMind.activeSession',
  JOURNAL_ENTRIES_BASE: 'sleepMobile.sleepJournalEntries.v1',

  // User preferences (AsyncStorage)
  LANGUAGE: 'sleepai_language',
  THEME_OVERRIDE: 'sleepai_theme_override',
  USER_PROFILE: 'sleepai_user_profile',
  DISPLAY_NAME: 'sleepai_display_name',

  // Onboarding flag
  ONBOARDING_DONE: 'sleepai_onboarding_done',

  // Notifications
  NOTIF_ENABLED: 'sleepai_notifications_enabled',
  NOTIF_TIME: 'sleepai_notification_time',
  WAKE_UP_NOTIF_ID: 'sleepai_wakeup_notif_id',
  SLEEP_REMINDER_ID: 'sleepai_reminder_notif_id',
} as const;

/**
 * Android notification channel id — separate constant to avoid mixing it up with
 * AsyncStorage keys. Used by expo-notifications setNotificationChannelAsync().
 */
export const NotificationChannel = {
  ALARM: 'sleepai_alarm',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
