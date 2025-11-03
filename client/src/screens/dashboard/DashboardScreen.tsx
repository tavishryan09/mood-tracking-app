import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { projectsAPI, timeEntriesAPI, eventsAPI } from '../../services/api';

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeProjects: 0,
    todayHours: 0,
    upcomingEvents: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load dashboard statistics with timeout
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const apiCalls = Promise.all([
        projectsAPI.getAll(),
        timeEntriesAPI.getAll({
          startDate: new Date().toISOString().split('T')[0],
        }),
        eventsAPI.getAll({
          startDate: new Date().toISOString(),
        }),
      ]);

      const [projectsRes, timeRes, eventsRes] = await Promise.race([
        apiCalls,
        timeout,
      ]) as any;

      const activeProjects = projectsRes.data.filter(
        (p: any) => p.status === 'ACTIVE'
      ).length;

      const todayMinutes = timeRes.data.reduce(
        (sum: number, entry: any) => sum + (entry.durationMinutes || 0),
        0
      );

      setStats({
        activeProjects,
        todayHours: Math.round((todayMinutes / 60) * 10) / 10,
        upcomingEvents: eventsRes.data.length,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Set default stats on error so the UI still loads
      setStats({
        activeProjects: 0,
        todayHours: 0,
        upcomingEvents: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Title style={styles.greeting}>
          Welcome back, {user?.firstName}!
        </Title>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title>{stats.activeProjects}</Title>
            <Paragraph>Active Projects</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Title>{stats.todayHours}h</Title>
            <Paragraph>Today's Hours</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Title>{stats.upcomingEvents}</Title>
            <Paragraph>Upcoming Events</Paragraph>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.actionCard}>
        <Card.Content>
          <Title>Quick Actions</Title>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => navigation.navigate('Time')}>Start Timer</Button>
          <Button onPress={() => navigation.navigate('Calendar')}>View Calendar</Button>
        </Card.Actions>
      </Card>
    </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#6200ee',
  },
  greeting: {
    color: 'white',
    fontSize: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    flexWrap: 'wrap',
  },
  statCard: {
    width: '30%',
    minWidth: 100,
    marginBottom: 10,
  },
  actionCard: {
    margin: 15,
    marginBottom: 30,
  },
});

export default DashboardScreen;
