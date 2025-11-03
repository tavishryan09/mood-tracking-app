import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Banner, Text, ActivityIndicator } from 'react-native-paper';
import { getQueuedRequestsCount } from '../utils/serviceWorkerRegistration';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Set initial online status
    setIsOnline(window.navigator.onLine);

    // Load initial queued count
    loadQueuedCount();

    const handleConnectionChange = (event: any) => {
      const online = event.detail.online;
      console.log(`[PWA] Connection changed: ${online ? 'online' : 'offline'}`);
      setIsOnline(online);
      setShowBanner(true);

      if (online) {
        setIsSyncing(true);
        // Hide banner after 3 seconds when back online
        setTimeout(() => {
          setShowBanner(false);
          setIsSyncing(false);
        }, 3000);
      }
    };

    const handleSyncSuccess = () => {
      console.log('[PWA] Sync successful');
      loadQueuedCount();
    };

    const handleOnline = () => {
      console.log('[PWA] Connection restored');
      setIsOnline(true);
      setIsSyncing(true);
      // Show "back online" message briefly
      setShowBanner(true);
      setTimeout(() => {
        setShowBanner(false);
        setIsSyncing(false);
      }, 3000);
    };

    const handleOffline = () => {
      console.log('[PWA] Connection lost');
      setIsOnline(false);
      setShowBanner(true);
      loadQueuedCount();
    };

    // Listen to custom events from serviceWorkerRegistration
    window.addEventListener('connection-change', handleConnectionChange as EventListener);
    window.addEventListener('sync-success', handleSyncSuccess);

    // Also listen to native online/offline events as backup
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update queued count periodically when offline
    const interval = setInterval(() => {
      if (!isOnline) {
        loadQueuedCount();
      }
    }, 5000);

    return () => {
      window.removeEventListener('connection-change', handleConnectionChange as EventListener);
      window.removeEventListener('sync-success', handleSyncSuccess);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  const loadQueuedCount = async () => {
    try {
      const count = await getQueuedRequestsCount();
      setQueuedCount(count);
    } catch (error) {
      console.error('[PWA] Error loading queued count:', error);
    }
  };

  // Don't show banner if online (unless briefly showing restoration message)
  if (isOnline && !showBanner) {
    return null;
  }

  const getMessage = () => {
    if (isSyncing) {
      return `Connection restored. Syncing ${queuedCount} queued ${queuedCount === 1 ? 'request' : 'requests'}...`;
    }
    if (isOnline) {
      return 'Connection restored. You are back online.';
    }
    if (queuedCount > 0) {
      return `No internet connection. ${queuedCount} ${queuedCount === 1 ? 'request' : 'requests'} queued for sync.`;
    }
    return 'No internet connection. You are working offline. Changes will sync when online.';
  };

  return (
    <Banner
      visible={showBanner || !isOnline}
      actions={
        isOnline
          ? []
          : [
              {
                label: 'Dismiss',
                onPress: () => setShowBanner(false),
              },
            ]
      }
      icon={isOnline ? 'wifi' : 'wifi-off'}
      style={[
        styles.banner,
        isOnline ? styles.onlineBanner : styles.offlineBanner,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.messageRow}>
          <Text variant="bodyMedium" style={styles.text}>
            {getMessage()}
          </Text>
          {isSyncing && (
            <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
          )}
        </View>
      </View>
    </Banner>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
  },
  offlineBanner: {
    backgroundColor: '#f44336',
  },
  onlineBanner: {
    backgroundColor: '#4caf50',
  },
  content: {
    paddingVertical: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  spinner: {
    marginLeft: 8,
  },
});

export default OfflineIndicator;
