import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type AiTipCardProps = {
  tip: string;
};

export function AiTipCard({ tip }: AiTipCardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();

  return (
    <View style={[styles.card, {
      backgroundColor: isDark ? Brand.surface : '#FFFFFF',
      borderColor: isDark ? Brand.border : '#E5E7EB',
    }]}>
      <View style={[styles.accentBar, { backgroundColor: colors.tint }]} />
      <View style={styles.inner}>
        <View style={styles.row}>
          <View style={[styles.iconWrapper, { backgroundColor: isDark ? Brand.accentSoft : `${colors.tint}18` }]}>
            <IconSymbol name="sparkles" size={16} color={colors.tint} />
          </View>
          <ThemedText style={[styles.title, { color: isDark ? Brand.textPrimary : '#1F2937' }]}>{t('home.aiTipTitle')}</ThemedText>
        </View>
        <ThemedText style={[styles.body, { color: isDark ? Brand.textSecondary : '#6B7280' }]}>{tip}</ThemedText>
      </View>
    </View>
  );
}

type AiInsightCardProps = {
  insight: string;
};

export function AiInsightCard({ insight }: AiInsightCardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <View style={[styles.card, {
        backgroundColor: isDark ? Brand.surface : '#FFFFFF',
        borderColor: isDark ? Brand.border : '#E5E7EB',
      }]}>
        <View style={[styles.accentBar, { backgroundColor: colors.success }]} />
        <View style={styles.inner}>
          <View style={styles.row}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? `${Brand.good}1f` : `${colors.success}18` }]}>
              <IconSymbol name="bolt.fill" size={16} color={colors.success} />
            </View>
            <ThemedText style={[styles.title, { color: isDark ? Brand.textPrimary : '#1F2937' }]}>{t('home.aiInsightTitle')}</ThemedText>
          </View>
          <ThemedText style={[styles.body, { color: isDark ? Brand.textSecondary : '#6B7280' }]}>{insight}</ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderRadius: 2,
    margin: 14,
    marginRight: 0,
  },
  inner: {
    flex: 1,
    padding: Spacing.md,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});
