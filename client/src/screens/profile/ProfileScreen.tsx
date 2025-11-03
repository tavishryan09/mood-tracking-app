import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Avatar, Title, Paragraph, Button, Divider, Switch } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';

const ProfileScreen = ({ navigation }: any) => {
  const { user, logout, refreshUser } = useAuth();
  const [showWeekendsDefault, setShowWeekendsDefault] = useState(false);
  const [defaultProjectsTableView, setDefaultProjectsTableView] = useState(false);

  useEffect(() => {
    loadPreferences();
    refreshUser(); // Refresh user data to get latest role
  }, []);

  const loadPreferences = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('calendar_show_weekends_default');
      if (savedPreference !== null) {
        setShowWeekendsDefault(savedPreference === 'true');
      }

      const projectsTableView = await AsyncStorage.getItem('@projects_default_table_view');
      if (projectsTableView !== null) {
        setDefaultProjectsTableView(projectsTableView === 'true');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleWeekendToggle = async () => {
    const newValue = !showWeekendsDefault;
    setShowWeekendsDefault(newValue);
    try {
      await AsyncStorage.setItem('calendar_show_weekends_default', newValue.toString());
    } catch (error) {
      console.error('Error saving preference:', error);
      Alert.alert('Error', 'Failed to save preference');
    }
  };

  const handleProjectsTableViewToggle = async () => {
    const newValue = !defaultProjectsTableView;
    setDefaultProjectsTableView(newValue);
    try {
      await AsyncStorage.setItem('@projects_default_table_view', newValue.toString());
    } catch (error) {
      console.error('Error saving preference:', error);
      Alert.alert('Error', 'Failed to save preference');
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
          style={styles.avatar}
        />
        <Title style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Title>
        <Paragraph style={styles.email}>{user?.email}</Paragraph>
        <Paragraph style={styles.role}>{user?.role}</Paragraph>
      </View>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Subheader>Settings</List.Subheader>
        <List.Item
          title="Edit Profile"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // Navigate to edit profile
          }}
        />
        <List.Item
          title="Notifications"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // Navigate to notifications settings
          }}
        />
        <List.Item
          title="Change Password"
          left={(props) => <List.Icon {...props} icon="lock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // Navigate to change password
          }}
        />
      </List.Section>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Subheader>Calendar Preferences</List.Subheader>
        <List.Item
          title="Show Weekends in Week View"
          description="Default setting for displaying weekends in calendar week view"
          left={(props) => <List.Icon {...props} icon="calendar-weekend" />}
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
          left={(props) => <List.Icon {...props} icon="table" />}
          right={() => (
            <Switch
              value={defaultProjectsTableView}
              onValueChange={handleProjectsTableViewToggle}
            />
          )}
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
              left={(props) => <List.Icon {...props} icon="account-multiple" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ManageUsers')}
            />
            <List.Item
              title="Manage User Rates"
              description="Set default billable rates for users"
              left={(props) => <List.Icon {...props} icon="currency-usd" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('UserRates')}
            />
            <List.Item
              title="Team View Settings"
              description="Configure page access and defaults by role"
              left={(props) => <List.Icon {...props} icon="view-dashboard-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
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
          left={(props) => <List.Icon {...props} icon="file-excel" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // Export time report
          }}
        />
        <List.Item
          title="Export Project Summary"
          left={(props) => <List.Icon {...props} icon="file-chart" />}
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
          buttonColor="#d32f2f"
        >
          Logout
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
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  avatar: {
    backgroundColor: '#6200ee',
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    marginBottom: 5,
  },
  email: {
    color: '#666',
    marginBottom: 5,
  },
  role: {
    color: '#6200ee',
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
});

export default ProfileScreen;
