import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { List, Switch, Title, Paragraph, Divider, Button, Menu } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { settingsAPI } from '../../services/api';
import { CustomDialog } from '../../components/CustomDialog';

// Settings keys (stored in database)
const SETTINGS_KEYS = {
  ADMIN_PAGE_ACCESS: 'team_view_admin_page_access',
  ADMIN_DEFAULT_PAGE: 'team_view_admin_default_page',
  ADMIN_SHOW_WEEKENDS: 'team_view_admin_show_weekends',
  ADMIN_DEFAULT_PROJECTS_TABLE: 'team_view_admin_default_projects_table',
  MANAGER_PAGE_ACCESS: 'team_view_manager_page_access',
  MANAGER_DEFAULT_PAGE: 'team_view_manager_default_page',
  MANAGER_SHOW_WEEKENDS: 'team_view_manager_show_weekends',
  MANAGER_DEFAULT_PROJECTS_TABLE: 'team_view_manager_default_projects_table',
  USER_PAGE_ACCESS: 'team_view_user_page_access',
  USER_DEFAULT_PAGE: 'team_view_user_default_page',
  USER_SHOW_WEEKENDS: 'team_view_user_show_weekends',
  USER_DEFAULT_PROJECTS_TABLE: 'team_view_user_default_projects_table',
};

// Available pages
const PAGES = [
  { key: 'Dashboard', label: 'Dashboard' },
  { key: 'Calendar', label: 'Calendar' },
  { key: 'Planning', label: 'Planning' },
  { key: 'Time', label: 'Time Tracking' },
  { key: 'Projects', label: 'Projects' },
  { key: 'Clients', label: 'Clients' },
  { key: 'Profile', label: 'Profile' },
];

interface PageAccess {
  [key: string]: boolean;
}

