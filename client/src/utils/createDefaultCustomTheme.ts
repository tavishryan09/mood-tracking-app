import { CustomColorPalette, ElementColorMapping } from '../types/customColors';
import { settingsAPI } from '../services/api';

const CUSTOM_COLOR_PALETTES_KEY = 'custom_color_palettes';
const ELEMENT_COLOR_MAPPING_KEY = 'element_color_mapping';
const DEFAULT_THEME_ID = 'default_theme';

export const createDefaultCustomTheme = async (): Promise<void> => {
  try {
    // Check if default theme already exists in database
    let palettes: Record<string, CustomColorPalette> = {};
    try {
      const response = await settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY);
      if (response?.data?.value) {
        palettes = response.data.value;
        if (palettes[DEFAULT_THEME_ID]) {
          console.log('[DefaultTheme] Default theme already exists');
          return;
        }
      }
    } catch (error: any) {
      // 404 is expected if no palettes exist yet
      if (error?.response?.status !== 404) {
        throw error;
      }
    }

    // Create default color palette
    const defaultPalette: CustomColorPalette = {
      id: DEFAULT_THEME_ID,
      name: 'Default Theme',
      colors: [
        { id: 'blue', name: 'Primary Blue', hexCode: '#007AFF', isPrimary: true, isSecondary: false },
        { id: 'orange', name: 'Secondary Orange', hexCode: '#FF9500', isPrimary: false, isSecondary: true },
        { id: 'white', name: 'White', hexCode: '#FFFFFF', isPrimary: false, isSecondary: false },
        { id: 'black', name: 'Dark Text', hexCode: '#1F1F21', isPrimary: false, isSecondary: false },
        { id: 'gray', name: 'Medium Gray', hexCode: '#8E8E93', isPrimary: false, isSecondary: false },
        { id: 'lightGray', name: 'Light Gray', hexCode: '#C7C7CC', isPrimary: false, isSecondary: false },
        { id: 'background', name: 'Background', hexCode: '#F7F7F7', isPrimary: false, isSecondary: false },
        { id: 'green', name: 'Success Green', hexCode: '#34C759', isPrimary: false, isSecondary: false },
        { id: 'red', name: 'Error Red', hexCode: '#FF3B30', isPrimary: false, isSecondary: false },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create default element mapping
    const defaultMapping: ElementColorMapping = {
      navigation: {
        tabBarBackground: 'white',
        tabBarActiveIcon: 'blue',
        tabBarInactiveIcon: 'gray',
      },
      desktopNavigation: {
        drawerBackground: 'background',
        drawerActiveItemBackground: 'blue',
        drawerInactiveItemBackground: 'background',
        drawerActiveItemText: 'white',
        drawerInactiveItemText: 'black',
        drawerActiveItemIcon: 'white',
        drawerInactiveItemIcon: 'gray',
        drawerDividerColor: 'lightGray',
        drawerHeaderBackground: 'blue',
        drawerHeaderText: 'white',
      },
      global: {
        primaryButton: 'blue',
        primaryButtonText: 'white',
        secondaryButton: 'orange',
        secondaryButtonText: 'white',
        textPrimary: 'black',
        textSecondary: 'gray',
        textTertiary: 'lightGray',
        background: 'background',
        cardBackground: 'white',
        borderColor: 'lightGray',
        iconDefault: 'gray',
        iconInactive: 'lightGray',
        errorColor: 'red',
        successColor: 'green',
        warningColor: 'orange',
      },
      dashboard: {
        background: 'background',
        cardBackground: 'white',
        cardText: 'black',
        statNumberColor: 'blue',
        statLabelColor: 'gray',
        chartPrimary: 'blue',
        chartSecondary: 'orange',
      },
      projects: {
        background: 'background',
        projectCardBackground: 'white',
        projectCardText: 'black',
        projectCardBorder: 'lightGray',
        statusActiveColor: 'green',
        statusOnHoldColor: 'orange',
        statusCompletedColor: 'blue',
        statusArchivedColor: 'gray',
        addButtonBackground: 'blue',
        addButtonIcon: 'white',
        tableHeaderBackground: 'blue',
        tableHeaderText: 'white',
      },
      timeTracking: {
        background: 'background',
        timerCardBackground: 'white',
        timerText: 'black',
        startButtonBackground: 'green',
        startButtonText: 'white',
        stopButtonBackground: 'red',
        stopButtonText: 'white',
        entryCardBackground: 'white',
        entryText: 'black',
        billableColor: 'green',
        nonBillableColor: 'gray',
      },
      calendar: {
        background: 'background',
        headerBackground: 'background',
        headerText: 'black',
        headerIcons: 'gray',
        weekdayHeaderBackground: 'background',
        weekdayHeaderText: 'black',
        weekendHeaderBackground: 'white',
        weekendHeaderText: 'gray',
        weekendCellBackground: 'background',
        currentDayBackground: 'blue',
        teamMemberColumnBackground: 'background',
        teamMemberColumnText: 'black',
        eventBackground: 'blue',
        eventText: 'white',
      },
      planningTasks: {
        projectTaskBackground: 'blue',
        projectTaskText: 'white',
        adminTaskBackground: 'orange',
        adminTaskText: 'white',
        marketingTaskBackground: 'blue',
        marketingTaskText: 'white',
        outOfOfficeBackground: 'orange',
        outOfOfficeText: 'black',
        unavailableBackground: 'gray',
        unavailableText: 'white',
        timeOffBackground: 'green',
        timeOffText: 'white',
        deadlineRowBackground: 'background',
        deadlineBackground: 'red',
        deadlineText: 'white',
        internalDeadlineBackground: 'orange',
        internalDeadlineText: 'white',
        milestoneBackground: 'blue',
        milestoneText: 'white',
      },
      clients: {
        background: 'background',
        clientCardBackground: 'white',
        clientCardText: 'black',
        clientCardBorder: 'lightGray',
        addButtonBackground: 'blue',
        addButtonIcon: 'white',
      },
      events: {
        background: 'background',
        eventCardBackground: 'white',
        eventCardText: 'black',
        eventCardBorder: 'lightGray',
        attendeeChipBackground: 'blue',
        attendeeChipText: 'white',
      },
      profile: {
        background: 'background',
        cardBackground: 'white',
        cardText: 'black',
        menuItemBackground: 'white',
        menuItemText: 'black',
        menuItemIcon: 'gray',
        logoutButtonBackground: 'red',
        logoutButtonText: 'white',
      },
      admin: {
        background: 'background',
        cardBackground: 'white',
        cardText: 'black',
        tableHeaderBackground: 'background',
        tableHeaderText: 'black',
        tableRowBackground: 'white',
        tableRowText: 'black',
        tableRowAlternateBackground: 'background',
        actionButtonBackground: 'blue',
        actionButtonText: 'white',
        deleteButtonBackground: 'red',
        deleteButtonText: 'white',
      },
    };

    // Save default palette to database
    palettes[DEFAULT_THEME_ID] = defaultPalette;
    await settingsAPI.user.set(CUSTOM_COLOR_PALETTES_KEY, palettes);

    // Save default mapping to database
    let mappings: Record<string, ElementColorMapping> = {};
    try {
      const response = await settingsAPI.user.get(ELEMENT_COLOR_MAPPING_KEY);
      if (response?.data?.value) {
        mappings = response.data.value;
      }
    } catch (error: any) {
      // 404 is expected if no mappings exist yet
      if (error?.response?.status !== 404) {
        throw error;
      }
    }

    mappings[DEFAULT_THEME_ID] = defaultMapping;
    await settingsAPI.user.set(ELEMENT_COLOR_MAPPING_KEY, mappings);

    console.log('[DefaultTheme] Default custom theme created successfully in database');
  } catch (error) {
    console.error('[DefaultTheme] Error creating default theme:', error);
  }
};
