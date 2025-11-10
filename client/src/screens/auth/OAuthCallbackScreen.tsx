import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const OAuthCallbackScreen = ({ navigation }: any) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const { loginWithToken } = useAuth();
  const { currentColors } = useTheme();

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      if (Platform.OS !== 'web') {
        setStatus('error');
        setErrorMessage('OAuth callback only supported on web');
        return;
      }

      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const error = params.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(
          error === 'authentication_failed'
            ? 'Microsoft authentication failed. Please try again.'
            : 'An error occurred during authentication.'
        );
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        return;
      }

      if (!token) {
        setStatus('error');
        setErrorMessage('No authentication token received.');
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        return;
      }

      // Store auth token and fetch user profile
      await loginWithToken(token);
      setStatus('success');

      // Clear URL parameters and redirect to main app
      window.history.replaceState({}, '', '/');

      // The AuthContext will handle navigation automatically
      // when it detects the token
    } catch (error: any) {
      console.error('[OAuth Callback] Error:', error);
      setStatus('error');
      setErrorMessage('Failed to complete authentication. Please try again.');
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    }
  };

  const dynamicStyles = createStyles(currentColors);

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={currentColors.primary} />
            <Text style={dynamicStyles.message}>Completing sign in...</Text>
          </>
        )}
        {status === 'success' && (
          <Text style={dynamicStyles.message}>Sign in successful! Redirecting...</Text>
        )}
        {status === 'error' && (
          <>
            <Text style={dynamicStyles.errorMessage}>{errorMessage}</Text>
            <Text style={dynamicStyles.subMessage}>Redirecting to login...</Text>
          </>
        )}
      </View>
    </View>
  );
};

const createStyles = (currentColors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentColors.background.bg500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      alignItems: 'center',
      padding: 20,
    },
    message: {
      marginTop: 20,
      fontSize: 16,
      color: currentColors.text,
      textAlign: 'center',
    },
    errorMessage: {
      fontSize: 16,
      color: currentColors.error || '#DC3545',
      textAlign: 'center',
      marginBottom: 10,
    },
    subMessage: {
      fontSize: 14,
      color: currentColors.textSecondary,
      textAlign: 'center',
    },
  });

export default OAuthCallbackScreen;