const TeamViewSettingsScreen = ({ navigation }: any) => {
  const { currentColors } = useTheme();

  // Admin settings
  const [adminPageAccess, setAdminPageAccess] = useState<PageAccess>({
    Dashboard: true,
    Calendar: true,
    Planning: true,
    Time: true,
    Projects: true,
    Clients: true,
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
    Clients: true,
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
    Clients: true,
    Profile: true,
  });
  const [userDefaultPage, setUserDefaultPage] = useState('Dashboard');
  const [userMenuVisible, setUserMenuVisible] = useState(false);

  // View preferences per role
  const [adminShowWeekends, setAdminShowWeekends] = useState(false);
  const [adminDefaultProjectsTable, setAdminDefaultProjectsTable] = useState(false);
  const [managerShowWeekends, setManagerShowWeekends] = useState(false);
  const [managerDefaultProjectsTable, setManagerDefaultProjectsTable] = useState(false);
  const [userShowWeekends, setUserShowWeekends] = useState(false);
  const [userDefaultProjectsTable, setUserDefaultProjectsTable] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dialog state variables
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {

      const response = await settingsAPI.app.getAll();
      const settings = response.data;

      // Convert array of settings to a map for easy lookup
      const settingsMap: Record<string, any> = {};
      settings.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value;
      });

      // Load Admin settings
      if (settingsMap[SETTINGS_KEYS.ADMIN_PAGE_ACCESS]) {
        setAdminPageAccess(settingsMap[SETTINGS_KEYS.ADMIN_PAGE_ACCESS]);
      }
      if (settingsMap[SETTINGS_KEYS.ADMIN_DEFAULT_PAGE]) {
        setAdminDefaultPage(settingsMap[SETTINGS_KEYS.ADMIN_DEFAULT_PAGE]);
      }
      if (settingsMap[SETTINGS_KEYS.ADMIN_SHOW_WEEKENDS] !== undefined) {
        setAdminShowWeekends(settingsMap[SETTINGS_KEYS.ADMIN_SHOW_WEEKENDS]);
      }
      if (settingsMap[SETTINGS_KEYS.ADMIN_DEFAULT_PROJECTS_TABLE] !== undefined) {
        setAdminDefaultProjectsTable(settingsMap[SETTINGS_KEYS.ADMIN_DEFAULT_PROJECTS_TABLE]);
      }

      // Load Manager settings
      if (settingsMap[SETTINGS_KEYS.MANAGER_PAGE_ACCESS]) {
        setManagerPageAccess(settingsMap[SETTINGS_KEYS.MANAGER_PAGE_ACCESS]);
      }
      if (settingsMap[SETTINGS_KEYS.MANAGER_DEFAULT_PAGE]) {
        setManagerDefaultPage(settingsMap[SETTINGS_KEYS.MANAGER_DEFAULT_PAGE]);
      }
      if (settingsMap[SETTINGS_KEYS.MANAGER_SHOW_WEEKENDS] !== undefined) {
        setManagerShowWeekends(settingsMap[SETTINGS_KEYS.MANAGER_SHOW_WEEKENDS]);
      }
      if (settingsMap[SETTINGS_KEYS.MANAGER_DEFAULT_PROJECTS_TABLE] !== undefined) {
        setManagerDefaultProjectsTable(settingsMap[SETTINGS_KEYS.MANAGER_DEFAULT_PROJECTS_TABLE]);
      }

      // Load User settings
      if (settingsMap[SETTINGS_KEYS.USER_PAGE_ACCESS]) {
        setUserPageAccess(settingsMap[SETTINGS_KEYS.USER_PAGE_ACCESS]);
      }
      if (settingsMap[SETTINGS_KEYS.USER_DEFAULT_PAGE]) {
        setUserDefaultPage(settingsMap[SETTINGS_KEYS.USER_DEFAULT_PAGE]);
      }
      if (settingsMap[SETTINGS_KEYS.USER_SHOW_WEEKENDS] !== undefined) {
        setUserShowWeekends(settingsMap[SETTINGS_KEYS.USER_SHOW_WEEKENDS]);
      }
      if (settingsMap[SETTINGS_KEYS.USER_DEFAULT_PROJECTS_TABLE] !== undefined) {
        setUserDefaultProjectsTable(settingsMap[SETTINGS_KEYS.USER_DEFAULT_PROJECTS_TABLE]);
      }

    } catch (error) {
      console.error('[TeamViewSettings] Error loading settings:', error);
      // Don't show alert for 404 errors (settings don't exist yet)
      if ((error as any)?.response?.status !== 404) {
        setErrorMessage('Failed to load team view settings');
        setShowErrorDialog(true);
      }
    }
  };

  const handleSaveSettings = async () => {

    try {
      setSaving(true);

      // Validate that default pages are enabled

      if (!adminPageAccess[adminDefaultPage]) {

        setValidationMessage('Admin default page must be enabled');
        setShowValidationDialog(true);
        setSaving(false);
        return;
      }
      if (!managerPageAccess[managerDefaultPage]) {

        setValidationMessage('Manager default page must be enabled');
        setShowValidationDialog(true);
        setSaving(false);
        return;
      }
      if (!userPageAccess[userDefaultPage]) {

        setValidationMessage('User default page must be enabled');
        setShowValidationDialog(true);
        setSaving(false);
        return;
      }

      // Ensure at least one page is enabled for each role
      const adminEnabled = Object.values(adminPageAccess).some((enabled) => enabled);
      const managerEnabled = Object.values(managerPageAccess).some((enabled) => enabled);
      const userEnabled = Object.values(userPageAccess).some((enabled) => enabled);

      if (!adminEnabled || !managerEnabled || !userEnabled) {

        setValidationMessage('Each role must have at least one page enabled');
        setShowValidationDialog(true);
        setSaving(false);
        return;
      }

      // Prepare batch settings update
      const settingsToSave = [
        // Admin settings
        { key: SETTINGS_KEYS.ADMIN_PAGE_ACCESS, value: adminPageAccess },
        { key: SETTINGS_KEYS.ADMIN_DEFAULT_PAGE, value: adminDefaultPage },
        { key: SETTINGS_KEYS.ADMIN_SHOW_WEEKENDS, value: adminShowWeekends },
        { key: SETTINGS_KEYS.ADMIN_DEFAULT_PROJECTS_TABLE, value: adminDefaultProjectsTable },
        // Manager settings
        { key: SETTINGS_KEYS.MANAGER_PAGE_ACCESS, value: managerPageAccess },
        { key: SETTINGS_KEYS.MANAGER_DEFAULT_PAGE, value: managerDefaultPage },
        { key: SETTINGS_KEYS.MANAGER_SHOW_WEEKENDS, value: managerShowWeekends },
        { key: SETTINGS_KEYS.MANAGER_DEFAULT_PROJECTS_TABLE, value: managerDefaultProjectsTable },
        // User settings
        { key: SETTINGS_KEYS.USER_PAGE_ACCESS, value: userPageAccess },
        { key: SETTINGS_KEYS.USER_DEFAULT_PAGE, value: userDefaultPage },
        { key: SETTINGS_KEYS.USER_SHOW_WEEKENDS, value: userShowWeekends },
        { key: SETTINGS_KEYS.USER_DEFAULT_PROJECTS_TABLE, value: userDefaultProjectsTable },
      ];

      await settingsAPI.app.batchSet(settingsToSave);

      setSaving(false);
      setSuccessMessage('Team view settings saved successfully');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('[TeamViewSettings] Error saving settings:', error);
      console.error('[TeamViewSettings] Error details:', JSON.stringify(error, null, 2));
      setSaving(false);
      setErrorMessage('Failed to save team view settings');
      setShowErrorDialog(true);
    }
  };

  const togglePageAccess = (role: 'admin' | 'manager' | 'user', page: string) => {
    // Prevent disabling Profile for admin
    if (role === 'admin' && page === 'Profile') {

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
    setDefaultPage: (page: string) => void,
    showWeekends: boolean,
    setShowWeekends: (value: boolean) => void,
    defaultProjectsTable: boolean,
    setDefaultProjectsTable: (value: boolean) => void
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
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Title style={{ fontSize: 16, color: currentColors.text, marginBottom: 4 }}>
            Default Page
          </Title>
          <Paragraph style={{ fontSize: 12, color: currentColors.textSecondary, marginBottom: 12 }}>
            {availablePages.length === 0
              ? 'Enable at least one page above to set a default'
              : availablePages.length === 1
              ? 'Only one page is enabled'
              : `Page to show when ${roleLabel}s log in (${availablePages.length} pages available)`}
          </Paragraph>
          <View>
            <TouchableOpacity
              onPress={() => {
                console.log(`[TeamViewSettings] TouchableOpacity pressed for ${role}, current menuVisible:`, menuVisible);
                setMenuVisible(!menuVisible);
                console.log(`[TeamViewSettings] Called setMenuVisible(${!menuVisible}) for ${role}`);
              }}
              disabled={availablePages.length === 0}
              style={{
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: availablePages.length === 0 ? currentColors.textTertiary : currentColors.primary,
                borderRadius: 4,
                paddingHorizontal: 16,
                paddingVertical: 8,
                opacity: availablePages.length === 0 ? 0.5 : 1,
              }}
            >
              <Text style={{ color: availablePages.length === 0 ? currentColors.textTertiary : currentColors.primary }}>
                {PAGES.find((p) => p.key === defaultPage)?.label || 'Select'}
              </Text>
            </TouchableOpacity>
            <Menu
              visible={menuVisible}
              onDismiss={() => {
                console.log(`[TeamViewSettings] Menu dismissed for ${role}`);
                setMenuVisible(false);
              }}
              contentStyle={{ backgroundColor: currentColors.background.bg300 }}
              anchor={{ x: 0, y: 0 }}
            >
              {availablePages.length === 0 ? (
                <Menu.Item
                  title="No pages available"
                  disabled
                />
              ) : (
                availablePages.map((page) => (
                  <Menu.Item
                    key={page.key}
                    onPress={() => {
                      console.log(`[TeamViewSettings] Selected page:`, page.label);
                      setDefaultPage(page.key);
                      setMenuVisible(false);
                    }}
                    title={page.label}
                    leadingIcon={page.key === defaultPage ? 'check' : undefined}
                  />
                ))
              )}
            </Menu>
          </View>
        </View>

        {/* View Preferences */}
        <Divider style={{ marginVertical: 10 }} />
        <List.Item
          title="Show Weekends in Week View"
          description={`Default setting for ${roleLabel}s to display weekends in calendar week view`}
          right={() => (
            <Switch
              value={showWeekends}
              onValueChange={setShowWeekends}
              color={currentColors.primary}
            />
          )}
        />
        <List.Item
          title="Default to Table View"
          description={`Default setting for ${roleLabel}s to open projects in table view`}
          right={() => (
            <Switch
              value={defaultProjectsTable}
              onValueChange={setDefaultProjectsTable}
              color={currentColors.primary}
            />
          )}
        />
      </>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={[styles.header, { backgroundColor: currentColors.background.bg300 }]}>
        <Title style={[styles.title, { color: currentColors.text }]}>Team View Settings</Title>
        <Paragraph style={[styles.description, { color: currentColors.textSecondary }]}>
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
          setAdminDefaultPage,
          adminShowWeekends,
          setAdminShowWeekends,
          adminDefaultProjectsTable,
          setAdminDefaultProjectsTable
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
          setManagerDefaultPage,
          managerShowWeekends,
          setManagerShowWeekends,
          managerDefaultProjectsTable,
          setManagerDefaultProjectsTable
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
          setUserDefaultPage,
          userShowWeekends,
          setUserShowWeekends,
          userDefaultProjectsTable,
          setUserDefaultProjectsTable
        )}
      </List.Section>

      <Divider style={styles.divider} />

      {/* Save Button */}
      <View style={[styles.saveContainer, { backgroundColor: currentColors.background.bg300 }]}>
        <Button
          mode="contained"
          onPress={handleSaveSettings}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          buttonColor={currentColors.secondary}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </View>

      {/* Error Dialog */}
      <CustomDialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowErrorDialog(false),
            style: 'default',
          },
        ]}
        onDismiss={() => setShowErrorDialog(false)}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowSuccessDialog(false),
            style: 'default',
          },
        ]}
        onDismiss={() => setShowSuccessDialog(false)}
      />

      {/* Validation Error Dialog */}
      <CustomDialog
        visible={showValidationDialog}
        title="Invalid Configuration"
        message={validationMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowValidationDialog(false),
            style: 'default',
          },
        ]}
        onDismiss={() => setShowValidationDialog(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
  },
  divider: {
    marginVertical: 10,
  },
  saveContainer: {
    padding: 20,
  },
  saveButton: {
    paddingVertical: 5,
  },
});

export default TeamViewSettingsScreen;
