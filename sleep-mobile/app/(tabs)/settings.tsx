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
    Share,
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
import { LANG_OPTIONS, useTranslation } from '@/contexts/i18n-context';
import { useColorSchemeOverride, useTheme } from '@/contexts/theme-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { api } from '@/services/api';
import Constants from 'expo-constants';

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

export default function SettingsScreen() {
  const colorScheme = useColorSchemeOverride() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const notif = useNotifications();
  const { entries, clearAll } = useSleepJournal();
  const { t, language, setLanguage } = useTranslation();

  const [backendUrl, setBackendUrl] = React.useState(api.getBaseUrl() || '');
  const [showBackendInput, setShowBackendInput] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [showLangPicker, setShowLangPicker] = React.useState(false);
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
      Alert.alert(t('settings.allowNotifications'), t('settings.allowNotificationsMsg'));
    }
  }, [notif, t]);

  const handleSaveTime = React.useCallback(async () => {
    await notif.updateTime({ hour: tempHour, minute: tempMinute });
    setShowTimePicker(false);
    if (notif.enabled) {
      const time = `${String(tempHour).padStart(2,'0')}:${String(tempMinute).padStart(2,'0')}`;
      Alert.alert(t('common.done'), t('settings.reminderSet', { time }));
    }
  }, [notif, tempHour, tempMinute, t]);

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
      t('settings.logoutTitle'),
      t('settings.logoutMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logoutBtn'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/welcome' as any);
          },
        },
      ]
    );
  }, [logout, t]);

  const handleExport = React.useCallback(async () => {
    if (isAuthenticated) {
      try {
        const data = await api.exportUserData();
        await Share.share({ message: JSON.stringify(data, null, 2), title: 'SleepAI export' });
      } catch {
        Alert.alert(t('common.error'), t('common.comingSoon'));
      }
    } else {
      // Guest: export local journal entries
      try {
        await Share.share({
          message: JSON.stringify(entries, null, 2),
          title: 'SleepAI export',
        });
      } catch {
        // Share cancelled – ignore
      }
    }
  }, [isAuthenticated, entries, t]);

  const handleClearData = React.useCallback(() => {
    Alert.alert(
      t('settings.clearDataTitle'),
      t('settings.clearDataMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.clearDataBtn'), 
          style: 'destructive',
          onPress: async () => {
            if (isAuthenticated) {
              try {
                await api.deleteUserData();
              } catch { /* ignore if offline */ }
            }
            await clearAll();
            Alert.alert(t('common.done'), t('settings.clearDone'));
          }
        },
      ]
    );
  }, [isAuthenticated, clearAll, t]);

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
            <ThemedText style={styles.headerTitle}>{t('settings.title')}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>{t('settings.subtitle')}</ThemedText>
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
                  {isAuthenticated && user ? user.name : t('settings.guest')}
                </ThemedText>
                <ThemedText type="caption">
                  {isAuthenticated && user ? user.email : t('settings.loginPrompt')}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </Pressable>
          </Card>
        </Animated.View>

        {/* Account Section - only show if authenticated */}
        {isAuthenticated && (
          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <ThemedText style={styles.sectionTitle}>{t('settings.account')}</ThemedText>
            <Card variant="default">
              <SettingRow icon="person.fill" iconColor={colors.tint} label={t('settings.editProfile')}
                onPress={() => Alert.alert(t('settings.editProfile'), t('common.comingSoon'))} colors={colors} />
              <SettingRow icon="lock.fill" iconColor={colors.warning} label={t('settings.changePassword')}
                onPress={() => Alert.alert(t('settings.changePassword'), t('common.comingSoon'))} colors={colors} />
              <SettingRow icon="rectangle.portrait.and.arrow.right" iconColor={colors.danger}
                label={t('settings.logout')} onPress={handleLogout} colors={colors} />
            </Card>
          </Animated.View>
        )}

        {/* Sign In prompt for guests */}
        {!isAuthenticated && (
          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <ThemedText style={styles.sectionTitle}>{t('settings.account')}</ThemedText>
            <Card variant="default">
              <Pressable style={styles.signInPrompt} onPress={() => router.push('/login' as any)}>
                <View style={[styles.signInIcon, { backgroundColor: colors.tint + '20' }]}>
                  <IconSymbol name="person.badge.plus" size={24} color={colors.tint} />
                </View>
                <View style={styles.signInText}>
                  <ThemedText style={[styles.signInTitle, { color: colors.tint }]}>
                    {t('settings.signIn')}
                  </ThemedText>
                  <ThemedText style={[styles.signInSubtitle, { color: colors.textSecondary }]}>
                    {t('settings.signInSubtitle')}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.tint} />
              </Pressable>
            </Card>
          </Animated.View>
        )}

        {/* App Preferences */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <ThemedText style={styles.sectionTitle}>{t('settings.appSettings')}</ThemedText>
          <Card variant="default">
            <SettingRow icon="bell.fill" iconColor={colors.accent} label={t('settings.notifications')}
              hasToggle toggleValue={notif.enabled} onToggle={handleNotifToggle} colors={colors} />
            <SettingRow icon="clock.fill" iconColor={colors.warning} label={t('settings.reminderTime')}
              value={notif.timeString} onPress={() => setShowTimePicker(true)} colors={colors} />
            {notif.enabled && Platform.OS !== 'web' && (
              <SettingRow icon="paperplane.fill" iconColor={colors.success} label={t('settings.testNotif')}
                onPress={notif.sendTestNotification} colors={colors} />
            )}
            <SettingRow icon="moon.fill" iconColor={colors.tint} label={t('settings.darkMode')}
              hasToggle toggleValue={isDark} onToggle={toggleTheme} colors={colors} />
            <SettingRow icon="globe" iconColor={'#3B82F6'} label={t('settings.language')}
              value={LANG_OPTIONS.find(l => l.value === language)?.flag + ' ' + LANG_OPTIONS.find(l => l.value === language)?.label}
              onPress={() => setShowLangPicker(true)} colors={colors} />
          </Card>
        </Animated.View>

        {/* Language Picker Modal */}
        <Modal visible={showLangPicker} transparent animationType="fade" onRequestClose={() => setShowLangPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.timePickerCard, { backgroundColor: colors.cardBackground }]}>
              <ThemedText type="subtitle" style={styles.timePickerTitle}>{t('settings.languageTitle')}</ThemedText>
              <View style={{ gap: 10, marginTop: 12 }}>
                {LANG_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => { setLanguage(opt.value); setShowLangPicker(false); }}
                    style={[
                      styles.langOption,
                      { backgroundColor: language === opt.value ? colors.tint + '20' : colors.cardBorder,
                        borderColor: language === opt.value ? colors.tint : 'transparent',
                        borderWidth: 1.5 }
                    ]}
                  >
                    <ThemedText style={{ fontSize: 24 }}>{opt.flag}</ThemedText>
                    <ThemedText style={{ fontSize: 16, fontWeight: language === opt.value ? '700' : '400',
                      color: language === opt.value ? colors.tint : colors.text }}>
                      {opt.label}
                    </ThemedText>
                    {language === opt.value && (
                      <IconSymbol name="checkmark" size={18} color={colors.tint} style={{ marginLeft: 'auto' }} />
                    )}
                  </Pressable>
                ))}
              </View>
              <Pressable style={[styles.timePickerBtn, { backgroundColor: colors.cardBorder, marginTop: 16, alignSelf: 'stretch' }]}
                onPress={() => setShowLangPicker(false)}>
                <ThemedText style={{ fontWeight: '600', color: colors.text }}>{t('common.close')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Time Picker Modal */}
        <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.timePickerCard, { backgroundColor: colors.cardBackground }]}>
              <ThemedText type="subtitle" style={styles.timePickerTitle}>{t('settings.timePickerTitle')}</ThemedText>
              <ThemedText style={[styles.timePickerSub, { color: colors.textSecondary }]}>
                {t('settings.dailyReminder')}
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
                <Pressable style={[styles.timePickerBtn, { backgroundColor: colors.cardBorder }]} onPress={() => setShowTimePicker(false)}>
                  <ThemedText style={{ fontWeight: '600', color: colors.text }}>{t('common.cancel')}</ThemedText>
                </Pressable>
                <Pressable style={[styles.timePickerBtn, { backgroundColor: colors.tint }]} onPress={handleSaveTime}>
                  <ThemedText style={{ fontWeight: '700', color: '#FFFFFF' }}>{t('common.save')}</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Data & Sync */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <ThemedText style={styles.sectionTitle}>{t('settings.dataSync')}</ThemedText>
          <Card variant="default">
            <SettingRow icon="icloud.fill" iconColor={colors.accent} label={t('settings.dataSource')}
              value={t('settings.local')} onPress={() => setShowBackendInput(!showBackendInput)} colors={colors} />
            {showBackendInput && (
              <View style={styles.backendInputContainer}>
                <TextInput value={backendUrl} onChangeText={setBackendUrl}
                  placeholder="https://api.example.com" placeholderTextColor={colors.muted}
                  style={[styles.backendInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                  autoCapitalize="none" autoCorrect={false} />
                <Pressable onPress={() => { Alert.alert('Info', t('settings.backendInfo')); setShowBackendInput(false); }}
                  style={[styles.saveButton, { backgroundColor: colors.tint }]}>
                  <ThemedText style={styles.saveButtonText}>{t('common.save')}</ThemedText>
                </Pressable>
              </View>
            )}
            <SettingRow icon="arrow.triangle.2.circlepath" iconColor={colors.success} label={t('settings.export')}
              onPress={handleExport} colors={colors} />
            <SettingRow icon="trash.fill" iconColor={colors.danger} label={t('settings.clearData')}
              onPress={handleClearData} colors={colors} />
          </Card>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <ThemedText style={styles.sectionTitle}>{t('settings.about')}</ThemedText>
          <Card variant="outlined">
            <SettingRow icon="info.circle.fill" iconColor={colors.muted} label={t('settings.version')} value={Constants.expoConfig?.version ?? '1.0.0'} colors={colors} />
            <SettingRow icon="doc.text.fill" iconColor={colors.muted} label={t('settings.terms')}
              onPress={() => Alert.alert(t('settings.terms'), t('settings.terms'))} colors={colors} />
            <SettingRow icon="hand.raised.fill" iconColor={colors.muted} label={t('settings.privacy')}
              onPress={() => Alert.alert(t('settings.privacy'), t('settings.privacy'))} colors={colors} />
          </Card>
        </Animated.View>

        {/* App Info */}
        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: colors.muted }]}>{t('settings.footer')}</ThemedText>
          <ThemedText style={[styles.footerSubtext, { color: colors.muted }]}>{t('settings.footerSub')}</ThemedText>
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
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
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
