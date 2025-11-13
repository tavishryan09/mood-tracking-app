import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Text, TextInput as RNTextInput, Platform, Image } from 'react-native';
import { CustomDialog } from '../../components/CustomDialog';
import { List, Avatar, Title, Paragraph, Button, Divider, Switch, TextInput, Card, Searchbar, Chip, IconButton, ActivityIndicator, Menu, FAB, SegmentedButtons } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { PencilEdit02Icon, AddCircleIcon, Cancel01Icon, UserAdd02Icon, Search01Icon, DownloadSquare02Icon, Calendar04Icon, Camera01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colorPalettes, ColorPaletteName } from '../../theme/colorPalettes';
import { settingsAPI, userManagementAPI, outlookAPI, exportAPI } from '../../services/api';
import axios from 'axios';

const ProfileScreen = ({ navigation }: any) => {
  const { user, logout, refreshUser, token } = useAuth();
  const { selectedPalette, setSelectedPalette, currentColors, customPalettes, loadCustomPalettes: reloadThemeCustomPalettes } = useTheme();

  // Modal states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showManageUsersModal, setShowManageUsersModal] = useState(false);
  const [showTeamViewSettingsModal, setShowTeamViewSettingsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Custom Dialog states
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [deleteUserIdPending, setDeleteUserIdPending] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  // Edit profile form
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notifications settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Outlook Calendar integration
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [outlookSyncing, setOutlookSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    totalTasks: number;
    syncedPlanningTasks: number;
    syncedDeadlineTasks: number;
    deletedEvents: number;
  } | null>(null);

  // Manage Users modal state
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Edit User modal state
  const [editUserData, setEditUserData] = useState<any | null>(null);
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserFirstName, setEditUserFirstName] = useState('');
  const [editUserLastName, setEditUserLastName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'USER' | 'MANAGER' | 'ADMIN'>('USER');
  const [editUserIsActive, setEditUserIsActive] = useState(true);
  const [editUserDefaultHourlyRate, setEditUserDefaultHourlyRate] = useState('');
  const [loadingEditUser, setLoadingEditUser] = useState(false);
  const [savingEditUser, setSavingEditUser] = useState(false);

  // Team View Settings modal state
  const [adminPageAccess, setAdminPageAccess] = useState<{ [key: string]: boolean }>({
    Dashboard: true,
    Planning: true,
    Projects: true,
    Clients: true,
    Profile: true,
  });
  const [adminDefaultPage, setAdminDefaultPage] = useState('Dashboard');
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);
  const [managerPageAccess, setManagerPageAccess] = useState<{ [key: string]: boolean }>({
    Dashboard: true,
    Planning: true,
    Projects: true,
    Clients: true,
    Profile: true,
  });
  const [managerDefaultPage, setManagerDefaultPage] = useState('Dashboard');
  const [managerMenuVisible, setManagerMenuVisible] = useState(false);
  const [userPageAccess, setUserPageAccess] = useState<{ [key: string]: boolean }>({
    Dashboard: true,
    Planning: true,
    Projects: true,
    Clients: true,
    Profile: true,
  });
  const [userDefaultPage, setUserDefaultPage] = useState('Dashboard');
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [adminDefaultProjectsTable, setAdminDefaultProjectsTable] = useState(false);
  const [managerDefaultProjectsTable, setManagerDefaultProjectsTable] = useState(false);
  const [userDefaultProjectsTable, setUserDefaultProjectsTable] = useState(false);
  const [savingTeamSettings, setSavingTeamSettings] = useState(false);

  useEffect(() => {
    loadPreferences();
    refreshUser(); // Refresh user data to get latest role
  }, []);

  const loadPreferences = async () => {
    try {
      // Check Outlook connection status
      try {
        const outlookResponse = await outlookAPI.getStatus();
        setOutlookConnected(outlookResponse.data.connected);
      } catch (error) {
        console.error('[ProfileScreen] Error loading Outlook status:', error);
      }
    } catch (error) {
      console.error('[ProfileScreen] Error loading preferences:', error);
    }
  };

  const handleColorPaletteChange = async (paletteId: string) => {
    try {
      await setSelectedPalette(paletteId);
      const palette = colorPalettes[paletteId as ColorPaletteName] || customPalettes[paletteId];
      setSuccessMessage(`Color palette changed to ${palette?.name || 'Custom'}`);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error changing color palette:', error);
      setErrorMessage('Failed to change color palette');
      setShowErrorDialog(true);
    }
  };

  const handleConnectOutlook = async () => {
    try {
      setOutlookLoading(true);
      const response = await outlookAPI.connect();
      const authUrl = response.data.authUrl;

      // Open OAuth URL in new window
      window.open(authUrl, '_blank');

      setSuccessMessage('Complete the authorization in the popup window. After authorizing, please reload this page to see the connection status.');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('[ProfileScreen] Error connecting Outlook:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to connect Outlook calendar';
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
    } finally {
      setOutlookLoading(false);
    }
  };

  const handleDisconnectOutlook = async () => {
    try {
      setOutlookLoading(true);
      await outlookAPI.disconnect();
      setOutlookConnected(false);
      setSuccessMessage('Outlook calendar disconnected. Your tasks will no longer sync to Outlook.');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('[ProfileScreen] Error disconnecting Outlook:', error);
      setErrorMessage('Failed to disconnect Outlook calendar');
      setShowErrorDialog(true);
    } finally {
      setOutlookLoading(false);
    }
  };

  const handleSyncOutlook = async () => {
    try {
      console.log('[ProfileScreen] Starting chunked Outlook sync...');
      setOutlookSyncing(true);
      setSyncProgress({
        totalTasks: 0,
        syncedPlanningTasks: 0,
        syncedDeadlineTasks: 0,
        deletedEvents: 0
      });

      // Create a job to track progress
      const jobResponse = await outlookAPI.sync();
      const { jobId } = jobResponse.data;
      console.log('[ProfileScreen] Job created:', jobId);

      // Phase 1: Sync planning tasks
      console.log('[ProfileScreen] Phase 1: Syncing planning tasks...');
      const planningResult = await outlookAPI.syncPlanning(jobId);
      console.log('[ProfileScreen] Planning result:', planningResult.data);

      // Update progress
      const statusAfterPlanning = await outlookAPI.getSyncStatus(jobId);
      if (statusAfterPlanning.data.progress) {
        setSyncProgress(statusAfterPlanning.data.progress);
      }

      // Phase 2: Sync deadline tasks
      console.log('[ProfileScreen] Phase 2: Syncing deadline tasks...');
      const deadlineResult = await outlookAPI.syncDeadline(jobId);
      console.log('[ProfileScreen] Deadline result:', deadlineResult.data);

      // Update progress
      const statusAfterDeadline = await outlookAPI.getSyncStatus(jobId);
      if (statusAfterDeadline.data.progress) {
        setSyncProgress(statusAfterDeadline.data.progress);
      }

      // Phase 3: Cleanup orphaned events
      console.log('[ProfileScreen] Phase 3: Cleaning up orphaned events...');
      const cleanupResult = await outlookAPI.syncCleanup(jobId);
      console.log('[ProfileScreen] Cleanup result:', cleanupResult.data);

      // Get final status
      const finalStatus = await outlookAPI.getSyncStatus(jobId);
      const { progress } = finalStatus.data;

      setOutlookSyncing(false);
      setSyncProgress(null);

      // Build success message
      let message = 'Sync completed successfully!';
      if (progress) {
        message += `\n\n📊 Sync Summary:`;
        message += `\n• Total Tasks: ${progress.totalTasks}`;
        message += `\n• Planning Tasks Synced: ${progress.syncedPlanningTasks}`;
        message += `\n• Deadline Tasks Synced: ${progress.syncedDeadlineTasks}`;
        message += `\n• Old Events Deleted: ${progress.deletedEvents}`;

        if (progress.errors && progress.errors.length > 0) {
          message += `\n\n⚠️ Errors (${progress.errors.length}):`;
          progress.errors.slice(0, 3).forEach((err: string) => {
            message += `\n• ${err}`;
          });
          if (progress.errors.length > 3) {
            message += `\n• ... and ${progress.errors.length - 3} more`;
          }
        }
      }

      setSuccessMessage(message);
      setShowSuccessDialog(true);

    } catch (error: any) {
      console.error('[ProfileScreen] Error during sync:', error);
      setOutlookSyncing(false);
      setSyncProgress(null);

      // Extract error message properly
      const errorMessage = error.response?.data?.error || error.message || 'Failed to complete sync';
      setErrorMessage(String(errorMessage));
      setShowErrorDialog(true);
    }
  };

  const handleExportProjectSummary = async () => {
    try {
      const response = await exportAPI.projectSummary();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-summary-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Project summary exported successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('[ProfileScreen] Error exporting project summary:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to export project summary');
      setShowErrorDialog(true);
    }
  };

  const handleEditProfile = () => {
    setEditFirstName(user?.firstName || '');
    setEditLastName(user?.lastName || '');
    setEditEmail(user?.email || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setErrorMessage('Please fill in all fields');
      setShowErrorDialog(true);
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/profile`,
        {
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await refreshUser();
      setShowEditProfileModal(false);
      setSuccessMessage('Profile updated successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Update profile error:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to update profile');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Please fill in all fields');
      setShowErrorDialog(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      setShowErrorDialog(true);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      setShowErrorDialog(true);
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShowChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password changed successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Change password error:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to change password');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      // Save notification preferences to user settings
      await settingsAPI.user.set('email_notifications', emailNotifications);
      await settingsAPI.user.set('push_notifications', pushNotifications);
      setShowNotificationsModal(false);
      setSuccessMessage('Notification preferences saved');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Save notifications error:', error);
      setErrorMessage('Failed to save notification preferences');
      setShowErrorDialog(true);
    }
  };

  const handleLogout = () => {
    console.log('[ProfileScreen] Logout button pressed');
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = async () => {
    console.log('[ProfileScreen] Logout confirmed');
    setShowLogoutDialog(false);
    await logout();
  };

  const handleProfileImageUpload = async (event: any) => {
    if (Platform.OS === 'web') {
      const file = event.target.files[0];
      if (!file) return;

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size must be less than 5MB');
        setShowErrorDialog(true);
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select an image file');
        setShowErrorDialog(true);
        return;
      }

      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await axios.post(
          `${process.env.EXPO_PUBLIC_API_URL}/api/users/avatar`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        await refreshUser();
        setSuccessMessage('Profile image updated successfully');
        setShowSuccessDialog(true);
      } catch (error: any) {
        console.error('Upload avatar error:', error);
        setErrorMessage(error.response?.data?.error || 'Failed to upload profile image');
        setShowErrorDialog(true);
      }
    }
  };

  // Manage Users handlers
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userManagementAPI.getAllUsers();
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setErrorMessage('Failed to load users');
      setShowErrorDialog(true);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '#d32f2f';
      case 'MANAGER':
        return '#1976d2';
      default:
        return '#388e3c';
    }
  };

  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUserId) return;

    try {
      await userManagementAPI.deleteUser(deletingUserId);
      setDeletingUserId(null);
      loadUsers();
    } catch (error: any) {
      console.error('Delete user error:', error);
      setDeletingUserId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingUserId(null);
  };

  const handleOpenManageUsersModal = () => {
    setShowManageUsersModal(true);
    loadUsers();
  };

  // Edit User modal handlers
  const loadEditUser = async (userId: string) => {
    try {
      setLoadingEditUser(true);
      const foundUser = users.find((u) => u.id === userId);

      if (foundUser) {
        setEditUserData(foundUser);
        setEditUserEmail(foundUser.email);
        setEditUserFirstName(foundUser.firstName);
        setEditUserLastName(foundUser.lastName);
        setEditUserRole(foundUser.role);
        setEditUserIsActive(foundUser.isActive);
        setEditUserDefaultHourlyRate(foundUser.defaultHourlyRate?.toString() || '');
      } else {
        setErrorMessage('User not found');
        setShowErrorDialog(true);
        setShowEditUserModal(false);
      }
    } catch (error: any) {
      console.error('Error loading user:', error);
      setErrorMessage('Failed to load user');
      setShowErrorDialog(true);
      setShowEditUserModal(false);
    } finally {
      setLoadingEditUser(false);
    }
  };

  const handleOpenEditUserModal = (userId: string) => {
    setEditingUserId(userId);
    setShowEditUserModal(true);
    loadEditUser(userId);
  };

  const handleUpdateEditUser = async () => {
    if (!editUserEmail || !editUserFirstName || !editUserLastName) {
      setErrorMessage('Please fill in all required fields');
      setShowErrorDialog(true);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUserEmail)) {
      setErrorMessage('Please enter a valid email address');
      setShowErrorDialog(true);
      return;
    }

    if (!editingUserId) return;

    setSavingEditUser(true);
    try {
      const data: any = {
        email: editUserEmail,
        firstName: editUserFirstName,
        lastName: editUserLastName,
        role: editUserRole,
        isActive: editUserIsActive,
      };

      if (editUserDefaultHourlyRate) {
        data.defaultHourlyRate = parseFloat(editUserDefaultHourlyRate);
      }

      await userManagementAPI.updateUser(editingUserId, data);
      setSuccessMessage('User updated successfully');
      setShowSuccessDialog(true);
      setShowEditUserModal(false);
      loadUsers(); // Refresh the users list
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to update user');
      setShowErrorDialog(true);
    } finally {
      setSavingEditUser(false);
    }
  };

  const handleResetUserPassword = () => {
    setResetPasswordValue('');
    setShowResetPasswordDialog(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      setShowErrorDialog(true);
      return;
    }

    if (!editingUserId) return;

    try {
      await userManagementAPI.resetPassword(editingUserId, resetPasswordValue);
      setShowResetPasswordDialog(false);
      setResetPasswordValue('');
      setSuccessMessage('Password reset successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      setShowResetPasswordDialog(false);
      setErrorMessage(error.response?.data?.error || 'Failed to reset password');
      setShowErrorDialog(true);
    }
  };

  const handleCloseEditUserModal = () => {
    setShowEditUserModal(false);
    setEditingUserId(null);
    setEditUserData(null);
    setEditUserEmail('');
    setEditUserFirstName('');
    setEditUserLastName('');
    setEditUserRole('USER');
    setEditUserIsActive(true);
    setEditUserDefaultHourlyRate('');
  };

  // Team View Settings handlers
  const SETTINGS_KEYS = {
    ADMIN_PAGE_ACCESS: 'team_view_admin_page_access',
    ADMIN_DEFAULT_PAGE: 'team_view_admin_default_page',
    ADMIN_DEFAULT_PROJECTS_TABLE: 'team_view_admin_default_projects_table',
    MANAGER_PAGE_ACCESS: 'team_view_manager_page_access',
    MANAGER_DEFAULT_PAGE: 'team_view_manager_default_page',
    MANAGER_DEFAULT_PROJECTS_TABLE: 'team_view_manager_default_projects_table',
    USER_PAGE_ACCESS: 'team_view_user_page_access',
    USER_DEFAULT_PAGE: 'team_view_user_default_page',
    USER_DEFAULT_PROJECTS_TABLE: 'team_view_user_default_projects_table',
  };

  const PAGES = [
    { key: 'Dashboard', label: 'Dashboard' },
    { key: 'Planning', label: 'Planning' },
    { key: 'Projects', label: 'Projects' },
    { key: 'Clients', label: 'Clients' },
    { key: 'Profile', label: 'Profile' },
  ];

  const loadTeamViewSettings = async () => {
    try {
      // Load each app-wide setting individually
      const loadSetting = async (key: string, defaultValue?: any) => {
        try {
          const response = await settingsAPI.app.get(key);
          return response.data?.value;
        } catch (error: any) {
          if (error.response?.status === 404) {
            return defaultValue;
          }
          throw error;
        }
      };

      const [
        adminPageAccessValue,
        adminDefaultPageValue,
        adminDefaultProjectsTableValue,
        managerPageAccessValue,
        managerDefaultPageValue,
        managerDefaultProjectsTableValue,
        userPageAccessValue,
        userDefaultPageValue,
        userDefaultProjectsTableValue,
      ] = await Promise.all([
        loadSetting(SETTINGS_KEYS.ADMIN_PAGE_ACCESS),
        loadSetting(SETTINGS_KEYS.ADMIN_DEFAULT_PAGE),
        loadSetting(SETTINGS_KEYS.ADMIN_DEFAULT_PROJECTS_TABLE),
        loadSetting(SETTINGS_KEYS.MANAGER_PAGE_ACCESS),
        loadSetting(SETTINGS_KEYS.MANAGER_DEFAULT_PAGE),
        loadSetting(SETTINGS_KEYS.MANAGER_DEFAULT_PROJECTS_TABLE),
        loadSetting(SETTINGS_KEYS.USER_PAGE_ACCESS),
        loadSetting(SETTINGS_KEYS.USER_DEFAULT_PAGE),
        loadSetting(SETTINGS_KEYS.USER_DEFAULT_PROJECTS_TABLE),
      ]);

      if (adminPageAccessValue) setAdminPageAccess(adminPageAccessValue);
      if (adminDefaultPageValue) setAdminDefaultPage(adminDefaultPageValue);
      if (adminDefaultProjectsTableValue !== undefined) setAdminDefaultProjectsTable(adminDefaultProjectsTableValue);

      if (managerPageAccessValue) setManagerPageAccess(managerPageAccessValue);
      if (managerDefaultPageValue) setManagerDefaultPage(managerDefaultPageValue);
      if (managerDefaultProjectsTableValue !== undefined) setManagerDefaultProjectsTable(managerDefaultProjectsTableValue);

      if (userPageAccessValue) setUserPageAccess(userPageAccessValue);
      if (userDefaultPageValue) setUserDefaultPage(userDefaultPageValue);
      if (userDefaultProjectsTableValue !== undefined) setUserDefaultProjectsTable(userDefaultProjectsTableValue);
    } catch (error) {
      console.error('[ProfileScreen] Error loading team view settings:', error);
      if ((error as any)?.response?.status !== 404) {
        setErrorMessage('Failed to load team view settings');
        setShowErrorDialog(true);
      }
    }
  };

  const handleOpenTeamViewSettingsModal = () => {
    setShowTeamViewSettingsModal(true);
    loadTeamViewSettings();
  };

  const handleSaveTeamViewSettings = async () => {
    try {
      setSavingTeamSettings(true);

      if (!adminPageAccess[adminDefaultPage]) {
        setErrorMessage('Admin default page must be enabled');
        setShowErrorDialog(true);
        setSavingTeamSettings(false);
        return;
      }
      if (!managerPageAccess[managerDefaultPage]) {
        setErrorMessage('Manager default page must be enabled');
        setShowErrorDialog(true);
        setSavingTeamSettings(false);
        return;
      }
      if (!userPageAccess[userDefaultPage]) {
        setErrorMessage('User default page must be enabled');
        setShowErrorDialog(true);
        setSavingTeamSettings(false);
        return;
      }

      const adminEnabled = Object.values(adminPageAccess).some((enabled) => enabled);
      const managerEnabled = Object.values(managerPageAccess).some((enabled) => enabled);
      const userEnabled = Object.values(userPageAccess).some((enabled) => enabled);

      if (!adminEnabled || !managerEnabled || !userEnabled) {
        setErrorMessage('Each role must have at least one page enabled');
        setShowErrorDialog(true);
        setSavingTeamSettings(false);
        return;
      }

      // Save each setting as app-wide (team-wide) settings
      await Promise.all([
        settingsAPI.app.set(SETTINGS_KEYS.ADMIN_PAGE_ACCESS, adminPageAccess),
        settingsAPI.app.set(SETTINGS_KEYS.ADMIN_DEFAULT_PAGE, adminDefaultPage),
        settingsAPI.app.set(SETTINGS_KEYS.ADMIN_DEFAULT_PROJECTS_TABLE, adminDefaultProjectsTable),
        settingsAPI.app.set(SETTINGS_KEYS.MANAGER_PAGE_ACCESS, managerPageAccess),
        settingsAPI.app.set(SETTINGS_KEYS.MANAGER_DEFAULT_PAGE, managerDefaultPage),
        settingsAPI.app.set(SETTINGS_KEYS.MANAGER_DEFAULT_PROJECTS_TABLE, managerDefaultProjectsTable),
        settingsAPI.app.set(SETTINGS_KEYS.USER_PAGE_ACCESS, userPageAccess),
        settingsAPI.app.set(SETTINGS_KEYS.USER_DEFAULT_PAGE, userDefaultPage),
        settingsAPI.app.set(SETTINGS_KEYS.USER_DEFAULT_PROJECTS_TABLE, userDefaultProjectsTable),
      ]);

      setSavingTeamSettings(false);
      setShowTeamViewSettingsModal(false);
      setSuccessMessage('Team view settings saved successfully');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('[ProfileScreen] Error saving team view settings:', error);
      setSavingTeamSettings(false);
      setErrorMessage('Failed to save team view settings');
      setShowErrorDialog(true);
    }
  };

  const togglePageAccess = (role: 'admin' | 'manager' | 'user', page: string) => {
    if (role === 'admin' && page === 'Profile') {
      return;
    }

    if (role === 'admin') {
      setAdminPageAccess((prev) => {
        const newAccess = { ...prev, [page]: !prev[page] };
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

  const isAdmin = user?.role === 'ADMIN';

  const renderRoleSection = (
    role: 'admin' | 'manager' | 'user',
    roleLabel: string,
    pageAccess: { [key: string]: boolean },
    defaultPage: string,
    menuVisible: boolean,
    setMenuVisible: (visible: boolean) => void,
    setDefaultPage: (page: string) => void,
    defaultProjectsTable: boolean,
    setDefaultProjectsTable: (value: boolean) => void
  ) => {
    // Show all pages in the dropdown, not just enabled ones
    // The user can select any page as default, but validation at save time ensures it's enabled
    const availablePages = PAGES;
    const isProfileLocked = role === 'admin';

    return (
      <>
        <List.Subheader>{roleLabel} Settings</List.Subheader>

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

        <List.Item
          title="Default Page"
          description={`Page to show when ${roleLabel}s log in`}
          right={() => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                contentStyle={{ backgroundColor: currentColors.background.bg500 }}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuVisible(true)}
                    style={{ minWidth: 120 }}
                  >
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
                    titleStyle={{ color: currentColors.text }}
                  />
                ))}
              </Menu>
            </View>
          )}
        />

        <Divider style={{ marginVertical: 10 }} />
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
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === 'web') {
              document.getElementById('avatar-upload')?.click();
            }
          }}
          style={styles.avatarContainer}
        >
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={[styles.avatarImage, { borderColor: currentColors.primary }]}
            />
          ) : (
            <Avatar.Text
              size={80}
              label={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
              style={[styles.avatar, { backgroundColor: currentColors.primary }]}
            />
          )}
          <View style={[styles.cameraIconContainer, { backgroundColor: currentColors.primary }]}>
            <HugeiconsIcon icon={Camera01Icon} size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleProfileImageUpload}
          />
        )}
        <Title style={[styles.name, { color: currentColors.text }]}>
          {user?.firstName} {user?.lastName}
        </Title>
        <Paragraph style={[styles.email, { color: currentColors.text }]}>{user?.email}</Paragraph>
        <Paragraph style={[styles.role, { color: currentColors.primary }]}>{user?.role}</Paragraph>
      </View>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Subheader>Settings</List.Subheader>
        <List.Item
          title="Edit Profile"
          description="Update your name and email"
          right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
          onPress={handleEditProfile}
        />
        <List.Item
          title="Notifications"
          description="Manage notification preferences"
          right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
          onPress={() => setShowNotificationsModal(true)}
        />
        <List.Item
          title="Change Password"
          description="Update your password"
          right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
          onPress={() => setShowChangePasswordModal(true)}
        />
      </List.Section>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Subheader>Outlook Calendar Sync</List.Subheader>
        <List.Item
          title="Outlook Calendar"
          description={
            outlookConnected
              ? "Connected - Your planning and deadline tasks sync automatically"
              : "Connect to sync your planning and deadline tasks to Outlook Calendar"
          }
          left={(props) => (
            <View style={{ marginLeft: 16, marginRight: 8, justifyContent: 'center' }}>
              <HugeiconsIcon
                icon={Calendar04Icon}
                size={24}
                color={outlookConnected ? currentColors.success : currentColors.icon}
              />
            </View>
          )}
          right={() => (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {outlookConnected && (
                <Button
                  mode="outlined"
                  onPress={handleSyncOutlook}
                  loading={outlookSyncing}
                  disabled={outlookSyncing || outlookLoading}
                  style={{ marginRight: 8 }}
                >
                  Re-sync
                </Button>
              )}
              <Button
                mode={outlookConnected ? "outlined" : "contained"}
                onPress={outlookConnected ? handleDisconnectOutlook : handleConnectOutlook}
                loading={outlookLoading}
                disabled={outlookLoading || outlookSyncing}
                style={{ marginRight: 8 }}
              >
                {outlookConnected ? "Disconnect" : "Connect"}
              </Button>
            </View>
          )}
        />

        {/* Real-time sync progress */}
        {syncProgress && (
          <Card style={{ margin: 16, backgroundColor: currentColors.background.bg300 }}>
            <Card.Content>
              <Paragraph style={{ color: currentColors.text, fontWeight: 'bold', marginBottom: 10 }}>
                🔄 Syncing...
              </Paragraph>
              <Paragraph style={{ color: currentColors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                📋 Total Tasks: {syncProgress.totalTasks}
              </Paragraph>
              <Paragraph style={{ color: currentColors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                ✅ Planning Tasks: {syncProgress.syncedPlanningTasks} / {syncProgress.totalTasks}
              </Paragraph>
              <Paragraph style={{ color: currentColors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                📅 Deadline Tasks: {syncProgress.syncedDeadlineTasks} / {syncProgress.totalTasks}
              </Paragraph>
              <Paragraph style={{ color: currentColors.textSecondary, fontSize: 12 }}>
                🗑️ Cleaned Up: {syncProgress.deletedEvents} old events
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </List.Section>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Manage Custom Themes"
          description="Create and customize your color themes"
          right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
          onPress={() => navigation.navigate('ManageCustomThemes')}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {user?.role === 'ADMIN' && (
        <>
          <List.Section>
            <List.Subheader>Admin</List.Subheader>
            <List.Item
              title="Manage Users"
              description="Invite new users and manage access"
              right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
              onPress={handleOpenManageUsersModal}
            />
            <List.Item
              title="Team View Settings"
              description="Configure page access and defaults by role"
              right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
              onPress={handleOpenTeamViewSettingsModal}
            />
          </List.Section>
          <Divider style={styles.divider} />
        </>
      )}

      <List.Section>
        <List.Subheader>Reports</List.Subheader>
        <List.Item
          title="Export Project Summary"
          description="Download project summary data as CSV"
          right={(props) => <HugeiconsIcon icon={DownloadSquare02Icon} size={24} color={currentColors.icon} />}
          onPress={handleExportProjectSummary}
        />
      </List.Section>

      <Divider style={styles.divider} />

      <View style={styles.logoutContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor={currentColors.error}
        >
          Logout
        </Button>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: currentColors.background.bg700 }]}>
            <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 8 }}>
              <Card.Content>
                <Title style={{ color: currentColors.text, marginBottom: 20 }}>Edit Profile</Title>

                <TextInput
                  label="First Name"
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Last Name"
                  value={editLastName}
                  onChangeText={setEditLastName}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Email"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowEditProfileModal(false)}
                    disabled={saving}
                    style={styles.modalButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    loading={saving}
                    disabled={saving}
                    style={styles.modalButton}
                  >
                    Save
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: currentColors.background.bg700 }]}>
            <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 8 }}>
              <Card.Content>
                <Title style={{ color: currentColors.text, marginBottom: 20 }}>Change Password</Title>

                <TextInput
                  label="Current Password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                />

                <TextInput
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                />

                <TextInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                />

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setShowChangePasswordModal(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={saving}
                    style={styles.modalButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleChangePassword}
                    loading={saving}
                    disabled={saving}
                    style={styles.modalButton}
                  >
                    Change Password
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: currentColors.background.bg700 }]}>
            <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 8 }}>
              <Card.Content>
                <Title style={{ color: currentColors.text, marginBottom: 20 }}>Notification Preferences</Title>

                <List.Item
                  title="Email Notifications"
                  description="Receive email notifications for important updates"
                  right={() => (
                    <Switch
                      value={emailNotifications}
                      onValueChange={setEmailNotifications}
                    />
                  )}
                />

                <List.Item
                  title="Push Notifications"
                  description="Receive push notifications on your device"
                  right={() => (
                    <Switch
                      value={pushNotifications}
                      onValueChange={setPushNotifications}
                    />
                  )}
                />

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowNotificationsModal(false)}
                    style={styles.modalButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSaveNotifications}
                    style={styles.modalButton}
                  >
                    Save
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Manage Users Modal */}
      <Modal
        visible={showManageUsersModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManageUsersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.fullModalContainer, { backgroundColor: currentColors.background.bg700 }]}>
            <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 8, flex: 1 }}>
              <Card.Content style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <Title style={{ color: currentColors.text, flex: 1 }}>Manage Users</Title>
                  <IconButton
                    icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
                    onPress={() => setShowManageUsersModal(false)}
                  />
                </View>

                <Searchbar
                  placeholder="Search users..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={styles.searchbar}
                  icon={() => <HugeiconsIcon icon={Search01Icon} size={24} color={currentColors.icon} />}
                />

                {loadingUsers ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                  </View>
                ) : (
                  <ScrollView style={styles.modalScrollView}>
                    {filteredUsers.length === 0 ? (
                      <Card style={[styles.emptyCard, { backgroundColor: currentColors.background.bg300 }]}>
                        <Card.Content>
                          <Paragraph style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                            No users found
                          </Paragraph>
                        </Card.Content>
                      </Card>
                    ) : (
                      filteredUsers.map((user) => (
                        <List.Item
                          key={user.id}
                          title={`${user.firstName} ${user.lastName}`}
                          description={user.email}
                          right={(props) => (
                            <View style={styles.rightContent}>
                              <Chip
                                mode="outlined"
                                style={[styles.roleChip, { borderColor: getRoleColor(user.role) }]}
                                textStyle={{ color: getRoleColor(user.role), fontSize: 12 }}
                              >
                                {user.role}
                              </Chip>
                              <IconButton
                                icon={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
                                onPress={() => handleOpenEditUserModal(user.id)}
                              />
                              <IconButton
                                icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.error} />}
                                onPress={() => handleDeleteClick(user.id)}
                              />
                            </View>
                          )}
                          style={[
                            styles.userItem,
                            { backgroundColor: currentColors.background.bg300 },
                            !user.isActive && styles.inactiveUser
                          ]}
                        />
                      ))
                    )}
                  </ScrollView>
                )}

                <View style={styles.modalFooter}>
                  <Button
                    mode="contained"
                    icon={() => <HugeiconsIcon icon={UserAdd02Icon} size={20} color="#FFFFFF" />}
                    onPress={() => {
                      setShowManageUsersModal(false);
                      navigation.navigate('InviteUser');
                    }}
                    style={styles.inviteButton}
                    buttonColor={currentColors.secondary}
                  >
                    Invite User
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        visible={deletingUserId !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: currentColors.background.bg700 }]}>
            <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 8 }}>
              <Card.Content>
                <Paragraph style={[styles.modalTitle, { color: currentColors.text }]}>
                  Delete User
                </Paragraph>
                <Paragraph style={[styles.modalMessage, { color: currentColors.textSecondary }]}>
                  Are you sure you want to delete {deletingUserId ? users.find(u => u.id === deletingUserId)?.firstName : ''} {deletingUserId ? users.find(u => u.id === deletingUserId)?.lastName : ''}?
                </Paragraph>
                <Paragraph style={[styles.modalWarning, { color: currentColors.error }]}>
                  This action cannot be undone.
                </Paragraph>
                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={handleDeleteCancel}
                    style={styles.modalButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor={currentColors.error}
                    onPress={handleDeleteConfirm}
                    style={styles.modalButton}
                  >
                    Delete
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Team View Settings Modal */}
      <Modal
        visible={showTeamViewSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTeamViewSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.fullModalContainer, { backgroundColor: currentColors.background.bg700 }]}>
            <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 8, flex: 1 }}>
              <Card.Content style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Title style={{ color: currentColors.text }}>Team View Settings</Title>
                    <Paragraph style={{ color: currentColors.textSecondary, fontSize: 12 }}>
                      Configure which pages are accessible for each user role and set the default landing page.
                    </Paragraph>
                  </View>
                  <IconButton
                    icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
                    onPress={() => setShowTeamViewSettingsModal(false)}
                  />
                </View>

                <ScrollView style={styles.modalScrollView}>
                  <List.Section>
                    {renderRoleSection(
                      'admin',
                      'Admin',
                      adminPageAccess,
                      adminDefaultPage,
                      adminMenuVisible,
                      setAdminMenuVisible,
                      setAdminDefaultPage,
                      adminDefaultProjectsTable,
                      setAdminDefaultProjectsTable
                    )}
                  </List.Section>

                  <Divider style={styles.divider} />

                  <List.Section>
                    {renderRoleSection(
                      'manager',
                      'Manager',
                      managerPageAccess,
                      managerDefaultPage,
                      managerMenuVisible,
                      setManagerMenuVisible,
                      setManagerDefaultPage,
                      managerDefaultProjectsTable,
                      setManagerDefaultProjectsTable
                    )}
                  </List.Section>

                  <Divider style={styles.divider} />

                  <List.Section>
                    {renderRoleSection(
                      'user',
                      'User',
                      userPageAccess,
                      userDefaultPage,
                      userMenuVisible,
                      setUserMenuVisible,
                      setUserDefaultPage,
                      userDefaultProjectsTable,
                      setUserDefaultProjectsTable
                    )}
                  </List.Section>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Button
                    mode="contained"
                    onPress={handleSaveTeamViewSettings}
                    loading={savingTeamSettings}
                    disabled={savingTeamSettings}
                    style={styles.saveButton}
                    buttonColor={currentColors.secondary}
                  >
                    {savingTeamSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditUserModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEditUserModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.fullModalContainer, { backgroundColor: currentColors.background.bg700 }]}>
            <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 8, flex: 1 }}>
              <Card.Content style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <Title style={{ color: currentColors.text, flex: 1 }}>Edit User</Title>
                  <IconButton
                    icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
                    onPress={handleCloseEditUserModal}
                  />
                </View>

                {loadingEditUser ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                  </View>
                ) : (
                  <ScrollView style={styles.modalScrollView}>
                    <View style={{ padding: 10 }}>
                      <TextInput
                        label="Email *"
                        value={editUserEmail}
                        onChangeText={setEditUserEmail}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                      />

                      <TextInput
                        label="First Name *"
                        value={editUserFirstName}
                        onChangeText={setEditUserFirstName}
                        mode="outlined"
                        style={styles.input}
                      />

                      <TextInput
                        label="Last Name *"
                        value={editUserLastName}
                        onChangeText={setEditUserLastName}
                        mode="outlined"
                        style={styles.input}
                      />

                      <Title style={[styles.editUserLabel, { color: currentColors.text }]}>User Role *</Title>
                      <SegmentedButtons
                        value={editUserRole}
                        onValueChange={(value) => setEditUserRole(value as 'USER' | 'MANAGER' | 'ADMIN')}
                        buttons={[
                          {
                            value: 'USER',
                            label: 'Team Member',
                          },
                          {
                            value: 'MANAGER',
                            label: 'Manager',
                          },
                          {
                            value: 'ADMIN',
                            label: 'Admin',
                          },
                        ]}
                        style={styles.input}
                      />

                      <TextInput
                        label="Default Hourly Rate (Optional)"
                        value={editUserDefaultHourlyRate}
                        onChangeText={setEditUserDefaultHourlyRate}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        placeholder="e.g., 50.00"
                      />

                      <List.Item
                        title="Active"
                        description={editUserIsActive ? 'User can log in' : 'User is deactivated'}
                        right={() => <Switch value={editUserIsActive} onValueChange={setEditUserIsActive} />}
                        style={[styles.switchItem, { backgroundColor: currentColors.background.bg300 }]}
                      />

                      <Button
                        mode="contained"
                        onPress={handleUpdateEditUser}
                        loading={savingEditUser}
                        disabled={savingEditUser}
                        style={styles.button}
                      >
                        Save Changes
                      </Button>

                      <Button
                        mode="outlined"
                        onPress={handleResetUserPassword}
                        style={styles.button}
                      >
                        Reset Password
                      </Button>

                      <Button
                        mode="text"
                        onPress={handleCloseEditUserModal}
                        style={styles.button}
                      >
                        Cancel
                      </Button>
                    </View>
                  </ScrollView>
                )}
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Dialog */}
      <CustomDialog
        visible={showLogoutDialog}
        title="Logout"
        message="Are you sure you want to logout?"
        buttons={[
          {
            label: 'Cancel',
            onPress: () => setShowLogoutDialog(false),
            variant: 'outline',
          },
          {
            label: 'Logout',
            onPress: handleConfirmLogout,
            variant: 'solid',
            color: currentColors.error,
          },
        ]}
        onDismiss={() => setShowLogoutDialog(false)}
      />

      {/* Delete User Confirmation Dialog */}
      <CustomDialog
        visible={deletingUserId !== null}
        title="Delete User"
        message={`Are you sure you want to delete ${deletingUserId ? users.find(u => u.id === deletingUserId)?.firstName : ''} ${deletingUserId ? users.find(u => u.id === deletingUserId)?.lastName : ''}? This action cannot be undone.`}
        buttons={[
          {
            label: 'Cancel',
            onPress: handleDeleteCancel,
            variant: 'outline',
          },
          {
            label: 'Delete',
            onPress: handleDeleteConfirm,
            variant: 'solid',
            color: currentColors.error,
          },
        ]}
        onDismiss={handleDeleteCancel}
      />

      {/* Reset Password Dialog */}
      <CustomDialog
        visible={showResetPasswordDialog}
        title="Reset Password"
        message="Enter new password (minimum 6 characters)"
        textInput={{
          value: resetPasswordValue,
          onChangeText: setResetPasswordValue,
          placeholder: 'New password',
          secureTextEntry: true,
        }}
        buttons={[
          {
            label: 'Cancel',
            onPress: () => {
              setShowResetPasswordDialog(false);
              setResetPasswordValue('');
            },
            variant: 'outline',
          },
          {
            label: 'Reset',
            onPress: handleConfirmResetPassword,
            variant: 'solid',
          },
        ]}
        onDismiss={() => {
          setShowResetPasswordDialog(false);
          setResetPasswordValue('');
        }}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        buttons={[
          {
            label: 'OK',
            onPress: () => setShowSuccessDialog(false),
            variant: 'solid',
          },
        ]}
        onDismiss={() => setShowSuccessDialog(false)}
      />

      {/* Error Dialog */}
      <CustomDialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
        buttons={[
          {
            label: 'OK',
            onPress: () => setShowErrorDialog(false),
            variant: 'solid',
            color: currentColors.error,
          },
        ]}
        onDismiss={() => setShowErrorDialog(false)}
      />

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    marginBottom: 10,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    marginBottom: 5,
  },
  email: {
    marginBottom: 5,
  },
  role: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 10,
  },
  logoutContainer: {
    padding: 20,
  },
  logoutButton: {
    paddingVertical: 5,
  },
  paletteContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  paletteOption: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    minWidth: 120,
    alignItems: 'center',
    position: 'relative',
  },
  paletteContent: {
    alignItems: 'center',
    width: '100%',
  },
  paletteEditButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  addPaletteOption: {
    justifyContent: 'center',
    minHeight: 100,
  },
  paletteOptionSelected: {
    borderColor: '#007AFF',
  },
  paletteColors: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
  },
  paletteName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  input: {
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    minWidth: 100,
  },
  fullModalContainer: {
    width: '95%',
    maxWidth: 900,
    height: '90%',
    borderRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  modalScrollView: {
    flex: 1,
  },
  modalFooter: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  searchbar: {
    marginBottom: 10,
    elevation: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  inactiveUser: {
    opacity: 0.6,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleChip: {
    height: 28,
  },
  emptyCard: {
    margin: 20,
  },
  emptyText: {
    textAlign: 'center',
  },
  inviteButton: {
    paddingVertical: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  modalWarning: {
    fontSize: 12,
    marginBottom: 20,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 5,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
  editUserLabel: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  switchItem: {
    marginBottom: 15,
    borderRadius: 8,
  },
});

export default ProfileScreen;
