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
  const [customColorResolver, setCustomColorResolver] = useState<((section: string, element: string) => string) | null>(null);
  const [isUsingCustomTheme, setIsUsingCustomTheme] = useState<boolean>(false);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    if (user && !userLoaded) {
      setUserLoaded(true);
      loadSavedPalette();
      loadCustomPalettesData();
    } else if (!user && userLoaded) {
      // User logged out, reset to defaults
      setUserLoaded(false);
      setSelectedPaletteState('default');
      setCustomPalettes({});
    }
  }, [user, userLoaded]);

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
      // Load both user preference and app-level default in parallel
      const [userPaletteResult, appDefaultResult] = await Promise.allSettled([
        settingsAPI.user.get(SELECTED_PALETTE_KEY),
        settingsAPI.app.get('default_custom_theme'),
      ]);

      // Priority: user preference > app default > hardcoded 'default'
      if (userPaletteResult.status === 'fulfilled' && userPaletteResult.value?.data?.value) {
        // User has their own preference
        setSelectedPaletteState(userPaletteResult.value.data.value);
      } else if (appDefaultResult.status === 'fulfilled' && appDefaultResult.value?.data?.value) {
        // No user preference, use app-level default set by admin
        setSelectedPaletteState(appDefaultResult.value.data.value);
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
    // Then check predefined palettes
    if (colorPalettes[selectedPalette as ColorPaletteName]) {
      return colorPalettes[selectedPalette as ColorPaletteName];
    }
    // Fallback to default
    return colorPalettes.default;
  }, [selectedPalette, customPalettes]);

  // Get current colors - either from custom theme or base palette
  const currentColors = useMemo((): ColorPalette => {
    // If not using custom theme, return base colors
    if (!isUsingCustomTheme || !customColorResolver) {
      return baseColors;
    }

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
