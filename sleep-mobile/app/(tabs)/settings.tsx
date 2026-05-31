import { router } from 'expo-router';
import * as React from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Btn } from '@/components/ui/btn';
import { Card } from '@/components/ui/card';
import { Ico, type IcoName } from '@/components/ui/ico';
import { SectionHeader } from '@/components/ui/section-header';
import { BorderRadius, Brand, Spacing, Type, tonal, tonalBorder } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { LANG_OPTIONS, useTranslation } from '@/contexts/i18n-context';
import { useTheme } from '@/contexts/theme-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useSleepJournal } from '@/hooks/use-sleep-journal';
import { api } from '@/services/api';
import Constants from 'expo-constants';

// ── Settings row ─────────────────────────────────────────────────────────────
type SettingRowProps = {
  icon: IcoName;
  iconColor: string;
  label: string;
  description?: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
};

function SettingRow({
  icon,
  iconColor,
  label,
  description,
  value,
  hasToggle,
  toggleValue,
  onToggle,
  onPress,
  isLast,
}: SettingRowProps) {
  const Icon = Ico[icon];
  const body = (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={[styles.iconChip, { backgroundColor: tonal(iconColor), borderColor: tonalBorder(iconColor) }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {description ? (
          <ThemedText style={styles.rowDescription}>{description}</ThemedText>
        ) : null}
      </View>
      {hasToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Brand.border, true: Brand.accentSoft }}
          thumbColor={toggleValue ? Brand.accent : Brand.textMuted}
        />
      ) : (
        <View style={styles.rowRight}>
          {value ? <ThemedText style={styles.rowValue}>{value}</ThemedText> : null}
          <Ico.ChevronRight size={18} color={Brand.textMuted} />
        </View>
      )}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} android_ripple={{ color: Brand.accentSoft }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

// ── Account header card ──────────────────────────────────────────────────────
function AccountCard({ isAuthenticated, name, email }: { isAuthenticated: boolean; name?: string; email?: string }) {
  const { t } = useTranslation();
  const initials = React.useMemo(() => {
    if (!name) return 'U';
    const p = name.trim().split(' ');
    return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : name.slice(0, 2)).toUpperCase();
  }, [name]);

  const isGuest = !isAuthenticated;

  return (
    <Card variant="bordered" animated={false}>
      <Pressable
        onPress={() => { if (isGuest) router.push('/login' as any); }}
        style={styles.accountRow}
        android_ripple={{ color: Brand.accentSoft }}
      >
        <View style={[styles.avatar, { backgroundColor: Brand.accent }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={styles.accountText}>
          <View style={styles.accountTitleRow}>
            <ThemedText style={styles.accountName}>{isGuest ? t('settings.guest') : name}</ThemedText>
            {isGuest ? (
              <View style={styles.offlineBadge}>
                <ThemedText style={styles.offlineBadgeText}>OFFLINE</ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText style={styles.accountSub} numberOfLines={1}>
            {isGuest ? t('settings.loginPrompt') : email}
          </ThemedText>
        </View>
        <Ico.ChevronRight size={18} color={Brand.textMuted} />
      </Pressable>
    </Card>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const notif = useNotifications();
  const { entries, clearAll, seedDemo } = useSleepJournal();
  const { t, language, setLanguage } = useTranslation();

  const [backendUrl, setBackendUrl] = React.useState(api.getBaseUrl() || '');
  const [showBackendInput, setShowBackendInput] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [showLangPicker, setShowLangPicker] = React.useState(false);
  const [tempHour, setTempHour] = React.useState(notif.time.hour);
  const [tempMinute, setTempMinute] = React.useState(notif.time.minute);

  React.useEffect(() => {
    if (showTimePicker) {
      setTempHour(notif.time.hour);
      setTempMinute(notif.time.minute);
    }
  }, [showTimePicker, notif.time]);

  const handleNotifToggle = React.useCallback(async (value: boolean) => {
    const ok = await notif.toggle(value);
    if (!ok && value) Alert.alert(t('settings.allowNotifications'), t('settings.allowNotificationsMsg'));
  }, [notif, t]);

  const handleSaveTime = React.useCallback(async () => {
    await notif.updateTime({ hour: tempHour, minute: tempMinute });
    setShowTimePicker(false);
    if (notif.enabled) {
      const time = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
      Alert.alert(t('common.done'), t('settings.reminderSet', { time }));
    }
  }, [notif, tempHour, tempMinute, t]);

  const handleLogout = React.useCallback(() => {
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logoutBtn'),
        style: 'destructive',
        onPress: async () => { await logout(); router.replace('/welcome' as any); },
      },
    ]);
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
      try {
        await Share.share({ message: JSON.stringify(entries, null, 2), title: 'SleepAI export' });
      } catch {}
    }
  }, [isAuthenticated, entries, t]);

  const handleSeedDemo = React.useCallback(() => {
    Alert.alert(t('settings.seedDemoTitle'), t('settings.seedDemoMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.seedDemoBtn'),
        onPress: async () => {
          try {
            const n = await seedDemo();
            Alert.alert(t('common.done'), t('settings.seedDemoDone', { n: String(n) }));
          } catch {
            Alert.alert(t('common.error'), t('common.comingSoon'));
          }
        },
      },
    ]);
  }, [seedDemo, t]);

  const handleClearData = React.useCallback(() => {
    Alert.alert(t('settings.clearDataTitle'), t('settings.clearDataMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.clearDataBtn'),
        style: 'destructive',
        onPress: async () => {
          let serverFailed = false;
          if (isAuthenticated) {
            try {
              await api.deleteUserData();
            } catch {
              serverFailed = true;
            }
          }
          await clearAll();
          if (serverFailed) {
            Alert.alert(t('common.error'), t('settings.clearServerFailed'));
          } else {
            Alert.alert(t('common.done'), t('settings.clearDone'));
          }
        },
      },
    ]);
  }, [isAuthenticated, clearAll, t]);

  const langLabel = LANG_OPTIONS.find((l) => l.value === language)?.label ?? language.toUpperCase();
  const reminderTime = `${String(notif.time.hour).padStart(2, '0')}:${String(notif.time.minute).padStart(2, '0')}`;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Brand.background }}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>{t('settings.title')}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{t('settings.subtitle')}</ThemedText>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AccountCard isAuthenticated={isAuthenticated} name={user?.name} email={user?.email} />

        {/* ── ACCOUNT ─────────────────────────────────────────────────────── */}
        <SectionHeader title={t('settings.account')} />
        {isAuthenticated ? (
          <Card variant="flat" animated={false} style={styles.cardPad}>
            <SettingRow
              icon="User"
              iconColor={Brand.accent}
              label={t('settings.editProfile')}
              onPress={() => Alert.alert(t('settings.editProfile'), t('common.comingSoon'))}
            />
            <SettingRow
              icon="Login"
              iconColor={Brand.warn}
              label={t('settings.changePassword')}
              onPress={() => Alert.alert(t('settings.changePassword'), t('common.comingSoon'))}
            />
            <SettingRow
              icon="Login"
              iconColor="#ff6b6b"
              label={t('settings.logout')}
              onPress={handleLogout}
              isLast
            />
          </Card>
        ) : (
          <Card variant="flat" animated={false} style={styles.cardPad}>
            <SettingRow
              icon="Login"
              iconColor={Brand.accent}
              label={t('settings.signIn')}
              description={t('settings.signInSubtitle')}
              onPress={() => router.push('/login' as any)}
              isLast
            />
          </Card>
        )}

        {/* ── APP SETTINGS ────────────────────────────────────────────────── */}
        <SectionHeader title={t('settings.appSettings')} />
        <Card variant="flat" animated={false} style={styles.cardPad}>
          <SettingRow
            icon="Bell"
            iconColor={Brand.info}
            label={t('settings.notifications')}
            description={t('settings.notificationsHint')}
            hasToggle
            toggleValue={notif.enabled}
            onToggle={handleNotifToggle}
          />
          <SettingRow
            icon="Alarm"
            iconColor={Brand.warn}
            label={t('settings.reminderTime')}
            value={reminderTime}
            onPress={() => setShowTimePicker(true)}
          />
          <SettingRow
            icon="Moon"
            iconColor={Brand.accent}
            label={t('settings.darkMode')}
            hasToggle
            toggleValue={isDark}
            onToggle={toggleTheme}
          />
          <SettingRow
            icon="Globe"
            iconColor={Brand.good}
            label={t('settings.language')}
            value={langLabel}
            onPress={() => setShowLangPicker(true)}
            isLast
          />
        </Card>

        {/* ── DATA & SYNC ─────────────────────────────────────────────────── */}
        <SectionHeader title={t('settings.dataSync')} />
        <Card variant="flat" animated={false} style={styles.cardPad}>
          <SettingRow
            icon="Cloud"
            iconColor={Brand.info}
            label={t('settings.dataSource')}
            description={`${t('settings.lastBackup')}: ${t('settings.never')}`}
            value={t('settings.create')}
            onPress={() => setShowBackendInput(!showBackendInput)}
          />
          {showBackendInput && (
            <View style={styles.backendInputWrap}>
              <TextInput
                value={backendUrl}
                onChangeText={setBackendUrl}
                placeholder="https://api.example.com"
                placeholderTextColor={Brand.textMuted}
                style={styles.backendInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Btn
                label={t('common.save')}
                onPress={() => {
                  Alert.alert('Info', t('settings.backendInfo'));
                  setShowBackendInput(false);
                }}
              />
            </View>
          )}
          <SettingRow
            icon="Download"
            iconColor={Brand.good}
            label={t('settings.export')}
            description="JSON · CSV"
            onPress={handleExport}
          />
          <SettingRow
            icon="Sparkles"
            iconColor={Brand.accent}
            label={t('settings.seedDemo')}
            description={t('settings.seedDemoHint')}
            onPress={handleSeedDemo}
          />
          <SettingRow
            icon="Close"
            iconColor="#ff6b6b"
            label={t('settings.clearData')}
            onPress={handleClearData}
            isLast
          />
        </Card>

        {/* ── ABOUT ───────────────────────────────────────────────────────── */}
        <SectionHeader title={t('settings.about')} />
        <Card variant="flat" animated={false} style={styles.cardPad}>
          <SettingRow
            icon="Info"
            iconColor={Brand.textMuted}
            label={t('settings.version')}
            value={Constants.expoConfig?.version ?? '1.0.0'}
          />
          <SettingRow
            icon="Note"
            iconColor={Brand.textMuted}
            label={t('settings.terms')}
            onPress={() => Alert.alert(t('settings.terms'), t('settings.terms'))}
          />
          <SettingRow
            icon="Note"
            iconColor={Brand.textMuted}
            label={t('settings.privacy')}
            onPress={() => Alert.alert(t('settings.privacy'), t('settings.privacy'))}
            isLast
          />
        </Card>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>{t('settings.footer')}</ThemedText>
          <ThemedText style={styles.footerSubtext}>{t('settings.footerSub')}</ThemedText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Language picker modal */}
      <Modal visible={showLangPicker} transparent animationType="fade" onRequestClose={() => setShowLangPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>{t('settings.languageTitle')}</ThemedText>
            <View style={{ gap: 8, marginTop: 12 }}>
              {LANG_OPTIONS.map((opt) => {
                const active = language === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => { setLanguage(opt.value); setShowLangPicker(false); }}
                    style={[
                      styles.langOption,
                      {
                        backgroundColor: active ? Brand.accentSoft : Brand.surface,
                        borderColor: active ? Brand.accentBorder : Brand.border,
                      },
                    ]}
                  >
                    <ThemedText style={styles.langCode}>{opt.value.toUpperCase()}</ThemedText>
                    <ThemedText style={[styles.langName, { color: active ? Brand.accent : Brand.textPrimary }]}>
                      {opt.label}
                    </ThemedText>
                    {active ? <Ico.Check size={18} color={Brand.accent} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 16 }}>
              <Btn label={t('common.close')} variant="secondary" onPress={() => setShowLangPicker(false)} fullWidth />
            </View>
          </View>
        </View>
      </Modal>

      {/* Time picker modal */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>{t('settings.timePickerTitle')}</ThemedText>
            <ThemedText style={styles.modalSub}>{t('settings.dailyReminder')}</ThemedText>
            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Pressable style={styles.timeStep} onPress={() => setTempHour((h) => (h + 1) % 24)}>
                  <Ico.ChevronUp size={18} color={Brand.accent} />
                </Pressable>
                <View style={styles.timeDisplay}>
                  <ThemedText style={styles.timeValue}>{String(tempHour).padStart(2, '0')}</ThemedText>
                </View>
                <Pressable style={styles.timeStep} onPress={() => setTempHour((h) => (h - 1 + 24) % 24)}>
                  <Ico.ChevronDown size={18} color={Brand.accent} />
                </Pressable>
              </View>

              <ThemedText style={styles.timeColon}>:</ThemedText>

              <View style={styles.timeColumn}>
                <Pressable style={styles.timeStep} onPress={() => setTempMinute((m) => (m + 5) % 60)}>
                  <Ico.ChevronUp size={18} color={Brand.accent} />
                </Pressable>
                <View style={styles.timeDisplay}>
                  <ThemedText style={styles.timeValue}>{String(tempMinute).padStart(2, '0')}</ThemedText>
                </View>
                <Pressable style={styles.timeStep} onPress={() => setTempMinute((m) => (m - 5 + 60) % 60)}>
                  <Ico.ChevronDown size={18} color={Brand.accent} />
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Btn label={t('common.cancel')} variant="secondary" onPress={() => setShowTimePicker(false)} fullWidth />
              <Btn label={t('common.save')} onPress={handleSaveTime} fullWidth />
            </View>

            {notif.enabled && Platform.OS !== 'web' && (
              <Pressable style={styles.testNotif} onPress={notif.sendTestNotification}>
                <Ico.Bell size={16} color={Brand.accent} />
                <ThemedText style={{ ...Type.bodyS, color: Brand.accent }}>{t('settings.testNotif')}</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { ...Type.display, color: Brand.textPrimary, marginBottom: 4 },
  headerSubtitle: { ...Type.bodyS, color: Brand.textSecondary },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: 32 },

  cardPad: { padding: 0, gap: 0, marginBottom: 0 },

  // Account row
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Type.titleM, color: Brand.textInverse },
  accountText: { flex: 1, gap: 4 },
  accountTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountName: { ...Type.titleS, color: Brand.textPrimary },
  offlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Brand.surfaceElevated,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  offlineBadgeText: { ...Type.monoS, color: Brand.textMuted, fontSize: 10, letterSpacing: 0.6 },
  accountSub: { ...Type.bodyS, color: Brand.textSecondary },

  // Settings row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: Spacing.hitArea,
    gap: 12,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Brand.borderSoft },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...Type.bodyM, color: Brand.textPrimary, fontSize: 15, fontWeight: '500' },
  rowDescription: { ...Type.bodyS, color: Brand.textSecondary, fontSize: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { ...Type.monoS, color: Brand.accent, fontSize: 13 },

  backendInputWrap: { flexDirection: 'row', gap: 10, padding: 16 },
  backendInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Brand.textPrimary,
    backgroundColor: Brand.surfaceElevated,
    fontFamily: Type.bodyM.fontFamily,
    fontSize: 14,
  },

  footer: { alignItems: 'center', marginTop: 24, paddingVertical: 12 },
  footerText: { ...Type.bodyS, color: Brand.textMuted, fontWeight: '600' },
  footerSubtext: { ...Type.monoS, color: Brand.textMuted, marginTop: 4, fontSize: 11 },

  // Modal — reused by both pickers
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Brand.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  modalTitle: { ...Type.titleM, color: Brand.textPrimary },
  modalSub: { ...Type.bodyS, color: Brand.textSecondary, marginTop: 4, marginBottom: 18 },

  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: Spacing.hitArea,
  },
  langCode: { ...Type.monoS, color: Brand.textMuted, fontSize: 13, letterSpacing: 1, width: 32 },
  langName: { ...Type.bodyM, fontWeight: '500' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 24, justifyContent: 'center' },
  timeColumn: { alignItems: 'center', gap: 8 },
  timeStep: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: Brand.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    width: 80,
    height: 60,
    borderRadius: 12,
    backgroundColor: Brand.surfaceElevated,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: { ...Type.monoL, fontSize: 30, color: Brand.textPrimary },
  timeColon: { ...Type.monoL, fontSize: 28, color: Brand.textMuted, marginBottom: 4 },

  testNotif: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 12,
  },
});
