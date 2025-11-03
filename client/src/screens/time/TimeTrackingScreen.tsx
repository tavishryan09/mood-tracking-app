import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Button, List, FAB, ActivityIndicator, Paragraph } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { StopWatchIcon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { timeEntriesAPI } from '../../services/api';

const TimeTrackingScreen = () => {
  const navigation = useNavigation();
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
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

  const loadData = async () => {
    try {
      setLoading(true);
      // Add timeout to prevent infinite loading
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const apiCalls = Promise.all([
        timeEntriesAPI.getRunningTimer(),
        timeEntriesAPI.getAll({ limit: 10 }),
      ]);

      const [runningRes, entriesRes] = await Promise.race([apiCalls, timeout]) as any;
      setRunningTimer(runningRes.data);
      setRecentEntries(entriesRes.data);
    } catch (error) {
      console.error('Error loading time data:', error);
      // Set empty data so UI still loads
      setRunningTimer(null);
      setRecentEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const stopTimer = async () => {
    if (!runningTimer) return;

    try {
      await timeEntriesAPI.stopTimer(runningTimer.id);
      Alert.alert('Success', 'Timer stopped');
      setRunningTimer(null);
      setElapsedTime(0);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to stop timer');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {runningTimer ? (
          <Card style={styles.timerCard}>
            <Card.Content>
              <Title>Timer Running</Title>
              <Paragraph>{runningTimer.project?.name || 'No Project'}</Paragraph>
              <Title style={styles.timeDisplay}>{formatTime(elapsedTime)}</Title>
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
          {recentEntries.map((entry) => (
            <List.Item
              key={entry.id}
              title={entry.project?.name || 'Unknown Project'}
              description={`${formatDuration(entry.durationMinutes)} - ${new Date(
                entry.startTime
              ).toLocaleDateString()}`}
              left={() => <HugeiconsIcon icon={StopWatchIcon} size={24} color="#666" />}
              right={() => <HugeiconsIcon icon={PencilEdit02Icon} size={20} color="#666" />}
              onPress={() => {
                (navigation as any).navigate('EditTimeEntry', { entryId: entry.id });
              }}
            />
          ))}
        </View>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon={() => <HugeiconsIcon icon={StopWatchIcon} size={24} color="#fff" />}
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
    backgroundColor: '#f5f5f5',
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
    color: '#6200ee',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default TimeTrackingScreen;
