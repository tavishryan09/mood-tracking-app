// New custom color palette system

export interface CustomColor {
  id: string;
  name: string;
  hexCode: string;
  isPrimary: boolean;
  isSecondary: boolean;
}

export interface CustomColorPalette {
  id: string;
  name: string;
  colors: CustomColor[];
  createdAt: string;
  updatedAt: string;
}

// Element mapping types - organized by category
export interface ElementColorMapping {
  // Navigation (Mobile)
  navigation: {
    tabBarBackground: string; // color id
    tabBarActiveIcon: string;
    tabBarInactiveIcon: string;
  };

  // Desktop Navigation
  desktopNavigation: {
    drawerBackground: string;
    drawerActiveItemBackground: string;
    drawerInactiveItemBackground: string;
    drawerActiveItemText: string;
    drawerInactiveItemText: string;
    drawerActiveItemIcon: string;
    drawerInactiveItemIcon: string;
    drawerDividerColor: string;
    drawerHeaderBackground: string;
    drawerHeaderText: string;
  };

  // Global
  global: {
    primaryButton: string;
    primaryButtonText: string;
    secondaryButton: string;
    secondaryButtonText: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    background: string;
    cardBackground: string;
    borderColor: string;
    iconDefault: string;
    iconInactive: string;
    errorColor: string;
    successColor: string;
    warningColor: string;
    statusBarBackground: string;
  };

  // Dashboard Screen
  dashboard: {
    background: string;
    cardBackground: string;
    cardText: string;
    headerBackground: string;
    headerText: string;
    // Task type backgrounds (on dashboard cards)
    projectTaskBackground: string;
    adminTaskBackground: string;
    marketingTaskBackground: string;
    outOfOfficeBackground: string;
    unavailableBackground: string;
    timeOffBackground: string;
    // Task type text colors
    projectTaskText: string;
    adminTaskText: string;
    marketingTaskText: string;
    outOfOfficeText: string;
    unavailableText: string;
    timeOffText: string;
    // Deadline type backgrounds (on dashboard cards)
    deadlineBackground: string;
    internalDeadlineBackground: string;
    milestoneBackground: string;
    // Deadline type text colors
    deadlineText: string;
    internalDeadlineText: string;
    milestoneText: string;
    // Section card backgrounds
    upcomingDeadlinesCardBackground: string;
    todaysTasksCardBackground: string;
    thisWeeksTasksCardBackground: string;
    // Section card text colors
    upcomingDeadlinesCardText: string;
    todaysTasksCardText: string;
    thisWeeksTasksCardText: string;
  };

  // Projects Screen
  projects: {
    background: string;
    projectCardBackground: string;
    projectCardText: string;
    projectCardBorder: string;
    statusActiveColor: string;
    statusOnHoldColor: string;
    statusCompletedColor: string;
    statusArchivedColor: string;
    addButtonBackground: string;
    addButtonIcon: string;
    tableHeaderBackground: string;
    tableHeaderText: string;
  };

  // Planning Tasks
  planningTasks: {
    projectTaskBackground: string;
    projectTaskText: string;
    adminTaskBackground: string;
    adminTaskText: string;
    marketingTaskBackground: string;
    marketingTaskText: string;
    outOfOfficeBackground: string;
    outOfOfficeText: string;
    unavailableBackground: string;
    unavailableText: string;
    timeOffBackground: string;
    timeOffText: string;
    deadlineBackground: string;
    deadlineText: string;
    internalDeadlineBackground: string;
    internalDeadlineText: string;
    milestoneBackground: string;
    milestoneText: string;
  };

  // Planning Grid
  planningGrid: {
    screenBackground: string;
    headerBackground: string;
    headerText: string;
    headerIcon: string;
    settingsIconColor: string;
    dateCellBackground: string;
    dateCellText: string;
    deadlinesRowBackground: string;
    deadlinesRowText: string;
    emptyDeadlineCellBackground: string;
    teamMemberCellBackground: string;
    teamMemberCellText: string;
    weekdayHeaderBackground: string;
    weekdayHeaderText: string;
    weekendHeaderBackground: string;
    weekendHeaderText: string;
    weekdayCellBackground: string;
    weekendCellBackground: string;
    todayCellBackground: string;
    todayHeaderBackground: string;
    todayHeaderText: string;
    headerBorderColor: string;
    cellBorderColor: string;
    teamMemberBorderColor: string;
  };

