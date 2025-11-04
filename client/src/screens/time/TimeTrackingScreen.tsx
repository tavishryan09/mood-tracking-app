import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Title, Button, List, FAB, ActivityIndicator, Paragraph } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { StopWatchIcon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { timeEntriesAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const TimeTrackingScreen = () => {
  const { currentColors } = useTheme();
  const navigation = useNavigation();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Use React Query to fetch running timer
  const { data: runningTimer, refetch: refetchTimer } = useQuery({
    queryKey: ['runningTimer'],
    queryFn: async () => {
      const response = await timeEntriesAPI.getRunningTimer();
      return response.data;
    },
    staleTime: 10 * 1000, // Consider stale after 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  // Use React Query to fetch recent entries
  const { data: recentEntries = [], isLoading: loading, refetch: refetchEntries } = useQuery({
    queryKey: ['timeEntries', 'recent'],
    queryFn: async () => {
      const response = await timeEntriesAPI.getAll({ limit: 10 });
      return response.data;
    },
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetchTimer();
      refetchEntries();
    }, [refetchTimer, refetchEntries])
  );

  useEffect(() => {
    let interval: any;
    if (runningTimer) {
      interval = setInterval(() => {
        const start = new Date(runningTimer.startTime).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        setElapsedTime(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [runningTimer]);

  const stopTimer = async () => {
    if (!runningTimer) return;

    try {
      await timeEntriesAPI.stopTimer(runningTimer.id);
      Alert.alert('Success', 'Timer stopped');
      setElapsedTime(0);
      refetchTimer();
      refetchEntries();
    } catch (error) {
      Alert.alert('Error', 'Failed to stop timer');
    }
  };

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatDuration = useCallback((minutes: number | null) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  const renderEntry = useCallback(({ item }: any) => (
    <List.Item
      key={item.id}
      title={item.project?.name || 'Unknown Project'}
      description={`${formatDuration(item.durationMinutes)} - ${new Date(
        item.startTime
      ).toLocaleDateString()}`}
      left={() => <HugeiconsIcon icon={StopWatchIcon} size={24} color={currentColors.icon} />}
      right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={20} color={currentColors.icon} />}
      onPress={() => {
        (navigation as any).navigate('EditTimeEntry', { entryId: item.id });
      }}
    />
  ), [currentColors.icon, formatDuration, navigation]);

  const ListHeader = useCallback(() => (
    <>
      {runningTimer ? (
        <Card style={styles.timerCard}>
          <Card.Content>
            <Title>Timer Running</Title>
            <Paragraph>{runningTimer.project?.name || 'No Project'}</Paragraph>
            <Title style={[styles.timeDisplay, { color: currentColors.primary }]}>{formatTime(elapsedTime)}</Title>
            <Button mode="contained" onPress={stopTimer} style={styles.stopButton}>
              Stop Timer
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.timerCard}>
          <Card.Content>
            <Title>No Timer Running</Title>
            <Paragraph>Start a new timer to track your time</Paragraph>
          </Card.Content>
        </Card>
      )}

      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Recent Time Entries</Title>
      </View>
    </>
  ), [runningTimer, currentColors.primary, elapsedTime, formatTime, stopTimer]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: currentColors.background.bg700 }]}>
        <ActivityIndicator size="large" color={currentColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <FlatList
        data={recentEntries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      <FAB
        style={[styles.fab, { backgroundColor: currentColors.primary }]}
        icon={() => <HugeiconsIcon icon={StopWatchIcon} size={24} color={currentColors.white} />}
        label="Start Timer"
        onPress={() => {
          (navigation as any).navigate('StartTimer');
        }}
        disabled={!!runningTimer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCard: {
    margin: 15,
  },
  timeDisplay: {
    fontSize: 48,
    textAlign: 'center',
    marginVertical: 20,
  },
  stopButton: {
    marginTop: 10,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default TimeTrackingScreen;
