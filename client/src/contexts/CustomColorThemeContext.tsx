import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { CustomColorPalette, CustomColorTheme, ElementColorMapping } from '../types/customColors';
import { useTheme } from './ThemeContext';
import { createDefaultCustomTheme } from '../utils/createDefaultCustomTheme';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';

// Database keys for settings
const CUSTOM_COLOR_PALETTES_KEY = 'custom_color_palettes';
const ELEMENT_COLOR_MAPPING_KEY = 'element_color_mapping';
const ACTIVE_CUSTOM_THEME_KEY = 'active_custom_theme';

interface CustomColorThemeContextType {
  customColorPalettes: Record<string, CustomColorPalette>;
  activeCustomTheme: CustomColorTheme | null;
  isUsingCustomTheme: boolean;
  setActiveCustomTheme: (paletteId: string) => Promise<void>;
  disableCustomTheme: () => Promise<void>;
  getColorForElement: (section: string, element: string) => string;
  loadCustomColorPalettes: () => Promise<void>;
  reloadCustomTheme: () => Promise<void>;
  isInitializing: boolean;
}

const CustomColorThemeContext = createContext<CustomColorThemeContextType | undefined>(undefined);

export const CustomColorThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const themeContext = useTheme();
  const { currentColors } = themeContext;
  const setCustomColorResolver = themeContext.setCustomColorResolver || null;
  const setThemeIsUsingCustomTheme = themeContext.setIsUsingCustomTheme || null;
  const { user } = useAuth();

  const [customColorPalettes, setCustomColorPalettes] = useState<Record<string, CustomColorPalette>>({});
  const [activeCustomTheme, setActiveCustomThemeState] = useState<CustomColorTheme | null>(null);
  const [isUsingCustomTheme, setIsUsingCustomTheme] = useState<boolean>(false);
  const [activePalette, setActivePalette] = useState<CustomColorPalette | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Track if we've initialized for the current user
  const [initializedForUser, setInitializedForUser] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Track if component is mounted

    const initializeTheme = async () => {
      if (!isMounted) return;

      // Don't re-initialize if we've already done it for this user
      const userId = user?.id?.toString() || 'no-user';
      if (initializedForUser === userId) {
        console.log('[CustomColorTheme] Already initialized for user:', userId);
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);

      try {
        // Create default theme if it doesn't exist
        await createDefaultCustomTheme();

        if (!isMounted) return;

        // Load palettes and active theme (requires user to be logged in)
        if (user) {
          await loadCustomColorPalettes();

          if (!isMounted) return;

          await loadActiveCustomTheme();

          if (!isMounted) return;

          // If no user-specific theme is set, check for admin-defined default theme
          // Note: loadActiveCustomTheme already checked the database for ACTIVE_CUSTOM_THEME_KEY
          if (!activeCustomTheme && isMounted) {
            try {
              // Check if admin has set a default theme
              const defaultThemeResponse = await settingsAPI.app.get('default_custom_theme');

              if (!isMounted) return;

              if (defaultThemeResponse.data?.value) {
                const defaultThemeId = defaultThemeResponse.data.value;
                console.log('[CustomColorTheme] Admin default theme found:', defaultThemeId);
                await setActiveCustomTheme(defaultThemeId);
                console.log('[CustomColorTheme] Admin default theme activated');
              } else {
                // Fall back to built-in default theme
                await setActiveCustomTheme('default_theme');
                console.log('[CustomColorTheme] Built-in default theme auto-activated');
              }
            } catch (error: any) {
              if (!isMounted) return;

              // If 404, no default theme set, use built-in default
              if (error.response?.status === 404) {
                try {
                  await setActiveCustomTheme('default_theme');
                  console.log('[CustomColorTheme] Built-in default theme auto-activated (no admin default)');
                } catch (err) {
                  console.error('[CustomColorTheme] Error auto-activating built-in default theme:', err);
                }
              } else {
                console.error('[CustomColorTheme] Error loading default theme:', error);
              }
            }
          }
        }

        // Mark as initialized for this user
        if (isMounted) {
          setInitializedForUser(userId);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('[CustomColorTheme] Error in initializeTheme:', error);
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeTheme();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user]);

  const loadCustomColorPalettes = useCallback(async () => {
    try {
      if (!user) return;

      const response = await settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY);
      if (response?.data?.value) {
        const palettes: Record<string, CustomColorPalette> = response.data.value;
        setCustomColorPalettes(palettes);
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('[CustomColorTheme] Error loading custom color palettes:', error);
      }
    }
  }, [user]);

  const loadActiveCustomTheme = useCallback(async () => {
    try {
      if (!user) return;

      // Load active theme ID from database
      const activeThemeResponse = await settingsAPI.user.get(ACTIVE_CUSTOM_THEME_KEY);
      const activeThemeId = activeThemeResponse?.data?.value;

      if (activeThemeId) {
        // Load the palette and mappings from database
        const palettesResponse = await settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY);
        const mappingsResponse = await settingsAPI.user.get(ELEMENT_COLOR_MAPPING_KEY);

        if (palettesResponse?.data?.value && mappingsResponse?.data?.value) {
          const palettes: Record<string, CustomColorPalette> = palettesResponse.data.value;
          const mappings: Record<string, ElementColorMapping> = mappingsResponse.data.value;

          const palette = palettes[activeThemeId];
          const mapping = mappings[activeThemeId];

          if (palette && mapping) {
            const theme: CustomColorTheme = {
              paletteId: activeThemeId,
              paletteName: palette.name,
              elementMapping: mapping,
            };
            setActiveCustomThemeState(theme);
            setActivePalette(palette);
            setIsUsingCustomTheme(true);
            return;
          }
        }
      }
      // If no active theme or loading failed
      setActiveCustomThemeState(null);
      setActivePalette(null);
      setIsUsingCustomTheme(false);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('[CustomColorTheme] Error loading active custom theme:', error);
      }
      setActiveCustomThemeState(null);
      setActivePalette(null);
      setIsUsingCustomTheme(false);
    }
  }, [user]);

  const setActiveCustomTheme = useCallback(async (paletteId: string) => {
    try {
      if (!user) throw new Error('User not logged in');

      // Try to load from user settings first
      const [palettesResult, mappingsResult, appPalettesResult, appMappingsResult] = await Promise.allSettled([
        settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY),
        settingsAPI.user.get(ELEMENT_COLOR_MAPPING_KEY),
        settingsAPI.app.get('custom_color_palettes'),
        settingsAPI.app.get('element_color_mapping'),
      ]);

      let palette: CustomColorPalette | null = null;
      let mapping: ElementColorMapping | null = null;

      // Try user settings first
      if (palettesResult.status === 'fulfilled' && palettesResult.value?.data?.value?.[paletteId]) {
        palette = palettesResult.value.data.value[paletteId];
      }
      // Fall back to app settings if not found in user settings
      else if (appPalettesResult.status === 'fulfilled' && appPalettesResult.value?.data?.value?.[paletteId]) {
        palette = appPalettesResult.value.data.value[paletteId];
        console.log('[CustomColorTheme] Loaded palette from app settings:', paletteId);
      }

      // Try user settings first for mapping
      if (mappingsResult.status === 'fulfilled' && mappingsResult.value?.data?.value?.[paletteId]) {
        mapping = mappingsResult.value.data.value[paletteId];
      }
      // Fall back to app settings if not found in user settings
      else if (appMappingsResult.status === 'fulfilled' && appMappingsResult.value?.data?.value?.[paletteId]) {
        mapping = appMappingsResult.value.data.value[paletteId];
        console.log('[CustomColorTheme] Loaded mapping from app settings:', paletteId);
      }

      if (!palette || !mapping) {
        throw new Error('Palette or mapping not found for ID: ' + paletteId);
      }

      const theme: CustomColorTheme = {
        paletteId,
        paletteName: palette.name,
        elementMapping: mapping,
      };

      await settingsAPI.user.set(ACTIVE_CUSTOM_THEME_KEY, paletteId);
      setActiveCustomThemeState(theme);
      setActivePalette(palette);
      setIsUsingCustomTheme(true);
      console.log('[CustomColorTheme] Theme activated:', paletteId, 'Colors:', palette.colors.length);
    } catch (error) {
      console.error('[CustomColorTheme] Error setting active custom theme:', error);
      throw error;
    }
  }, [user]);

  const disableCustomTheme = useCallback(async () => {
    try {
      if (!user) return;

      await settingsAPI.user.delete(ACTIVE_CUSTOM_THEME_KEY);
      setActiveCustomThemeState(null);
      setActivePalette(null);
      setIsUsingCustomTheme(false);
    } catch (error) {
      console.error('[CustomColorTheme] Error disabling custom theme:', error);
      throw error;
    }
  }, [user]);

  const getColorForElement = useCallback((section: string, element: string): string => {
    if (!activeCustomTheme || !isUsingCustomTheme || !activePalette) {
      // Return default color from current theme
      console.log(`[CustomColorTheme] No active theme for ${section}.${element}, using defaults`);
      return getDefaultColorForElement(section, element, currentColors);
    }

    try {
      const colorId = (activeCustomTheme.elementMapping[section as keyof ElementColorMapping] as any)?.[element];
      console.log(`[CustomColorTheme] Getting color for ${section}.${element}, colorId:`, colorId);
      if (!colorId) {
        console.log(`[CustomColorTheme] No colorId found for ${section}.${element}, using defaults`);
        return getDefaultColorForElement(section, element, currentColors);
      }

      // Use cached palette to get actual hex code
      const color = activePalette.colors.find(c => c.id === colorId);
      if (color) {
        console.log(`[CustomColorTheme] Found color for ${section}.${element}:`, color.hexCode);
        return color.hexCode;
      }
      console.log(`[CustomColorTheme] Color not found in palette for ${section}.${element}`);
    } catch (error) {
      console.error('[CustomColorTheme] Error getting color for element:', error);
    }

    return getDefaultColorForElement(section, element, currentColors);
  }, [activeCustomTheme, isUsingCustomTheme, activePalette, currentColors]);

  // Inject custom color resolver into ThemeContext whenever custom theme state changes
  useEffect(() => {
    if (!setCustomColorResolver || !setThemeIsUsingCustomTheme) {
      console.warn('[CustomColorTheme] ThemeContext does not support custom color injection');
      return;
    }

    if (isUsingCustomTheme && activeCustomTheme && activePalette) {
      // Inject the color resolver
      setCustomColorResolver(getColorForElement);
      setThemeIsUsingCustomTheme(true);
      console.log('[CustomColorTheme] Injected color resolver into ThemeContext');
    } else {
      // Remove the color resolver
      setCustomColorResolver(null);
      setThemeIsUsingCustomTheme(false);
      console.log('[CustomColorTheme] Removed color resolver from ThemeContext');
    }
    // Only depend on state changes, NOT on getColorForElement (which would cause infinite loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUsingCustomTheme, activeCustomTheme, activePalette, setCustomColorResolver, setThemeIsUsingCustomTheme]);

  const reloadCustomTheme = useCallback(async () => {
    await loadCustomColorPalettes();
    await loadActiveCustomTheme();
  }, [loadCustomColorPalettes, loadActiveCustomTheme]);

  const value = useMemo(() => ({
    customColorPalettes,
    activeCustomTheme,
    isUsingCustomTheme,
    setActiveCustomTheme,
    disableCustomTheme,
    getColorForElement,
    loadCustomColorPalettes,
    reloadCustomTheme,
    isInitializing,
  }), [
    customColorPalettes,
    activeCustomTheme,
    isUsingCustomTheme,
    setActiveCustomTheme,
    disableCustomTheme,
    getColorForElement,
    loadCustomColorPalettes,
    reloadCustomTheme,
    isInitializing,
  ]);

  // Show loading screen while initializing to prevent flash of wrong theme
  if (isInitializing) {
    return (
      <CustomColorThemeContext.Provider value={value}>
        {/* Render nothing while initializing to prevent theme flash */}
        <div style={{ display: 'none' }}>{children}</div>
      </CustomColorThemeContext.Provider>
    );
  }

  return (
    <CustomColorThemeContext.Provider value={value}>
      {children}
    </CustomColorThemeContext.Provider>
  );
};

export const useCustomColorTheme = () => {
  const context = useContext(CustomColorThemeContext);
  if (context === undefined) {
    throw new Error('useCustomColorTheme must be used within a CustomColorThemeProvider');
  }
  return context;
};

// Helper function to get default colors
function getDefaultColorForElement(section: string, element: string, currentColors: any): string {
  // Map element paths to current theme colors
  const mapping: Record<string, string> = {
    'navigation.tabBarBackground': currentColors.background.bg700,
    'navigation.tabBarActiveIcon': currentColors.primary,
    'navigation.tabBarInactiveIcon': currentColors.icon,
    'navigation.tabBarActiveText': currentColors.primary,
    'navigation.tabBarInactiveText': currentColors.text,
    'navigation.headerBackground': currentColors.background.bg700,
    'navigation.headerText': currentColors.text,
    'navigation.headerIcons': currentColors.icon,
    'desktopNavigation.drawerBackground': currentColors.white,
    'desktopNavigation.drawerActiveItemBackground': currentColors.primary,
    'desktopNavigation.drawerInactiveItemBackground': currentColors.white,
    'desktopNavigation.drawerActiveItemText': currentColors.white,
    'desktopNavigation.drawerInactiveItemText': currentColors.text,
    'desktopNavigation.drawerActiveItemIcon': currentColors.white,
    'desktopNavigation.drawerInactiveItemIcon': currentColors.icon,
    'desktopNavigation.drawerDividerColor': currentColors.border,
    'desktopNavigation.drawerHeaderBackground': currentColors.primary,
    'desktopNavigation.drawerHeaderText': currentColors.white,
    'global.primaryButton': currentColors.primary,
    'global.primaryButtonText': currentColors.white,
    'global.secondaryButton': currentColors.secondary,
    'global.secondaryButtonText': currentColors.white,
    'global.textPrimary': currentColors.text,
    'global.textSecondary': currentColors.textSecondary,
    'global.textTertiary': currentColors.textTertiary,
    'global.background': currentColors.background.bg700,
    'global.cardBackground': currentColors.white,
    'global.borderColor': currentColors.border,
    'global.iconDefault': currentColors.icon,
    'global.iconInactive': currentColors.iconInactive,
    'global.errorColor': currentColors.error,
    'global.successColor': currentColors.success,
    'global.warningColor': currentColors.warning,
    'planningTasks.projectTaskBackground': currentColors.primary,
    'planningTasks.projectTaskText': currentColors.white,
    'planningTasks.adminTaskBackground': currentColors.secondary,
    'planningTasks.adminTaskText': currentColors.white,
    'planningTasks.marketingTaskBackground': currentColors.planning?.marketingTask || currentColors.primary,
    'planningTasks.marketingTaskText': currentColors.white,
    'planningTasks.outOfOfficeBackground': currentColors.planning?.outOfOffice || currentColors.secondary,
    'planningTasks.outOfOfficeText': currentColors.planning?.outOfOfficeFont || currentColors.white,
    'planningGrid.headerBackground': currentColors.background.bg500,
    'planningGrid.headerText': currentColors.text,
    'planningGrid.headerIcon': currentColors.primary,
    'planningGrid.settingsIconColor': currentColors.white,
    'planningGrid.dateCellBackground': currentColors.background.bg500,
    'planningGrid.dateCellText': currentColors.text,
    'planningGrid.deadlinesRowBackground': currentColors.background.bg500,
    'planningGrid.deadlinesRowText': currentColors.text,
    'planningGrid.teamMemberCellBackground': currentColors.background.bg300,
    'planningGrid.teamMemberCellText': currentColors.text,
    'planningGrid.weekdayHeaderBackground': currentColors.background.bg500,
    'planningGrid.weekdayHeaderText': currentColors.text,
    'planningGrid.weekendHeaderBackground': currentColors.background.bg700,
    'planningGrid.weekendHeaderText': currentColors.textSecondary,
    'planningGrid.weekdayCellBackground': currentColors.white,
    'planningGrid.weekendCellBackground': currentColors.background.bg300,
    'planningGrid.headerBorderColor': currentColors.text,
    'planningGrid.cellBorderColor': currentColors.text,
    'projects.tableHeaderBackground': currentColors.primary,
    'projects.tableHeaderText': currentColors.white,
    'dashboard.background': currentColors.background.bg700,
    'dashboard.cardBackground': currentColors.background.bg500,
    'dashboard.cardText': currentColors.text,
    'dashboard.headerBackground': currentColors.background.bg500,
    'dashboard.headerText': currentColors.text,
  };

  const key = `${section}.${element}`;
  return mapping[key] || currentColors.text || '#000000';
}
