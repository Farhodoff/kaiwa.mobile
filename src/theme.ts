import { TextStyle } from 'react-native';

/**
 * Kaiwa.live design tokens — extracted from the Figma file
 * "Kaiwa.live — Mobile UI UX".
 */
export const colors = {
  // Brand
  primary: '#6C5CE7',
  primaryDark: '#5A4BD4',
  primaryLight: '#EEEAFE',
  primarySoft: '#F4F1FF',

  // Accents
  accent: '#FF6B6B',
  accentSoft: '#FFEDED',
  success: '#22C55E',
  successLight: '#E9FBEF',
  warning: '#F59E0B',
  warningLight: '#FEF6E7',
  info: '#38BDF8',

  // Neutrals
  bg: '#F5F5F7',
  card: '#FFFFFF',
  border: '#ECECF1',
  divider: '#F1F1F5',

  text: '#16161D',
  textSecondary: '#6E6E7B',
  textMuted: '#A0A0AE',
  white: '#FFFFFF',

  // Bottom tab
  tabInactive: '#A9A9B8',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700', color: colors.text },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, fontWeight: '400', color: colors.text },
  bodySecondary: { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  small: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
};

export const shadow = {
  card: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
