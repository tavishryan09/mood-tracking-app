import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Title,
  SegmentedButtons,
  ActivityIndicator,
  Switch,
  List,
} from 'react-native-paper';
import { userManagementAPI } from '../../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  isActive: boolean;
  defaultHourlyRate?: number;
}

const EditUserScreen = ({ route, navigation }: any) => {
  const { userId } = route.params;
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'USER' | 'MANAGER' | 'ADMIN'>('USER');
  const [isActive, setIsActive] = useState(true);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await userManagementAPI.getAllUsers();
      const foundUser = response.data.find((u: User) => u.id === userId);

      if (foundUser) {
        setUser(foundUser);
        setFirstName(foundUser.firstName);
        setLastName(foundUser.lastName);
        setRole(foundUser.role);
        setIsActive(foundUser.isActive);
        setDefaultHourlyRate(foundUser.defaultHourlyRate?.toString() || '');
      } else {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!firstName || !lastName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        firstName,
        lastName,
        role,
        isActive,
      };

      if (defaultHourlyRate) {
        data.defaultHourlyRate = parseFloat(defaultHourlyRate);
      }

      await userManagementAPI.updateUser(userId, data);
      Alert.alert('Success', 'User updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = () => {
    Alert.prompt(
      'Reset Password',
      'Enter new password (min 6 characters)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async (newPassword) => {
            if (!newPassword || newPassword.length < 6) {
              Alert.alert('Error', 'Password must be at least 6 characters long');
              return;
            }

            try {
              await userManagementAPI.resetPassword(userId, newPassword);
              Alert.alert('Success', 'Password reset successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to reset password');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>Edit User</Title>

        <TextInput
          label="Email"
          value={user?.email || ''}
          mode="outlined"
          disabled
          style={styles.input}
          left={<TextInput.Icon icon="email" />}
        />

        <TextInput
          label="First Name *"
          value={firstName}
          onChangeText={setFirstName}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Last Name *"
          value={lastName}
          onChangeText={setLastName}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />

        <Title style={styles.label}>User Role *</Title>
        <SegmentedButtons
          value={role}
          onValueChange={(value) => setRole(value as 'USER' | 'MANAGER' | 'ADMIN')}
          buttons={[
            {
              value: 'USER',
              label: 'Team Member',
              icon: 'account',
            },
            {
              value: 'MANAGER',
              label: 'Manager',
              icon: 'account-tie',
            },
            {
              value: 'ADMIN',
              label: 'Admin',
              icon: 'shield-account',
            },
          ]}
          style={styles.input}
        />

        <TextInput
          label="Default Hourly Rate (Optional)"
          value={defaultHourlyRate}
          onChangeText={setDefaultHourlyRate}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          left={<TextInput.Icon icon="currency-usd" />}
          placeholder="e.g., 50.00"
        />

        <List.Item
          title="Active"
          description={isActive ? 'User can log in' : 'User is deactivated'}
          left={(props) => <List.Icon {...props} icon={isActive ? 'account-check' : 'account-off'} />}
          right={() => <Switch value={isActive} onValueChange={setIsActive} />}
          style={styles.switchItem}
        />

        <Button
          mode="contained"
          onPress={handleUpdateUser}
          loading={saving}
          disabled={saving}
          style={styles.button}
        >
          Save Changes
        </Button>

        <Button
          mode="outlined"
          onPress={handleResetPassword}
          style={styles.button}
          icon="lock-reset"
        >
          Reset Password
        </Button>

        <Button mode="text" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  input: {
    marginBottom: 15,
  },
  switchItem: {
    backgroundColor: 'white',
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
});

export default EditUserScreen;
