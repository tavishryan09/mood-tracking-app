import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { ColorPalette, ColorPaletteName, colorPalettes } from '../theme/colorPalettes';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../utils/apiWithTimeout';

interface CustomColorMapping {
  [section: string]: {
    [element: string]: string;
  };
}

interface PlanningColors {
  marketingTask?: string;
  outOfOffice?: string;
  outOfOfficeFont?: string;
  unavailable?: string;
  timeOff?: string;
  deadline?: string;
  internalDeadline?: string;
  milestone?: string;
}

interface UnifiedColorContextType {
  currentColors: ColorPalette;
  selectedPalette: string;
  setSelectedPalette: (paletteId: string) => Promise<void>;
  getColorForElement: (section: string, element: string) => string;
  planningColors: PlanningColors;
  updatePlanningColors: (colors: PlanningColors) => Promise<void>;
  isUsingCustomTheme: boolean;
  customColorMappings: CustomColorMapping;
  updateCustomColorMapping: (section: string, element: string, color: string) => Promise<void>;
}

const UnifiedColorContext = createContext<UnifiedColorContextType | undefined>(undefined);

export const UnifiedColorProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [selectedPalette, setSelectedPaletteState] = useState('default');
  const [customColorMappings, setCustomColorMappings] = useState<CustomColorMapping>({});
  const [planningColors, setPlanningColors] = useState<PlanningColors>({});
  const [isUsingCustomTheme, setIsUsingCustomTheme] = useState(false);

  // Load initial settings
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        // Load custom color mappings if user is logged in
        if (user) {
          // Load all settings in parallel to ensure they're all ready before rendering
          const [paletteResult, mappingsResult, planningColorsResult, defaultThemeResult] = await Promise.allSettled([
            settingsAPI.user.get('selected_color_palette'),
            settingsAPI.user.get('custom_color_mappings'),
            settingsAPI.user.get('planning_colors'),
            settingsAPI.app.get('default_custom_theme'),
          ]);

          if (!isMounted) return;

          // Process palette - use user preference if available, otherwise use app default
          if (paletteResult.status === 'fulfilled' && paletteResult.value?.data?.value) {
            // User has their own preference
            setSelectedPaletteState(paletteResult.value.data.value);
          } else if (defaultThemeResult.status === 'fulfilled' && defaultThemeResult.value?.data?.value) {
            // No user preference, use app-level default
            setSelectedPaletteState(defaultThemeResult.value.data.value);
          } else if (paletteResult.status === 'rejected' && paletteResult.reason?.response?.status !== 404) {
            logger.error('Error loading palette:', paletteResult.reason, 'UnifiedColorContext');
          }

          // Process custom mappings
          if (mappingsResult.status === 'fulfilled' && mappingsResult.value?.data?.value) {
            const customMappings = mappingsResult.value.data.value;
            setCustomColorMappings(customMappings);
            setIsUsingCustomTheme(Object.keys(customMappings).length > 0);
            logger.log('Custom color mappings loaded successfully', { count: Object.keys(customMappings).length }, 'UnifiedColorContext');
          } else if (mappingsResult.status === 'rejected' && mappingsResult.reason?.response?.status !== 404) {
            logger.error('Error loading custom mappings:', mappingsResult.reason, 'UnifiedColorContext');
          }

          // Process planning colors
          if (planningColorsResult.status === 'fulfilled' && planningColorsResult.value?.data?.value) {
            setPlanningColors(planningColorsResult.value.data.value);
            logger.log('Planning colors loaded successfully', {}, 'UnifiedColorContext');
          } else if (planningColorsResult.status === 'rejected' && planningColorsResult.reason?.response?.status !== 404) {
            logger.error('Error loading planning colors:', planningColorsResult.reason, 'UnifiedColorContext');
          }
        }
      } catch (error) {
        logger.error('Error loading settings:', error, 'UnifiedColorContext');
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Memoize current colors to prevent unnecessary re-renders
  const currentColors = useMemo(() => {
    const basePalette = colorPalettes[selectedPalette as ColorPaletteName] || colorPalettes.default;

    // If not using custom theme, return base palette
    if (!isUsingCustomTheme) {
      return basePalette;
    }

    // Build custom palette by overriding base colors
    const customPalette: ColorPalette = { ...basePalette };

    // Map custom colors to palette properties
    if (customColorMappings.global) {
      if (customColorMappings.global.primaryButton) customPalette.primary = customColorMappings.global.primaryButton;
      if (customColorMappings.global.secondaryButton) customPalette.secondary = customColorMappings.global.secondaryButton;
      if (customColorMappings.global.textPrimary) customPalette.text = customColorMappings.global.textPrimary;
      if (customColorMappings.global.textSecondary) customPalette.textSecondary = customColorMappings.global.textSecondary;
      if (customColorMappings.global.textTertiary) customPalette.textTertiary = customColorMappings.global.textTertiary;
      if (customColorMappings.global.borderColor) {
        customPalette.border = customColorMappings.global.borderColor;
        customPalette.borderLight = customColorMappings.global.borderColor;
      }
      if (customColorMappings.global.iconDefault) customPalette.icon = customColorMappings.global.iconDefault;
      if (customColorMappings.global.iconInactive) customPalette.iconInactive = customColorMappings.global.iconInactive;
      if (customColorMappings.global.errorColor) customPalette.error = customColorMappings.global.errorColor;
      if (customColorMappings.global.successColor) customPalette.success = customColorMappings.global.successColor;
      if (customColorMappings.global.warningColor) customPalette.warning = customColorMappings.global.warningColor;
      if (customColorMappings.global.background) customPalette.background.bg700 = customColorMappings.global.background;
      if (customColorMappings.global.cardBackground) {
        customPalette.background.bg500 = customColorMappings.global.cardBackground;
        customPalette.background.bg300 = customColorMappings.global.cardBackground;
      }
    }

    // Apply planning colors
    if (planningColors.marketingTask) customPalette.planning.marketingTask = planningColors.marketingTask;
    if (planningColors.outOfOffice) customPalette.planning.outOfOffice = planningColors.outOfOffice;
    if (planningColors.outOfOfficeFont) customPalette.planning.outOfOfficeFont = planningColors.outOfOfficeFont;
    if (planningColors.unavailable) customPalette.planning.unavailable = planningColors.unavailable;
    if (planningColors.timeOff) customPalette.planning.timeOff = planningColors.timeOff;
    if (planningColors.deadline) customPalette.planning.deadline = planningColors.deadline;
    if (planningColors.internalDeadline) customPalette.planning.internalDeadline = planningColors.internalDeadline;
    if (planningColors.milestone) customPalette.planning.milestone = planningColors.milestone;

    return customPalette;
  }, [selectedPalette, customColorMappings, planningColors, isUsingCustomTheme]);

  // Memoized color resolver
  const getColorForElement = useCallback((section: string, element: string): string => {
    if (customColorMappings[section]?.[element]) {
      return customColorMappings[section][element];
    }
    // Fall back to current colors
    return (currentColors as any)[element] || currentColors.primary;
  }, [customColorMappings, currentColors]);

  const setSelectedPalette = useCallback(async (paletteId: string) => {
    setSelectedPaletteState(paletteId);
    if (user) {
      try {
        await apiWithTimeout(
          settingsAPI.user.set('selected_color_palette', paletteId),
          TIMEOUT_DURATIONS.STANDARD
        );
        logger.log('Selected palette saved successfully', { paletteId }, 'UnifiedColorContext');
      } catch (error) {
        logger.error('Error saving selected palette:', error, 'UnifiedColorContext');
        throw error;
      }
    }
  }, [user]);

  const updatePlanningColors = useCallback(async (colors: PlanningColors) => {
    setPlanningColors(colors);
    if (user) {
      try {
        await apiWithTimeout(
          settingsAPI.user.set('planning_colors', colors),
          TIMEOUT_DURATIONS.STANDARD
        );
        logger.log('Planning colors updated successfully', {}, 'UnifiedColorContext');
      } catch (error) {
        logger.error('Error updating planning colors:', error, 'UnifiedColorContext');
        throw error;
      }
    }
  }, [user]);

  const updateCustomColorMapping = useCallback(async (section: string, element: string, color: string) => {
    setCustomColorMappings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [element]: color
      }
    }));

    const newMappings = {
      ...customColorMappings,
      [section]: {
        ...customColorMappings[section],
        [element]: color
      }
    };

    setIsUsingCustomTheme(Object.keys(newMappings).length > 0);

    if (user) {
      try {
        await apiWithTimeout(
          settingsAPI.user.set('custom_color_mappings', newMappings),
          TIMEOUT_DURATIONS.STANDARD
        );
        logger.log('Custom color mapping updated successfully', { section, element }, 'UnifiedColorContext');
      } catch (error) {
        logger.error('Error updating custom color mapping:', error, 'UnifiedColorContext');
        throw error;
      }
    }
  }, [customColorMappings, user]);

  const value = useMemo(() => ({
    currentColors,
    selectedPalette,
    setSelectedPalette,
    getColorForElement,
    planningColors,
    updatePlanningColors,
    isUsingCustomTheme,
    customColorMappings,
    updateCustomColorMapping,
  }), [
    currentColors,
    selectedPalette,
    setSelectedPalette,
    getColorForElement,
    planningColors,
    updatePlanningColors,
    isUsingCustomTheme,
    customColorMappings,
    updateCustomColorMapping,
  ]);

  return (
    <UnifiedColorContext.Provider value={value}>
      {children}
    </UnifiedColorContext.Provider>
  );
};

export const useUnifiedColors = () => {
  const context = useContext(UnifiedColorContext);
  if (!context) {
    throw new Error('useUnifiedColors must be used within UnifiedColorProvider');
  }
  return context;
};
