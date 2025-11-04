import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';

export interface PlanningColors {
  calendarHeaderBg: string;
  calendarHeaderFont: string;
  prevNextIconColor: string;
  teamMemberColBg: string;
  teamMemberColText: string;
  weekdayHeaderBg: string;
  weekdayHeaderFont: string;
  weekendHeaderBg: string;
  weekendHeaderFont: string;
  weekendCellBg: string;
  projectTaskBg: string;
  projectTaskFont: string;
  adminTaskBg: string;
  adminTaskFont: string;
  marketingTaskBg: string;
  marketingTaskFont: string;
  outOfOfficeBg: string;
  outOfOfficeFont: string;
  unavailableBg: string;
  unavailableFont: string;
  timeOffBg: string;
  timeOffFont: string;
  deadlineRowBg: string;
  deadlineBg: string;
  deadlineFont: string;
  internalDeadlineBg: string;
  internalDeadlineFont: string;
  milestoneBg: string;
  milestoneFont: string;
}

interface PlanningColorsContextType {
  planningColors: PlanningColors;
  updatePlanningColors: (colors: Partial<PlanningColors>) => Promise<void>;
  savePlanningColors: (colors: PlanningColors, asDefault?: boolean) => Promise<void>;
  loadPlanningColors: () => Promise<void>;
}

const defaultColors: PlanningColors = {
  calendarHeaderBg: '',
  calendarHeaderFont: '',
  prevNextIconColor: '',
  teamMemberColBg: '',
  teamMemberColText: '',
  weekdayHeaderBg: '',
  weekdayHeaderFont: '',
  weekendHeaderBg: '',
  weekendHeaderFont: '',
  weekendCellBg: '',
  projectTaskBg: '',
  projectTaskFont: '',
  adminTaskBg: '',
  adminTaskFont: '',
  marketingTaskBg: '',
  marketingTaskFont: '',
  outOfOfficeBg: '',
  outOfOfficeFont: '',
  unavailableBg: '',
  unavailableFont: '',
  timeOffBg: '',
  timeOffFont: '',
  deadlineRowBg: '',
  deadlineBg: '',
  deadlineFont: '',
  internalDeadlineBg: '',
  internalDeadlineFont: '',
  milestoneBg: '',
  milestoneFont: '',
};

const PlanningColorsContext = createContext<PlanningColorsContextType | undefined>(undefined);

export const PlanningColorsProvider = ({ children }: { children: ReactNode }) => {
  const [planningColors, setPlanningColors] = useState<PlanningColors>(defaultColors);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPlanningColors();
    }
  }, [user]);

  const loadPlanningColors = useCallback(async () => {
    if (!user) {
      console.log('[PlanningColors] No user logged in, using defaults');
      setPlanningColors(defaultColors);
      return;
    }

    try {
      // Try to load from database
      const response = await settingsAPI.get('planning_colors');

      if (response.data && response.data.value) {
        setPlanningColors(response.data.value);
      } else {
        // No saved colors, use defaults
        setPlanningColors(defaultColors);
      }
    } catch (error: any) {
      // If setting doesn't exist (404), use defaults
      if (error.response?.status === 404) {
        console.log('[PlanningColors] No saved colors found, using defaults');
        setPlanningColors(defaultColors);
      } else {
        console.error('[PlanningColors] Error loading planning colors:', error);
        setPlanningColors(defaultColors);
      }
    }
  }, [user]);

  const updatePlanningColors = useCallback(async (colors: Partial<PlanningColors>) => {
    const newColors = { ...planningColors, ...colors };
    setPlanningColors(newColors);
  }, [planningColors]);

  const savePlanningColors = useCallback(async (colors: PlanningColors, asDefault: boolean = false) => {
    try {
      // Save to database
      const settingKey = asDefault ? 'planning_colors_default' : 'planning_colors';
      await settingsAPI.set(settingKey, colors);
      setPlanningColors(colors);
      console.log(`[PlanningColors] Saved ${asDefault ? 'default' : 'user'} colors to database`);
    } catch (error) {
      console.error('[PlanningColors] Error saving planning colors:', error);
      throw error;
    }
  }, []);

  const value = useMemo(() => ({
    planningColors,
    updatePlanningColors,
    savePlanningColors,
    loadPlanningColors,
  }), [planningColors, updatePlanningColors, savePlanningColors, loadPlanningColors]);

  return (
    <PlanningColorsContext.Provider value={value}>
      {children}
    </PlanningColorsContext.Provider>
  );
};

export const usePlanningColors = () => {
  const context = useContext(PlanningColorsContext);
  if (context === undefined) {
    throw new Error('usePlanningColors must be used within a PlanningColorsProvider');
  }
  return context;
};
