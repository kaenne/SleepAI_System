import * as React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * SleepMind icon set — thin-stroke SVGs (1.7–1.8). Each icon takes a uniform
 * `size` (default 22) and `color` (default text-secondary). Use the indexed
 * `Ico.<name>` form for typed access:
 *
 *   <Ico.Bell size={20} color={Brand.accent} />
 */

type IconProps = {
  size?: number;
  color?: string;
  /** Stroke width override. Default 1.8. */
  weight?: number;
};

const STROKE = 1.8;

function Frame({ children, size = 22 }: { children: React.ReactNode; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

const defaults = (color?: string, weight?: number) => ({
  stroke: color ?? Brand.textSecondary,
  strokeWidth: weight ?? STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

// ── Icons ────────────────────────────────────────────────────────────────────

const Bell = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...defaults(color, weight)} />
    <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" {...defaults(color, weight)} />
  </Frame>
);

const Alarm = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Circle cx="12" cy="13" r="8" {...defaults(color, weight)} />
    <Path d="M12 9v4l2.5 2.5" {...defaults(color, weight)} />
    <Path d="M5 3 2 6m17-3 3 3" {...defaults(color, weight)} />
  </Frame>
);

const Moon = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" {...defaults(color, weight)} />
  </Frame>
);

const Globe = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Circle cx="12" cy="12" r="9" {...defaults(color, weight)} />
    <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" {...defaults(color, weight)} />
  </Frame>
);

const Cloud = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 14h11.5z" {...defaults(color, weight)} />
  </Frame>
);

const Download = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" {...defaults(color, weight)} />
  </Frame>
);

const ChevronRight = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="m9 6 6 6-6 6" {...defaults(color, weight)} />
  </Frame>
);

const ChevronLeft = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="m15 6-6 6 6 6" {...defaults(color, weight)} />
  </Frame>
);

const ChevronUp = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="m6 15 6-6 6 6" {...defaults(color, weight)} />
  </Frame>
);

const ChevronDown = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="m6 9 6 6 6-6" {...defaults(color, weight)} />
  </Frame>
);

const Plus = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M12 5v14M5 12h14" {...defaults(color, weight)} />
  </Frame>
);

const Close = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M18 6 6 18M6 6l12 12" {...defaults(color, weight)} />
  </Frame>
);

const Check = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="m5 12 5 5 9-12" {...defaults(color, weight)} />
  </Frame>
);

const Login = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" {...defaults(color, weight)} />
  </Frame>
);

const User = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...defaults(color, weight)} />
    <Circle cx="12" cy="7" r="4" {...defaults(color, weight)} />
  </Frame>
);

const Heart = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21l7.78-7.55 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      {...defaults(color, weight)}
    />
  </Frame>
);

const Pulse = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M3 12h4l2-6 4 12 2-6h6" {...defaults(color, weight)} />
  </Frame>
);

const ChartBar = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M3 21h18M7 17V8m5 9V4m5 13v-7" {...defaults(color, weight)} />
  </Frame>
);

const Book = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5V21h16" {...defaults(color, weight)} />
  </Frame>
);

const Chat = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" {...defaults(color, weight)} />
  </Frame>
);

const Settings = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Circle cx="12" cy="12" r="3" {...defaults(color, weight)} />
    <Path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      {...defaults(color, weight)}
    />
  </Frame>
);

const Note = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...defaults(color, weight)} />
    <Path d="M14 2v6h6M9 13h6m-6 4h4" {...defaults(color, weight)} />
  </Frame>
);

const Sparkles = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" {...defaults(color, weight)} />
  </Frame>
);

const Info = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Circle cx="12" cy="12" r="9" {...defaults(color, weight)} />
    <Path d="M12 8h.01M11 12h1v4h1" {...defaults(color, weight)} />
  </Frame>
);

const Smile = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Circle cx="12" cy="12" r="9" {...defaults(color, weight)} />
    <Path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" {...defaults(color, weight)} />
  </Frame>
);

const Flame = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path
      d="M8.5 14.5A2.5 2.5 0 0 0 11 17a3 3 0 0 0 3-3c0-1.6-1.4-2.4-2-3.4-.7-1.2-1-2-1-3.6 0-1.6 1-3 1-3s-2.5 0-4 2c-1.5 2-1.5 5-1.5 6.5a3 3 0 0 0 2 2.5z"
      {...defaults(color, weight)}
    />
  </Frame>
);

const Star = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" {...defaults(color, weight)} />
  </Frame>
);

const Square = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Rect x="3" y="3" width="18" height="18" rx="2" {...defaults(color, weight)} />
  </Frame>
);

const Trash = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" {...defaults(color, weight)} />
  </Frame>
);

const ArrowUp = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M12 19V5M5 12l7-7 7 7" {...defaults(color, weight)} />
  </Frame>
);

const ArrowDown = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M12 5v14M5 12l7 7 7-7" {...defaults(color, weight)} />
  </Frame>
);

const Minus = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M5 12h14" {...defaults(color, weight)} />
  </Frame>
);

const Trophy = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M6 9V4h12v5a6 6 0 0 1-12 0zM4 4h2M18 4h2M4 4a2 2 0 0 0 2 2v3M20 4a2 2 0 0 1-2 2v3M9 21h6M12 15v6" {...defaults(color, weight)} />
  </Frame>
);

const Pencil = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="m12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" {...defaults(color, weight)} />
  </Frame>
);

const Leaf = ({ size, color, weight }: IconProps) => (
  <Frame size={size}>
    <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6" {...defaults(color, weight)} />
  </Frame>
);

// Indexed export — typed access via `Ico.<name>`.
export const Ico = {
  Bell, Alarm, Moon, Globe, Cloud, Download,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  Plus, Close, Check, Login, User, Heart, Pulse,
  ChartBar, Book, Chat, Settings, Note, Sparkles, Info,
  Smile, Flame, Star, Square, Trash, ArrowUp, ArrowDown, Minus,
  Trophy, Pencil, Leaf,
} as const;

export type IcoName = keyof typeof Ico;
