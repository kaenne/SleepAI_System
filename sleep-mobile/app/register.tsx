import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import * as React from 'react';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { register, isLoading, error, clearError } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ageText, setAgeText] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);

  const validateForm = () => {
    if (!name.trim()) {
      setValidationError(t('register.validate_name_empty'));
      return false;
    }
    if (name.trim().length < 2) {
      setValidationError(t('register.validate_name_short'));
      return false;
    }
    if (!email.trim()) {
      setValidationError(t('register.validate_email_empty'));
      return false;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setValidationError(t('register.validate_email_invalid'));
      return false;
    }
    if (!password) {
      setValidationError(t('register.validate_password_empty'));
      return false;
    }
    if (password.length < 6) {
      setValidationError(t('register.validate_password_short'));
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError(t('register.validate_passwords_mismatch'));
      return false;
    }
    if (ageText && (Number(ageText) < 10 || Number(ageText) > 100)) {
      setValidationError(t('register.validate_age_invalid'));
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleRegister = async () => {
    clearError();
    if (!validateForm()) return;

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      // Сохраняем возраст/пол локально для AI предсказаний
      const age = ageText ? Number(ageText) : null;
      const genderNum = gender === 'male' ? 1 : gender === 'female' ? 0 : null;
      await AsyncStorage.setItem('sleepai_user_profile', JSON.stringify({
        age,
        gender: genderNum,
        bmiCategory: null,
      }));
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(t('register.errorTitle'), e?.message || t('register.errorFallback'));
    }
  };

  const displayError = validationError || error;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoContainer}
            >
              <IconSymbol name="moon.stars.fill" size={48} color="#FFFFFF" />
            </LinearGradient>
            <ThemedText style={styles.title}>{t('register.title')}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('register.subtitle')}
            </ThemedText>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                {t('register.nameLabel')}
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: displayError && !name ? colors.error : colors.inputBorder,
                  },
                ]}
              >
                <IconSymbol name="person.fill" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('register.namePlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setValidationError(null);
                  }}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                {t('register.emailLabel')}
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: displayError && !email ? colors.error : colors.inputBorder,
                  },
                ]}
              >
                <IconSymbol name="envelope.fill" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('register.emailPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setValidationError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                {t('register.passwordLabel')}
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: displayError && password.length > 0 && password.length < 6 
                      ? colors.error 
                      : colors.inputBorder,
                  },
                ]}
              >
                <IconSymbol name="lock.fill" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('register.passwordPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setValidationError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isLoading}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <IconSymbol
                    name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
              <ThemedText style={[styles.hint, { color: colors.muted }]}>
                {t('register.passwordHint')}
              </ThemedText>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                {t('register.confirmLabel')}
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor:
                      confirmPassword && password !== confirmPassword
                        ? colors.error
                        : colors.inputBorder,
                  },
                ]}
              >
                <IconSymbol name="lock.fill" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('register.confirmPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setValidationError(null);
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <IconSymbol
                    name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Age Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                {t('register.ageLabel')} <ThemedText style={[styles.hint, { color: colors.muted }]}>{t('register.optional')}</ThemedText>
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                ]}
              >
                <IconSymbol name="calendar" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('register.agePlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={ageText}
                  onChangeText={(t) => { setAgeText(t.replace(/[^0-9]/g, '')); setValidationError(null); }}
                  keyboardType="numeric"
                  maxLength={3}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Gender Select */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                {t('register.genderLabel')} <ThemedText style={[styles.hint, { color: colors.muted }]}>{t('register.optional')}</ThemedText>
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {(['male', 'female'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(gender === g ? null : g)}
                    style={[
                      styles.inputContainer,
                      { flex: 1, justifyContent: 'center',
                        backgroundColor: gender === g ? colors.tint + '20' : colors.inputBackground,
                        borderColor: gender === g ? colors.tint : colors.inputBorder },
                    ]}
                  >
                    <ThemedText style={{ color: gender === g ? colors.tint : colors.muted, fontWeight: gender === g ? '600' : '400' }}>
                      {g === 'male' ? t('register.male') : t('register.female')}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Error Message */}
            {displayError && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={[styles.errorContainer, { backgroundColor: colors.error + '15' }]}
              >
                <IconSymbol name="exclamationmark.circle.fill" size={18} color={colors.error} />
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {displayError}
                </ThemedText>
              </Animated.View>
            )}

            {/* Terms */}
            <ThemedText style={[styles.terms, { color: colors.textSecondary }]}>
              {t('register.terms')}
              <ThemedText style={{ color: colors.tint }}>{t('register.termsLink')}</ThemedText>
              {t('register.termsAnd')}
              <ThemedText style={{ color: colors.tint }}>{t('register.privacyLink')}</ThemedText>
            </ThemedText>

            {/* Register Button */}
            <Pressable
              style={[styles.registerButton, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.registerButtonText}>{t('register.submitBtn')}</ThemedText>
                )}
              </LinearGradient>
            </Pressable>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <ThemedText style={[styles.loginText, { color: colors.textSecondary }]}>
                {t('register.hasAccount')}{' '}
              </ThemedText>
              <Link href={'/login' as any} asChild replace>
                <Pressable>
                  <ThemedText style={[styles.loginLink, { color: colors.tint }]}>
                    {t('register.loginLink')}
                  </ThemedText>
                </Pressable>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  hint: {
    fontSize: 12,
    marginLeft: Spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  registerButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  registerButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
