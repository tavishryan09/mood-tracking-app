import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button, Title, Text } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';
import { RegisterScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import { validateAndSanitize, ValidationPatterns } from '../../utils/sanitize';

const RegisterScreen = React.memo(({ navigation }: RegisterScreenProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const { currentColors } = useTheme();

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogButtons, setDialogButtons] = useState<any[]>([]);

  // Dynamic styles based on current theme
  const dynamicStyles = {
    container: {
      backgroundColor: currentColors.background.bg500,
    },
    title: {
      color: currentColors.primary,
    },
    subtitle: {
      color: currentColors.textSecondary,
    },
  };

  const handleRegister = async () => {
    // Check password match first
    if (password !== confirmPassword) {
      setDialogTitle('Error');
      setDialogMessage('Passwords do not match');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
      logger.warn('Password mismatch', null, 'RegisterScreen');
      return;
    }

    // Validate and sanitize all fields
    const { isValid, errors, sanitizedData } = validateAndSanitize(
      { firstName, lastName, email, password },
      {
        firstName: { required: true, minLength: 2, maxLength: 50 },
        lastName: { required: true, minLength: 2, maxLength: 50 },
        email: { required: true, pattern: ValidationPatterns.email, maxLength: 254 },
        password: { required: true, minLength: 6, maxLength: 128 },
      }
    );

    if (!isValid) {
      const errorMsg = Object.values(errors)[0] || 'Please check your input';
      setDialogTitle('Error');
      setDialogMessage(errorMsg);
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
      logger.warn('Registration validation failed:', errors, 'RegisterScreen');
      return;
    }

    setLoading(true);
    try {
      await register(sanitizedData);
      logger.log('User registered successfully', { email: sanitizedData.email }, 'RegisterScreen');
    } catch (error: any) {
      logger.error('Registration error:', error, 'RegisterScreen');
      setDialogTitle('Registration Failed');
      setDialogMessage(error.message);
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, dynamicStyles.container]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Title style={[styles.title, dynamicStyles.title]}>Create Account</Title>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Sign up to get started</Text>

          <TextInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock-check" />}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Sign Up
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            Already have an account? Sign In
          </Button>
        </View>
      </ScrollView>

      <CustomDialog
        visible={dialogVisible}
        title={dialogTitle}
        message={dialogMessage}
        buttons={dialogButtons}
        onDismiss={() => setDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
});

RegisterScreen.displayName = 'RegisterScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
  linkButton: {
    marginTop: 10,
  },
});

export default RegisterScreen;
