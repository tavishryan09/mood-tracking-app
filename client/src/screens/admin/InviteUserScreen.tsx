import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Title, SegmentedButtons } from 'react-native-paper';
import { userManagementAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const InviteUserScreen = ({ navigation }: any) => {
  const { currentColors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'USER' | 'MANAGER' | 'ADMIN'>('USER');
  const [defaultHourlyRate, setDefaultHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInviteUser = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        email,
        password,
        firstName,
        lastName,
        role,
      };

      if (defaultHourlyRate) {
        data.defaultHourlyRate = parseFloat(defaultHourlyRate);
      }

      await userManagementAPI.inviteUser(data);
      Alert.alert('Success', 'User invited successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

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
    </ScrollView>
  );
};

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
