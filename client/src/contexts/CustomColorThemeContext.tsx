import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { CustomColorPalette, CustomColorTheme, ElementColorMapping } from '../types/customColors';
import { useTheme } from './ThemeContext';
import { createDefaultCustomTheme } from '../utils/createDefaultCustomTheme';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';

// Database keys for settings
const CUSTOM_COLOR_PALETTES_KEY = 'custom_color_palettes';
const ELEMENT_COLOR_MAPPING_KEY = 'element_color_mapping';
const ACTIVE_CUSTOM_THEME_KEY = 'active_custom_theme';

// Force bundle regeneration - v2025.11.18.002 - Fixed palette.colors null safety in loadActiveCustomTheme and setActiveCustomTheme
const BUNDLE_VERSION = '2025.11.18.002';

interface CustomColorThemeContextType {
  customColorPalettes: Record<string, CustomColorPalette>;
  activeCustomTheme: CustomColorTheme | null;
  isUsingCustomTheme: boolean;
  setActiveCustomTheme: (paletteId: string, saveToUserSettings?: boolean, explicitSource?: 'user' | 'app' | 'shared') => Promise<void>;
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
  const [activePalette, setActivePalette] = useState<CustomColorPalette | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Computed value: we're using custom theme if we have an active theme
  const isUsingCustomTheme = !!activeCustomTheme && !!activePalette;

  // Track if we've initialized for the current user
  const [initializedForUser, setInitializedForUser] = useState<string | null>(null);

  // Track if we're currently reloading to prevent flash
  const isReloadingRef = React.useRef(false);

  // Memoize color lookup map for O(1) access instead of O(n) find operations
  // Fixed: Check both activePalette and colors array to prevent crash (2025-11-18)
  const colorLookupMap = useMemo(() => {
    // Safety check: ensure both activePalette exists AND colors array exists
    if (!activePalette?.colors || !Array.isArray(activePalette.colors)) {
      return new Map<string, string>();
    }
    const map = new Map<string, string>();
    activePalette.colors.forEach(color => {
      map.set(color.id, color.hexCode);
    });
    return map;
  }, [activePalette]);

