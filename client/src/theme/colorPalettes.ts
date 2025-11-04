// Color palette definitions based on screenshots
export type ColorPaletteName = 'default' | 'orange' | 'blue' | 'dark' | 'green';

export interface ColorPalette {
  id: ColorPaletteName;
  name: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  icon: string;
  iconInactive: string;
  white: string;
  error: string;
  success: string;
  warning: string;
  background: {
    bg700: string;
    bg500: string;
    bg300: string;
  };
  status: {
    active: string;
    onHold: string;
    completed: string;
    archived: string;
  };
  planning: {
    marketingTask: string;
    outOfOffice: string;
    outOfOfficeFont: string;
    unavailable: string;
    timeOff: string;
    deadline: string;
    internalDeadline: string;
    milestone: string;
  };
  // iOS color palette (available but not all used in theme mapping)
  ios?: {
    red: string;
    redOrange: string;
    pink: string;
    orangeRed: string;
    lightPink: string;
    purple: string;
    blue: string;
    lightBlue: string;
    skyBlue: string;
    green: string;
    orange: string;
    yellow: string;
    darkGray: string;
    mediumGray: string;
    lightGray: string;
    lighterGray: string;
    beigeGray: string;
    offWhite: string;
  };
}

export const colorPalettes: Record<ColorPaletteName, ColorPalette> = {
  default: {
    id: 'default',
    name: 'Default',
    primary: '#007AFF',
    secondary: '#FF9500',
    text: '#1F1F21',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    border: '#C7C7CC',
    borderLight: '#D6CEC3',
    icon: '#8E8E93',
    iconInactive: '#BDBEC2',
    white: '#FFFFFF',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    background: {
      bg700: '#FFFFFF',
      bg500: '#F7F7F7',
      bg300: '#F7F7F7',
    },
    status: {
      active: '#4CD964',
      onHold: '#FF9500',
      completed: '#007AFF',
      archived: '#8E8E93',
    },
    planning: {
      marketingTask: '#9C27B0',
      outOfOffice: '#FFC107',
      outOfOfficeFont: '#1F1F21',
      unavailable: '#757575',
      timeOff: '#4CAF50',
      deadline: '#FF5252',
      internalDeadline: '#FF9800',
      milestone: '#2196F3',
    },
    ios: {
      red: '#FF1300',
      redOrange: '#FF3A2D',
      pink: '#FF2D55',
      orangeRed: '#FF3B30',
      lightPink: '#FFD3E0',
      purple: '#5856D6',
      blue: '#007AFF',
      lightBlue: '#34AADC',
      skyBlue: '#5AC8FA',
      green: '#4CD964',
      orange: '#FF9500',
      yellow: '#FFCC00',
      darkGray: '#1F1F21',
      mediumGray: '#8E8E93',
      lightGray: '#BDBEC2',
      lighterGray: '#C7C7CC',
      beigeGray: '#D6CEC3',
      offWhite: '#F7F7F7',
    },
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    primary: '#F89344',
    secondary: '#FF642F',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#E0E0E0',
    borderLight: '#E5E5EA',
    icon: '#666666',
    iconInactive: '#999999',
    white: '#FFFFFF',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    background: {
      bg700: '#393A3A',
      bg500: '#575959',
      bg300: '#F4F4F4',
    },
    status: {
      active: '#4CD964',
      onHold: '#FF9500',
      completed: '#007AFF',
      archived: '#8E8E93',
    },
    planning: {
      marketingTask: '#9C27B0',
      outOfOffice: '#FFC107',
      outOfOfficeFont: '#000000',
      unavailable: '#757575',
      timeOff: '#4CAF50',
      deadline: '#FF5252',
      internalDeadline: '#FF9800',
      milestone: '#2196F3',
    },
  },
  blue: {
    id: 'blue',
    name: 'Blue',
    primary: '#F8893D',
    secondary: '#FF592A',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#E0E0E0',
    borderLight: '#E5E5EA',
    icon: '#666666',
    iconInactive: '#999999',
    white: '#FFFFFF',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    background: {
      bg700: '#215A89',
      bg500: '#3A64BB',
      bg300: '#B8D4E7',
    },
    status: {
      active: '#4CD964',
      onHold: '#FF9500',
      completed: '#007AFF',
      archived: '#8E8E93',
    },
    planning: {
      marketingTask: '#9C27B0',
      outOfOffice: '#FFC107',
      outOfOfficeFont: '#000000',
      unavailable: '#757575',
      timeOff: '#4CAF50',
      deadline: '#FF5252',
      internalDeadline: '#FF9800',
      milestone: '#2196F3',
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    primary: '#F8893D',
    secondary: '#FF592A',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#E0E0E0',
    borderLight: '#E5E5EA',
    icon: '#666666',
    iconInactive: '#999999',
    white: '#FFFFFF',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    background: {
      bg700: '#333333',
      bg500: '#4E4F4E',
      bg300: '#E5E5E5',
    },
    status: {
      active: '#4CD964',
      onHold: '#FF9500',
      completed: '#007AFF',
      archived: '#8E8E93',
    },
    planning: {
      marketingTask: '#9C27B0',
      outOfOffice: '#FFC107',
      outOfOfficeFont: '#000000',
      unavailable: '#757575',
      timeOff: '#4CAF50',
      deadline: '#FF5252',
      internalDeadline: '#FF9800',
      milestone: '#2196F3',
    },
  },
  green: {
    id: 'green',
    name: 'Dark Green',
    primary: '#4BAA8C',
    secondary: '#57D368',
    text: '#F3EEEB',
    textSecondary: '#C5D3D8',
    textTertiary: '#8FA9B3',
    border: '#3A7A8F',
    borderLight: '#2F6B7E',
    icon: '#C5D3D8',
    iconInactive: '#8FA9B3',
    white: '#FFFFFF',
    error: '#FF6B6B',
    success: '#57D368',
    warning: '#FFB84D',
    background: {
      bg700: '#0D2830',
      bg500: '#1D5266',
      bg300: '#246582',
    },
    status: {
      active: '#57D368',
      onHold: '#FFB84D',
      completed: '#4BAA8C',
      archived: '#8FA9B3',
    },
    planning: {
      marketingTask: '#9C27B0',
      outOfOffice: '#FFC107',
      outOfOfficeFont: '#0D2830',
      unavailable: '#757575',
      timeOff: '#4CAF50',
      deadline: '#FF5252',
      internalDeadline: '#FF9800',
      milestone: '#2196F3',
    },
  },
};
