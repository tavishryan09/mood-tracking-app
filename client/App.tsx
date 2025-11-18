import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CustomColorThemeProvider, useCustomColorTheme } from './src/contexts/CustomColorThemeContext';
import { PlanningColorsProvider } from './src/contexts/PlanningColorsContext';
import AppNavigator from './src/navigation/AppNavigator';
import { createThemedIOSTheme } from './src/theme/iosTheme';
import InstallPrompt from './src/components/InstallPrompt';
import OfflineIndicator from './src/components/OfflineIndicator';
import ErrorBoundary from './src/components/ErrorBoundary';
import * as serviceWorkerRegistration from './src/utils/serviceWorkerRegistration';
import { queryClient, initializePersistence } from './src/config/queryClient';
import { logger } from './src/utils/logger';

// Inner component that uses the theme context
const ThemedApp = () => {
  const { currentColors } = useTheme();
  const { getColorForElement, isInitializing } = useCustomColorTheme();
  const theme = createThemedIOSTheme(currentColors);

  // Get the status bar background color from element mapping
  const statusBarColor = getColorForElement('global', 'statusBarBackground');

  // Debug: Log the status bar color
  useEffect(() => {
    logger.log('Status bar color:', statusBarColor, 'App');
  }, [statusBarColor]);

  // Set status bar color on mount and when theme changes
  useEffect(() => {
    // Use hardcoded dark blue during initialization to prevent color flash
    const colorToUse = isInitializing ? '#141b2b' : statusBarColor;

    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(colorToUse);
      StatusBar.setBarStyle('light-content');
    }

    // Update meta theme-color tag for web/PWA
    if (Platform.OS === 'web') {
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', colorToUse);
        logger.log('Updated meta theme-color to:', { color: colorToUse, isInitializing }, 'App');
      }
    }
  }, [statusBarColor, isInitializing]);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <View style={{
          flex: 1,
          height: '100%',
          width: '100%',
          position: 'relative',
          opacity: isInitializing ? 0 : 1,
          transition: Platform.OS === 'web' ? 'opacity 0.2s ease-in-out' : undefined,
        }}>
          <OfflineIndicator />
          <PlanningColorsProvider>
            <AppNavigator />
            {Platform.OS === 'ios' && <ExpoStatusBar style="light" backgroundColor={statusBarColor} />}
            {Platform.OS === 'android' && <ExpoStatusBar style="light" backgroundColor={statusBarColor} />}
          </PlanningColorsProvider>
          <InstallPrompt />
        </View>
      </PaperProvider>
    </QueryClientProvider>
  );
};

export default function App() {
  // On web, fonts are loaded via Google Fonts link in HTML - no need to wait
  const fontsLoaded = true;

  useEffect(() => {
    // Fix scrolling on web by overriding Expo's body overflow hidden
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        html, body {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          position: fixed;
        }

        #root {
          height: 100%;
          width: 100%;
          overflow: auto;
        }

        #root > div {
          height: 100%;
          width: 100%;
        }

        /* Josefin Sans default font */
        * {
          font-family: 'Josefin Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        body, body *, div, span, p, h1, h2, h3, h4, h5, h6, button, input, textarea, select {
          font-family: 'Josefin Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Target React Native Web text elements specifically */
        [dir="auto"] {
          font-family: 'Josefin Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Override for Juana font - must come after Josefin Sans rules */
        .juana-font,
        .juana-font * {
          font-family: 'Juana', 'Josefin Sans', sans-serif !important;
        }
      `;
      document.head.appendChild(style);

      // Initialize React Query persistent cache (controlled by feature flag)
      initializePersistence();

      // TEMPORARILY UNREGISTER service worker for development
      // This prevents aggressive caching during development
      serviceWorkerRegistration.unregister();
      logger.log('Service Worker UNREGISTERED for development', null, 'PWA');

      // TODO: Re-enable for production by changing unregister() back to register()
      // serviceWorkerRegistration.register({
      //   onSuccess: (registration) => {
      //     console.log('[PWA] Service Worker registered successfully');
      //   },
      //   onUpdate: (registration) => {
      //     console.log('[PWA] New version available. Please close all tabs to update.');
      //     // You could show a notification to the user here
      //     if (window.confirm('A new version is available! Reload to update?')) {
      //       if (registration.waiting) {
      //         registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      //         window.location.reload();
      //       }
      //     }
      //   },
      // });

      // Initialize offline support (IndexedDB, event listeners)
      serviceWorkerRegistration.initOfflineSupport();

      // Initialize install prompt
      serviceWorkerRegistration.initInstallPrompt();
    }
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#dd3e7f" />
      </View>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // TODO: Send to error monitoring service
        // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
        logger.error('Error caught by boundary:', error, 'App');
      }}
    >
      <SafeAreaProvider style={{ flex: 1, height: '100%', width: '100%' }}>
        <AuthProvider>
          <ThemeProvider>
            <CustomColorThemeProvider>
              <ThemedApp />
            </CustomColorThemeProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
