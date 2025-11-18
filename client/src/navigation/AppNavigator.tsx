import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Platform, useWindowDimensions, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home09Icon, Folder01Icon, UserCircleIcon, Calendar04Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomColorTheme } from '../contexts/CustomColorThemeContext';
import { iOSColors } from '../theme/iosTheme';
import { settingsAPI } from '../services/api';

// Suspense fallback component
const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: iOSColors.systemBackground }}>
    <ActivityIndicator size="large" color="#dd3e7f" />
  </View>
);

// Reusable Suspense wrapper for lazy-loaded screens
const SuspenseWrapper = ({ component: Component, ...props }: any) => {
  if (Platform.OS === 'web') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Component {...props} />
      </Suspense>
    );
  }
  return <Component {...props} />;
};

// Platform-specific imports for better code splitting on web
const LoginScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/auth/LoginScreen'))
  : require('../screens/auth/LoginScreen').default;

const OAuthCallbackScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/auth/OAuthCallbackScreen'))
  : require('../screens/auth/OAuthCallbackScreen').default;

const DashboardScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/dashboard/DashboardScreen'))
  : require('../screens/dashboard/DashboardScreen').default;

const PlanningScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/planning/PlanningScreen'))
  : require('../screens/planning/PlanningScreen').default;

const ProjectsScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/projects/ProjectsScreen'))
  : require('../screens/projects/ProjectsScreen').default;

const ProjectTableViewScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/projects/ProjectTableViewScreen'))
  : require('../screens/projects/ProjectTableViewScreen').default;

const ProfileScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/profile/ProfileScreen'))
  : require('../screens/profile/ProfileScreen').default;

const CreateEventScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/events/CreateEventScreen'))
  : require('../screens/events/CreateEventScreen').default;

const EditEventScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/events/EditEventScreen'))
  : require('../screens/events/EditEventScreen').default;

const CreateProjectScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/projects/CreateProjectScreen'))
  : require('../screens/projects/CreateProjectScreen').default;

const EditProjectScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/projects/EditProjectScreen'))
  : require('../screens/projects/EditProjectScreen').default;

const CreateClientScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/clients/CreateClientScreen'))
  : require('../screens/clients/CreateClientScreen').default;

const ClientsListScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/clients/ClientsListScreen'))
  : require('../screens/clients/ClientsListScreen').default;

const EditClientScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/clients/EditClientScreen'))
  : require('../screens/clients/EditClientScreen').default;

const UserRatesScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/admin/UserRatesScreen'))
  : require('../screens/admin/UserRatesScreen').default;

const TeamViewSettingsScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/admin/TeamViewSettingsScreen'))
  : require('../screens/admin/TeamViewSettingsScreen').default;

const ManageUsersScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/admin/ManageUsersScreen'))
  : require('../screens/admin/ManageUsersScreen').default;

const InviteUserScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/admin/InviteUserScreen'))
  : require('../screens/admin/InviteUserScreen').default;

const EditUserScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/admin/EditUserScreen'))
  : require('../screens/admin/EditUserScreen').default;

const PlanningColorsScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/profile/PlanningColorsScreen'))
  : require('../screens/profile/PlanningColorsScreen').default;

const CustomColorManagerScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/profile/CustomColorManagerScreen'))
  : require('../screens/profile/CustomColorManagerScreen').default;

const ElementColorMapperScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/profile/ElementColorMapperScreen'))
  : require('../screens/profile/ElementColorMapperScreen').default;

const ManageCustomThemesScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/profile/ManageCustomThemesScreen'))
  : require('../screens/profile/ManageCustomThemesScreen').default;

const DesktopNavigator = Platform.OS === 'web'
  ? lazy(() => import('./DesktopNavigator'))
  : require('./DesktopNavigator').default;

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
      <Stack.Screen name="Login">
        {(props) => <SuspenseWrapper component={LoginScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen name="OAuthCallback">
        {(props) => <SuspenseWrapper component={OAuthCallbackScreen} {...props} />}
      </Stack.Screen>
      {/* Register screen removed - users must be invited by admins */}
      {/* <Stack.Screen name="Register" component={RegisterScreen} /> */}
    </Stack.Navigator>
  );
};

