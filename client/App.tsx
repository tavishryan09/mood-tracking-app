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
import * as serviceWorkerRegistration from './src/utils/serviceWorkerRegistration';
import { queryClient } from './src/config/queryClient';

// Inner component that uses the theme context
const ThemedApp = () => {
  const { currentColors } = useTheme();
  const { getColorForElement } = useCustomColorTheme();
  const theme = createThemedIOSTheme(currentColors);

  // Get the status bar background color from element mapping
  const statusBarColor = getColorForElement('global', 'statusBarBackground');

  // Set status bar color on mount and when theme changes
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(statusBarColor);
      StatusBar.setBarStyle('light-content');
    }
  }, [statusBarColor]);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <View style={{ flex: 1, height: '100%', width: '100%', position: 'relative' }}>
          <OfflineIndicator />
          <PlanningColorsProvider>
            <AppNavigator />
            {Platform.OS === 'ios' && <ExpoStatusBar style="light" backgroundColor={statusBarColor} />}
            {Platform.OS === 'android' && <ExpoStatusBar style="light" />}
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

        /* Force Josefin Sans with !important to override React Native Web inline styles */
        * {
          font-family: 'Josefin Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        body, body *, div, span, p, h1, h2, h3, h4, h5, h6, button, input, textarea, select {
          font-family: 'Josefin Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        /* Target React Native Web text elements specifically */
        [dir="auto"] {
          font-family: 'Josefin Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        /* Override for Juana font - must come after Josefin Sans rules */
        .juana-font,
        .juana-font * {
          font-family: 'Juana', 'Josefin Sans', sans-serif !important;
        }
      `;
      document.head.appendChild(style);

      // TEMPORARILY UNREGISTER service worker for development
      // This prevents aggressive caching during development
      serviceWorkerRegistration.unregister();
      console.log('[PWA] Service Worker UNREGISTERED for development');

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
    <SafeAreaProvider style={{ flex: 1, height: '100%', width: '100%' }}>
      <AuthProvider>
        <ThemeProvider>
          <CustomColorThemeProvider>
            <ThemedApp />
          </CustomColorThemeProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
