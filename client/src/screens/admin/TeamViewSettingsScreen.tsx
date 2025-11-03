import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Switch, Title, Paragraph, Divider, Button, Menu } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  ADMIN_PAGE_ACCESS: '@team_view_admin_page_access',
  ADMIN_DEFAULT_PAGE: '@team_view_admin_default_page',
  MANAGER_PAGE_ACCESS: '@team_view_manager_page_access',
  MANAGER_DEFAULT_PAGE: '@team_view_manager_default_page',
  USER_PAGE_ACCESS: '@team_view_user_page_access',
  USER_DEFAULT_PAGE: '@team_view_user_default_page',
};

// Available pages
const PAGES = [
  { key: 'Dashboard', label: 'Dashboard' },
  { key: 'Calendar', label: 'Calendar' },
  { key: 'Planning', label: 'Planning' },
  { key: 'Time', label: 'Time Tracking' },
  { key: 'Projects', label: 'Projects' },
  { key: 'Profile', label: 'Profile' },
];

interface PageAccess {
  [key: string]: boolean;
}

const TeamViewSettingsScreen = ({ navigation }: any) => {
  // Admin settings
  const [adminPageAccess, setAdminPageAccess] = useState<PageAccess>({
    Dashboard: true,
    Calendar: true,
    Planning: true,
    Time: true,
    Projects: true,
    Profile: true,
  });
  const [adminDefaultPage, setAdminDefaultPage] = useState('Dashboard');
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);

  // Manager settings
  const [managerPageAccess, setManagerPageAccess] = useState<PageAccess>({
    Dashboard: true,
    Calendar: true,
    Planning: true,
    Time: true,
    Projects: true,
    Profile: true,
  });
  const [managerDefaultPage, setManagerDefaultPage] = useState('Dashboard');
  const [managerMenuVisible, setManagerMenuVisible] = useState(false);

  // User settings
  const [userPageAccess, setUserPageAccess] = useState<PageAccess>({
    Dashboard: true,
    Calendar: true,
    Planning: true,
    Time: true,
    Projects: true,
    Profile: true,
  });
  const [userDefaultPage, setUserDefaultPage] = useState('Dashboard');
  const [userMenuVisible, setUserMenuVisible] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load Admin settings
      const adminAccessStr = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_PAGE_ACCESS);
      if (adminAccessStr) {
        setAdminPageAccess(JSON.parse(adminAccessStr));
      }
      const adminDefault = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_DEFAULT_PAGE);
      if (adminDefault) {
        setAdminDefaultPage(adminDefault);
      }

      // Load Manager settings
      const managerAccessStr = await AsyncStorage.getItem(STORAGE_KEYS.MANAGER_PAGE_ACCESS);
      if (managerAccessStr) {
        setManagerPageAccess(JSON.parse(managerAccessStr));
      }
      const managerDefault = await AsyncStorage.getItem(STORAGE_KEYS.MANAGER_DEFAULT_PAGE);
      if (managerDefault) {
        setManagerDefaultPage(managerDefault);
      }

      // Load User settings
      const userAccessStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_PAGE_ACCESS);
      if (userAccessStr) {
        setUserPageAccess(JSON.parse(userAccessStr));
      }
      const userDefault = await AsyncStorage.getItem(STORAGE_KEYS.USER_DEFAULT_PAGE);
      if (userDefault) {
        setUserDefaultPage(userDefault);
      }

      console.log('[TeamViewSettings] Settings loaded successfully');
    } catch (error) {
      console.error('[TeamViewSettings] Error loading settings:', error);
      Alert.alert('Error', 'Failed to load team view settings');
    }
  };

  const handleSaveSettings = async () => {
    console.log('[TeamViewSettings] Save button clicked');
    console.log('[TeamViewSettings] Current state:', {
      adminPageAccess,
      adminDefaultPage,
      managerPageAccess,
      managerDefaultPage,
      userPageAccess,
      userDefaultPage,
    });

    try {
      // Validate that default pages are enabled
      console.log('[TeamViewSettings] Starting validation...');

      if (!adminPageAccess[adminDefaultPage]) {
        console.log('[TeamViewSettings] Validation failed: Admin default page not enabled');
        Alert.alert('Invalid Configuration', 'Admin default page must be enabled');
        return;
      }
      if (!managerPageAccess[managerDefaultPage]) {
        console.log('[TeamViewSettings] Validation failed: Manager default page not enabled');
        Alert.alert('Invalid Configuration', 'Manager default page must be enabled');
        return;
      }
      if (!userPageAccess[userDefaultPage]) {
        console.log('[TeamViewSettings] Validation failed: User default page not enabled');
        Alert.alert('Invalid Configuration', 'User default page must be enabled');
        return;
      }

      // Ensure at least one page is enabled for each role
      const adminEnabled = Object.values(adminPageAccess).some((enabled) => enabled);
      const managerEnabled = Object.values(managerPageAccess).some((enabled) => enabled);
      const userEnabled = Object.values(userPageAccess).some((enabled) => enabled);

      console.log('[TeamViewSettings] Page enabled checks:', {
        adminEnabled,
        managerEnabled,
        userEnabled,
      });

      if (!adminEnabled || !managerEnabled || !userEnabled) {
        console.log('[TeamViewSettings] Validation failed: Not all roles have pages enabled');
        Alert.alert('Invalid Configuration', 'Each role must have at least one page enabled');
        return;
      }

      console.log('[TeamViewSettings] Validation passed, starting save...');

      // Save Admin settings
      console.log('[TeamViewSettings] Saving admin settings...');
      await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_PAGE_ACCESS, JSON.stringify(adminPageAccess));
      console.log('[TeamViewSettings] Admin page access saved');
      await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_DEFAULT_PAGE, adminDefaultPage);
      console.log('[TeamViewSettings] Admin default page saved');

      // Save Manager settings
      console.log('[TeamViewSettings] Saving manager settings...');
      await AsyncStorage.setItem(STORAGE_KEYS.MANAGER_PAGE_ACCESS, JSON.stringify(managerPageAccess));
      console.log('[TeamViewSettings] Manager page access saved');
      await AsyncStorage.setItem(STORAGE_KEYS.MANAGER_DEFAULT_PAGE, managerDefaultPage);
      console.log('[TeamViewSettings] Manager default page saved');

      // Save User settings
      console.log('[TeamViewSettings] Saving user settings...');
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PAGE_ACCESS, JSON.stringify(userPageAccess));
      console.log('[TeamViewSettings] User page access saved');
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DEFAULT_PAGE, userDefaultPage);
      console.log('[TeamViewSettings] User default page saved');

      console.log('[TeamViewSettings] All settings saved successfully');
      Alert.alert('Success', 'Team view settings saved successfully');
    } catch (error) {
      console.error('[TeamViewSettings] Error saving settings:', error);
      console.error('[TeamViewSettings] Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'Failed to save team view settings');
    }
  };

  const togglePageAccess = (role: 'admin' | 'manager' | 'user', page: string) => {
    // Prevent disabling Profile for admin
    if (role === 'admin' && page === 'Profile') {
      console.log('[TeamViewSettings] Cannot disable Profile for admin');
      return;
    }

    if (role === 'admin') {
      setAdminPageAccess((prev) => {
        const newAccess = { ...prev, [page]: !prev[page] };
        // If disabling the default page, reset to first enabled page
        if (page === adminDefaultPage && !newAccess[page]) {
          const firstEnabled = PAGES.find((p) => newAccess[p.key]);
          if (firstEnabled) {
            setAdminDefaultPage(firstEnabled.key);
          }
        }
        return newAccess;
      });
    } else if (role === 'manager') {
      setManagerPageAccess((prev) => {
        const newAccess = { ...prev, [page]: !prev[page] };
        // If disabling the default page, reset to first enabled page
        if (page === managerDefaultPage && !newAccess[page]) {
          const firstEnabled = PAGES.find((p) => newAccess[p.key]);
          if (firstEnabled) {
            setManagerDefaultPage(firstEnabled.key);
          }
        }
        return newAccess;
      });
    } else {
      setUserPageAccess((prev) => {
        const newAccess = { ...prev, [page]: !prev[page] };
        // If disabling the default page, reset to first enabled page
        if (page === userDefaultPage && !newAccess[page]) {
          const firstEnabled = PAGES.find((p) => newAccess[p.key]);
          if (firstEnabled) {
            setUserDefaultPage(firstEnabled.key);
          }
        }
        return newAccess;
      });
    }
  };

  const renderRoleSection = (
    role: 'admin' | 'manager' | 'user',
    roleLabel: string,
    pageAccess: PageAccess,
    defaultPage: string,
    menuVisible: boolean,
    setMenuVisible: (visible: boolean) => void,
    setDefaultPage: (page: string) => void
  ) => {
    const availablePages = PAGES.filter((p) => pageAccess[p.key]);
    const isProfileLocked = role === 'admin'; // Profile is always enabled for admin

    return (
      <>
        <List.Subheader>{roleLabel} Settings</List.Subheader>

        {/* Page Access Toggles */}
        {PAGES.map((page) => {
          const isLocked = isProfileLocked && page.key === 'Profile';

          return (
            <List.Item
              key={page.key}
              title={page.label}
              description={
                isLocked
                  ? `Profile is always available for ${roleLabel}s`
                  : `Enable/disable ${page.label} for ${roleLabel}s`
              }
              left={(props) => <List.Icon {...props} icon="view-dashboard" />}
              right={() => (
                <Switch
                  value={pageAccess[page.key]}
                  onValueChange={() => togglePageAccess(role, page.key)}
                  disabled={isLocked}
                />
              )}
            />
          );
        })}

        {/* Default Page Selector */}
        <List.Item
          title="Default Page"
          description={`Page to show when ${roleLabel}s log in`}
          left={(props) => <List.Icon {...props} icon="home" />}
          right={() => (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setMenuVisible(true)}>
                  {PAGES.find((p) => p.key === defaultPage)?.label || 'Select'}
                </Button>
              }
            >
              {availablePages.map((page) => (
                <Menu.Item
                  key={page.key}
                  onPress={() => {
                    setDefaultPage(page.key);
                    setMenuVisible(false);
                  }}
                  title={page.label}
                  leadingIcon={page.key === defaultPage ? 'check' : undefined}
                />
              ))}
            </Menu>
          )}
        />
      </>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Team View Settings</Title>
        <Paragraph style={styles.description}>
          Configure which pages are accessible for each user role and set the default landing page.
        </Paragraph>
      </View>

      <Divider style={styles.divider} />

      {/* Admin Role Settings */}
      <List.Section>
        {renderRoleSection(
          'admin',
          'Admin',
          adminPageAccess,
          adminDefaultPage,
          adminMenuVisible,
          setAdminMenuVisible,
          setAdminDefaultPage
        )}
      </List.Section>

      <Divider style={styles.divider} />

      {/* Manager Role Settings */}
      <List.Section>
        {renderRoleSection(
          'manager',
          'Manager',
          managerPageAccess,
          managerDefaultPage,
          managerMenuVisible,
          setManagerMenuVisible,
          setManagerDefaultPage
        )}
      </List.Section>

      <Divider style={styles.divider} />

      {/* User Role Settings */}
      <List.Section>
        {renderRoleSection(
          'user',
          'User',
          userPageAccess,
          userDefaultPage,
          userMenuVisible,
          setUserMenuVisible,
          setUserDefaultPage
        )}
      </List.Section>

      <Divider style={styles.divider} />

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <Button mode="contained" onPress={handleSaveSettings} style={styles.saveButton}>
          Save Settings
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  description: {
    color: '#666',
    fontSize: 14,
  },
  divider: {
    marginVertical: 10,
  },
  saveContainer: {
    padding: 20,
    backgroundColor: 'white',
  },
  saveButton: {
    paddingVertical: 5,
  },
});

export default TeamViewSettingsScreen;
