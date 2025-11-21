import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Platform, useWindowDimensions, View, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NavigationContainer, useNavigationState, useNavigation } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home09Icon, Folder01Icon, UserCircleIcon, Calendar04Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Text as PaperText, Paragraph } from 'react-native-paper';
import Svg, { Path } from 'react-native-svg';
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

const Stack = createStackNavigator();

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

// All main navigation screens
const mainScreens = [
  { name: 'Dashboard', icon: Home09Icon, label: 'Dashboard', component: DashboardScreen },
  { name: 'Planning', icon: Calendar04Icon, label: 'Planning', component: PlanningScreen },
  { name: 'Projects', icon: Folder01Icon, label: 'Projects', component: ProjectsScreen },
  { name: 'Clients', icon: UserGroupIcon, label: 'Clients', component: ClientsListScreen },
  { name: 'Profile', icon: UserCircleIcon, label: 'Profile', component: ProfileScreen },
];

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

// Custom navigation UI components that adapt based on screen size

// Mobile: Bottom tab bar
const MobileTabBar = () => {
  const { getColorForElement } = useCustomColorTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [visibleScreens, setVisibleScreens] = useState<string[]>([]);

  // Get current route
  const currentRoute = useNavigationState(state => {
    if (!state) return 'Dashboard';
    const route = state.routes[state.index];
    return route.name;
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.role) {
        setVisibleScreens(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        return;
      }

      let pageAccessKey = 'team_view_user_page_access';
      if (user.role === 'ADMIN') pageAccessKey = 'team_view_admin_page_access';
      else if (user.role === 'MANAGER') pageAccessKey = 'team_view_manager_page_access';

      try {
        const response = await settingsAPI.app.get(pageAccessKey);
        const pageAccess = response.data?.value;

        if (pageAccess) {
          const visible = mainScreens.filter(screen => pageAccess[screen.name]).map(s => s.name);
          setVisibleScreens(visible);
        } else {
          setVisibleScreens(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          setVisibleScreens(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        }
      }
    };

    loadSettings();
  }, [user?.id, user?.role]);

  // Filter main screens to only show visible ones
  const tabs = mainScreens.filter(screen => visibleScreens.includes(screen.name));

  return (
    <View style={[
      navStyles.mobileTabBar,
      {
        backgroundColor: getColorForElement('navigation', 'tabBarBackground'),
        borderTopColor: iOSColors.separator,
      }
    ]}>
      {tabs.map((screen) => {
        const isFocused = currentRoute === screen.name;
        const color = isFocused
          ? getColorForElement('navigation', 'tabBarActiveIcon')
          : getColorForElement('navigation', 'tabBarInactiveIcon');

        return (
          <TouchableOpacity
            key={screen.name}
            onPress={() => navigation.navigate(screen.name as never)}
            style={navStyles.tabButton}
          >
            <HugeiconsIcon
              icon={screen.icon}
              size={24}
              color={color}
              strokeWidth={isFocused ? 2 : 1.5}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Desktop: Side drawer
const DesktopDrawer = () => {
  const { currentColors } = useTheme();
  const { getColorForElement } = useCustomColorTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [visibleScreens, setVisibleScreens] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem('desktopNav_isCollapsed');
      return saved === 'true';
    }
    return false;
  });

  // Get current route name using navigation state
  const currentRoute = useNavigationState(state => {
    if (!state) return 'Dashboard';
    const route = state.routes[state.index];
    return route.name;
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      localStorage.setItem('desktopNav_isCollapsed', isCollapsed.toString());
    }
  }, [isCollapsed]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.role) {
        setVisibleScreens(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        return;
      }

      let pageAccessKey = 'team_view_user_page_access';
      if (user.role === 'ADMIN') pageAccessKey = 'team_view_admin_page_access';
      else if (user.role === 'MANAGER') pageAccessKey = 'team_view_manager_page_access';

      try {
        const response = await settingsAPI.app.get(pageAccessKey);
        const pageAccess = response.data?.value;

        if (pageAccess) {
          const visible = mainScreens.filter(screen => pageAccess[screen.name]).map(s => s.name);
          setVisibleScreens(visible);
        } else {
          setVisibleScreens(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          setVisibleScreens(['Dashboard', 'Planning', 'Projects', 'Clients', 'Profile']);
        }
      }
    };

    loadSettings();
  }, [user?.id, user?.role]);

  const drawerBg = getColorForElement('desktopNavigation', 'drawerBackground');
  const drawerHeaderBg = getColorForElement('desktopNavigation', 'drawerHeaderBackground');
  const drawerHeaderText = getColorForElement('desktopNavigation', 'drawerHeaderText');
  const drawerActiveItemBg = getColorForElement('desktopNavigation', 'drawerActiveItemBackground');
  const drawerInactiveItemBg = getColorForElement('desktopNavigation', 'drawerInactiveItemBackground');
  const drawerActiveItemText = getColorForElement('desktopNavigation', 'drawerActiveItemText');
  const drawerInactiveItemText = getColorForElement('desktopNavigation', 'drawerInactiveItemText');
  const drawerActiveItemIcon = getColorForElement('desktopNavigation', 'drawerActiveItemIcon');
  const drawerInactiveItemIcon = getColorForElement('desktopNavigation', 'drawerInactiveItemIcon');
  const drawerDivider = getColorForElement('desktopNavigation', 'drawerDividerColor');
  const mobileActiveIcon = getColorForElement('navigation', 'tabBarActiveIcon');
  const mobileInactiveIcon = getColorForElement('navigation', 'tabBarInactiveIcon');

  const menuItems = mainScreens.filter(screen => visibleScreens.includes(screen.name));

  return (
    <View style={[navStyles.desktopDrawer, { width: isCollapsed ? 80 : 250, backgroundColor: drawerBg }]}>
      <TouchableOpacity
        style={[navStyles.drawerHeader, { backgroundColor: drawerHeaderBg, borderBottomColor: drawerDivider }]}
        onPress={() => setIsCollapsed(!isCollapsed)}
        activeOpacity={0.7}
      >
        {isCollapsed ? (
          <Svg width="48" height="48" viewBox="0 0 547.3014287 266.0121941">
            <Path
              d="M423.4285601,212.7344941c0,17.2922054,4.6824499,38.3267196,16.3657557,43.000042v2.8021679h-131.3276595v-2.8021679c11.6833058-4.6733223,16.3566281-23.8366821,16.3566281-43.000042V83.277989c0-35.9900585-13.0889536-48.138871-27.1089205-48.138871-8.4156312,0-16.3566281,2.3366612-23.8412459,8.4110674v169.1843086c0,17.2922054,4.6824499,38.3267196,16.3657557,43.000042v2.8021679h-131.8022938v-2.8021679c11.6833058-4.6733223,16.3566281-23.8366821,16.3566281-43.000042V83.277989c0-35.9900585-13.079826-48.138871-27.0997929-48.138871-7.9501245,0-16.3566281,2.8021679-23.8412459,8.4110674v169.1843086c0,17.2922054,4.6733223,38.3267196,16.3566281,43.000042v2.8021679H8.4156312v-2.8021679c11.6833058-4.6733223,16.3566281-23.8366821,16.3566281-43.000042v-122.4465215c0-21.9655277-7.4754902-35.519988-24.7722594-49.5399549v-2.8067317C21.5045848,32.3323864,83.6634228,13.1735903,116.8421858,3.8269457h2.8021679l.940141,36.9210719C139.7432907,15.040181,168.7233657.0846368,201.436622.0846368c43.000042,0,63.5644857,21.9655277,71.0399759,37.8566491C291.6353939,14.1091676,319.6753279.0846368,351.4575707.0846368c60.2876835,0,71.9709894,54.2132773,71.9709894,101.8866416v110.7632157ZM449.7118033,216.9423097c0-26.63885,21.9609639-48.6043777,49.0698844-48.6043777,26.6434138,0,48.6043777,21.9655277,48.6043777,48.6043777,0,27.1043567-21.9609639,49.0698844-48.6043777,49.0698844-27.1089205,0-49.0698844-23.3666116-49.0698844-49.0698844Z"
              fill={drawerHeaderText}
            />
          </Svg>
        ) : (
          <Svg width="180" height="48" viewBox="0 0 1000.6292135 266.0121941">
            <Path
              d="M298.8660113,228.2726869c0,12.2052524,3.3049852,27.051916,11.5513421,30.3504587v1.9778372h-92.694205v-1.9778372c8.2463569-3.2985427,11.5448996-16.8245007,11.5448996-30.3504587v-91.3734994c0-25.4026446-9.2384967-33.9775672-19.1341249-33.9775672-5.9399539,0-11.5448996,1.6492714-16.827722,5.9367327v119.414334c0,12.2052524,3.3049852,27.051916,11.5513421,30.3504587v1.9778372h-93.0292133v-1.9778372c8.2463569-3.2985427,11.5448996-16.8245007,11.5448996-30.3504587v-91.3734994c0-25.4026446-9.2320542-33.9775672-19.1276824-33.9775672-5.6113881,0-11.5448996,1.9778372-16.827722,5.9367327v119.414334c0,12.2052524,3.2985427,27.051916,11.5448996,30.3504587v1.9778372H5.9399539v-1.9778372c8.2463569-3.2985427,11.5448996-16.8245007,11.5448996-30.3504587v-86.4256853c0-15.5037951-5.2763799-25.0708576-17.4848535-34.9664858v-1.9810584c15.1784506-3.9588955,59.051646-17.4816323,82.470011-24.0787178h1.9778372l.663574,26.0597762c13.5227367-18.1452063,33.9775672-28.7011873,57.0673664-28.7011873,30.3504587,0,44.8653353,15.5037951,50.1417152,26.7201289,13.5227367-16.8212795,33.3139932-26.7201289,55.7466608-26.7201289,42.5524899,0,50.7988467,38.2650285,50.7988467,71.91403v78.1793285ZM915.4748422,0v228.2726869c0,12.2052524,3.2985427,27.051916,11.5448996,30.3504587v1.9778372h-78.8429025l-2.3064029-29.0297531c-11.8799078,19.1341249-28.7011873,31.3393773-53.7688237,31.3393773-35.9554044,0-64.6565917-22.7612334-64.6565917-86.4289065,0-57.0673664,37.9332415-97.9705849,81.4778712-97.9705849,16.1641479,0,26.3883419,2.6381899,36.6189784,11.5448996v-29.0297531c0-15.1720081-5.2828224-25.0708576-17.8134193-34.6346988v-2.3096242c15.5005739-3.9588955,62.6723121-17.4848535,86.0971195-24.081939h1.6492714ZM845.5418706,220.8754416v-123.0353731c-3.9621168-3.2985427-7.5892253-4.9478141-13.2006134-4.9478141-22.7612334,0-30.3440162,24.5442424-30.3440162,75.3430891,0,51.4624207,8.2463569,64.1849977,24.081939,64.1849977,7.254217,0,14.1798683-4.2874613,19.4626907-11.5448996ZM931.0591682,231.2426639c0-18.8023379,15.5005739-34.306133,34.6346988-34.306133,18.8055591,0,34.306133,15.5037951,34.306133,34.306133,0,19.1309037-15.5005739,34.6346988-34.306133,34.6346988-19.1341249,0-34.6346988-16.4927137-34.6346988-34.6346988ZM519.7073133,170.2164019c0-46.5146066,39.2539471-92.0370735,95.664182-92.0370735,59.3802118,0,95.3356162,42.5557111,95.3356162,92.3656392,0,47.1717382-38.5968156,92.3656392-95.3356162,92.3656392-60.0373434,0-95.664182-42.2239241-95.664182-92.694205ZM636.4834574,170.2215706c-.3285658-64.9444758-5.6049457-86.3727918-21.111962-86.3727918-15.1720081,0-21.111962,21.428316-21.4405278,86.3727918-.3285658,65.2647274,5.9335115,87.0228073,21.4405278,87.0228073,15.8355821,0,21.4405278-21.7580799,21.111962-87.0228073ZM317.0150946,170.2164019c0-46.5146066,39.2539471-92.0370735,95.664182-92.0370735,59.3802118,0,95.3356162,42.5557111,95.3356162,92.3656392,0,47.1717382-38.5968156,92.3656392-95.3356162,92.3656392-60.0373434,0-95.664182-42.2239241-95.664182-92.694205ZM433.7912386,170.2215706c-.3285658-64.9444758-5.6049457-86.3727918-21.111962-86.3727918-15.1720081,0-21.111962,21.428316-21.4405278,86.3727918-.3285658,65.2647274,5.9335115,87.0228073,21.4405278,87.0228073,15.8355821,0,21.4405278-21.7580799,21.111962-87.0228073Z"
              fill={drawerHeaderText}
            />
          </Svg>
        )}
      </TouchableOpacity>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        {menuItems.map((screen) => {
          const isActive = currentRoute === screen.name ||
            (screen.name === 'Projects' && currentRoute === 'ProjectTableView');

          const iconColor = isCollapsed
            ? (isActive ? mobileActiveIcon : mobileInactiveIcon)
            : (isActive ? drawerActiveItemIcon : drawerInactiveItemIcon);

          const backgroundColor = isCollapsed
            ? 'transparent'
            : (isActive ? drawerActiveItemBg : drawerInactiveItemBg);

          return (
            <TouchableOpacity
              key={screen.name}
              style={[
                isCollapsed ? navStyles.menuItemCollapsed : navStyles.menuItem,
                { backgroundColor }
              ]}
              onPress={() => navigation.navigate(screen.name as never)}
              activeOpacity={isCollapsed ? 1 : 0.7}
            >
              <View style={isCollapsed ? navStyles.menuIconCollapsed : navStyles.menuIcon}>
                <HugeiconsIcon
                  icon={screen.icon}
                  size={24}
                  color={iconColor}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </View>
              {!isCollapsed && (
                <Paragraph style={[
                  navStyles.menuLabel,
                  {
                    color: isActive ? drawerActiveItemText : drawerInactiveItemText,
                    fontWeight: isActive ? '600' : '400',
                  }
                ]}>
                  {screen.label}
                </Paragraph>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Wrapper component that provides navigation UI
const NavigationWrapper = ({ children }: { children: React.ReactNode }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {isDesktop && <DesktopDrawer />}
      <View style={{ flex: 1 }}>
        {children}
        {!isDesktop && <MobileTabBar />}
      </View>
    </View>
  );
};

// Unified main navigator with responsive UI
const UnifiedMainNavigator = () => {
  const { width } = useWindowDimensions();
  const { currentColors } = useTheme();
  const { user } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string>('Dashboard');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Load initial route based on team settings
  useEffect(() => {
    const loadInitialRoute = async () => {
      if (!user?.role) {
        setInitialRoute('Dashboard');
        setSettingsLoaded(true);
        return;
      }

      // On mobile, always use Dashboard
      if (!isDesktop) {
        setInitialRoute('Dashboard');
        setSettingsLoaded(true);
        return;
      }

      // On desktop, use team default page setting
      let defaultPageKey = 'team_view_user_default_page';
      if (user.role === 'ADMIN') defaultPageKey = 'team_view_admin_default_page';
      else if (user.role === 'MANAGER') defaultPageKey = 'team_view_manager_default_page';

      try {
        const response = await settingsAPI.app.get(defaultPageKey);
        if (response.data?.value) {
          setInitialRoute(response.data.value);
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('[UnifiedMainNavigator] Error loading default page:', error);
        }
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadInitialRoute();
  }, [user?.id, user?.role, isDesktop]);

  if (!settingsLoaded) {
    return <LoadingFallback />;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        ...(Platform.OS === 'web' && {
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
        }),
      }}
    >
          {/* Main screens */}
          <Stack.Screen name="Dashboard">
            {(props) => <SuspenseWrapper component={DashboardScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Planning">
            {(props) => <SuspenseWrapper component={PlanningScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Projects">
            {(props) => <SmartProjectsScreen {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Clients">
            {(props) => <SuspenseWrapper component={ClientsListScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Profile">
            {(props) => <SuspenseWrapper component={ProfileScreen} {...props} />}
          </Stack.Screen>

          {/* Project Table View (desktop only, hidden from menu) */}
          <Stack.Screen name="ProjectTableView">
            {(props) => <SuspenseWrapper component={ProjectTableViewScreen} {...props} />}
          </Stack.Screen>

          {/* Modal/Detail screens */}
          <Stack.Screen
            name="CreateEvent"
            options={{
              headerShown: true,
              title: 'Create Event',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={CreateEventScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="EditEvent"
            options={{
              headerShown: true,
              title: 'Edit Event',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={EditEventScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="CreateProject"
            options={{
              headerShown: true,
              title: 'Create Project',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={CreateProjectScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="EditProject"
            options={{
              headerShown: true,
              title: 'Edit Project',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={EditProjectScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="CreateClient">
            {(props) => <SuspenseWrapper component={CreateClientScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="EditClient">
            {(props) => <SuspenseWrapper component={EditClientScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="ManageUsers"
            options={{
              headerShown: true,
              title: 'Manage Users',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={ManageUsersScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="EditUser"
            options={{
              headerShown: true,
              title: 'Edit User',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={EditUserScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="InviteUser"
            options={{
              headerShown: true,
              title: 'Invite User',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={InviteUserScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="UserRates"
            options={{
              headerShown: true,
              title: 'Manage User Rates',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={UserRatesScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="TeamViewSettings"
            options={{
              headerShown: true,
              title: 'Team View Settings',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={TeamViewSettingsScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="PlanningColors"
            options={{
              headerShown: true,
              title: 'Planning Page Colors',
              headerStyle: {
                backgroundColor: currentColors.primary,
                borderBottomColor: currentColors.border,
                borderBottomWidth: 0.5,
              },
              headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
              headerTintColor: '#FFFFFF',
            }}
          >
            {(props) => <SuspenseWrapper component={PlanningColorsScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="CustomColorManager">
            {(props) => <SuspenseWrapper component={CustomColorManagerScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ElementColorMapper">
            {(props) => <SuspenseWrapper component={ElementColorMapperScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ManageCustomThemes">
            {(props) => <SuspenseWrapper component={ManageCustomThemesScreen} {...props} />}
          </Stack.Screen>
        </Stack.Navigator>
  );
};

// Wrap the navigator with responsive UI
const UnifiedMainNavigatorWithUI = () => {
  return (
    <NavigationWrapper>
      <UnifiedMainNavigator />
    </NavigationWrapper>
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

  // Don't block rendering while auth is loading - show auth screen instead
  // This prevents the infinite loading issue on web

  // Linking configuration for URL routing
  // Disable linking for desktop since the nested navigator structure makes it complex
  // Instead we'll handle URL navigation manually in DesktopNavigator
  const linking = useMemo(() => {
    if (isDesktop) return undefined;

    return {
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
    };
  }, [isDesktop]);

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
        <UnifiedMainNavigatorWithUI />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

// Navigation styles
const navStyles = StyleSheet.create({
  // Mobile tab bar
  mobileTabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    height: Platform.OS === 'web' ? 85 : Platform.OS === 'ios' ? 108 : 80,
    paddingBottom: Platform.OS === 'web' ? 30 : Platform.OS === 'ios' ? 54 : 28,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  // Desktop drawer
  desktopDrawer: {
    borderRightWidth: 0,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 0,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 8,
  },
  menuItemCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 8,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuIconCollapsed: {
    marginRight: 0,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '100',
  },
});

export default AppNavigator;