  useEffect(() => {

    let isMounted = true; // Track if component is mounted

    const initializeTheme = async () => {

      if (!isMounted) return;

      // Don't re-initialize if we've already done it for this user
      const userId = user?.id?.toString() || 'no-user';

      if (initializedForUser === userId) {

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

          // Try to load user's active theme - returns true if theme was loaded
          const hasUserTheme = await loadActiveCustomTheme();

          if (!isMounted) return;

          // If no user-specific theme is set, check for admin-defined default theme
          if (!hasUserTheme && isMounted) {

            try {
              // Check if admin has set a default theme
              const defaultThemeResponse = await settingsAPI.app.get('default_custom_theme');

              if (!isMounted) return;

              if (defaultThemeResponse.data?.value) {
                const defaultThemeId = defaultThemeResponse.data.value;

                // Don't save to user settings - this is a temporary app-wide default
                // Use explicit source 'app' to load from app settings
                await setActiveCustomTheme(defaultThemeId, false, 'app');

              } else {

                // Fall back to built-in default theme
                await setActiveCustomTheme('default_theme', false, 'app');

              }
            } catch (error: any) {
              if (!isMounted) return;

              logger.error('Error in default theme loading:', error, 'CustomColorThemeContext');
              logger.error('Error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
              });

              // If 404, no default theme set, use built-in default
              if (error.response?.status === 404) {

                try {
                  await setActiveCustomTheme('default_theme', false, 'app');

                } catch (err) {
                  logger.error('Error auto-activating built-in default theme:', err, 'CustomColorThemeContext');
                }
              } else {
                logger.error('Non-404 error loading default theme:', error, 'CustomColorThemeContext');
              }
            }
          } else if (hasUserTheme) {

          }
        }

        // Mark as initialized for this user
        if (isMounted) {
          setInitializedForUser(userId);
          setIsInitializing(false);
        }
      } catch (error) {
        logger.error('Error in initializeTheme:', error, 'CustomColorThemeContext');
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
        logger.error('Error loading custom color palettes:', error, 'CustomColorThemeContext');
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

        // Safety check: ensure palette has colors array before using it
        if (palette && mapping && palette.colors && Array.isArray(palette.colors)) {
          const theme: CustomColorTheme = {
            paletteId: activeThemeId,
            paletteName: palette.name,
            elementMapping: mapping,
            source: activeSource,
          };
          setActiveCustomThemeState(theme);
          setActivePalette(palette);

          return true;
        } else {
          // Theme was saved but data no longer exists - clean it up

          try {
            await settingsAPI.user.delete(ACTIVE_CUSTOM_THEME_KEY);
          } catch (err) {
            logger.error('Error deleting stale theme setting:', err, 'CustomColorThemeContext');
          }
        }
      }
      // If no active theme or loading failed
      setActiveCustomThemeState(null);
      setActivePalette(null);
      return false;
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        logger.error('Error loading active custom theme:', error, 'CustomColorThemeContext');
      }
      setActiveCustomThemeState(null);
      setActivePalette(null);
      return false;
    }
  }, [user]);

  const setActiveCustomTheme = useCallback(async (paletteId: string, saveToUserSettings: boolean = true, explicitSource?: 'user' | 'app' | 'shared') => {
    try {

      if (!user) throw new Error('User not logged in');

      // Try to load from user settings, app settings (default), and shared themes

      const [palettesResult, mappingsResult, appPalettesResult, appMappingsResult, sharedPalettesResult, sharedMappingsResult] = await Promise.allSettled([
        settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY),
        settingsAPI.user.get(ELEMENT_COLOR_MAPPING_KEY),
        settingsAPI.app.get('custom_color_palettes'),
        settingsAPI.app.get('element_color_mapping'),
        settingsAPI.app.get('shared_custom_themes'),
        settingsAPI.app.get('shared_element_mappings'),
      ]);

      let palette: CustomColorPalette | null = null;
      let mapping: ElementColorMapping | null = null;
      let source: 'user' | 'app' | 'shared' = explicitSource || 'user';

      // If explicit source is provided, load from that source only
      if (explicitSource) {

        if (explicitSource === 'user') {
          palette = palettesResult.status === 'fulfilled' ? palettesResult.value?.data?.value?.[paletteId] : null;
          mapping = mappingsResult.status === 'fulfilled' ? mappingsResult.value?.data?.value?.[paletteId] : null;
        } else if (explicitSource === 'app') {
          palette = appPalettesResult.status === 'fulfilled' ? appPalettesResult.value?.data?.value?.[paletteId] : null;
          mapping = appMappingsResult.status === 'fulfilled' ? appMappingsResult.value?.data?.value?.[paletteId] : null;
        } else if (explicitSource === 'shared') {
          palette = sharedPalettesResult.status === 'fulfilled' ? sharedPalettesResult.value?.data?.value?.[paletteId] : null;
          mapping = sharedMappingsResult.status === 'fulfilled' ? sharedMappingsResult.value?.data?.value?.[paletteId] : null;
        }

      } else {
        // Auto-detect source with priority: user settings > app settings (default) > shared themes
        // Try user settings first
        if (palettesResult.status === 'fulfilled' && palettesResult.value?.data?.value?.[paletteId]) {
          palette = palettesResult.value.data.value[paletteId];
          source = 'user';

        }
        // Fall back to app settings if not found in user settings
        else if (appPalettesResult.status === 'fulfilled' && appPalettesResult.value?.data?.value?.[paletteId]) {
          palette = appPalettesResult.value.data.value[paletteId];
          source = 'app';

        }
        // Fall back to shared themes if not found in app settings
        else if (sharedPalettesResult.status === 'fulfilled' && sharedPalettesResult.value?.data?.value?.[paletteId]) {
          palette = sharedPalettesResult.value.data.value[paletteId];
          source = 'shared';

        } else {
          logger.error('Could not find palette for ID:', paletteId, 'CustomColorThemeContext');
          logger.error('App palettes data:', appPalettesResult.status === 'fulfilled' ? appPalettesResult.value?.data : 'rejected', 'CustomColorThemeContext');
        }

        // Try user settings first for mapping
        if (mappingsResult.status === 'fulfilled' && mappingsResult.value?.data?.value?.[paletteId]) {
          mapping = mappingsResult.value.data.value[paletteId];

        }
        // Fall back to app settings if not found in user settings
        else if (appMappingsResult.status === 'fulfilled' && appMappingsResult.value?.data?.value?.[paletteId]) {
          mapping = appMappingsResult.value.data.value[paletteId];

        }
        // Fall back to shared element mappings if not found in app settings
        else if (sharedMappingsResult.status === 'fulfilled' && sharedMappingsResult.value?.data?.value?.[paletteId]) {
          mapping = sharedMappingsResult.value.data.value[paletteId];

        } else {
          logger.error('Could not find mapping for ID:', paletteId, 'CustomColorThemeContext');
          logger.error('App mappings data:', appMappingsResult.status === 'fulfilled' ? appMappingsResult.value?.data : 'rejected', 'CustomColorThemeContext');
        }
      }

      // Safety check: ensure palette has colors array before using it
      if (!palette || !mapping || !palette.colors || !Array.isArray(palette.colors)) {
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

      } else {

      }

      setActiveCustomThemeState(theme);
      setActivePalette(palette);

    } catch (error) {
      logger.error('Error setting active custom theme:', error, 'CustomColorThemeContext');
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

      // Load app-level default theme (if one is set by admin)
      try {
        const defaultThemeResponse = await settingsAPI.app.get('default_custom_theme');
        if (defaultThemeResponse?.data?.value) {
          const defaultThemeId = defaultThemeResponse.data.value;

          // Don't save to user settings, load from app settings
          await setActiveCustomTheme(defaultThemeId, false, 'app');
        } else {

        }
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          logger.error('Error loading app default theme:', error, 'CustomColorThemeContext');
        }
      }
    } catch (error) {
      logger.error('Error disabling custom theme:', error, 'CustomColorThemeContext');
      throw error;
    }
  }, [user, setActiveCustomTheme]);

  const getColorForElement = useCallback((section: string, element: string): string => {
    if (!activeCustomTheme || !isUsingCustomTheme || !activePalette) {
      return getDefaultColorForElement(section, element, currentColors);
    }

    try {
      const sectionMapping = activeCustomTheme.elementMapping[section as keyof ElementColorMapping];
      const colorId = (sectionMapping as any)?.[element];

      if (!colorId) {
        return getDefaultColorForElement(section, element, currentColors);
      }

      // Use memoized lookup map for O(1) access instead of O(n) find
      const hexCode = colorLookupMap.get(colorId);
      if (hexCode) {
        return hexCode;
      }

    } catch (error) {
      logger.error('Error getting color for element:', error, 'CustomColorThemeContext');
    }

    return getDefaultColorForElement(section, element, currentColors);
  }, [activeCustomTheme, isUsingCustomTheme, activePalette, currentColors, colorLookupMap]);

  // Inject custom color resolver into ThemeContext whenever custom theme state changes
  useEffect(() => {
    if (!setCustomColorResolver || !setThemeIsUsingCustomTheme) {

      return;
    }

    // ALWAYS inject the color resolver as long as we have an active theme
    // This includes both user-specific themes AND admin default themes
    if (activeCustomTheme && activePalette) {
      // Inject the color resolver
      setCustomColorResolver(getColorForElement);
      setThemeIsUsingCustomTheme(true);

    } else if (!isReloadingRef.current) {
      // Only remove if there's truly no theme at all AND we're not in the middle of reloading
      setCustomColorResolver(null);
      setThemeIsUsingCustomTheme(false);

    }
    // Only depend on state changes, NOT on getColorForElement (which would cause infinite loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCustomTheme, activePalette, setCustomColorResolver, setThemeIsUsingCustomTheme]);

  const reloadCustomTheme = useCallback(async () => {
    // Set reloading flag to prevent color resolver from being cleared during reload
    isReloadingRef.current = true;

    try {
      await loadCustomColorPalettes();

      // Save current theme to prevent flash
      const previousTheme = activeCustomTheme;
      const previousPalette = activePalette;

      const hasUserTheme = await loadActiveCustomTheme();

      // If no user theme found, restore admin default or previous theme
      if (!hasUserTheme && user) {

        try {
          const defaultThemeResponse = await settingsAPI.app.get('default_custom_theme');
          if (defaultThemeResponse?.data?.value) {
            const defaultThemeId = defaultThemeResponse.data.value;

            // Only reload if it's different from current theme
            if (previousTheme?.paletteId !== defaultThemeId) {

              await setActiveCustomTheme(defaultThemeId, false, 'app');
            } else {
              // Restore previous theme state to prevent flash

              setActiveCustomThemeState(previousTheme);
              setActivePalette(previousPalette);
            }
          }
        } catch (error: any) {
          if (error?.response?.status !== 404) {
            logger.error('Error restoring admin default theme:', error, 'CustomColorThemeContext');
          }
        }
      }
    } finally {
      // Clear reloading flag
      isReloadingRef.current = false;
    }
  }, [loadCustomColorPalettes, loadActiveCustomTheme, user, setActiveCustomTheme, activeCustomTheme, activePalette]);

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
    'global.statusBarBackground': currentColors.primary,
    'planningTasks.projectTaskBackground': currentColors.primary,
    'planningTasks.projectTaskText': currentColors.white,
    'planningTasks.adminTaskBackground': currentColors.secondary,
    'planningTasks.adminTaskText': currentColors.white,
    'planningTasks.marketingTaskBackground': currentColors.planning?.marketingTask || currentColors.primary,
    'planningTasks.marketingTaskText': currentColors.white,
    'planningTasks.outOfOfficeBackground': currentColors.planning?.outOfOffice || currentColors.secondary,
    'planningTasks.outOfOfficeText': currentColors.planning?.outOfOfficeFont || currentColors.white,
    'planningTasks.unavailableBackground': currentColors.planning?.unavailable || currentColors.text,
    'planningTasks.unavailableText': currentColors.white,
    'planningTasks.timeOffBackground': currentColors.planning?.timeOff || currentColors.primary,
    'planningTasks.timeOffText': currentColors.white,
    'planningTasks.deadlineBackground': currentColors.planning?.deadline || currentColors.secondary,
    'planningTasks.deadlineText': currentColors.white,
    'planningTasks.internalDeadlineBackground': currentColors.planning?.internalDeadline || currentColors.secondary,
    'planningTasks.internalDeadlineText': currentColors.white,
    'planningTasks.milestoneBackground': currentColors.planning?.milestone || currentColors.primary,
    'planningTasks.milestoneText': currentColors.white,
    'planningGrid.headerBackground': currentColors.background.bg500,
    'planningGrid.headerText': currentColors.text,
    'planningGrid.headerIcon': currentColors.primary,
    'planningGrid.settingsIconColor': currentColors.white,
    'planningGrid.dateCellBackground': currentColors.background.bg500,
    'planningGrid.dateCellText': currentColors.text,
    'planningGrid.deadlinesRowBackground': currentColors.background.bg500,
    'planningGrid.deadlinesRowText': currentColors.text,
    'planningGrid.emptyDeadlineCellBackground': currentColors.background.bg500,
    'planningGrid.teamMemberCellBackground': currentColors.background.bg300,
    'planningGrid.teamMemberCellText': currentColors.text,
    'planningGrid.weekdayHeaderBackground': currentColors.background.bg500,
    'planningGrid.weekdayHeaderText': currentColors.text,
    'planningGrid.weekendHeaderBackground': currentColors.background.bg700,
    'planningGrid.weekendHeaderText': currentColors.textSecondary,
    'planningGrid.weekdayCellBackground': currentColors.white,
    'planningGrid.weekendCellBackground': currentColors.background.bg300,
    'planningGrid.todayCellBackground': currentColors.primary + '20',
    'planningGrid.todayHeaderBackground': currentColors.primary,
    'planningGrid.todayHeaderText': currentColors.white,
    'planningGrid.headerBorderColor': currentColors.text,
    'planningGrid.cellBorderColor': currentColors.text,
    'projects.tableHeaderBackground': currentColors.primary,
    'projects.tableHeaderText': currentColors.white,
    'clients.background': currentColors.background.bg700,
    'clients.clientCardBackground': currentColors.white,
    'clients.clientCardText': currentColors.text,
    'clients.clientCardBorder': currentColors.border,
    'clients.addButtonBackground': currentColors.secondary,
    'clients.addButtonIcon': currentColors.white,
    'clients.searchIconColor': currentColors.icon,
    'clients.searchTextColor': currentColors.text,
    'clients.searchBarBackground': currentColors.white,
    'clients.searchSectionBackground': currentColors.background.bg700,
    'dashboard.background': currentColors.background.bg700,
    'dashboard.cardBackground': currentColors.background.bg500,
    'dashboard.cardText': currentColors.text,
    'dashboard.headerBackground': currentColors.background.bg500,
    'dashboard.headerText': currentColors.text,
    // Dashboard section card backgrounds
    'dashboard.upcomingDeadlinesCardBackground': currentColors.white,
    'dashboard.todaysTasksCardBackground': currentColors.white,
    'dashboard.thisWeeksTasksCardBackground': currentColors.white,
    // Dashboard section card text colors
    'dashboard.upcomingDeadlinesCardText': currentColors.text,
    'dashboard.todaysTasksCardText': currentColors.text,
    'dashboard.thisWeeksTasksCardText': currentColors.text,
    // Dashboard task type backgrounds
    'dashboard.projectTaskBackground': currentColors.primary,
    'dashboard.adminTaskBackground': currentColors.secondary,
    'dashboard.marketingTaskBackground': currentColors.primary,
    'dashboard.outOfOfficeBackground': currentColors.secondary,
    'dashboard.unavailableBackground': currentColors.textSecondary,
    'dashboard.timeOffBackground': currentColors.primary,
    // Dashboard task type text colors
    'dashboard.projectTaskText': currentColors.white,
    'dashboard.adminTaskText': currentColors.white,
    'dashboard.marketingTaskText': currentColors.white,
    'dashboard.outOfOfficeText': currentColors.white,
    'dashboard.unavailableText': currentColors.white,
    'dashboard.timeOffText': currentColors.white,
    // Dashboard deadline type backgrounds
    'dashboard.deadlineBackground': currentColors.secondary,
    'dashboard.internalDeadlineBackground': currentColors.secondary,
    'dashboard.milestoneBackground': currentColors.primary,
    // Dashboard deadline type text colors
    'dashboard.deadlineText': currentColors.white,
    'dashboard.internalDeadlineText': currentColors.white,
    'dashboard.milestoneText': currentColors.white,
  };

  const key = `${section}.${element}`;
  return mapping[key] || currentColors.text || '#000000';
}
