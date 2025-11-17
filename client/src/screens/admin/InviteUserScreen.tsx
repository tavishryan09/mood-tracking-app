import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Title, SegmentedButtons } from 'react-native-paper';
import { userManagementAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';
import { InviteUserScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import { validateAndSanitize, ValidationPatterns } from '../../utils/sanitize';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../../utils/apiWithTimeout';

const InviteUserScreen = React.memo(({ navigation }: InviteUserScreenProps) => {
  const { currentColors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'USER' | 'MANAGER' | 'ADMIN'>('USER');
  const [defaultHourlyRate, setDefaultHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleInviteUser = useCallback(async () => {
    // Validate and sanitize all fields
    const { isValid, errors, sanitizedData } = validateAndSanitize(
      { email, password, firstName, lastName, defaultHourlyRate },
      {
        email: { required: true, pattern: ValidationPatterns.email, maxLength: 254 },
        password: { required: true, minLength: 6, maxLength: 128 },
        firstName: { required: true, minLength: 2, maxLength: 50 },
        lastName: { required: true, minLength: 2, maxLength: 50 },
        defaultHourlyRate: { pattern: /^\d+(\.\d{1,2})?$/ }, // Optional numeric with 2 decimals
      }
    );

    if (!isValid) {
      const errorMsg = Object.values(errors)[0] || 'Please check your input';
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
      logger.warn('User invite validation failed:', errors, 'InviteUserScreen');
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        email: sanitizedData.email,
        password: sanitizedData.password,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        role,
      };

      if (sanitizedData.defaultHourlyRate) {
        data.defaultHourlyRate = parseFloat(sanitizedData.defaultHourlyRate);
      }

      await apiWithTimeout(userManagementAPI.inviteUser(data), TIMEOUT_DURATIONS.STANDARD);
      logger.log('User invited successfully', { email: sanitizedData.email, role }, 'InviteUserScreen');
      setShowSuccessDialog(true);
    } catch (error: any) {
      logger.error('User invite error:', error, 'InviteUserScreen');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : error.response?.data?.error || 'Failed to invite user';
      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  }, [email, password, firstName, lastName, role, defaultHourlyRate]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: currentColors.text }]}>Invite New User</Title>

        <TextInput
          label="Email *"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
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

        <TextInput
          label="Default Password *"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
          left={<TextInput.Icon icon="lock" />}
          placeholder="User can change this later"
        />

        <Title style={[styles.label, { color: currentColors.text }]}>User Role *</Title>
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

        <Button
          mode="contained"
          onPress={handleInviteUser}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Invite User
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
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
        message="User invited successfully"
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setShowSuccessDialog(false);
              navigation.goBack();
            },
            style: 'default',
          },
        ]}
        onDismiss={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
      />
    </ScrollView>
  );
});

InviteUserScreen.displayName = 'InviteUserScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
});

export default InviteUserScreen;
