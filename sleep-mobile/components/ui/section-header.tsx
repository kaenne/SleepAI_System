import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Type } from '@/constants/theme';

/**
 * Section header for grouped lists — JetBrains Mono, uppercase, wide tracking,
 * with a thin trailing rule to anchor it to the section. Emit one per group:
 *
 *   <SectionHeader title={t('settings.account')} />
 *   <Card variant="flat">…</Card>
 */
export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  title: {
    ...Type.section,
    color: Brand.textMuted,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: Brand.borderSoft,
  },
});
