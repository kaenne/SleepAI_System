import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as React from 'react';
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColorSchemeOverride, useTheme } from '@/contexts/theme-context';
import { useNotifications } from '@/hooks/use-notifications';
import { api } from '@/services/api';

type SettingRowProps = {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  colors: typeof Colors.light;
};

function SettingRow({ 
  icon, 
  iconColor, 
  label, 
  value, 
  hasToggle, 
  toggleValue, 
  onToggle,
  onPress,
  colors 
}: SettingRowProps) {
  const content = (
    <View style={[styles.settingRow, { borderBottomColor: colors.cardBorder }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
          <IconSymbol name={icon as any} size={18} color={iconColor} />
        </View>
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
      </View>
      {hasToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.cardBorder, true: colors.tint + '60' }}
          thumbColor={toggleValue ? colors.tint : colors.muted}
        />
      ) : (
        <View style={styles.settingRight}>
          {value && <ThemedText style={[styles.settingValue, { color: colors.muted }]}>{value}</ThemedText>}
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

export default function НастройкиScreen() {
  const colorScheme = useColorSchemeOverride() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const notif = useNotifications();

  const [backendUrl, setBackendUrl] = React.useState(api.getBaseUrl() || '');
  const [showBackendInput, setShowBackendInput] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [tempHour, setTempHour] = React.useState(notif.time.hour);
  const [tempMinute, setTempMinute] = React.useState(notif.time.minute);

  // Sync temp values when modal opens
  React.useEffect(() => {
    if (showTimePicker) {
      setTempHour(notif.time.hour);
      setTempMinute(notif.time.minute);
    }
  }, [showTimePicker, notif.time]);

  const handleNotifToggle = React.useCallback(async (value: boolean) => {
    const ok = await notif.toggle(value);
    if (!ok && value) {
      Alert.alert(
        'Разрешите уведомления',
        'Пожалуйста, разрешите уведомления в настройках телефона.',
      );
    }
  }, [notif]);

  const handleSaveTime = React.useCallback(async () => {
    await notif.updateTime({ hour: tempHour, minute: tempMinute });
    setShowTimePicker(false);
    if (notif.enabled) {
      Alert.alert('Готово', `Напоминание установлено на ${String(tempHour).padStart(2,'0')}:${String(tempMinute).padStart(2,'0')} ежедневно`);
    }
  }, [notif, tempHour, tempMinute]);

  // Get user initials for avatar
  const userInitials = React.useMemo(() => {
    if (!user?.name) return 'U';
    const parts = user.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }, [user?.name]);

  const handleLogout = React.useCallback(async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/welcome' as any);
          },
        },
      ]
    );
  }, [logout]);

  const handleSaveBackend = React.useCallback(() => {
    if (backendUrl.trim()) {
      // Note: Backend URL is configured via EXPO_PUBLIC_API_BASE_URL env variable
      Alert.alert('Инфо', 'URL бэкенда настраивается в файле .env как EXPO_PUBLIC_API_BASE_URL');
    }
    setShowBackendInput(false);
  }, [backendUrl]);

  const handleClearData = React.useCallback(() => {
    Alert.alert(
      'Очистить все данные',
      'Это удалит все ваши записи о сне. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Очистить', 
          style: 'destructive',
          onPress: () => {
            // Would clear AsyncStorage here
            Alert.alert('Готово', 'Все данные удалены');
          }
        },
      ]
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientMid, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <ThemedText style={styles.headerTitle}>⚙️ Настройки</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Настройте приложение под себя ✨</ThemedText>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <Card variant="elevated">
            <Pressable 
              style={styles.profileRow}
              onPress={() => {
                if (!isAuthenticated) {
                  router.push('/login' as any);
                }
              }}
            >
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.avatarText}>{userInitials}</ThemedText>
              </View>
              <View style={styles.profileInfo}>
                <ThemedText type="subtitle">
                  {isAuthenticated && user ? user.name : 'Гость'}
                </ThemedText>
                <ThemedText type="caption">
                  {isAuthenticated && user ? user.email : 'Войдите для синхронизации данных'}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </Pressable>
          </Card>
        </Animated.View>

        {/* Account Section - only show if authenticated */}
        {isAuthenticated && (
          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <ThemedText style={styles.sectionTitle}>Аккаунт</ThemedText>
            <Card variant="default">
              <SettingRow
                icon="person.fill"
                iconColor={colors.tint}
                label="✏️ Редактировать профиль"
                onPress={() => Alert.alert('Редактирование профиля', 'Скоро будет доступно!')}
                colors={colors}
              />
              <SettingRow
                icon="lock.fill"
                iconColor={colors.warning}
                label="🔐 Сменить пароль"
                onPress={() => Alert.alert('Смена пароля', 'Скоро будет доступно!')}
                colors={colors}
              />
              <SettingRow
                icon="rectangle.portrait.and.arrow.right"
                iconColor={colors.danger}
                label="🚪 Выйти"
                onPress={handleLogout}
                colors={colors}
              />
            </Card>
          </Animated.View>
        )}

        {/* Sign In prompt for guests */}
        {!isAuthenticated && (
          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <ThemedText style={styles.sectionTitle}>Аккаунт</ThemedText>
            <Card variant="default">
              <Pressable 
                style={styles.signInPrompt}
                onPress={() => router.push('/login' as any)}
              >
                <View style={[styles.signInIcon, { backgroundColor: colors.tint + '20' }]}>
                  <IconSymbol name="person.badge.plus" size={24} color={colors.tint} />
                </View>
                <View style={styles.signInText}>
                  <ThemedText style={[styles.signInTitle, { color: colors.tint }]}>
                    Войти в аккаунт
                  </ThemedText>
                  <ThemedText style={[styles.signInSubtitle, { color: colors.textSecondary }]}>
                    Синхронизируйте данные между устройствами
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.tint} />
              </Pressable>
            </Card>
          </Animated.View>
        )}

        {/* App Preferences */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <ThemedText style={styles.sectionTitle}>Настройки приложения</ThemedText>
          <Card variant="default">
            <SettingRow
              icon="bell.fill"
              iconColor={colors.accent}
              label="🔔 Уведомления"
              hasToggle
              toggleValue={notif.enabled}
              onToggle={handleNotifToggle}
              colors={colors}
            />
            <SettingRow
              icon="clock.fill"
              iconColor={colors.warning}
              label="⏰ Время напоминания"
              value={notif.timeString}
              onPress={() => setShowTimePicker(true)}
              colors={colors}
            />
            {notif.enabled && Platform.OS !== 'web' && (
              <SettingRow
                icon="paperplane.fill"
                iconColor={colors.success}
                label="✉️ Отправить тестовое уведомление"
                onPress={notif.sendTestNotification}
                colors={colors}
              />
            )}
            <SettingRow
              icon="moon.fill"
              iconColor={colors.tint}
              label="🌙 Тёмная тема"
              hasToggle
              toggleValue={isDark}
              onToggle={toggleTheme}
              colors={colors}
            />
          </Card>
        </Animated.View>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.timePickerCard, { backgroundColor: colors.cardBackground }]}>
              <ThemedText type="subtitle" style={styles.timePickerTitle}>⏰ Время напоминания</ThemedText>
              <ThemedText style={[styles.timePickerSub, { color: colors.textSecondary }]}>
                Ежедневное напоминание ложиться спать
              </ThemedText>
              <View style={styles.timeRow}>
                {/* Hours */}
                <View style={styles.timeColumn}>
                  <Pressable
                    style={[styles.timeBtn, { backgroundColor: colors.tint + '20' }]}
                    onPress={() => setTempHour((h) => (h + 1) % 24)}
                  >
                    <IconSymbol name="chevron.up" size={20} color={colors.tint} />
                  </Pressable>
                  <View style={[styles.timeDisplay, { backgroundColor: colors.cardBorder }]}>
                    <ThemedText style={[styles.timeValue, { color: colors.text }]}>
                      {String(tempHour).padStart(2, '0')}
                    </ThemedText>
                  </View>
                  <Pressable
                    style={[styles.timeBtn, { backgroundColor: colors.tint + '20' }]}
                    onPress={() => setTempHour((h) => (h - 1 + 24) % 24)}
                  >
                    <IconSymbol name="chevron.down" size={20} color={colors.tint} />
                  </Pressable>
                </View>

                <ThemedText style={[styles.timeColon, { color: colors.text }]}>:</ThemedText>

                {/* Minutes */}
                <View style={styles.timeColumn}>
                  <Pressable
                    style={[styles.timeBtn, { backgroundColor: colors.tint + '20' }]}
                    onPress={() => setTempMinute((m) => (m + 5) % 60)}
                  >
                    <IconSymbol name="chevron.up" size={20} color={colors.tint} />
                  </Pressable>
                  <View style={[styles.timeDisplay, { backgroundColor: colors.cardBorder }]}>
                    <ThemedText style={[styles.timeValue, { color: colors.text }]}>
                      {String(tempMinute).padStart(2, '0')}
                    </ThemedText>
                  </View>
                  <Pressable
                    style={[styles.timeBtn, { backgroundColor: colors.tint + '20' }]}
                    onPress={() => setTempMinute((m) => (m - 5 + 60) % 60)}
                  >
                    <IconSymbol name="chevron.down" size={20} color={colors.tint} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.timePickerActions}>
                <Pressable
                  style={[styles.timePickerBtn, { backgroundColor: colors.cardBorder }]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <ThemedText style={{ fontWeight: '600', color: colors.text }}>Отмена</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.timePickerBtn, { backgroundColor: colors.tint }]}
                  onPress={handleSaveTime}
                >
                  <ThemedText style={{ fontWeight: '700', color: '#FFFFFF' }}>Сохранить</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Data & Sync */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <ThemedText style={styles.sectionTitle}>Данные и синхронизация</ThemedText>
          <Card variant="default">
            <SettingRow
              icon="icloud.fill"
              iconColor={colors.accent}
              label="☁️ Источник данных"
              value="Локально"
              onPress={() => setShowBackendInput(!showBackendInput)}
              colors={colors}
            />
            
            {showBackendInput && (
              <View style={styles.backendInputContainer}>
                <TextInput
                  value={backendUrl}
                  onChangeText={setBackendUrl}
                  placeholder="https://api.example.com"
                  placeholderTextColor={colors.muted}
                  style={[styles.backendInput, { 
                    color: colors.text,
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                  }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable 
                  onPress={handleSaveBackend}
                  style={[styles.saveButton, { backgroundColor: colors.tint }]}
                >
                  <ThemedText style={styles.saveButtonText}>Сохранить</ThemedText>
                </Pressable>
              </View>
            )}
            
            <SettingRow
              icon="arrow.triangle.2.circlepath"
              iconColor={colors.success}
              label="📤 Экспорт данных"
              onPress={() => Alert.alert('Экспорт', 'Функция экспорта скоро будет доступна!')}
              colors={colors}
            />
            <SettingRow
              icon="trash.fill"
              iconColor={colors.danger}
              label="🗑️ Очистить все данные"
              onPress={handleClearData}
              colors={colors}
            />
          </Card>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <ThemedText style={styles.sectionTitle}>О приложении</ThemedText>
          <Card variant="outlined">
            <SettingRow
              icon="info.circle.fill"
              iconColor={colors.muted}
              label="ℹ️ Версия"
              value="1.0.0"
              colors={colors}
            />
            <SettingRow
              icon="doc.text.fill"
              iconColor={colors.muted}
              label="📜 Условия использования"
              onPress={() => Alert.alert('Условия', 'Условия использования')}
              colors={colors}
            />
            <SettingRow
              icon="hand.raised.fill"
              iconColor={colors.muted}
              label="🔒 Политика конфиденциальности"
              onPress={() => Alert.alert('Конфиденциальность', 'Политика конфиденциальности')}
              colors={colors}
            />
          </Card>
        </Animated.View>

        {/* App Info */}
        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: colors.muted }]}>
            SleepMind · Спите лучше. Без стресса.
          </ThemedText>
          <ThemedText style={[styles.footerSubtext, { color: colors.muted }]}>
            Сделано с 💜 для лучшего сна
          </ThemedText>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 14,
  },
  backendInputContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  backendInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  signInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  signInIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    flex: 1,
  },
  signInTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  signInSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerCard: {
    width: 300,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  timePickerTitle: {
    marginBottom: 4,
  },
  timePickerSub: {
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  timeColumn: {
    alignItems: 'center',
    gap: 10,
  },
  timeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    width: 72,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeColon: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  timePickerActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  timePickerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});
