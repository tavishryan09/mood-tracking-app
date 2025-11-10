import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Banner, Text, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { DownloadSquare02Icon } from '@hugeicons/core-free-icons';
import {
  canInstall,
  promptInstall,
  isAppInstalled,
  initInstallPrompt
} from '../utils/serviceWorkerRegistration';
import { useTheme } from '../contexts/ThemeContext';

const InstallPrompt: React.FC = () => {
  const { currentColors } = useTheme();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Only show on web platform
    if (Platform.OS !== 'web') {
      return;
    }

    // Initialize install prompt listener
    initInstallPrompt();

    // Check if app is already installed
    const installed = isAppInstalled();
    setIsInstalled(installed);

    // Check if we can show the install prompt
    const checkInstallPrompt = () => {
      const canShow = canInstall() && !installed;
      setShowPrompt(canShow);
    };

    // Check immediately and set up interval to check periodically
    checkInstallPrompt();
    const interval = setInterval(checkInstallPrompt, 1000);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage to not show again for a while
    if (typeof window !== 'undefined' && window.localStorage) {
      const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
      window.localStorage.setItem('installPromptDismissed', dismissedUntil.toString());
    }
  };

  // Don't show if not on web or already installed
  if (Platform.OS !== 'web' || isInstalled || !showPrompt) {
    return null;
  }

  // Check if user has dismissed recently
  if (typeof window !== 'undefined' && window.localStorage) {
    const dismissedUntil = window.localStorage.getItem('installPromptDismissed');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return null;
    }
  }

  return (
    <Banner
      visible={showPrompt}
      actions={[
        {
          label: 'Not now',
          onPress: handleDismiss,
        },
        {
          label: 'Install',
          onPress: handleInstall,
        },
      ]}
      icon={() => (
        <HugeiconsIcon
          icon={DownloadSquare02Icon}
          size={24}
          color={currentColors.icon}
        />
      )}
      style={[styles.banner, {
        backgroundColor: currentColors.background.bg500,
        borderBottomColor: currentColors.border
      }]}
    >
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.title}>
          Install Mood Tracker
        </Text>
        <Text variant="bodyMedium" style={[styles.description, { color: currentColors.textSecondary }]}>
          Install this app on your device for quick and easy access to track your moods. It works offline and provides a native app experience.
        </Text>
      </View>
    </Banner>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
  },
  content: {
    paddingVertical: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    // Color applied via inline style
  },
});

export default InstallPrompt;
