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
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Brand, Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { api } from '@/services/api';

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { login, isLoading, error, clearError } = useAuth();
  const { t } = useTranslation();
  const { rs, rf } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear any auth error left over from the previous screen on mount.
  React.useEffect(() => {
    clearError();
  }, [clearError]);

  // Google OAuth temporarily disabled — new Google Android OAuth clients require
  // custom URI scheme activation that has no public API. Restore after thesis defense.
  // const handleGoogleSuccess = async (accessToken: string) => { ... };
  // const { signIn: signInWithGoogle, isPending: googlePending, isConfigured: googleConfigured } = useGoogleAuth(handleGoogleSuccess);

  const handleForgotPassword = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      Alert.alert(
        t('login.forgotPwTitle') as string,
        t('login.forgotPwNeedEmail') as string,
      );
      return;
    }
    try {
      await api.forgotPassword(targetEmail);
      Alert.alert(
        t('login.forgotPwTitle') as string,
        (t('login.forgotPwSent') as string).replace('{{email}}', targetEmail),
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      Alert.alert(
        t('login.forgotPwTitle') as string,
        err?.message || (t('login.forgotPwError') as string),
      );
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      setValidationError(t('login.validate_email_empty') as string);
      return false;
    }
    if (!email.includes('@')) {
      setValidationError(t('login.validate_email_invalid') as string);
      return false;
    }
    if (!password) {
      setValidationError(t('login.validate_password_empty') as string);
      return false;
    }
    if (password.length < 6) {
      setValidationError(t('login.validate_password_short') as string);
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleLogin = async () => {
    clearError();
    if (!validateForm()) return;

    try {
      await login({ email: email.trim().toLowerCase(), password });
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const err = error as { message?: string };
      Alert.alert(t('login.errorTitle') as string, err?.message || (t('login.errorFallback') as string));
    }
  };

  const displayError = validationError || error;
  const anyLoading = isLoading;

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
              style={[styles.logoContainer, { width: rs(100), height: rs(100), borderRadius: rs(50) }]}
            >
              <IconSymbol name="moon.stars.fill" size={rs(48)} color="#FFFFFF" />
            </LinearGradient>
            <ThemedText style={[styles.title, { fontSize: rf(28) }]}>{t('login.title')}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary, fontSize: rf(16) }]}>
              {t('login.subtitle')}
            </ThemedText>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                {t('login.emailLabel')}
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
                  placeholder={t('login.emailPlaceholder') as string}
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
                {t('login.passwordLabel')}
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: displayError && !password ? colors.error : colors.inputBorder,
                  },
                ]}
              >
                <IconSymbol name="lock.fill" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('login.passwordPlaceholder') as string}
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setValidationError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
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
            </View>

            {/* Forgot Password */}
            <Pressable
              onPress={handleForgotPassword}
              style={styles.forgotPassword}
            >
              <ThemedText style={[styles.forgotPasswordText, { color: colors.tint }]}>
                {t('login.forgotPassword')}
              </ThemedText>
            </Pressable>

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

            {/* Login Button */}
            <Pressable
              style={[
                styles.loginButton,
                { backgroundColor: Brand.accent, opacity: anyLoading ? 0.7 : 1 },
              ]}
              onPress={handleLogin}
              disabled={anyLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Brand.textInverse} />
              ) : (
                <ThemedText style={[styles.loginButtonText, { color: Brand.textInverse, fontSize: rf(16) }]}>
                  {t('login.submitBtn')}
                </ThemedText>
              )}
            </Pressable>

            {/*
              Social login (Apple + Google) temporarily hidden until Google OAuth
              custom URI scheme is enabled for the Android client (new Google clients
              require gcloud workforce-style configuration). Restore after thesis defense.

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.inputBorder }]} />
                <ThemedText style={[styles.dividerText, { color: colors.muted }]}>
                  {t('login.orLogin')}
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: colors.inputBorder }]} />
              </View>

              <View style={styles.socialButtons}>
                <Pressable style={[styles.socialButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <IconSymbol name="apple.logo" size={rs(24)} color={colors.text} />
                </Pressable>
                <Pressable
                  style={[styles.socialButton, { backgroundColor: colors.inputBackground, borderColor: googleConfigured ? colors.inputBorder : colors.cardBorder, opacity: googleConfigured ? 1 : 0.45 }]}
                  onPress={signInWithGoogle}
                  disabled={!googleConfigured || anyLoading}
                >
                  {googlePending ? <ActivityIndicator size="small" color="#4285F4" /> : <ThemedText style={[styles.googleIcon, { fontSize: rf(24) }]}>G</ThemedText>}
                </Pressable>
              </View>
              {!googleConfigured && (
                <ThemedText style={[styles.googleHint, { color: colors.muted }]}>
                  {t('login.googleNotConfigured')}
                </ThemedText>
              )}
            */}

            {/* Development Mode - Mock Credentials Removed for Production */}

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <ThemedText style={[styles.registerText, { color: colors.textSecondary }]}>
                {t('login.noAccount')}
              </ThemedText>
              <Link href={'/register'} asChild replace>
                <Pressable>
                  <ThemedText style={[styles.registerLink, { color: colors.tint }]}>
                    {t('login.registerLink')}
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
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
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
  loginButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  mockCredentials: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  mockTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  mockCredential: {
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  mockCredentialText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mockCredentialPassword: {
    fontSize: 11,
    marginTop: 2,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
