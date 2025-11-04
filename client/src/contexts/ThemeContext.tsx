import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPaletteName, colorPalettes, ColorPalette } from '../theme/colorPalettes';

interface ThemeContextType {
  selectedPalette: ColorPaletteName | string;
  setSelectedPalette: (palette: ColorPaletteName | string) => Promise<void>;
  currentColors: ColorPalette;
  customPalettes: Record<string, ColorPalette>;
  loadCustomPalettes: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = '@app_color_palette';
const CUSTOM_PALETTES_KEY = '@app_custom_palettes';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedPalette, setSelectedPaletteState] = useState<ColorPaletteName | string>('default');
  const [customPalettes, setCustomPalettes] = useState<Record<string, ColorPalette>>({});

  useEffect(() => {
    loadSavedPalette();
    loadCustomPalettesData();
  }, []);

  const loadCustomPalettesData = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(CUSTOM_PALETTES_KEY);
      if (saved) {
        setCustomPalettes(JSON.parse(saved));
      }
    } catch (error) {
      console.error('[ThemeContext] Error loading custom palettes:', error);
    }
  }, []);

  const loadSavedPalette = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSelectedPaletteState(saved);
      }
    } catch (error) {
      console.error('[ThemeContext] Error loading saved palette:', error);
    }
  };

  const setSelectedPalette = useCallback(async (palette: ColorPaletteName | string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, palette);
      setSelectedPaletteState(palette);
    } catch (error) {
      console.error('[ThemeContext] Error saving palette:', error);
      throw error;
    }
  }, []);

  // Get current colors from either predefined palettes or custom palettes - memoized
  const currentColors = useMemo((): ColorPalette => {
    // First check custom palettes
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

  const value = useMemo(() => ({
    selectedPalette,
    setSelectedPalette,
    currentColors,
    customPalettes,
    loadCustomPalettes: loadCustomPalettesData,
  }), [selectedPalette, setSelectedPalette, currentColors, customPalettes, loadCustomPalettesData]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
