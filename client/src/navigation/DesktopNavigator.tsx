import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home09Icon, Folder01Icon, UserCircleIcon, UserGroupIcon, MultiplicationSignIcon } from '@hugeicons/core-free-icons';
import { Title, Paragraph } from 'react-native-paper';
import { iOSColors } from '../theme/iosTheme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomColorTheme } from '../contexts/CustomColorThemeContext';
import Svg, { Path } from 'react-native-svg';
import { settingsAPI } from '../services/api';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PlanningScreen from '../screens/planning/PlanningScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Create Screens
import CreateEventScreen from '../screens/events/CreateEventScreen';
import EditEventScreen from '../screens/events/EditEventScreen';
import CreateProjectScreen from '../screens/projects/CreateProjectScreen';
import EditProjectScreen from '../screens/projects/EditProjectScreen';
import CreateClientScreen from '../screens/clients/CreateClientScreen';
import ClientsListScreen from '../screens/clients/ClientsListScreen';
import EditClientScreen from '../screens/clients/EditClientScreen';
import UserRatesScreen from '../screens/admin/UserRatesScreen';
import TeamViewSettingsScreen from '../screens/admin/TeamViewSettingsScreen';
import ManageUsersScreen from '../screens/admin/ManageUsersScreen';
import EditUserScreen from '../screens/admin/EditUserScreen';
import InviteUserScreen from '../screens/admin/InviteUserScreen';
import ProjectTableViewScreen from '../screens/projects/ProjectTableViewScreen';
import PlanningColorsScreen from '../screens/profile/PlanningColorsScreen';
import CustomColorManagerScreen from '../screens/profile/CustomColorManagerScreen';
import ElementColorMapperScreen from '../screens/profile/ElementColorMapperScreen';
import ManageCustomThemesScreen from '../screens/profile/ManageCustomThemesScreen';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Smart Projects wrapper for desktop that checks settings
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

        // Fall back to role-based setting (stored in app settings, not user settings)
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
    return null;
  }

  return useTableView ? <ProjectTableViewScreen {...props} /> : <ProjectsScreen {...props} />;
};

const allMenuItems = [
  { name: 'Dashboard', icon: Home09Icon, label: 'Dashboard', component: DashboardScreen },
  { name: 'Planning', icon: Home09Icon, label: 'Planning', component: PlanningScreen },
  { name: 'Projects', icon: Folder01Icon, label: 'Projects', component: SmartProjectsScreen },
  { name: 'Clients', icon: UserGroupIcon, label: 'Clients', component: ClientsListScreen },
  { name: 'Profile', icon: UserCircleIcon, label: 'Profile', component: ProfileScreen },
];

