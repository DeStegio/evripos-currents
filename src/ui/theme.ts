import { Platform, TextStyle } from 'react-native';

/**
 * Evripos v2 — editorial paper palette.
 * Flat full-bleed sections divided by hairlines: no radii, no shadows, no card gaps.
 */
export const PAPER = '#FBF8F2';
export const BAND = '#F3EFE6';
export const NAVY = '#14395C';
export const INK = '#12263A';
export const MUTED = '#5C6A76';
export const SUBTLE = '#6B7883';
export const BODY = '#4C5A66';
export const RULE = '#DDD5C5';
export const RULE_SOFT = '#ECE6D9';
export const RULE_CHART = '#C9C0AD';
export const RULE_FAINT = '#E0D8C8';
export const ACCENT = '#E4661F';
export const NORTH = '#16745A';
export const SOUTH = '#B23A2A';

export const ON_NAVY = '#F3EFE6';
export const ON_NAVY_DIM = 'rgba(243,239,230,0.62)';
export const ON_NAVY_FAINT = 'rgba(243,239,230,0.55)';
export const ON_NAVY_LINE = 'rgba(243,239,230,0.28)';
export const ON_NAVY_IDLE = 'rgba(243,239,230,0.70)';
export const SCRIM = 'rgba(18,38,58,0.32)';

/** Map / strait schematic. */
export const LAND = '#EFE9DC';
export const COAST = '#CFC6B1';
export const WATER = '#E6EEEB';
export const BRIDGE_LINE = '#C3B9A2';
export const MOON_LIT = '#F7F2E6';

/** The design specifies Newsreader/Libre Franklin and falls back to Georgia/system. */
export const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: "Georgia, 'Times New Roman', serif",
});
export const SANS = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: "system-ui, -apple-system, 'Segoe UI', sans-serif",
});

/** Lining figures, so times and countdowns do not jitter as they tick. */
export const TNUM: TextStyle = { fontVariant: ['tabular-nums'] };

/** Section eyebrow: 9.5px / 600 / .2em tracking, used above every block. */
export const LABEL: TextStyle = {
  color: MUTED,
  fontFamily: SANS,
  fontSize: 9.5,
  fontWeight: '600',
  letterSpacing: 1.9,
};

export const GUTTER = 22;
