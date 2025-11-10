import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';

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
  const { currentColors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'USER' | 'MANAGER' | 'ADMIN'>('USER');
  const [isActive, setIsActive] = useState(true);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states for error messages
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dialog states for success messages
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successAction, setSuccessAction] = useState<(() => void) | null>(null);

  // Dialog states for password reset
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [showResetPasswordErrorDialog, setShowResetPasswordErrorDialog] = useState(false);

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
        setErrorMessage('User not found');
        setShowErrorDialog(true);
        setSuccessAction(() => () => navigation.goBack());
      }
    } catch (error: any) {
      console.error('Error loading user:', error);
      setErrorMessage('Failed to load user');
      setShowErrorDialog(true);
      setSuccessAction(() => () => navigation.goBack());
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!firstName || !lastName) {
      setErrorMessage('Please fill in all required fields');
      setShowErrorDialog(true);
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
      setSuccessMessage('User updated successfully');
      setShowSuccessDialog(true);
      setSuccessAction(() => () => navigation.goBack());
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to update user');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = () => {
    setNewPassword('');
    setShowResetPasswordDialog(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!newPassword || newPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters long');
      setShowResetPasswordErrorDialog(true);
      return;
    }

    setShowResetPasswordDialog(false);

    try {
      await userManagementAPI.resetPassword(userId, newPassword);
      setSuccessMessage('Password reset successfully');
      setShowSuccessDialog(true);
      setNewPassword('');
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to reset password');
      setShowErrorDialog(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: currentColors.background.bg700 }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: currentColors.text }]}>Edit User</Title>

        <TextInput
          label="Email"
          value={user?.email || ''}
          mode="outlined"
          disabled
          style={styles.input}
        />

        <TextInput
          label="First Name *"
          value={firstName}
          onChangeText={setFirstName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Last Name *"
          value={lastName}
          onChangeText={setLastName}
          mode="outlined"
          style={styles.input}
        />

        <Title style={[styles.label, { color: currentColors.text }]}>User Role *</Title>
        <SegmentedButtons
          value={role}
          onValueChange={(value) => setRole(value as 'USER' | 'MANAGER' | 'ADMIN')}
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
          value={defaultHourlyRate}
          onChangeText={setDefaultHourlyRate}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="e.g., 50.00"
        />

        <List.Item
          title="Active"
          description={isActive ? 'User can log in' : 'User is deactivated'}
          right={() => <Switch value={isActive} onValueChange={setIsActive} />}
          style={[styles.switchItem, { backgroundColor: currentColors.background.bg300 }]}
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
        >
          Reset Password
        </Button>

        <Button mode="text" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
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
            onPress: () => {
              setShowErrorDialog(false);
              if (successAction) {
                successAction();
                setSuccessAction(null);
              }
            },
            style: 'default',
          },
        ]}
        onDismiss={() => {
          setShowErrorDialog(false);
          if (successAction) {
            successAction();
            setSuccessAction(null);
          }
        }}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setShowSuccessDialog(false);
              if (successAction) {
                successAction();
                setSuccessAction(null);
              }
            },
            style: 'default',
          },
        ]}
        onDismiss={() => {
          setShowSuccessDialog(false);
          if (successAction) {
            successAction();
            setSuccessAction(null);
          }
        }}
      />

      {/* Reset Password Dialog */}
      <CustomDialog
        visible={showResetPasswordDialog}
        title="Reset Password"
        message="Enter new password (min 6 characters)"
        textInput={{
          value: newPassword,
          onChangeText: setNewPassword,
          placeholder: 'New password',
          secureTextEntry: true,
        }}
        buttons={[
          {
            text: 'Cancel',
            onPress: () => {
              setShowResetPasswordDialog(false);
              setNewPassword('');
            },
            style: 'cancel',
          },
          {
            text: 'Reset',
            onPress: handleResetPasswordConfirm,
            style: 'default',
          },
        ]}
        onDismiss={() => {
          setShowResetPasswordDialog(false);
          setNewPassword('');
        }}
      />

      {/* Reset Password Error Dialog */}
      <CustomDialog
        visible={showResetPasswordErrorDialog}
        title="Error"
        message={resetPasswordError}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setShowResetPasswordErrorDialog(false);
              setShowResetPasswordDialog(true);
            },
            style: 'default',
          },
        ]}
        onDismiss={() => {
          setShowResetPasswordErrorDialog(false);
          setShowResetPasswordDialog(true);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
});

export default EditUserScreen;
