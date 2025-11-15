import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Title, Text, HelperText } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ViewIcon, ViewOffIcon, UserIcon, LockPasswordIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const { currentColors } = useTheme();

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogButtons, setDialogButtons] = useState<any[]>([]);

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      // Extract more specific error messages
      let message = 'Login failed. Please try again.';

      if (error.message.includes('Invalid email or password') ||
          error.message.includes('Invalid credentials')) {
        message = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('User not found')) {
        message = 'No account found with this email address.';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        message = 'Network error. Please check your connection.';
      } else if (error.message) {
        message = error.message;
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setDialogTitle('Email Required');
      setDialogMessage('Please enter your email address first, then tap "Forgot Password?" again.');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
      return;
    }

    setDialogTitle('Request Password Reset');
    setDialogMessage(`A password reset request will be sent to your administrator for the email: ${email}`);
    setDialogButtons([
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Request Reset',
        onPress: () => {
          setDialogTitle('Request Sent');
          setDialogMessage('Your password reset request has been noted. Please contact your administrator to reset your password.');
          setDialogButtons([{ text: 'OK', onPress: () => {} }]);
          setDialogVisible(true);
        },
      },
    ]);
    setDialogVisible(true);
  };

  const dynamicStyles = createStyles(currentColors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[dynamicStyles.container]}
    >
      <ScrollView
        contentContainerStyle={dynamicStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={dynamicStyles.content}>
          <Title style={[dynamicStyles.title]}>Time Tracking App</Title>
          <Text style={[dynamicStyles.subtitle]}>Sign in to continue</Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={dynamicStyles.input}
            left={
              <TextInput.Icon
                icon={() => (
                  <HugeiconsIcon
                    icon={UserIcon}
                    size={24}
                    color={currentColors.icon}
                  />
                )}
              />
            }
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={dynamicStyles.input}
            left={
              <TextInput.Icon
                icon={() => (
                  <HugeiconsIcon
                    icon={LockPasswordIcon}
                    size={24}
                    color={currentColors.icon}
                  />
                )}
              />
            }
            right={
              <TextInput.Icon
                icon={() => (
                  <HugeiconsIcon
                    icon={showPassword ? ViewOffIcon : ViewIcon}
                    size={24}
                    color={currentColors.icon}
                  />
                )}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          {errorMessage ? (
            <HelperText type="error" visible={true} style={dynamicStyles.errorText}>
              {errorMessage}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={dynamicStyles.button}
          >
            Sign In
          </Button>

          <Button
            mode="text"
            onPress={handleForgotPassword}
            disabled={loading}
            style={dynamicStyles.forgotButton}
          >
            Forgot Password?
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
};

const createStyles = (currentColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: currentColors.background.bg500,
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
    color: currentColors.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: currentColors.textSecondary,
  },
  input: {
    marginBottom: 15,
  },
  errorText: {
    marginTop: 5,
    marginBottom: 5,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
  forgotButton: {
    marginTop: 10,
  },
});

export default LoginScreen;