function CustomDrawerContent(props: any) {
  const { state, navigation, isCollapsed, setIsCollapsed } = props;
  const { user } = useAuth();
  const { currentColors } = useTheme();
  const { getColorForElement } = useCustomColorTheme();
  const currentRoute = state.routes[state.index].name;
  const [visibleMenuItems, setVisibleMenuItems] = useState<typeof allMenuItems>([]);
  const [menuLoaded, setMenuLoaded] = useState(false);

  useEffect(() => {
    loadMenuSettings();
  }, [user]);

  const loadMenuSettings = async () => {
    try {
      if (!user || !user.role) {
        setVisibleMenuItems(allMenuItems);
        setMenuLoaded(true);
        return;
      }

      // Get settings key based on role
      let settingsKey = 'team_view_user_page_access';
      if (user.role === 'ADMIN') {
        settingsKey = 'team_view_admin_page_access';
      } else if (user.role === 'MANAGER') {
        settingsKey = 'team_view_manager_page_access';
      }

      // Load settings from app-wide settings (not user-specific)
      try {
        const response = await settingsAPI.app.get(settingsKey);
        const pageAccess = response.data.value;

        if (pageAccess) {
          console.log('[DesktopNavigator] Loaded page access for', user.role, ':', pageAccess);

          // Filter menu items based on page access
          const filtered = allMenuItems.filter((item) => pageAccess[item.name] === true);
          console.log('[DesktopNavigator] Filtered menu items:', filtered.map(i => i.name));
          setVisibleMenuItems(filtered);
        } else {
          // If no settings saved, show all pages
          console.log('[DesktopNavigator] No saved settings, showing all pages');
          setVisibleMenuItems(allMenuItems);
        }
      } catch (error: any) {
        // If setting doesn't exist (404), show all pages
        if (error.response?.status === 404) {
          console.log('[DesktopNavigator] No saved settings, showing all pages');
          setVisibleMenuItems(allMenuItems);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('[DesktopNavigator] Error loading menu settings:', error);
      setVisibleMenuItems(allMenuItems);
    } finally {
      setMenuLoaded(true);
    }
  };

  // Don't render menu until settings are loaded
  if (!menuLoaded) {
    return null;
  }

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

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={[styles.drawerContent, { backgroundColor: drawerBg }]}>
      <TouchableOpacity
        style={[styles.sidebarHeader, { backgroundColor: drawerHeaderBg, borderBottomColor: drawerDivider }]}
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
      {visibleMenuItems.map((item) => {
        // Check if current route matches this item or if it's a sub-route
        // e.g., Projects should be active when on ProjectTableView
        const isActive = currentRoute === item.name ||
          (item.name === 'Projects' && currentRoute === 'ProjectTableView') ||
          (item.name === 'Planning' && currentRoute === 'PlanningColors');
        return (
          <TouchableOpacity
            key={item.name}
            style={[
              isCollapsed ? styles.menuItemCollapsed : styles.menuItem,
              {
                backgroundColor: isActive ? drawerActiveItemBg : drawerInactiveItemBg,
              }
            ]}
            onPress={() => navigation.navigate(item.name)}
            activeOpacity={0.7}
          >
            <View style={isCollapsed ? styles.menuIconCollapsed : styles.menuIcon}>
              <HugeiconsIcon
                icon={item.icon}
                size={24}
                color={isActive ? drawerActiveItemIcon : drawerInactiveItemIcon}
                strokeWidth={isActive ? 2 : 1.5}
              />
            </View>
            {!isCollapsed && (
              <Paragraph style={[
                styles.menuLabel,
                {
                  color: isActive ? drawerActiveItemText : drawerInactiveItemText,
                  fontWeight: isActive ? '600' : '400',
                }
              ]}>
                {item.label}
              </Paragraph>
            )}
          </TouchableOpacity>
        );
      })}
    </DrawerContentScrollView>
  );
}

function MainDrawer() {
  const { user } = useAuth();
  const { currentColors } = useTheme();
  const [visibleMenuItems, setVisibleMenuItems] = useState<typeof allMenuItems>([]);
  const [initialRoute, setInitialRoute] = useState<string>('Dashboard');
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadMenuSettings();
  }, [user]);

  const loadMenuSettings = async () => {
    try {
      // If user is null/undefined, don't load settings - user is logging out or not authenticated
      if (!user) {
        console.log('[MainDrawer] No user found, skipping settings load');
        setDrawerLoaded(true);
        return;
      }

      if (!user.role) {
        setVisibleMenuItems(allMenuItems);
        setDrawerLoaded(true);
        return;
      }

      // Get settings keys based on role
      let pageAccessKey = 'team_view_user_page_access';
      let defaultPageKey = 'team_view_user_default_page';

      if (user.role === 'ADMIN') {
        pageAccessKey = 'team_view_admin_page_access';
        defaultPageKey = 'team_view_admin_default_page';
      } else if (user.role === 'MANAGER') {
        pageAccessKey = 'team_view_manager_page_access';
        defaultPageKey = 'team_view_manager_default_page';
      }

      // Load settings from app-wide settings (not user-specific)
      try {
        const pageAccessResponse = await settingsAPI.app.get(pageAccessKey);
        const pageAccess = pageAccessResponse.data.value;

        if (pageAccess) {
          console.log('[MainDrawer] Loaded page access for', user.role, ':', pageAccess);

          const filtered = allMenuItems.filter((item) => pageAccess[item.name] === true);
          console.log('[MainDrawer] Filtered menu items:', filtered.map(i => i.name));
          setVisibleMenuItems(filtered);
        } else {
          setVisibleMenuItems(allMenuItems);
        }
      } catch (error: any) {
        // If setting doesn't exist (404), show all pages
        if (error.response?.status === 404) {
          console.log('[MainDrawer] No page access settings, showing all pages');
          setVisibleMenuItems(allMenuItems);
        } else {
          throw error;
        }
      }

      // Set initial route from default page setting
      try {
        const defaultPageResponse = await settingsAPI.app.get(defaultPageKey);
        const defaultPage = defaultPageResponse.data.value;

        if (defaultPage) {
          console.log('[MainDrawer] Setting initial route to:', defaultPage);
          setInitialRoute(defaultPage);
        }
      } catch (error: any) {
        // If setting doesn't exist (404), use default
        if (error.response?.status !== 404) {
          throw error;
        }
      }
    } catch (error) {
      console.error('[MainDrawer] Error loading menu settings:', error);
      // Don't set default menu items on error - if there's an auth error, we should not show the drawer
      if (error && error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('[MainDrawer] Auth error, skipping menu setup');
      } else {
        setVisibleMenuItems(allMenuItems);
      }
    } finally {
      setDrawerLoaded(true);
    }
  };

  // Don't render drawer until settings are loaded
  if (!drawerLoaded) {
    return null;
  }

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}
      screenOptions={{
        drawerType: 'permanent',
        drawerStyle: {
          width: isCollapsed ? 80 : 250,
          backgroundColor: currentColors.background.bg300,
          borderRightWidth: 0,
        },
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
      }}
    >
      {visibleMenuItems.map((item) => (
        <Drawer.Screen
          key={item.name}
          name={item.name}
          component={item.component}
          options={{
            title: item.label,
            headerShown: item.name !== 'Planning' && item.name !== 'Profile' && item.name !== 'Dashboard' && item.name !== 'Clients' && item.name !== 'Projects'
          }}
        />
      ))}
      {/* Add ProjectTableView as a drawer screen so it shows within the app layout */}
      <Drawer.Screen
        name="ProjectTableView"
        component={ProjectTableViewScreen}
        options={{
          title: 'Projects Table View',
          headerShown: false,
          drawerItemStyle: { display: 'none' } // Hide from drawer menu
        }}
      />
    </Drawer.Navigator>
  );
}

