import { useColorScheme } from 'react-native';

/** Colour tokens from DESIGN.md §2. */
const light = {
  bg: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EDE8',
  text: '#1A1A1A',
  textMuted: '#6E6A64',
  border: '#E4E0D9',
  accent: '#1A1A1A',
  onAccent: '#FFFFFF',
  highlight: '#C8553D',
  success: '#4F7A5A',
  warning: '#B8860B',
  danger: '#B3261E',
};

const dark: typeof light = {
  bg: '#121110',
  surface: '#1C1B19',
  surfaceMuted: '#262421',
  text: '#F2F0EC',
  textMuted: '#A39E96',
  border: '#33302C',
  accent: '#F2F0EC',
  onAccent: '#121110',
  highlight: '#E07A5F',
  success: '#7FB08A',
  warning: '#E0B54A',
  danger: '#F2B8B5',
};

export type Colors = typeof light;

/** Spacing scale from DESIGN.md §4. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { tile: 12, sheet: 20, pill: 999 } as const;

/** Typography from DESIGN.md §3. Serif on iOS is "New York" via the system serif family. */
export const type = {
  display: { fontFamily: 'ui-serif', fontSize: 34, lineHeight: 40, fontWeight: '600' },
  title: { fontFamily: 'ui-serif', fontSize: 22, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  number: { fontSize: 28, lineHeight: 32, fontWeight: '600', fontVariant: ['tabular-nums'] },
} as const;

export function useTheme() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  return { colors, space, radius, type, dark: scheme === 'dark' };
}

export const palettes = { light, dark };
