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
  setActiveCustomTheme: (paletteId: string, saveToUserSettings?: boolean) => Promise<void>;
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
    console.log('[CustomColorTheme] useEffect triggered, user:', user?.id, 'initializedForUser:', initializedForUser);
    let isMounted = true; // Track if component is mounted

    const initializeTheme = async () => {
      console.log('[CustomColorTheme] initializeTheme called, isMounted:', isMounted);
      if (!isMounted) return;

      // Don't re-initialize if we've already done it for this user
      const userId = user?.id?.toString() || 'no-user';
      console.log('[CustomColorTheme] Checking initialization status for user:', userId, 'initializedForUser:', initializedForUser);
      if (initializedForUser === userId) {
        console.log('[CustomColorTheme] Already initialized for user:', userId);
        setIsInitializing(false);
        return;
      }

      console.log('[CustomColorTheme] Starting initialization for user:', userId);
      setIsInitializing(true);

      try {
        // Create default theme if it doesn't exist
        await createDefaultCustomTheme();

        if (!isMounted) return;

        // Load palettes and active theme (requires user to be logged in)
        if (user) {
          await loadCustomColorPalettes();

          if (!isMounted) return;

          // Try to load user's active theme - returns true if theme was loaded
          const hasUserTheme = await loadActiveCustomTheme();

          if (!isMounted) return;

          // If no user-specific theme is set, check for admin-defined default theme
          if (!hasUserTheme && isMounted) {
            console.log('[CustomColorTheme] No user theme found, checking for admin default theme...');
            try {
              // Check if admin has set a default theme
              const defaultThemeResponse = await settingsAPI.app.get('default_custom_theme');

              if (!isMounted) return;

              console.log('[CustomColorTheme] Default theme API response:', defaultThemeResponse.data);

              if (defaultThemeResponse.data?.value) {
                const defaultThemeId = defaultThemeResponse.data.value;
                console.log('[CustomColorTheme] Admin default theme found:', defaultThemeId);
                console.log('[CustomColorTheme] Attempting to activate admin default theme...');
                // Don't save to user settings - this is a temporary app-wide default
                await setActiveCustomTheme(defaultThemeId, false);
                console.log('[CustomColorTheme] Admin default theme activated successfully (temporary)');
              } else {
                console.log('[CustomColorTheme] No admin default theme value, falling back to built-in default');
                // Fall back to built-in default theme
                await setActiveCustomTheme('default_theme', false);
                console.log('[CustomColorTheme] Built-in default theme auto-activated (temporary)');
              }
            } catch (error: any) {
              if (!isMounted) return;

              console.error('[CustomColorTheme] Error in default theme loading:', error);
              console.error('[CustomColorTheme] Error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
              });

              // If 404, no default theme set, use built-in default
              if (error.response?.status === 404) {
                console.log('[CustomColorTheme] 404 response - no admin default theme set, using built-in default');
                try {
                  await setActiveCustomTheme('default_theme', false);
                  console.log('[CustomColorTheme] Built-in default theme auto-activated (temporary, no admin default)');
                } catch (err) {
                  console.error('[CustomColorTheme] Error auto-activating built-in default theme:', err);
                }
              } else {
                console.error('[CustomColorTheme] Non-404 error loading default theme:', error);
              }
            }
          } else if (hasUserTheme) {
            console.log('[CustomColorTheme] User has a personal theme, skipping admin default');
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

  const loadActiveCustomTheme = useCallback(async (): Promise<boolean> => {
    try {
      if (!user) return false;

      // Load active theme info from database
      const activeThemeResponse = await settingsAPI.user.get(ACTIVE_CUSTOM_THEME_KEY);
      const activeThemeData = activeThemeResponse?.data?.value;

      if (activeThemeData) {
        // Support both old format (just string) and new format (object with id and source)
        const activeThemeId = typeof activeThemeData === 'string' ? activeThemeData : activeThemeData.paletteId;
        const activeSource = typeof activeThemeData === 'string' ? 'user' : (activeThemeData.source || 'user');

        console.log('[CustomColorTheme] Loading active theme:', activeThemeId, 'from source:', activeSource);

        // Load the palette and mappings from the appropriate source
        const [userPalettesResult, userMappingsResult, appPalettesResult, appMappingsResult, sharedPalettesResult, sharedMappingsResult] = await Promise.allSettled([
          settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY),
          settingsAPI.user.get(ELEMENT_COLOR_MAPPING_KEY),
          settingsAPI.app.get('custom_color_palettes'),
          settingsAPI.app.get('element_color_mapping'),
          settingsAPI.app.get('shared_custom_themes'),
          settingsAPI.app.get('shared_element_mappings'),
        ]);

        let palette: CustomColorPalette | null = null;
        let mapping: ElementColorMapping | null = null;

        // Load from the correct source based on saved source
        if (activeSource === 'user' && userPalettesResult.status === 'fulfilled' && userMappingsResult.status === 'fulfilled') {
          palette = userPalettesResult.value?.data?.value?.[activeThemeId];
          mapping = userMappingsResult.value?.data?.value?.[activeThemeId];
        } else if (activeSource === 'app' && appPalettesResult.status === 'fulfilled' && appMappingsResult.status === 'fulfilled') {
          palette = appPalettesResult.value?.data?.value?.[activeThemeId];
          mapping = appMappingsResult.value?.data?.value?.[activeThemeId];
        } else if (activeSource === 'shared' && sharedPalettesResult.status === 'fulfilled' && sharedMappingsResult.status === 'fulfilled') {
          palette = sharedPalettesResult.value?.data?.value?.[activeThemeId];
          mapping = sharedMappingsResult.value?.data?.value?.[activeThemeId];
        }

        if (palette && mapping) {
          const theme: CustomColorTheme = {
            paletteId: activeThemeId,
            paletteName: palette.name,
            elementMapping: mapping,
            source: activeSource,
          };
          setActiveCustomThemeState(theme);
          setActivePalette(palette);
          setIsUsingCustomTheme(true);
          console.log('[CustomColorTheme] User theme loaded:', activeThemeId, 'from source:', activeSource);
          return true;
        }
      }
      // If no active theme or loading failed
      setActiveCustomThemeState(null);
      setActivePalette(null);
      setIsUsingCustomTheme(false);
      return false;
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('[CustomColorTheme] Error loading active custom theme:', error);
      }
      setActiveCustomThemeState(null);
      setActivePalette(null);
      setIsUsingCustomTheme(false);
      return false;
    }
  }, [user]);

  const setActiveCustomTheme = useCallback(async (paletteId: string, saveToUserSettings: boolean = true) => {
    try {
      console.log('[CustomColorTheme] setActiveCustomTheme called with paletteId:', paletteId, 'saveToUserSettings:', saveToUserSettings);

      if (!user) throw new Error('User not logged in');

      // Try to load from user settings, app settings (default), and shared themes
      console.log('[CustomColorTheme] Fetching theme data from all sources...');
      const [palettesResult, mappingsResult, appPalettesResult, appMappingsResult, sharedPalettesResult, sharedMappingsResult] = await Promise.allSettled([
        settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY),
        settingsAPI.user.get(ELEMENT_COLOR_MAPPING_KEY),
        settingsAPI.app.get('custom_color_palettes'),
        settingsAPI.app.get('element_color_mapping'),
        settingsAPI.app.get('shared_custom_themes'),
        settingsAPI.app.get('shared_element_mappings'),
      ]);

      console.log('[CustomColorTheme] Fetch results:', {
        userPalettes: palettesResult.status,
        userMappings: mappingsResult.status,
        appPalettes: appPalettesResult.status,
        appMappings: appMappingsResult.status,
        sharedPalettes: sharedPalettesResult.status,
        sharedMappings: sharedMappingsResult.status
      });

      let palette: CustomColorPalette | null = null;
      let mapping: ElementColorMapping | null = null;
      let source: 'user' | 'app' | 'shared' = 'user';

      // Priority: user settings > app settings (default) > shared themes
      // Try user settings first
      if (palettesResult.status === 'fulfilled' && palettesResult.value?.data?.value?.[paletteId]) {
        palette = palettesResult.value.data.value[paletteId];
        source = 'user';
        console.log('[CustomColorTheme] Loaded palette from user settings:', paletteId);
      }
      // Fall back to app settings if not found in user settings
      else if (appPalettesResult.status === 'fulfilled' && appPalettesResult.value?.data?.value?.[paletteId]) {
        palette = appPalettesResult.value.data.value[paletteId];
        source = 'app';
        console.log('[CustomColorTheme] Loaded palette from app settings:', paletteId, 'Colors:', palette.colors.length);
      }
      // Fall back to shared themes if not found in app settings
      else if (sharedPalettesResult.status === 'fulfilled' && sharedPalettesResult.value?.data?.value?.[paletteId]) {
        palette = sharedPalettesResult.value.data.value[paletteId];
        source = 'shared';
        console.log('[CustomColorTheme] Loaded palette from shared themes:', paletteId);
      } else {
        console.error('[CustomColorTheme] Could not find palette for ID:', paletteId);
        console.error('[CustomColorTheme] App palettes data:', appPalettesResult.status === 'fulfilled' ? appPalettesResult.value?.data : 'rejected');
      }

      // Try user settings first for mapping
      if (mappingsResult.status === 'fulfilled' && mappingsResult.value?.data?.value?.[paletteId]) {
        mapping = mappingsResult.value.data.value[paletteId];
        console.log('[CustomColorTheme] Loaded mapping from user settings:', paletteId);
      }
      // Fall back to app settings if not found in user settings
      else if (appMappingsResult.status === 'fulfilled' && appMappingsResult.value?.data?.value?.[paletteId]) {
        mapping = appMappingsResult.value.data.value[paletteId];
        console.log('[CustomColorTheme] Loaded mapping from app settings:', paletteId);
      }
      // Fall back to shared element mappings if not found in app settings
      else if (sharedMappingsResult.status === 'fulfilled' && sharedMappingsResult.value?.data?.value?.[paletteId]) {
        mapping = sharedMappingsResult.value.data.value[paletteId];
        console.log('[CustomColorTheme] Loaded mapping from shared themes:', paletteId);
      } else {
        console.error('[CustomColorTheme] Could not find mapping for ID:', paletteId);
        console.error('[CustomColorTheme] App mappings data:', appMappingsResult.status === 'fulfilled' ? appMappingsResult.value?.data : 'rejected');
      }

      if (!palette || !mapping) {
        throw new Error('Palette or mapping not found for ID: ' + paletteId);
      }

      const theme: CustomColorTheme = {
        paletteId,
        paletteName: palette.name,
        elementMapping: mapping,
        source, // Track where the theme came from
      };

      // Only save to user settings if explicitly requested (default behavior)
      // When applying app-wide default theme, we don't want to save it to user settings
      if (saveToUserSettings) {
        // Save both paletteId and source to distinguish between themes with same ID
        await settingsAPI.user.set(ACTIVE_CUSTOM_THEME_KEY, { paletteId, source });
        console.log('[CustomColorTheme] Theme saved to user settings:', paletteId, 'source:', source);
      } else {
        console.log('[CustomColorTheme] Theme activated temporarily (not saved to user settings):', paletteId);
      }

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

      // Delete user's personal theme preference
      await settingsAPI.user.delete(ACTIVE_CUSTOM_THEME_KEY);

      // Clear current theme
      setActiveCustomThemeState(null);
      setActivePalette(null);
      setIsUsingCustomTheme(false);

      // Load app-level default theme (if one is set by admin)
      try {
        const defaultThemeResponse = await settingsAPI.app.get('default_custom_theme');
        if (defaultThemeResponse?.data?.value) {
          const defaultThemeId = defaultThemeResponse.data.value;
          console.log('[CustomColorTheme] Loading app default theme after deactivation:', defaultThemeId);
          await setActiveCustomTheme(defaultThemeId, false); // Don't save to user settings
        } else {
          console.log('[CustomColorTheme] No app default theme set, using hardcoded default');
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          console.error('[CustomColorTheme] Error loading app default theme:', error);
        }
      }
    } catch (error) {
      console.error('[CustomColorTheme] Error disabling custom theme:', error);
      throw error;
    }
  }, [user, setActiveCustomTheme]);

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
