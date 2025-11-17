/**
 * LoginScreen - Best Practices Example
 *
 * This is an example of how to update existing screens with:
 * - Typed navigation props
 * - Logger instead of console.log
 * - Input sanitization
 * - Typed API responses
 * - Error handling with ErrorBoundary
 *
 * Compare this with the original LoginScreen.tsx to see the improvements
 */

import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { TextInput, Button, Title, Text, ActivityIndicator } from 'react-native-paper';
import { LoginScreenProps } from '../../types/navigation';
import { sanitizeEmail, validateAndSanitize, ValidationPatterns } from '../../utils/sanitize';
import { logger } from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ErrorBoundary from '../../components/ErrorBoundary';

// Wrap the screen in ErrorBoundary for better error handling
const LoginScreenContent = ({ navigation, route }: LoginScreenProps) => {
  const { currentColors } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});
    setApiError('');

    // Validate and sanitize input
    const { isValid, errors: validationErrors, sanitizedData } = validateAndSanitize(
      { email, password },
      {
        email: {
          required: true,
          pattern: ValidationPatterns.email,
          message: 'Please enter a valid email address',
        },
        password: {
          required: true,
          minLength: 6,
          message: 'Password must be at least 6 characters',
        },
      }
    );

    if (!isValid) {
      setErrors(validationErrors);
      logger.warn('Login validation failed', validationErrors, 'LoginScreen');
      return;
    }

    setLoading(true);

    try {
      // Use sanitized data for API call
      logger.log('Attempting login', { email: sanitizedData.email }, 'LoginScreen');

      await login(sanitizedData.email, sanitizedData.password);

      logger.log('Login successful', { email: sanitizedData.email }, 'LoginScreen');

      // Navigation is fully typed - autocomplete works!
      // If you try to navigate to a non-existent screen, TypeScript will error
      // navigation.navigate('NonExistentScreen'); // TypeScript error!

    } catch (error: any) {
      logger.error('Login failed', error, 'LoginScreen');

      // User-friendly error message
      const errorMessage = error.message || 'Login failed. Please try again.';
      setApiError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Clear error when user starts typing
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: currentColors.text }]}>Welcome Back</Title>

        {apiError ? (
          <View style={[styles.errorContainer, { backgroundColor: currentColors.error + '20' }]}>
            <Text style={{ color: currentColors.error }}>{apiError}</Text>
          </View>
        ) : null}

        <TextInput
          label="Email"
          value={email}
          onChangeText={handleEmailChange}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={!!errors.email}
          disabled={loading}
          style={styles.input}
          // Accessibility
          accessibilityLabel="Email input"
          accessibilityHint="Enter your email address"
        />
        {errors.email && (
          <Text style={[styles.errorText, { color: currentColors.error }]}>{errors.email}</Text>
        )}

        <TextInput
          label="Password"
          value={password}
          onChangeText={handlePasswordChange}
          mode="outlined"
          secureTextEntry
          autoComplete="password"
          error={!!errors.password}
          disabled={loading}
          style={styles.input}
          // Accessibility
          accessibilityLabel="Password input"
          accessibilityHint="Enter your password"
        />
        {errors.password && (
          <Text style={[styles.errorText, { color: currentColors.error }]}>{errors.password}</Text>
        )}

        <Button
          mode="contained"
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          style={styles.button}
          buttonColor={currentColors.primary}
          // Accessibility
          accessibilityLabel="Login button"
          accessibilityHint="Double tap to log in"
          accessibilityRole="button"
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        {Platform.OS === 'web' && (
          <Button
            mode="text"
            onPress={() => {
              logger.log('Microsoft OAuth initiated', null, 'LoginScreen');
              // OAuth flow...
            }}
            disabled={loading}
            style={styles.oauthButton}
          >
            Sign in with Microsoft
          </Button>
        )}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={currentColors.primary} />
        </View>
      )}
    </View>
  );
};

// Export wrapped in ErrorBoundary
const LoginScreen = (props: LoginScreenProps) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Login Error</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <Button mode="contained" onPress={reset}>
            Try Again
          </Button>
        </View>
      )}
    >
      <LoginScreenContent {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: 'Josefin Sans',
  },
  input: {
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 12,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  button: {
    marginTop: 20,
    paddingVertical: 6,
  },
  oauthButton: {
    marginTop: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    marginBottom: 20,
  },
});

export default LoginScreen;
