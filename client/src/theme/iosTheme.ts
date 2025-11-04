import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { Platform } from 'react-native';
import { ColorPalette } from './colorPalettes';

// iOS native colors based on Apple's Human Interface Guidelines
export const iOSColors = {
  // System colors
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D55',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#5AC8FA',
  systemYellow: '#FFCC00',

  // Gray scale
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',

  // Label colors
  label: '#000000',
  secondaryLabel: '#3C3C43',
  tertiaryLabel: '#3C3C43',

  // Background colors
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',

  // Grouped background
  systemGroupedBackground: '#F2F2F7',
  secondarySystemGroupedBackground: '#FFFFFF',
  tertiarySystemGroupedBackground: '#F2F2F7',

  // Separator
  separator: '#C6C6C8',
  opaqueSeparator: '#C6C6C8',
};

// iOS-styled theme for React Native Paper
// Font is applied globally via CSS in App.tsx for web
export const iOSTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: iOSColors.systemBlue,
    secondary: iOSColors.systemGray,
    tertiary: iOSColors.systemGray3,
    error: iOSColors.systemRed,
    background: iOSColors.systemBackground,
    surface: iOSColors.secondarySystemGroupedBackground,
    surfaceVariant: iOSColors.systemGroupedBackground,
    onSurface: iOSColors.label,
    onSurfaceVariant: iOSColors.secondaryLabel,
    outline: iOSColors.separator,
  },
  roundness: 10, // iOS uses more rounded corners
};

// iOS typography with Josefin Sans font
export const iOSTypography = {
  // Large Title
  largeTitle: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_700Bold',
    fontSize: 34,
    fontWeight: '700' as '700',
    lineHeight: 41,
  },
  // Title 1
  title1: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_700Bold',
    fontSize: 28,
    fontWeight: '700' as '700',
    lineHeight: 34,
  },
  // Title 2
  title2: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_700Bold',
    fontSize: 22,
    fontWeight: '700' as '700',
    lineHeight: 28,
  },
  // Title 3
  title3: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_600SemiBold',
    fontSize: 20,
    fontWeight: '600' as '600',
    lineHeight: 25,
  },
  // Headline
  headline: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_600SemiBold',
    fontSize: 17,
    fontWeight: '600' as '600',
    lineHeight: 22,
  },
  // Body
  body: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_400Regular',
    fontSize: 17,
    fontWeight: '400' as '400',
    lineHeight: 22,
  },
  // Callout
  callout: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_400Regular',
    fontSize: 16,
    fontWeight: '400' as '400',
    lineHeight: 21,
  },
  // Subheadline
  subheadline: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_400Regular',
    fontSize: 15,
    fontWeight: '400' as '400',
    lineHeight: 20,
  },
  // Footnote
  footnote: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_400Regular',
    fontSize: 13,
    fontWeight: '400' as '400',
    lineHeight: 18,
  },
  // Caption 1
  caption1: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_400Regular',
    fontSize: 12,
    fontWeight: '400' as '400',
    lineHeight: 16,
  },
  // Caption 2
  caption2: {
    fontFamily: Platform.OS === 'web' ? 'Josefin Sans, sans-serif' : 'JosefinSans_400Regular',
    fontSize: 11,
    fontWeight: '400' as '400',
    lineHeight: 13,
  },
};

// iOS-specific spacing
export const iOSSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// iOS shadow styles
export const iOSShadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Create a theme with a specific color palette
export const createThemedIOSTheme = (palette: ColorPalette) => ({
  ...iOSTheme,
  colors: {
    ...iOSTheme.colors,
    // Primary for icons and headers
    primary: palette.primary,
    // Secondary for buttons
    secondary: palette.secondary,
    // bg700 replaces the main background color
    background: palette.background.bg700,
    // bg300 is the main color for all cards
    surface: palette.background.bg300,
    // bg500 is secondary for cards
    surfaceVariant: palette.background.bg500,
    // Text colors throughout the app
    onSurface: palette.text,
    onSurfaceVariant: palette.text,
    onBackground: palette.text,
    onPrimary: '#FFFFFF', // White text on primary colored elements
    onSecondary: '#FFFFFF', // White text on secondary colored elements
  },
});
