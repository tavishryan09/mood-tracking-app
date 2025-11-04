import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { projectsAPI, timeEntriesAPI, eventsAPI } from '../../services/api';

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { currentColors } = useTheme();

  // Use React Query to fetch projects
  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsAPI.getAll();
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Use React Query to fetch today's time entries
  const todayDate = new Date().toISOString().split('T')[0];
  const { data: timeEntriesData, isLoading: timeLoading, refetch: refetchTime } = useQuery({
    queryKey: ['timeEntries', 'today', todayDate],
    queryFn: async () => {
      const response = await timeEntriesAPI.getAll({
        startDate: todayDate,
      });
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Use React Query to fetch upcoming events
  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async () => {
      const response = await eventsAPI.getAll({
        startDate: new Date().toISOString(),
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Memoize computed stats
  const stats = useMemo(() => {
    const activeProjects = projectsData?.filter((p: any) => p.status === 'ACTIVE').length || 0;
    const todayMinutes = timeEntriesData?.reduce(
      (sum: number, entry: any) => sum + (entry.durationMinutes || 0),
      0
    ) || 0;
    const todayHours = Math.round((todayMinutes / 60) * 10) / 10;
    const upcomingEvents = eventsData?.length || 0;

    return {
      activeProjects,
      todayHours,
      upcomingEvents,
    };
  }, [projectsData, timeEntriesData, eventsData]);

  const loading = projectsLoading || timeLoading || eventsLoading;
  const refreshing = false;

  const onRefresh = async () => {
    await Promise.all([refetchProjects(), refetchTime(), refetchEvents()]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: currentColors.background.bg700 }]}>
        <ActivityIndicator size="large" color={currentColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.header, { backgroundColor: currentColors.primary }]}>
        <Title style={[styles.greeting, { color: currentColors.white }]}>
          Welcome back, {user?.firstName}!
        </Title>
      </View>

      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, { backgroundColor: currentColors.background.bg500 }]}>
          <Card.Content>
            <Title>{stats.activeProjects}</Title>
            <Paragraph>Active Projects</Paragraph>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: currentColors.background.bg500 }]}>
          <Card.Content>
            <Title>{stats.todayHours}h</Title>
            <Paragraph>Today's Hours</Paragraph>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: currentColors.background.bg500 }]}>
          <Card.Content>
            <Title>{stats.upcomingEvents}</Title>
            <Paragraph>Upcoming Events</Paragraph>
          </Card.Content>
        </Card>
      </View>

      <Card style={[styles.actionCard, { backgroundColor: currentColors.background.bg500 }]}>
        <Card.Content>
          <Title>Quick Actions</Title>
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            buttonColor={currentColors.secondary}
            onPress={() => navigation.navigate('Time')}
          >
            Start Timer
          </Button>
          <Button
            mode="contained"
            buttonColor={currentColors.secondary}
            onPress={() => navigation.navigate('Calendar')}
          >
            View Calendar
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
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
  header: {
    padding: 20,
  },
  greeting: {
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
