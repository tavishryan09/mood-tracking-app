import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useCustomColorTheme } from './CustomColorThemeContext';

export interface PlanningColors {
  // Header colors
  headerBg: string;
  headerText: string;
  headerIcon: string;

  // Date cell colors
  dateCellBg: string;
  dateCellText: string;

  // Deadlines & Milestones row colors
  deadlinesRowBg: string;
  deadlinesRowText: string;

  // Team member name cell colors
  teamMemberColBg: string;
  teamMemberColText: string;

  // Weekday header colors
  weekdayHeaderBg: string;
  weekdayHeaderFont: string;

  // Weekend header colors
  weekendHeaderBg: string;
  weekendHeaderFont: string;

  // Cell background colors
  weekdayCellBg: string;
  weekendCellBg: string;
  currentDayBg: string;

  // Border colors
  headerBorderColor: string;
  cellBorderColor: string;

  // Legacy fields (keeping for backward compatibility)
  calendarHeaderBg: string;
  calendarHeaderFont: string;
  prevNextIconColor: string;

  // Task colors
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

  // Deadline task colors
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
  // Header colors
  headerBg: '',
  headerText: '',
  headerIcon: '',

  // Date cell colors
  dateCellBg: '',
  dateCellText: '',

  // Deadlines & Milestones row colors
  deadlinesRowBg: '',
  deadlinesRowText: '',

  // Team member name cell colors
  teamMemberColBg: '',
  teamMemberColText: '',

  // Weekday header colors
  weekdayHeaderBg: '',
  weekdayHeaderFont: '',

  // Weekend header colors
  weekendHeaderBg: '',
  weekendHeaderFont: '',

  // Cell background colors
  weekdayCellBg: '',
  weekendCellBg: '',
  currentDayBg: '',

  // Border colors
  headerBorderColor: '',
  cellBorderColor: '',

  // Legacy fields
  calendarHeaderBg: '',
  calendarHeaderFont: '',
  prevNextIconColor: '',

  // Task colors
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

  // Deadline task colors
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
  const { getColorForElement } = useCustomColorTheme();

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
      const response = await settingsAPI.user.get('planning_colors');

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
      await settingsAPI.user.set(settingKey, colors);
      setPlanningColors(colors);
      console.log(`[PlanningColors] Saved ${asDefault ? 'default' : 'user'} colors to database`);
    } catch (error) {
      console.error('[PlanningColors] Error saving planning colors:', error);
      throw error;
    }
  }, []);

  // Merge planning colors with Element Color Mapper colors
  const mergedPlanningColors = useMemo(() => {
    return {
      ...planningColors,
      // Use Element Color Mapper if planning color is empty
      projectTaskBg: planningColors.projectTaskBg || getColorForElement('planningTasks', 'projectTaskBackground'),
      projectTaskFont: planningColors.projectTaskFont || getColorForElement('planningTasks', 'projectTaskText'),
      adminTaskBg: planningColors.adminTaskBg || getColorForElement('planningTasks', 'adminTaskBackground'),
      adminTaskFont: planningColors.adminTaskFont || getColorForElement('planningTasks', 'adminTaskText'),
      marketingTaskBg: planningColors.marketingTaskBg || getColorForElement('planningTasks', 'marketingTaskBackground'),
      marketingTaskFont: planningColors.marketingTaskFont || getColorForElement('planningTasks', 'marketingTaskText'),
      outOfOfficeBg: planningColors.outOfOfficeBg || getColorForElement('planningTasks', 'outOfOfficeBackground'),
      outOfOfficeFont: planningColors.outOfOfficeFont || getColorForElement('planningTasks', 'outOfOfficeText'),
      unavailableBg: planningColors.unavailableBg || getColorForElement('planningTasks', 'unavailableBackground'),
      unavailableFont: planningColors.unavailableFont || getColorForElement('planningTasks', 'unavailableText'),
      timeOffBg: planningColors.timeOffBg || getColorForElement('planningTasks', 'timeOffBackground'),
      timeOffFont: planningColors.timeOffFont || getColorForElement('planningTasks', 'timeOffText'),
      deadlineBg: planningColors.deadlineBg || getColorForElement('planningTasks', 'deadlineBackground'),
      deadlineFont: planningColors.deadlineFont || getColorForElement('planningTasks', 'deadlineText'),
      internalDeadlineBg: planningColors.internalDeadlineBg || getColorForElement('planningTasks', 'internalDeadlineBackground'),
      internalDeadlineFont: planningColors.internalDeadlineFont || getColorForElement('planningTasks', 'internalDeadlineText'),
      milestoneBg: planningColors.milestoneBg || getColorForElement('planningTasks', 'milestoneBackground'),
      milestoneFont: planningColors.milestoneFont || getColorForElement('planningTasks', 'milestoneText'),
    };
  }, [planningColors, getColorForElement]);

  const value = useMemo(() => ({
    planningColors: mergedPlanningColors,
    updatePlanningColors,
    savePlanningColors,
    loadPlanningColors,
  }), [mergedPlanningColors, updatePlanningColors, savePlanningColors, loadPlanningColors]);

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
