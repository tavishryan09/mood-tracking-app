import React, { useState, useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home09Icon, Calendar03Icon, StopWatchIcon, Folder01Icon, UserCircleIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '../contexts/AuthContext';
import { iOSColors } from '../theme/iosTheme';
import DesktopNavigator from './DesktopNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
// RegisterScreen removed - users must be invited by admins
// import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import PlanningScreen from '../screens/planning/PlanningScreen';
import TimeTrackingScreen from '../screens/time/TimeTrackingScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Create Screens
import CreateEventScreen from '../screens/events/CreateEventScreen';
import EditEventScreen from '../screens/events/EditEventScreen';
import DayViewScreen from '../screens/calendar/DayViewScreen';
import StartTimerScreen from '../screens/time/StartTimerScreen';
import EditTimeEntryScreen from '../screens/time/EditTimeEntryScreen';
import CreateProjectScreen from '../screens/projects/CreateProjectScreen';
import EditProjectScreen from '../screens/projects/EditProjectScreen';
import CreateClientScreen from '../screens/clients/CreateClientScreen';
import ClientsListScreen from '../screens/clients/ClientsListScreen';
import EditClientScreen from '../screens/clients/EditClientScreen';
import UserRatesScreen from '../screens/admin/UserRatesScreen';
import TeamViewSettingsScreen from '../screens/admin/TeamViewSettingsScreen';
import ManageUsersScreen from '../screens/admin/ManageUsersScreen';
import InviteUserScreen from '../screens/admin/InviteUserScreen';
import EditUserScreen from '../screens/admin/EditUserScreen';
import ProjectTableViewScreen from '../screens/projects/ProjectTableViewScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Storage keys for Team View Settings
const STORAGE_KEYS = {
  ADMIN_PAGE_ACCESS: '@team_view_admin_page_access',
  ADMIN_DEFAULT_PAGE: '@team_view_admin_default_page',
  MANAGER_PAGE_ACCESS: '@team_view_manager_page_access',
  MANAGER_DEFAULT_PAGE: '@team_view_manager_default_page',
  USER_PAGE_ACCESS: '@team_view_user_page_access',
  USER_DEFAULT_PAGE: '@team_view_user_default_page',
};

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Register screen removed - users must be invited by admins */}
      {/* <Stack.Screen name="Register" component={RegisterScreen} /> */}
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { user } = useAuth();
  const [visibleTabs, setVisibleTabs] = useState<string[]>(['Dashboard', 'Calendar', 'Time', 'Projects', 'Profile']);

  useEffect(() => {
    loadTabSettings();
  }, [user]);

  const loadTabSettings = async () => {
    try {
      if (!user || !user.role) {
        setVisibleTabs(['Dashboard', 'Calendar', 'Time', 'Projects', 'Profile']);
        return;
      }

      // Get storage key based on role
      let storageKey = STORAGE_KEYS.USER_PAGE_ACCESS;
      if (user.role === 'ADMIN') {
        storageKey = STORAGE_KEYS.ADMIN_PAGE_ACCESS;
      } else if (user.role === 'MANAGER') {
        storageKey = STORAGE_KEYS.MANAGER_PAGE_ACCESS;
      }

      const savedAccess = await AsyncStorage.getItem(storageKey);

      if (savedAccess) {
        const pageAccess = JSON.parse(savedAccess);
        console.log('[AppNavigator] Loaded page access for', user.role, ':', pageAccess);

        // Filter tabs based on page access
        const tabs = [];
        if (pageAccess.Dashboard) tabs.push('Dashboard');
        if (pageAccess.Calendar) tabs.push('Calendar');
        if (pageAccess.Time) tabs.push('Time');
        if (pageAccess.Projects) tabs.push('Projects');
        if (pageAccess.Profile) tabs.push('Profile');

        console.log('[AppNavigator] Filtered tabs:', tabs);
        setVisibleTabs(tabs);
      } else {
        // If no settings saved, show all tabs
        console.log('[AppNavigator] No saved settings, showing all tabs');
        setVisibleTabs(['Dashboard', 'Calendar', 'Time', 'Projects', 'Profile']);
      }
    } catch (error) {
      console.error('[AppNavigator] Error loading tab settings:', error);
      setVisibleTabs(['Dashboard', 'Calendar', 'Time', 'Projects', 'Profile']);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Performance: Only load screens when they're focused
        lazy: true,
        // Performance: Detach inactive screens to free memory
        detachInactiveScreens: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconObject;

          if (route.name === 'Dashboard') {
            iconObject = Home09Icon;
          } else if (route.name === 'Calendar') {
            iconObject = Calendar03Icon;
          } else if (route.name === 'Time') {
            iconObject = StopWatchIcon;
          } else if (route.name === 'Projects') {
            iconObject = Folder01Icon;
          } else if (route.name === 'Profile') {
            iconObject = UserCircleIcon;
          }

          return <HugeiconsIcon icon={iconObject} size={size} color={color} strokeWidth={focused ? 2 : 1.5} />;
        },
        // iOS-style tab bar
        tabBarActiveTintColor: iOSColors.systemBlue,
        tabBarInactiveTintColor: iOSColors.systemGray,
        tabBarStyle: {
          backgroundColor: iOSColors.systemBackground,
          borderTopColor: iOSColors.separator,
          borderTopWidth: 0.5,
          height: Platform.OS === 'web' ? 65 : Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'web' ? 10 : Platform.OS === 'ios' ? 34 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginBottom: Platform.OS === 'web' ? 4 : 0,
          display: Platform.OS === 'web' ? 'flex' : 'none',
          height: Platform.OS === 'web' ? undefined : 0,
          overflow: 'hidden',
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'web' ? 4 : 0,
        },
        // iOS-style header
        headerShown: true,
        headerStyle: {
          backgroundColor: iOSColors.systemBackground,
          borderBottomColor: iOSColors.separator,
          borderBottomWidth: 0.5,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: iOSColors.label,
        },
        headerTintColor: iOSColors.systemBlue,
      })}
    >
      {visibleTabs.includes('Dashboard') && (
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Dashboard' }}
        />
      )}
      {visibleTabs.includes('Calendar') && (
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ headerShown: false }}
        />
      )}
      {visibleTabs.includes('Time') && (
        <Tab.Screen
          name="Time"
          component={TimeTrackingScreen}
          options={{ title: 'Time Tracking' }}
        />
      )}
      {visibleTabs.includes('Projects') && (
        <Tab.Screen
          name="Projects"
          component={ProjectsScreen}
          options={{ title: 'Projects' }}
        />
      )}
      {visibleTabs.includes('Profile') && (
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
      )}
    </Tab.Navigator>
  );
};

const MainStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        // Performance: Enable native animations for smoother transitions
        animationEnabled: true,
        // Performance: Use simple fade animation for faster transitions on web
        ...(Platform.OS === 'web' && {
          cardStyleInterpolator: ({ current }) => ({
            cardStyle: {
              opacity: current.progress,
            },
          }),
        }),
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: 'Create Event' }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ title: 'Edit Event' }}
      />
      <Stack.Screen
        name="DayView"
        component={DayViewScreen}
        options={{ title: 'Calendar', headerShown: false }}
      />
      <Stack.Screen
        name="Planning"
        component={PlanningScreen}
        options={{ title: 'Planning', headerShown: false }}
      />
      <Stack.Screen
        name="StartTimer"
        component={StartTimerScreen}
        options={{ title: 'Start Timer' }}
      />
      <Stack.Screen
        name="EditTimeEntry"
        component={EditTimeEntryScreen}
        options={{ title: 'Edit Time Entry' }}
      />
      <Stack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={{ title: 'Create Project' }}
      />
      <Stack.Screen
        name="EditProject"
        component={EditProjectScreen}
        options={{ title: 'Edit Project' }}
      />
      <Stack.Screen
        name="CreateClient"
        component={CreateClientScreen}
        options={{ title: 'Create Client' }}
      />
      <Stack.Screen
        name="ClientsList"
        component={ClientsListScreen}
        options={{ title: 'Clients' }}
      />
      <Stack.Screen
        name="EditClient"
        component={EditClientScreen}
        options={{ title: 'Edit Client' }}
      />
      <Stack.Screen
        name="UserRates"
        component={UserRatesScreen}
        options={{ title: 'Manage User Rates' }}
      />
      <Stack.Screen
        name="TeamViewSettings"
        component={TeamViewSettingsScreen}
        options={{ title: 'Team View Settings' }}
      />
      <Stack.Screen
        name="ManageUsers"
        component={ManageUsersScreen}
        options={{ title: 'Manage Users' }}
      />
      <Stack.Screen
        name="InviteUser"
        component={InviteUserScreen}
        options={{ title: 'Invite User' }}
      />
      <Stack.Screen
        name="EditUser"
        component={EditUserScreen}
        options={{ title: 'Edit User' }}
      />
      <Stack.Screen
        name="ProjectTableView"
        component={ProjectTableViewScreen}
        options={{ title: 'Projects Table View' }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const authContext = useAuth();
  const { width } = useWindowDimensions();

  // Explicitly convert to booleans to avoid type issues
  const isAuthenticated = Boolean(authContext.isAuthenticated);
  const loading = Boolean(authContext.loading);

  // Use desktop layout for web and screens wider than 768px
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Don't block rendering while auth is loading - show auth screen instead
  // This prevents the infinite loading issue on web

  return (
    <NavigationContainer>
      {!loading && isAuthenticated ? (
        isDesktop ? <DesktopNavigator /> : <MainStack />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
