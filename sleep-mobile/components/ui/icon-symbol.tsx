// Android / web fallback — uses Ionicons instead of SF Symbols.
// iOS uses icon-symbol.ios.tsx (native expo-symbols — unchanged).
// Icon reference: https://icons.expo.fyi  (filter by Ionicons)

import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];
type IconMapping = Partial<Record<SymbolViewProps['name'], IoniconsName>>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols → Ionicons mapping.
 * Add new icons here when needed — see https://icons.expo.fyi for Ionicons names.
 */
const MAPPING = {
  // ── Navigation ─────────────────────────────────────────────────────────────
  'house.fill':                               'home',
  'chevron.right':                            'chevron-forward',
  'chevron.left':                             'chevron-back',
  'chevron.up':                               'chevron-up',
  'chevron.down':                             'chevron-down',
  'chevron.left.forwardslash.chevron.right':  'code-slash',
  'xmark':                                    'close',
  'xmark.circle.fill':                        'close-circle',

  // ── Tab bar ─────────────────────────────────────────────────────────────────
  'chart.bar.fill':                           'bar-chart',
  'bubble.left.and.bubble.right.fill':        'chatbubbles',
  'gearshape.fill':                           'settings',
  'person.crop.circle.fill':                  'person-circle',

  // ── Actions ─────────────────────────────────────────────────────────────────
  'paperplane.fill':                          'send',
  'arrow.up':                                 'arrow-up',
  'arrow.down':                               'arrow-down',
  'arrow.up.circle.fill':                     'arrow-up-circle',
  'arrow.down.circle.fill':                   'arrow-down-circle',
  'arrow.up.right':                           'trending-up',
  'arrow.down.right':                         'trending-down',
  'arrow.triangle.2.circlepath':              'sync',
  'plus':                                     'add',
  'plus.circle.fill':                         'add-circle',
  'pencil':                                   'pencil',
  'trash':                                    'trash',
  'trash.fill':                               'trash',
  'checkmark':                                'checkmark',
  'checkmark.circle.fill':                    'checkmark-circle',
  'square.and.arrow.up':                      'share-social',
  'square.and.arrow.down':                    'download',
  'eye.fill':                                 'eye',
  'eye.slash.fill':                           'eye-off',

  // ── Sleep & Health ──────────────────────────────────────────────────────────
  'moon.fill':                                'moon',
  'moon.stars.fill':                          'moon',
  'moon.zzz.fill':                            'moon',
  'sun.horizon.fill':                         'partly-sunny',
  'sun.max.fill':                             'sunny',
  'heart.fill':                               'heart',
  'heart.text.square.fill':                   'heart-half',
  'waveform.path.ecg':                        'pulse',
  'brain.head.profile':                       'hardware-chip',
  'sparkles':                                 'sparkles',
  'bolt.fill':                                'flash',
  'flame.fill':                               'flame',
  'drop.fill':                                'water',
  'wind':                                     'cloudy-night',

  // ── Calendar & Time ─────────────────────────────────────────────────────────
  'calendar':                                 'calendar',
  'calendar.badge.plus':                      'calendar',
  'clock.fill':                               'time',
  'clock.badge.checkmark.fill':               'alarm',
  'timer':                                    'timer-outline',

  // ── Auth & User ─────────────────────────────────────────────────────────────
  'person.fill':                              'person',
  'person.badge.plus':                        'person-add',
  'person.2.fill':                            'people',
  'envelope.fill':                            'mail',
  'lock.fill':                                'lock-closed',
  'lock.open.fill':                           'lock-open',
  'key.fill':                                 'key',
  'apple.logo':                               'logo-apple',
  'rectangle.portrait.and.arrow.right':       'log-out',

  // ── Settings & Info ─────────────────────────────────────────────────────────
  'bell.fill':                                'notifications',
  'bell.slash.fill':                          'notifications-off',
  'icloud.fill':                              'cloud',
  'info.circle.fill':                         'information-circle',
  'exclamationmark.circle.fill':              'alert-circle',
  'exclamationmark.triangle.fill':            'warning',
  'doc.text.fill':                            'document-text',
  'hand.raised.fill':                         'hand-right',
  'shield.fill':                              'shield',
  'globe':                                    'globe',
  'paintbrush.fill':                          'color-palette',

  // ── Stats & Insights ────────────────────────────────────────────────────────
  'chart.line.uptrend.xyaxis':                'trending-up',
  'chart.xyaxis.line':                        'analytics',
  'chart.pie.fill':                           'pie-chart',
  'star.fill':                                'star',
  'star.leadinghalf.filled':                  'star-half',
  'target':                                   'locate',
  'book.fill':                                'book',
  'bookmark.fill':                            'bookmark',
} as const satisfies IconMapping;

/**
 * Cross-platform icon component.
 * Uses native SF Symbols on iOS (icon-symbol.ios.tsx) and Ionicons elsewhere.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const ionName = MAPPING[name];
  if (!ionName) return null;
  return <Ionicons color={color} size={size} name={ionName} style={style} />;
}
