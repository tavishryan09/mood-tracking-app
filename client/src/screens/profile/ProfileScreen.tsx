import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, Text } from 'react-native';
import { List, Avatar, Title, Paragraph, Button, Divider, Switch, TextInput, Card } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { PencilEdit02Icon, AddCircleIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colorPalettes, ColorPaletteName } from '../../theme/colorPalettes';
import { settingsAPI } from '../../services/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }: any) => {
  const { user, logout, refreshUser } = useAuth();
  const { selectedPalette, setSelectedPalette, currentColors, customPalettes } = useTheme();
  const [showWeekendsDefault, setShowWeekendsDefault] = useState(false);
  const [defaultProjectsTableView, setDefaultProjectsTableView] = useState(false);

  // Modal states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

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

  useEffect(() => {
    loadPreferences();
    refreshUser(); // Refresh user data to get latest role
  }, []);

  const loadPreferences = async () => {
    try {
      // Load calendar weekend preference from database
      try {
        const weekendResponse = await settingsAPI.user.get('calendar_show_weekends_default');
        if (weekendResponse.data?.value !== undefined) {
          setShowWeekendsDefault(weekendResponse.data.value === true);
        }
      } catch (error: any) {
        // 404 means no setting exists, use default (false)
        if (error.response?.status !== 404) {
          throw error;
        }
      }

      // Load projects table view preference from database
      try {
        const tableViewResponse = await settingsAPI.user.get('projects_default_table_view');
        if (tableViewResponse.data?.value !== undefined) {
          setDefaultProjectsTableView(tableViewResponse.data.value === true);
        }
      } catch (error: any) {
        // 404 means no setting exists, use default (false)
        if (error.response?.status !== 404) {
          throw error;
        }
      }
    } catch (error) {
      console.error('[ProfileScreen] Error loading preferences:', error);
    }
  };

  const handleWeekendToggle = async () => {
    const newValue = !showWeekendsDefault;
    setShowWeekendsDefault(newValue);
    try {
      await settingsAPI.user.set('calendar_show_weekends_default', newValue);
      console.log('[ProfileScreen] Saved calendar weekend preference to database');
    } catch (error) {
      console.error('[ProfileScreen] Error saving preference:', error);
      Alert.alert('Error', 'Failed to save preference');
    }
  };

  const handleProjectsTableViewToggle = async () => {
    const newValue = !defaultProjectsTableView;
    setDefaultProjectsTableView(newValue);
    try {
      await settingsAPI.user.set('projects_default_table_view', newValue);
      console.log('[ProfileScreen] Saved projects table view preference to database');
    } catch (error) {
      console.error('[ProfileScreen] Error saving preference:', error);
      Alert.alert('Error', 'Failed to save preference');
    }
  };

  const handleColorPaletteChange = async (paletteId: string) => {
    try {
      await setSelectedPalette(paletteId);
      const palette = colorPalettes[paletteId as ColorPaletteName] || customPalettes[paletteId];
      Alert.alert('Success', `Color palette changed to ${palette?.name || 'Custom'}`);
    } catch (error) {
      console.error('Error changing color palette:', error);
      Alert.alert('Error', 'Failed to change color palette');
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
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
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
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
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
      Alert.alert('Success', 'Password changed successfully');
    } catch (error: any) {
      console.error('Change password error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
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
      Alert.alert('Success', 'Notification preferences saved');
    } catch (error) {
      console.error('Save notifications error:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={[styles.header, { backgroundColor: currentColors.background.bg300 }]}>
        <Avatar.Text
          size={80}
          label={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
          style={[styles.avatar, { backgroundColor: currentColors.primary }]}
        />
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
        <List.Subheader>Calendar Preferences</List.Subheader>
        <List.Item
          title="Show Weekends in Week View"
          description="Default setting for displaying weekends in calendar week view"
          right={() => (
            <Switch
              value={showWeekendsDefault}
              onValueChange={handleWeekendToggle}
            />
          )}
        />
      </List.Section>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Subheader>Projects Preferences</List.Subheader>
        <List.Item
          title="Default to Table View"
          description="Open projects in table view by default"
          right={() => (
            <Switch
              value={defaultProjectsTableView}
              onValueChange={handleProjectsTableViewToggle}
            />
          )}
        />
      </List.Section>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <View style={styles.paletteContainer}>
          {/* Predefined palettes */}
          {(Object.keys(colorPalettes) as ColorPaletteName[]).map((paletteKey) => {
            const palette = colorPalettes[paletteKey];
            const isSelected = selectedPalette === palette.id;
            return (
              <View
                key={palette.id}
                style={[
                  styles.paletteOption,
                  {
                    backgroundColor: currentColors.white,
                    borderColor: isSelected ? currentColors.primary : currentColors.borderLight,
                  },
                  isSelected && {
                    backgroundColor: `${currentColors.primary}1A`,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.paletteContent}
                  onPress={() => handleColorPaletteChange(palette.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.paletteColors}>
                    <View style={[styles.colorSwatch, { backgroundColor: palette.primary, borderColor: currentColors.borderLight }]} />
                    <View style={[styles.colorSwatch, { backgroundColor: palette.secondary, borderColor: currentColors.borderLight }]} />
                    <View style={[styles.colorSwatch, { backgroundColor: palette.background.bg700, borderColor: currentColors.borderLight }]} />
                  </View>
                  <Paragraph style={styles.paletteName}>{palette.name}</Paragraph>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.paletteEditButton}
                  onPress={() => navigation.navigate('ColorPaletteEditor', { paletteId: palette.id })}
                  activeOpacity={0.7}
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} size={16} color={currentColors.icon} />
                </TouchableOpacity>
              </View>
            );
          })}
          {/* Custom palettes */}
          {Object.entries(customPalettes).map(([paletteId, palette]) => {
            const isSelected = selectedPalette === paletteId;
            return (
              <View
                key={paletteId}
                style={[
                  styles.paletteOption,
                  {
                    backgroundColor: currentColors.white,
                    borderColor: isSelected ? currentColors.primary : currentColors.borderLight,
                  },
                  isSelected && {
                    backgroundColor: `${currentColors.primary}1A`,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.paletteContent}
                  onPress={() => handleColorPaletteChange(paletteId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.paletteColors}>
                    <View style={[styles.colorSwatch, { backgroundColor: palette.primary, borderColor: currentColors.borderLight }]} />
                    <View style={[styles.colorSwatch, { backgroundColor: palette.secondary, borderColor: currentColors.borderLight }]} />
                    <View style={[styles.colorSwatch, { backgroundColor: palette.background.bg700, borderColor: currentColors.borderLight }]} />
                  </View>
                  <Paragraph style={styles.paletteName}>{palette.name}</Paragraph>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.paletteEditButton}
                  onPress={() => navigation.navigate('ColorPaletteEditor', { paletteId })}
                  activeOpacity={0.7}
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} size={16} color={currentColors.icon} />
                </TouchableOpacity>
              </View>
            );
          })}
          {/* Add New Palette Option */}
          <TouchableOpacity
            style={[
              styles.paletteOption,
              styles.addPaletteOption,
              {
                backgroundColor: currentColors.white,
                borderColor: currentColors.borderLight,
                borderStyle: 'dashed',
              },
            ]}
            onPress={() => navigation.navigate('ColorPaletteEditor', { createNew: true })}
            activeOpacity={0.7}
          >
            <HugeiconsIcon icon={AddCircleIcon} size={32} color={currentColors.primary} />
            <Paragraph style={[styles.paletteName, { color: currentColors.primary }]}>Add New</Paragraph>
          </TouchableOpacity>
        </View>
        <List.Item
          title="Planning Page Colors"
          description="Customize colors for the planning view"
          right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
          onPress={() => navigation.navigate('PlanningColors')}
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
              onPress={() => navigation.navigate('ManageUsers')}
            />
            <List.Item
              title="Team View Settings"
              description="Configure page access and defaults by role"
              right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
              onPress={() => navigation.navigate('TeamViewSettings')}
            />
          </List.Section>
          <Divider style={styles.divider} />
        </>
      )}

      <List.Section>
        <List.Subheader>Reports</List.Subheader>
        <List.Item
          title="Export Time Report"
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // Export time report
          }}
        />
        <List.Item
          title="Export Project Summary"
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // Export project summary
          }}
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
  avatar: {
    marginBottom: 10,
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
});

export default ProfileScreen;