const DesktopNavigator = () => {
  const { currentColors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainDrawer" component={MainDrawer} />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          headerShown: true,
          title: 'Create Event',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{
          headerShown: true,
          title: 'Edit Event',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={{
          headerShown: true,
          title: 'Create Project',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="EditProject"
        component={EditProjectScreen}
        options={{
          headerShown: true,
          title: 'Edit Project',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="CreateClient"
        component={CreateClientScreen}
        options={{
          headerShown: true,
          title: 'Create Client',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="EditClient"
        component={EditClientScreen}
        options={{
          headerShown: true,
          title: 'Edit Client',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="ManageUsers"
        component={ManageUsersScreen}
        options={{
          headerShown: true,
          title: 'Manage Users',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="EditUser"
        component={EditUserScreen}
        options={{
          headerShown: true,
          title: 'Edit User',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="InviteUser"
        component={InviteUserScreen}
        options={{
          headerShown: true,
          title: 'Invite User',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="UserRates"
        component={UserRatesScreen}
        options={{
          headerShown: true,
          title: 'Manage User Rates',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="TeamViewSettings"
        component={TeamViewSettingsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Team View Settings',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 16 }}
            >
              <HugeiconsIcon icon={MultiplicationSignIcon} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="PlanningColors"
        component={PlanningColorsScreen}
        options={{
          headerShown: true,
          title: 'Planning Page Colors',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="CustomColorManager"
        component={CustomColorManagerScreen}
        options={{
          headerShown: true,
          title: 'Custom Color Manager',
          headerStyle: {
            backgroundColor: currentColors.primary,
            borderBottomColor: currentColors.border,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="ElementColorMapper"
        component={ElementColorMapperScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManageCustomThemes"
        component={ManageCustomThemesScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingTop: 0,
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 0,
    borderBottomColor: currentColors.border,
    marginBottom: 10,
    backgroundColor: iOSColors.systemGroupedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '100',
    color: iOSColors.label,
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
  menuItemActive: {
    backgroundColor: iOSColors.systemBlue + '15',
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
    color: iOSColors.secondaryLabel,

  },
  menuLabelActive: {
    color: iOSColors.systemBlue,
    fontWeight: '100',
  },
});

export default DesktopNavigator;
