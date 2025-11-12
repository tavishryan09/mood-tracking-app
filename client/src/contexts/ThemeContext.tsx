import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { ColorPaletteName, colorPalettes, ColorPalette } from '../theme/colorPalettes';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  selectedPalette: ColorPaletteName | string;
  setSelectedPalette: (palette: ColorPaletteName | string) => Promise<void>;
  currentColors: ColorPalette;
  customPalettes: Record<string, ColorPalette>;
  loadCustomPalettes: () => Promise<void>;
  // Internal use only - allow injecting custom color resolver
  setCustomColorResolver?: (resolver: ((section: string, element: string) => string) | null) => void;
  setIsUsingCustomTheme?: (isUsing: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Database keys for settings
const SELECTED_PALETTE_KEY = 'selected_color_palette';
const CUSTOM_PALETTES_KEY = 'custom_color_palettes_legacy';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedPalette, setSelectedPaletteState] = useState<ColorPaletteName | string>('default');
  const [customPalettes, setCustomPalettes] = useState<Record<string, ColorPalette>>({});
  const [adminDefaultPalette, setAdminDefaultPalette] = useState<ColorPalette | null>(null);
  const [customColorResolver, setCustomColorResolver] = useState<((section: string, element: string) => string) | null>(null);
  const [isUsingCustomTheme, setIsUsingCustomTheme] = useState<boolean>(false);
  const [userLoaded, setUserLoaded] = useState(false);

  // Load app-level default theme immediately on mount (no auth required)
  const loadAppDefaultTheme = useCallback(async () => {
    try {
      // Load the actual default color palette (not just a theme ID reference)
      const defaultPaletteResponse = await settingsAPI.app.get('default_color_palette');
      if (defaultPaletteResponse?.data?.value) {
        const defaultPalette = defaultPaletteResponse.data.value;
        console.log('[ThemeContext] Loaded default color palette with actual color values');

        // Store admin default in state instead of mutating imported object
        setAdminDefaultPalette(defaultPalette);

        // Set it as selected
        setSelectedPaletteState('default');
      } else {
        console.log('[ThemeContext] No default_color_palette found, using hardcoded default');
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('[ThemeContext] Error loading app default theme:', error);
      } else {
        console.log('[ThemeContext] No default_color_palette found (404), using hardcoded default');
      }
    }
  }, []);

  // Load app default on mount
  useEffect(() => {
    loadAppDefaultTheme();
  }, [loadAppDefaultTheme]);

  // Load user-specific settings when user logs in
  useEffect(() => {
    if (user && !userLoaded) {
      setUserLoaded(true);
      loadSavedPalette();
      loadCustomPalettesData();
    } else if (!user && userLoaded) {
      // User logged out, reload app default
      setUserLoaded(false);
      setCustomPalettes({});
      loadAppDefaultTheme();
    }
  }, [user, userLoaded, loadAppDefaultTheme]);

  const loadCustomPalettesData = useCallback(async () => {
    if (!user) return;

    try {
      const response = await settingsAPI.user.get(CUSTOM_PALETTES_KEY);
      if (response?.data?.value) {
        setCustomPalettes(response.data.value);
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('[ThemeContext] Error loading custom palettes:', error);
      }
    }
  }, [user]);

  const loadSavedPalette = async () => {
    if (!user) return;

    try {
      // Load both user preference and app-level default theme ID
      const [userPaletteResult, appDefaultResult] = await Promise.allSettled([
        settingsAPI.user.get(SELECTED_PALETTE_KEY),
        settingsAPI.app.get('default_custom_theme'),
      ]);

      let selectedTheme: string | null = null;

      // Priority: user preference > app default > hardcoded 'default'
      if (userPaletteResult.status === 'fulfilled' && userPaletteResult.value?.data?.value) {
        // User has their own preference
        selectedTheme = userPaletteResult.value.data.value;
      } else if (appDefaultResult.status === 'fulfilled' && appDefaultResult.value?.data?.value) {
        // No user preference, admin set a default theme
        // The admin default theme colors are already loaded in colorPalettes.default via loadAppDefaultTheme()
        // So we just use 'default' as the theme name
        console.log('[ThemeContext] Using admin default theme (already loaded in colorPalettes.default)');
        selectedTheme = 'default';
      }

      if (selectedTheme) {
        setSelectedPaletteState(selectedTheme);
      }
      // Otherwise keep the hardcoded default ('default')
    } catch (error: any) {
      console.error('[ThemeContext] Error loading saved palette:', error);
    }
  };

  const setSelectedPalette = useCallback(async (palette: ColorPaletteName | string) => {
    try {
      setSelectedPaletteState(palette);

      // Only save to database if user is logged in
      if (user) {
        await settingsAPI.user.set(SELECTED_PALETTE_KEY, palette);
      }
    } catch (error) {
      console.error('[ThemeContext] Error saving palette:', error);
      throw error;
    }
  }, [user]);

  // Get base colors from predefined palettes
  const baseColors = useMemo((): ColorPalette => {
    // First check custom palettes (old system)
    if (customPalettes[selectedPalette]) {
      return customPalettes[selectedPalette];
    }
    // If selectedPalette is 'default' and we have admin default, use it
    if (selectedPalette === 'default' && adminDefaultPalette) {
      console.log('[ThemeContext] Using admin default palette for base colors');
      return adminDefaultPalette;
    }
    // Then check predefined palettes
    if (colorPalettes[selectedPalette as ColorPaletteName]) {
      console.log('[ThemeContext] Using predefined palette:', selectedPalette);
      return colorPalettes[selectedPalette as ColorPaletteName];
    }
    // Fallback to hardcoded default (only if no admin default)
    console.log('[ThemeContext] Using fallback:', adminDefaultPalette ? 'admin default' : 'hardcoded default');
    return adminDefaultPalette || colorPalettes.default;
  }, [selectedPalette, customPalettes, adminDefaultPalette]);

  // Get current colors - either from custom theme or base palette
  const currentColors = useMemo((): ColorPalette => {
    // If not using custom theme, return base colors
    if (!isUsingCustomTheme || !customColorResolver) {
      console.log('[ThemeContext] currentColors using baseColors (not custom theme). isUsingCustomTheme:', isUsingCustomTheme, 'hasResolver:', !!customColorResolver);
      console.log('[ThemeContext] baseColors primary:', baseColors.primary, 'background.bg700:', baseColors.background?.bg700);
      return baseColors;
    }

    console.log('[ThemeContext] currentColors using custom theme resolver');
    // Build ColorPalette from custom theme
    const customColors: ColorPalette = {
      ...baseColors, // Start with defaults as fallback
      id: 'custom' as ColorPaletteName,
      name: 'Custom Theme',

      // Override with custom colors
      primary: customColorResolver('global', 'primaryButton'),
      secondary: customColorResolver('global', 'secondaryButton'),
      text: customColorResolver('global', 'textPrimary'),
      textSecondary: customColorResolver('global', 'textSecondary'),
      textTertiary: customColorResolver('global', 'textTertiary'),
      border: customColorResolver('global', 'borderColor'),
      borderLight: customColorResolver('global', 'borderColor'),
      icon: customColorResolver('global', 'iconDefault'),
      iconInactive: customColorResolver('global', 'iconInactive'),
      white: customColorResolver('navigation', 'tabBarBackground'),
      error: customColorResolver('global', 'errorColor'),
      success: customColorResolver('global', 'successColor'),
      warning: customColorResolver('global', 'warningColor'),
      background: {
        bg700: customColorResolver('global', 'background'),
        bg500: customColorResolver('global', 'cardBackground'),
        bg300: customColorResolver('global', 'cardBackground'),
      },
      status: {
        active: customColorResolver('projects', 'statusActiveColor'),
        onHold: customColorResolver('projects', 'statusOnHoldColor'),
        completed: customColorResolver('projects', 'statusCompletedColor'),
        archived: customColorResolver('projects', 'statusArchivedColor'),
      },
      planning: {
        marketingTask: customColorResolver('planningTasks', 'marketingTaskBackground'),
        outOfOffice: customColorResolver('planningTasks', 'outOfOfficeBackground'),
        outOfOfficeFont: customColorResolver('planningTasks', 'outOfOfficeText'),
        unavailable: customColorResolver('planningTasks', 'unavailableBackground'),
        timeOff: customColorResolver('planningTasks', 'timeOffBackground'),
        deadline: customColorResolver('planningTasks', 'deadlineBackground'),
        internalDeadline: customColorResolver('planningTasks', 'internalDeadlineBackground'),
        milestone: customColorResolver('planningTasks', 'milestoneBackground'),
      },
    };

    console.log('[ThemeContext] customColors primary:', customColors.primary, 'background.bg700:', customColors.background.bg700);
    return customColors;
  }, [baseColors, isUsingCustomTheme, customColorResolver]);

  const setCustomColorResolverWrapper = useCallback((resolver: ((section: string, element: string) => string) | null) => {
    setCustomColorResolver(() => resolver);
  }, []);

  const setIsUsingCustomThemeWrapper = useCallback((isUsing: boolean) => {
    setIsUsingCustomTheme(isUsing);
  }, []);

  const value = useMemo(() => ({
    selectedPalette,
    setSelectedPalette,
    currentColors,
    customPalettes,
    loadCustomPalettes: loadCustomPalettesData,
    setCustomColorResolver: setCustomColorResolverWrapper,
    setIsUsingCustomTheme: setIsUsingCustomThemeWrapper,
  }), [selectedPalette, setSelectedPalette, currentColors, customPalettes, loadCustomPalettesData, setCustomColorResolverWrapper, setIsUsingCustomThemeWrapper]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Hook that components use - now automatically uses custom colors when active
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
