/**
 * Tenaville React Native theme.
 *
 * Load the fonts with expo-font: PlusJakartaSans_700Bold, Inter_400Regular,
 * Inter_600SemiBold.
 *
 * Deliberately free of react-native imports. The `useColorScheme` hook lives in
 * apps/mobile, which owns that dependency — keeping this file platform-neutral
 * is what allows the token drift test to import it from node, and what stops
 * @tenaville/ui from dragging react-native into the web build.
 */
const base = {
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 },
  radius: { sm: 6, md: 10, lg: 14, xl: 20, full: 999 },
  touchTarget: 44,
  font: {
    display: 'PlusJakartaSans_700Bold',
    body: 'Inter_400Regular',
    bodyStrong: 'Inter_600SemiBold',
  },
  text: {
    display: { fontSize: 36, lineHeight: 44 },
    h1: { fontSize: 24, lineHeight: 32 },
    title: { fontSize: 18, lineHeight: 26 },
    body: { fontSize: 15, lineHeight: 24 },
    small: { fontSize: 13, lineHeight: 20 },
    money: { fontSize: 28, lineHeight: 36, fontVariant: ['tabular-nums'] as const },
  },
};

export const lightTheme = {
  ...base,
  dark: false,
  colors: {
    bg: '#F6F8FB',
    surface: '#FFFFFF',
    surface2: '#F2F5FA',
    border: '#DEE3EC',
    border_strong: '#C2CAD8',
    text: '#0B1220',
    muted: '#475572',
    subtle: '#5F6B85',
    primary: '#0C4192',
    primary_hover: '#0A3A80',
    primary_soft: '#E4EDFA',
    on_primary: '#FFFFFF',
    accent: '#067A60',
    accent_hover: '#046B54',
    accent_soft: '#E1F6F0',
    on_accent: '#FFFFFF',
    success_soft: '#E1F6F0',
    success_text: '#046B54',
    warning_soft: '#FFF4DB',
    warning_text: '#8A5A00',
    danger: '#B3261E',
    danger_soft: '#FDECEA',
    danger_text: '#B3261E',
    info_soft: '#E4EDFA',
    info_text: '#0A3A80',
    ring: '#4B84D4',
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 32,
      elevation: 8,
    },
  },
};

export const darkTheme = {
  ...base,
  dark: true,
  colors: {
    bg: '#0B1220',
    surface: '#121A2B',
    surface2: '#1C2638',
    border: '#2D3950',
    border_strong: '#475572',
    text: '#EEF3FF',
    muted: '#A9B4C8',
    subtle: '#8C98AE',
    primary: '#7DAAF0',
    primary_hover: '#A3C3F5',
    primary_soft: '#12294F',
    on_primary: '#04204A',
    accent: '#34BC9A',
    accent_hover: '#5FD0B3',
    accent_soft: '#0F3A32',
    on_accent: '#04281F',
    success_soft: '#0F3A32',
    success_text: '#5FD0B3',
    warning_soft: '#3A2B08',
    warning_text: '#F2C14E',
    danger: '#C73E36',
    danger_soft: '#3D1613',
    danger_text: '#F28B82',
    info_soft: '#12294F',
    info_text: '#8DB4EA',
    ring: '#7DAAF0',
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.4,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.55,
      shadowRadius: 32,
      elevation: 8,
    },
  },
};

export type TenavilleTheme = typeof lightTheme;

/**
 * Colour keys use underscores (border_strong, on_primary) so they work as plain
 * object properties, where the CSS variables use hyphens.
 */
export const themeFor = (scheme: 'light' | 'dark' | null | undefined): TenavilleTheme =>
  scheme === 'dark' ? darkTheme : lightTheme;
