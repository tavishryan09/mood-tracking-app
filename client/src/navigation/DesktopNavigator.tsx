import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home09Icon, Calendar03Icon, StopWatchIcon, Folder01Icon, UserCircleIcon } from '@hugeicons/core-free-icons';
import { Title, Paragraph } from 'react-native-paper';
import { iOSColors } from '../theme/iosTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

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
import ProjectTableViewScreen from '../screens/projects/ProjectTableViewScreen';

const Drawer = createDrawerNavigator();
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

const allMenuItems = [
  { name: 'Dashboard', icon: Home09Icon, label: 'Dashboard', component: DashboardScreen },
  { name: 'Calendar', icon: Calendar03Icon, label: 'Calendar', component: CalendarScreen },
  { name: 'Planning', icon: Calendar03Icon, label: 'Planning', component: PlanningScreen },
  { name: 'Time', icon: StopWatchIcon, label: 'Time Tracking', component: TimeTrackingScreen },
  { name: 'Projects', icon: Folder01Icon, label: 'Projects', component: ProjectsScreen },
  { name: 'Profile', icon: UserCircleIcon, label: 'Profile', component: ProfileScreen },
];

function CustomDrawerContent(props: any) {
  const { state, navigation } = props;
  const { user } = useAuth();
  const currentRoute = state.routes[state.index].name;
  const [visibleMenuItems, setVisibleMenuItems] = useState(allMenuItems);

  useEffect(() => {
    loadMenuSettings();
  }, [user]);

  const loadMenuSettings = async () => {
    try {
      if (!user || !user.role) {
        setVisibleMenuItems(allMenuItems);
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
    } catch (error) {
      console.error('[DesktopNavigator] Error loading menu settings:', error);
      setVisibleMenuItems(allMenuItems);
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.sidebarHeader}>
        <Title style={styles.appTitle}>Mood Tracker</Title>
      </View>
      {visibleMenuItems.map((item) => {
        const isActive = currentRoute === item.name;
        return (
          <TouchableOpacity
            key={item.name}
            style={[styles.menuItem, isActive && styles.menuItemActive]}
            onPress={() => navigation.navigate(item.name)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <HugeiconsIcon
                icon={item.icon}
                size={24}
                color={isActive ? iOSColors.systemBlue : iOSColors.systemGray}
                strokeWidth={isActive ? 2 : 1.5}
              />
            </View>
            <Paragraph style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
              {item.label}
            </Paragraph>
          </TouchableOpacity>
        );
      })}
    </DrawerContentScrollView>
  );
}

function MainDrawer() {
  const { user } = useAuth();
  const [visibleMenuItems, setVisibleMenuItems] = useState(allMenuItems);

  useEffect(() => {
    loadMenuSettings();
  }, [user]);

  const loadMenuSettings = async () => {
    try {
      if (!user || !user.role) {
        setVisibleMenuItems(allMenuItems);
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
        const filtered = allMenuItems.filter((item) => pageAccess[item.name] === true);
        setVisibleMenuItems(filtered);
      } else {
        setVisibleMenuItems(allMenuItems);
      }
    } catch (error) {
      console.error('[MainDrawer] Error loading menu settings:', error);
      setVisibleMenuItems(allMenuItems);
    }
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerType: 'permanent',
        drawerStyle: {
          width: 250,
          backgroundColor: iOSColors.systemGroupedBackground,
        },
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
      }}
    >
      {visibleMenuItems.map((item) => (
        <Drawer.Screen
          key={item.name}
          name={item.name}
          component={item.component}
          options={{
            title: item.label,
            headerShown: item.name !== 'Calendar' && item.name !== 'Planning' && item.name !== 'Profile'
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
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{
          headerShown: true,
          title: 'Edit Event',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="DayView"
        component={DayViewScreen}
        options={{
          headerShown: false,
          title: 'Calendar',
        }}
      />
      <Stack.Screen
        name="StartTimer"
        component={StartTimerScreen}
        options={{
          headerShown: true,
          title: 'Start Timer',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="EditTimeEntry"
        component={EditTimeEntryScreen}
        options={{
          headerShown: true,
          title: 'Edit Time Entry',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={{
          headerShown: true,
          title: 'Create Project',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="EditProject"
        component={EditProjectScreen}
        options={{
          headerShown: true,
          title: 'Edit Project',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="CreateClient"
        component={CreateClientScreen}
        options={{
          headerShown: true,
          title: 'Create Client',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="ClientsList"
        component={ClientsListScreen}
        options={{
          headerShown: true,
          title: 'Clients',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="EditClient"
        component={EditClientScreen}
        options={{
          headerShown: true,
          title: 'Edit Client',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="UserRates"
        component={UserRatesScreen}
        options={{
          headerShown: true,
          title: 'Manage User Rates',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
        }}
      />
      <Stack.Screen
        name="TeamViewSettings"
        component={TeamViewSettingsScreen}
        options={{
          headerShown: true,
          title: 'Team View Settings',
          headerStyle: {
            backgroundColor: iOSColors.systemBackground,
            borderBottomColor: iOSColors.separator,
            borderBottomWidth: 0.5,
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: iOSColors.label,
          },
          headerTintColor: iOSColors.systemBlue,
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
    borderBottomWidth: 1,
    borderBottomColor: iOSColors.separator,
    marginBottom: 10,
    backgroundColor: iOSColors.systemGroupedBackground,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
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
  menuItemActive: {
    backgroundColor: iOSColors.systemBlue + '15',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuLabel: {
    fontSize: 16,
    color: iOSColors.secondaryLabel,
  },
  menuLabelActive: {
    color: iOSColors.systemBlue,
    fontWeight: '600',
  },
});

export default DesktopNavigator;
