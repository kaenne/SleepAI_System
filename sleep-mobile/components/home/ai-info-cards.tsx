import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTranslation } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type AiTipCardProps = {
  tip: string;
};

export function AiTipCard({ tip }: AiTipCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrapper, { backgroundColor: `${colors.accent}20` }]}>
          <IconSymbol name="sparkles" size={18} color={colors.accent} />
        </View>
        <ThemedText style={styles.title}>{t('home.aiTipTitle')}</ThemedText>
      </View>
      <ThemedText style={[styles.body, { color: colors.textSecondary }]}>{tip}</ThemedText>
    </Card>
  );
}

type AiInsightCardProps = {
  insight: string;
};

export function AiInsightCard({ insight }: AiInsightCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconWrapper, { backgroundColor: `${colors.success}20` }]}>
            <IconSymbol name="bolt.fill" size={18} color={colors.success} />
          </View>
          <ThemedText style={styles.title}>{t('home.aiInsightTitle')}</ThemedText>
        </View>
        <ThemedText style={[styles.body, { color: colors.textSecondary }]}>{insight}</ThemedText>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});
