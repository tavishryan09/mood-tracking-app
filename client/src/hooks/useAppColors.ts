/**
 * Hook that provides app colors with custom theme support
 * Use this instead of useTheme() to get colors that respect custom themes
 */

import { useTheme } from '../contexts/ThemeContext';
import { useCustomColorTheme } from '../contexts/CustomColorThemeContext';
import { ColorPalette } from '../theme/colorPalettes';

export const useAppColors = (): ColorPalette => {
  const { currentColors } = useTheme();
  const { isUsingCustomTheme, getColorForElement } = useCustomColorTheme();

  // If not using custom theme, return the basic theme colors
  if (!isUsingCustomTheme) {
    return currentColors;
  }

  // Build a ColorPalette object using custom theme colors
  const customColors: ColorPalette = {
    ...currentColors, // Start with defaults as fallback

    // Override with custom colors
    primary: getColorForElement('global', 'primaryButton'),
    secondary: getColorForElement('global', 'secondaryButton'),
    text: getColorForElement('global', 'textPrimary'),
    textSecondary: getColorForElement('global', 'textSecondary'),
    textTertiary: getColorForElement('global', 'textTertiary'),
    border: getColorForElement('global', 'borderColor'),
    borderLight: getColorForElement('global', 'borderColor'),
    icon: getColorForElement('global', 'iconDefault'),
    iconInactive: getColorForElement('global', 'iconInactive'),
    white: getColorForElement('navigation', 'tabBarBackground'),
    error: getColorForElement('global', 'errorColor'),
    success: getColorForElement('global', 'successColor'),
    warning: getColorForElement('global', 'warningColor'),
    background: {
      bg700: getColorForElement('global', 'background'),
      bg500: getColorForElement('global', 'cardBackground'),
      bg300: getColorForElement('global', 'cardBackground'),
    },
    status: {
      active: getColorForElement('projects', 'statusActiveColor'),
      onHold: getColorForElement('projects', 'statusOnHoldColor'),
      completed: getColorForElement('projects', 'statusCompletedColor'),
      archived: getColorForElement('projects', 'statusArchivedColor'),
    },
    planning: {
      marketingTask: getColorForElement('planningTasks', 'marketingTaskBackground'),
      outOfOffice: getColorForElement('planningTasks', 'outOfOfficeBackground'),
      outOfOfficeFont: getColorForElement('planningTasks', 'outOfOfficeText'),
      unavailable: getColorForElement('planningTasks', 'unavailableBackground'),
      timeOff: getColorForElement('planningTasks', 'timeOffBackground'),
      deadline: getColorForElement('planningTasks', 'deadlineBackground'),
      internalDeadline: getColorForElement('planningTasks', 'internalDeadlineBackground'),
      milestone: getColorForElement('planningTasks', 'milestoneBackground'),
    },
  };

  return customColors;
};
