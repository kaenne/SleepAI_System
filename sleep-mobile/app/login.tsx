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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DEBUG_USE_MOCK_AUTH, getMockCredentials } from '@/services/auth';

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateForm = () => {
    if (!email.trim()) {
      setValidationError('Введите email');
      return false;
    }
    if (!email.includes('@')) {
      setValidationError('Введите корректный email');
      return false;
    }
    if (!password) {
      setValidationError('Введите пароль');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Пароль должен содержать минимум 6 символов');
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
    } catch (e: any) {
      Alert.alert('Ошибка входа', e?.message || 'Проверьте данные и попробуйте снова.');
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
            <ThemedText style={styles.title}>С возвращением</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Войдите, чтобы продолжить
            </ThemedText>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                Email
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
                    placeholder="Введите email"
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
                Пароль
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
                    placeholder="Введите пароль"
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
            <Pressable style={styles.forgotPassword}>
              <ThemedText style={[styles.forgotPasswordText, { color: colors.tint }]}>
                Забыли пароль?
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
                { opacity: isLoading ? 0.7 : 1 },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.loginButtonText}>Войти</ThemedText>
                )}
              </LinearGradient>
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.inputBorder }]} />
              <ThemedText style={[styles.dividerText, { color: colors.muted }]}>
                или войти через
              </ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colors.inputBorder }]} />
            </View>

            {/* Social Login */}
            <View style={styles.socialButtons}>
              <Pressable
                style={[
                  styles.socialButton,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                ]}
              >
                <IconSymbol name="apple.logo" size={24} color={colors.text} />
              </Pressable>
              <Pressable
                style={[
                  styles.socialButton,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                ]}
              >
                <ThemedText style={styles.googleIcon}>G</ThemedText>
              </Pressable>
            </View>

            {/* Development Mode - Mock Credentials */}
            {DEBUG_USE_MOCK_AUTH && (
              <View style={[styles.mockCredentials, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                <ThemedText style={[styles.mockTitle, { color: colors.tint }]}>
                  🧪 DEV MODE - Test Credentials
                </ThemedText>
                {getMockCredentials().map((cred, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      setEmail(cred.email);
                      setPassword(cred.password);
                    }}
                    style={[styles.mockCredential, { backgroundColor: colors.inputBackground }]}
                  >
                    <ThemedText style={styles.mockCredentialText}>
                      📧 {cred.email}
                    </ThemedText>
                    <ThemedText style={[styles.mockCredentialPassword, { color: colors.muted }]}>
                      🔑 {cred.password}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <ThemedText style={[styles.registerText, { color: colors.textSecondary }]}>
                {"Нет аккаунта? "}
              </ThemedText>
              <Link href={'/register' as any} asChild replace>
                <Pressable>
                  <ThemedText style={[styles.registerLink, { color: colors.tint }]}>
                    Регистрация
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
    overflow: 'hidden',
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