  // Clients Screen
  clients: {
    background: string;
    clientCardBackground: string;
    clientCardText: string;
    clientCardBorder: string;
    addButtonBackground: string;
    addButtonIcon: string;
    searchIconColor: string;
    searchTextColor: string;
    searchBarBackground: string;
    searchSectionBackground: string;
  };

  // Profile Screen
  profile: {
    background: string;
    cardBackground: string;
    cardText: string;
    menuItemBackground: string;
    menuItemText: string;
    menuItemIcon: string;
    logoutButtonBackground: string;
    logoutButtonText: string;
  };
}

export interface CustomColorTheme {
  paletteId: string;
  paletteName: string;
  elementMapping: ElementColorMapping;
  source?: 'user' | 'app' | 'shared'; // Track where the theme came from
}

// Helper to get element labels for UI
export const ElementLabels = {
  navigation: {
    title: 'Mobile Navigation',
    elements: {
      tabBarBackground: 'Background Color',
      tabBarActiveIcon: 'Active Icon Color',
      tabBarInactiveIcon: 'Inactive Icon Color',
    },
  },
  desktopNavigation: {
    title: 'Desktop Navigation',
    elements: {
      drawerBackground: 'Drawer Background',
      drawerActiveItemBackground: 'Active Item Background',
      drawerInactiveItemBackground: 'Inactive Item Background',
      drawerActiveItemText: 'Active Item Text',
      drawerInactiveItemText: 'Inactive Item Text',
      drawerActiveItemIcon: 'Active Item Icon',
      drawerInactiveItemIcon: 'Inactive Item Icon',
      drawerDividerColor: 'Divider Color',
      drawerHeaderBackground: 'Header Background',
      drawerHeaderText: 'Header Text',
    },
  },
  global: {
    title: 'Global Elements',
    elements: {
      primaryButton: 'Primary Button',
      primaryButtonText: 'Primary Button Text',
      secondaryButton: 'Secondary Button',
      secondaryButtonText: 'Secondary Button Text',
      textPrimary: 'Primary Text',
      textSecondary: 'Secondary Text',
      textTertiary: 'Tertiary Text',
      background: 'Background',
      cardBackground: 'Card Background',
      borderColor: 'Border Color',
      iconDefault: 'Default Icon',
      iconInactive: 'Inactive Icon',
      errorColor: 'Error Color',
      successColor: 'Success Color',
      warningColor: 'Warning Color',
      statusBarBackground: 'Status Bar Background',
    },
  },
  dashboard: {
    title: 'Dashboard',
    elements: {
      background: 'Background',
      cardBackground: 'Card Background',
      cardText: 'Card Text',
      headerBackground: 'Header Background',
      headerText: 'Header Text',
      // Task type backgrounds
      projectTaskBackground: 'Project Task Item Background',
      adminTaskBackground: 'Admin Task Item Background',
      marketingTaskBackground: 'Marketing Task Item Background',
      outOfOfficeBackground: 'Out of Office Task Item Background',
      unavailableBackground: 'Unavailable Task Item Background',
      timeOffBackground: 'Time Off Task Item Background',
      // Task type text colors
      projectTaskText: 'Project Task Item Text',
      adminTaskText: 'Admin Task Item Text',
      marketingTaskText: 'Marketing Task Item Text',
      outOfOfficeText: 'Out of Office Task Item Text',
      unavailableText: 'Unavailable Task Item Text',
      timeOffText: 'Time Off Task Item Text',
      // Deadline type backgrounds
      deadlineBackground: 'Deadline Item Background',
      internalDeadlineBackground: 'Internal Deadline Item Background',
      milestoneBackground: 'Milestone Item Background',
      // Deadline type text colors
      deadlineText: 'Deadline Item Text',
      internalDeadlineText: 'Internal Deadline Item Text',
      milestoneText: 'Milestone Item Text',
      // Section card backgrounds
      upcomingDeadlinesCardBackground: 'Upcoming Deadlines Card Background',
      todaysTasksCardBackground: 'Today\'s Tasks Card Background',
      thisWeeksTasksCardBackground: 'This Week\'s Tasks Card Background',
      // Section card text colors
      upcomingDeadlinesCardText: 'Upcoming Deadlines Card Text',
      todaysTasksCardText: 'Today\'s Tasks Card Text',
      thisWeeksTasksCardText: 'This Week\'s Tasks Card Text',
    },
  },
  projects: {
    title: 'Projects',
    elements: {
      background: 'Background',
      projectCardBackground: 'Project Card Background',
      projectCardText: 'Project Card Text',
      projectCardBorder: 'Project Card Border',
      statusActiveColor: 'Status: Active',
      statusOnHoldColor: 'Status: On Hold',
      statusCompletedColor: 'Status: Completed',
      statusArchivedColor: 'Status: Archived',
      addButtonBackground: 'Add Button Background',
      addButtonIcon: 'Add Button Icon',
      tableHeaderBackground: 'Table Header Background',
      tableHeaderText: 'Table Header Text',
    },
  },
  planningTasks: {
    title: 'Planning Tasks',
    elements: {
      projectTaskBackground: 'Project Task Background',
      projectTaskText: 'Project Task Text',
      adminTaskBackground: 'Admin Task Background',
      adminTaskText: 'Admin Task Text',
      marketingTaskBackground: 'Marketing Task Background',
      marketingTaskText: 'Marketing Task Text',
      outOfOfficeBackground: 'Out of Office Background',
      outOfOfficeText: 'Out of Office Text',
      unavailableBackground: 'Unavailable Background',
      unavailableText: 'Unavailable Text',
      timeOffBackground: 'Time Off Background',
      timeOffText: 'Time Off Text',
      deadlineBackground: 'Deadline Background',
      deadlineText: 'Deadline Text',
      internalDeadlineBackground: 'Internal Deadline Background',
      internalDeadlineText: 'Internal Deadline Text',
      milestoneBackground: 'Milestone Background',
      milestoneText: 'Milestone Text',
    },
  },
  planningGrid: {
    title: 'Planning Grid',
    elements: {
      screenBackground: 'Screen Background',
      headerBackground: 'Header Background',
      headerText: 'Header Text',
      headerIcon: 'Header Icon',
      settingsIconColor: 'Settings Icon Color',
      dateCellBackground: 'Date Cell Background',
      dateCellText: 'Date Cell Text',
      deadlinesRowBackground: 'Deadlines Row Background',
      deadlinesRowText: 'Deadlines Row Text',
      emptyDeadlineCellBackground: 'Empty Deadline Cell Background',
      teamMemberCellBackground: 'Team Member Cell Background',
      teamMemberCellText: 'Team Member Cell Text',
      weekdayHeaderBackground: 'Weekday Header Background',
      weekdayHeaderText: 'Weekday Header Text',
      weekendHeaderBackground: 'Weekend Header Background',
      weekendHeaderText: 'Weekend Header Text',
      weekdayCellBackground: 'Weekday Cell Background',
      weekendCellBackground: 'Weekend Cell Background',
      todayCellBackground: 'Today\'s Cell Background',
      todayHeaderBackground: 'Today\'s Header Background',
      todayHeaderText: 'Today\'s Header Text',
      headerBorderColor: 'Header Border Color',
      cellBorderColor: 'Cell Border Color',
      teamMemberBorderColor: 'Team Member Border Color',
    },
  },
  clients: {
    title: 'Clients',
    elements: {
      background: 'Background',
      clientCardBackground: 'Client Card Background',
      clientCardText: 'Client Card Text',
      clientCardBorder: 'Client Card Border',
      addButtonBackground: 'Add Button Background',
      addButtonIcon: 'Add Button Icon',
      searchIconColor: 'Search Icon Color',
      searchTextColor: 'Search Text Color',
      searchBarBackground: 'Search Bar Background',
      searchSectionBackground: 'Search Section Background',
    },
  },
  profile: {
    title: 'Profile',
    elements: {
      background: 'Background',
      cardBackground: 'Card Background',
      cardText: 'Card Text',
      menuItemBackground: 'Menu Item Background',
      menuItemText: 'Menu Item Text',
      menuItemIcon: 'Menu Item Icon',
      logoutButtonBackground: 'Logout Button Background',
      logoutButtonText: 'Logout Button Text',
    },
  },
};