// Smart Projects wrapper that checks settings and renders appropriate view
const SmartProjectsScreen = (props: any) => {
  const { user } = useAuth();
  const [useTableView, setUseTableView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkViewPreference = async () => {
      try {
        if (!user || !user.role) {
          setUseTableView(false);
          setLoading(false);
          return;
        }

        // Try user personal preference first
        try {
          const userPrefResponse = await settingsAPI.user.get('projects_default_table_view');
          if (userPrefResponse.data?.value !== undefined) {
            setUseTableView(userPrefResponse.data.value === true);
            setLoading(false);
            return;
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            throw error;
          }
        }

        // Fall back to role-based team setting (app-wide)
        let defaultTableViewKey = 'team_view_user_default_projects_table';
        if (user.role === 'ADMIN') {
          defaultTableViewKey = 'team_view_admin_default_projects_table';
        } else if (user.role === 'MANAGER') {
          defaultTableViewKey = 'team_view_manager_default_projects_table';
        }

        try {
          const roleDefaultResponse = await settingsAPI.app.get(defaultTableViewKey);
          if (roleDefaultResponse.data?.value !== undefined) {
            setUseTableView(roleDefaultResponse.data.value === true);
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('[SmartProjectsScreen] Error loading setting:', error);
          }
        }
      } catch (error) {
        console.error('[SmartProjectsScreen] Error checking view preference:', error);
      } finally {
        setLoading(false);
      }
    };

    checkViewPreference();
  }, [user?.id, user?.role]);

  if (loading) {
    return <LoadingFallback />;
  }

  return useTableView ? (
    <SuspenseWrapper component={ProjectTableViewScreen} {...props} />
  ) : (
    <SuspenseWrapper component={ProjectsScreen} {...props} />
  );
};

const MainTabs = () => {
  const { user } = useAuth();
  const { currentColors } = useTheme();
  const { getColorForElement } = useCustomColorTheme();
  const [visibleTabs, setVisibleTabs] = useState<string[]>([]);
  const [tabsLoaded, setTabsLoaded] = useState(false);

  useEffect(() => {
    loadTabSettings();
  }, [user?.id]); // Only re-run when user ID changes, not the whole user object

  const loadTabSettings = async () => {
    try {
      if (!user || !user.role) {
        setVisibleTabs(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        setTabsLoaded(true);
        return;
      }

      // Get settings key based on role
      let settingsKey = 'team_view_user_page_access';
      if (user.role === 'ADMIN') {
        settingsKey = 'team_view_admin_page_access';
      } else if (user.role === 'MANAGER') {
        settingsKey = 'team_view_manager_page_access';
      }

      // Load settings from app-wide settings (team settings)
      try {
        const response = await settingsAPI.app.get(settingsKey);
        const pageAccess = response.data?.value;

        if (pageAccess) {

          // Filter tabs based on page access
          const tabs = [];
          if (pageAccess.Dashboard) tabs.push('Dashboard');
          if (pageAccess.Planning) tabs.push('Planning');
          if (pageAccess.Projects) tabs.push('Projects');
          if (pageAccess.Clients) tabs.push('Clients');
          if (pageAccess.Profile) tabs.push('Profile');

          setVisibleTabs(tabs);
        } else {
          // If no settings saved, show all tabs

          setVisibleTabs(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        }
      } catch (error: any) {
        // If 404, no settings exist yet - show all tabs
        if (error.response?.status === 404) {

          setVisibleTabs(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('[AppNavigator] Error loading tab settings:', error);
      setVisibleTabs(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
    } finally {
      setTabsLoaded(true);
    }
  };

  // Show loading indicator while settings are being loaded
  if (!tabsLoaded) {
    return <LoadingFallback />;
  }

  return (
    <Tab.Navigator
      key={currentColors.primary} // Force re-render when theme changes
      screenOptions={({ route }) => ({
        // Performance: Only load screens when they're focused
        lazy: true,
        // Performance: Detach inactive screens to free memory
        detachInactiveScreens: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconObject;

          if (route.name === 'Dashboard') {
            iconObject = Home09Icon;
          } else if (route.name === 'Planning') {
            iconObject = Calendar04Icon;
          } else if (route.name === 'Projects') {
            iconObject = Folder01Icon;
          } else if (route.name === 'Clients') {
            iconObject = UserGroupIcon;
          } else if (route.name === 'Profile') {
            iconObject = UserCircleIcon;
          }

          return <HugeiconsIcon icon={iconObject} size={size} color={color} strokeWidth={focused ? 2 : 1.5} />;
        },
        // iOS-style tab bar with theme colors
        tabBarShowLabel: false, // Hide labels completely
        tabBarActiveTintColor: getColorForElement('navigation', 'tabBarActiveIcon'),
        tabBarInactiveTintColor: getColorForElement('navigation', 'tabBarInactiveIcon'),
        tabBarStyle: {
          backgroundColor: getColorForElement('navigation', 'tabBarBackground'),
          borderTopColor: iOSColors.separator,
          borderTopWidth: 0.5,
          height: Platform.OS === 'web' ? 85 : Platform.OS === 'ios' ? 108 : 80,
          paddingBottom: Platform.OS === 'web' ? 30 : Platform.OS === 'ios' ? 54 : 28,
          paddingTop: 8,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'web' ? 4 : 0,
        },
        // iOS-style header
        headerShown: true,
        headerStyle: {
          backgroundColor: currentColors.primary,
          borderBottomColor: currentColors.border,
          borderBottomWidth: 0.5,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#FFFFFF',
        },
        headerTintColor: '#FFFFFF',
      })}
    >
      {visibleTabs.includes('Dashboard') && (
        <Tab.Screen
          name="Dashboard"
          options={{
            title: 'Dashboard',
            headerShown: false, // Hide header completely
          }}
        >
          {(props) => <SuspenseWrapper component={DashboardScreen} {...props} />}
        </Tab.Screen>
      )}
      {visibleTabs.includes('Planning') && (
        <Tab.Screen
          name="Planning"
          options={{ title: 'Planning', headerShown: false }}
        >
          {(props) => <SuspenseWrapper component={PlanningScreen} {...props} />}
        </Tab.Screen>
      )}
      {visibleTabs.includes('Projects') && (
        <Tab.Screen
          name="Projects"
          options={{ title: 'Projects', headerShown: false }}
        >
          {(props) => <SmartProjectsScreen {...props} />}
        </Tab.Screen>
      )}
      {visibleTabs.includes('Clients') && (
        <Tab.Screen
          name="Clients"
          options={{ title: 'Clients', headerShown: false }}
        >
          {(props) => <SuspenseWrapper component={ClientsListScreen} {...props} />}
        </Tab.Screen>
      )}
      {visibleTabs.includes('Profile') && (
        <Tab.Screen
          name="Profile"
          options={{
            title: 'Profile',
            headerShown: false, // Hide header completely
          }}
        >
          {(props) => <SuspenseWrapper component={ProfileScreen} {...props} />}
        </Tab.Screen>
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
        options={{ title: 'Create Event' }}
      >
        {(props) => <SuspenseWrapper component={CreateEventScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="EditEvent"
        options={{ title: 'Edit Event' }}
      >
        {(props) => <SuspenseWrapper component={EditEventScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="Planning"
        options={{ title: 'Planning', headerShown: false }}
      >
        {(props) => <SuspenseWrapper component={PlanningScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="CreateProject"
        options={{ title: 'Create Project' }}
      >
        {(props) => <SuspenseWrapper component={CreateProjectScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="EditProject"
        options={{ title: 'Edit Project' }}
      >
        {(props) => <SuspenseWrapper component={EditProjectScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="CreateClient"
        options={{ title: 'Create Client' }}
      >
        {(props) => <SuspenseWrapper component={CreateClientScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="ClientsList"
        options={{ title: 'Clients' }}
      >
        {(props) => <SuspenseWrapper component={ClientsListScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="EditClient"
        options={{ title: 'Edit Client' }}
      >
        {(props) => <SuspenseWrapper component={EditClientScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="UserRates"
        options={{ title: 'Manage User Rates' }}
      >
        {(props) => <SuspenseWrapper component={UserRatesScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="TeamViewSettings"
        options={{ title: 'Team View Settings' }}
      >
        {(props) => <SuspenseWrapper component={TeamViewSettingsScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="ManageUsers"
        options={{ title: 'Manage Users' }}
      >
        {(props) => <SuspenseWrapper component={ManageUsersScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="InviteUser"
        options={{ title: 'Invite User' }}
      >
        {(props) => <SuspenseWrapper component={InviteUserScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="EditUser"
        options={{ title: 'Edit User' }}
      >
        {(props) => <SuspenseWrapper component={EditUserScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="PlanningColors"
        options={{ title: 'Planning Page Colors' }}
      >
        {(props) => <SuspenseWrapper component={PlanningColorsScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="CustomColorManager"
        options={{ title: 'Custom Color Manager' }}
      >
        {(props) => <SuspenseWrapper component={CustomColorManagerScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="ElementColorMapper"
        options={{ title: 'Map Colors to Elements', headerShown: false }}
      >
        {(props) => <SuspenseWrapper component={ElementColorMapperScreen} {...props} />}
      </Stack.Screen>
      <Stack.Screen
        name="ManageCustomThemes"
        options={{ title: 'Manage Custom Themes', headerShown: false }}
      >
        {(props) => <SuspenseWrapper component={ManageCustomThemesScreen} {...props} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const authContext = useAuth();
  const { width } = useWindowDimensions();

  // Explicitly convert to booleans to avoid type issues
  // Also directly check token and user to ensure we react to state changes
  const isAuthenticated = Boolean(authContext.isAuthenticated && authContext.token && authContext.user);
  const loading = Boolean(authContext.loading);

  // Use desktop layout for web and screens wider than 768px
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Clear ProjectTableView URL if on mobile (safety check for bookmarks/history)
  // No reload needed - just update URL
  React.useEffect(() => {
    if (!isDesktop && Platform.OS === 'web' && window.location.pathname.includes('ProjectTableView')) {
      window.history.replaceState({}, '', '/');
    }
  }, [isDesktop]);

  // Don't block rendering while auth is loading - show auth screen instead
  // This prevents the infinite loading issue on web

  // Linking configuration for URL routing
  // Disable linking for desktop since the nested navigator structure makes it complex
  // Instead we'll handle URL navigation manually in DesktopNavigator
  const linking = isDesktop ? undefined : useMemo(() => ({
    prefixes: ['http://localhost:8081', 'http://localhost:3000', 'https://lightingbymood-tracker.vercel.app'],
    config: {
      screens: {
        // Auth screens
        'Auth': {
          path: 'auth',
          screens: {
            'Login': 'login',
            'OAuthCallback': 'callback',
          },
        },
        // Mobile: MainTabs with paths
        'MainTabs': {
          path: '',
          screens: {
            'Dashboard': '',
            'Planning': 'planning',
            'Projects': 'projects',
            'Profile': 'profile',
            'Clients': 'clients',
          },
        },
        // Mobile stack screens at top level
        'CreateEvent': 'events/create',
        'EditEvent': 'events/edit/:eventId',
        'CreateProject': 'projects/create',
        'EditProject': 'projects/edit/:projectId',
        'CreateClient': 'clients/create',
        'EditClient': 'clients/edit/:clientId',
        'ManageUsers': 'admin/users',
        'InviteUser': 'admin/users/invite',
        'EditUser': 'admin/users/edit/:userId',
        'TeamViewSettings': 'admin/settings/team-view',
        'UserRates': 'admin/users/rates',
        'PlanningColors': 'profile/planning-colors',
        'CustomColorManager': 'profile/colors/manager',
        'ElementColorMapper': 'profile/colors/mapper',
        'ManageCustomThemes': 'profile/colors/themes',
      },
    },
  }), []);

  // Debug: Log the current path and linking config
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('[AppNavigator] Current path:', window.location.pathname);
      console.log('[AppNavigator] isDesktop:', isDesktop);
      console.log('[AppNavigator] isAuthenticated:', isAuthenticated);
    }
  }, [isDesktop, isAuthenticated]);

  return (
    <NavigationContainer
      linking={linking}
      independent={true}
      documentTitle={{
        enabled: false
      }}
    >
      {!loading && isAuthenticated ? (
        isDesktop ? (
          <DesktopNavigator />
        ) : (
          <MainStack />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
