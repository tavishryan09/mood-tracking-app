import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Chip, FAB, ActivityIndicator, Searchbar, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserGroupIcon, TaskDaily01Icon, GridTableIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { projectsAPI, settingsAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const ProjectsScreen = () => {
  const { currentColors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query to reduce re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use React Query to fetch projects with automatic caching
  const { data: projects = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsAPI.getAll();
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  // Check default view when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkView = async () => {
        try {
          if (!user || !user.role) {
            return;
          }

          // Try to load user personal preference first
          try {
            const userPrefResponse = await settingsAPI.user.get('projects_default_table_view');
            if (userPrefResponse.data?.value !== undefined) {

              if (userPrefResponse.data.value === true) {
                (navigation as any).navigate('ProjectTableView');
              }
              return;
            }
          } catch (error: any) {
            if (error.response?.status !== 404) {
              throw error;
            }
          }

          // Fall back to role-based Team View Setting
          let defaultTableViewKey = 'team_view_user_default_projects_table';
          if (user.role === 'ADMIN') {
            defaultTableViewKey = 'team_view_admin_default_projects_table';
          } else if (user.role === 'MANAGER') {
            defaultTableViewKey = 'team_view_manager_default_projects_table';
          }

          try {
            const roleDefaultResponse = await settingsAPI.user.get(defaultTableViewKey);
            if (roleDefaultResponse.data?.value !== undefined) {

              if (roleDefaultResponse.data.value === true) {
                (navigation as any).navigate('ProjectTableView');
              }
            }
          } catch (error: any) {
            if (error.response?.status !== 404) {
              throw error;
            }

          }
        } catch (error) {
          console.error('[ProjectsScreen] Error checking default view:', error);
        }
      };

      // Refetch projects when screen comes into focus
      refetch();
      checkView();
    }, [user, navigation, refetch])
  );

  // Memoize filtered projects - only recompute when debounced search query or projects change
  const filteredProjects = useMemo(() => {
    if (!debouncedSearchQuery) {
      return projects;
    }

    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        project.client?.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [debouncedSearchQuery, projects]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'ACTIVE':
        return currentColors.status.active;
      case 'ON_HOLD':
        return currentColors.status.onHold;
      case 'COMPLETED':
        return currentColors.status.completed;
      case 'ARCHIVED':
        return currentColors.status.archived;
      default:
        return currentColors.textSecondary;
    }
  }, [currentColors]);

  const renderProject = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => (navigation as any).navigate('EditProject', { projectId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={[styles.card, { backgroundColor: currentColors.background.bg500 }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={{ color: currentColors.text }}>{item.name}</Title>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={[styles.chipText, { color: currentColors.white }]}
            >
              {item.status}
            </Chip>
          </View>
          <Paragraph style={{ color: currentColors.text }}>Client: {item.client?.name || 'N/A'}</Paragraph>
          {item.description && <Paragraph style={{ color: currentColors.textSecondary }}>{item.description}</Paragraph>}
          <View style={styles.stats}>
            <Paragraph style={{ color: currentColors.textSecondary }}>Team: {item.members?.length || 0} members</Paragraph>
            <Paragraph style={{ color: currentColors.textSecondary }}>Events: {item._count?.events || 0}</Paragraph>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: currentColors.background.bg700 }]}>
        <ActivityIndicator size="large" color={currentColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <Searchbar
        placeholder="Search projects..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        icon={() => <HugeiconsIcon icon={Search01Icon} size={24} color={currentColors.icon} />}
      />

      <View style={styles.buttonsRow}>
        <Button
          mode="outlined"
          icon={() => <HugeiconsIcon icon={UserGroupIcon} size={20} color={currentColors.primary} />}
          onPress={() => (navigation as any).navigate('ClientsList')}
          style={styles.actionButton}
        >
          Manage Clients
        </Button>
        <Button
          mode="contained"
          icon={() => <HugeiconsIcon icon={GridTableIcon} size={20} color={currentColors.white} />}
          onPress={() => (navigation as any).navigate('ProjectTableView')}
          style={styles.actionButton}
          buttonColor={currentColors.secondary}
        >
          Table View
        </Button>
      </View>

      <FlatList
        data={filteredProjects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />

      <FAB
        style={[styles.fab, { backgroundColor: currentColors.primary }]}
        icon="plus"
        label="New Project"
        onPress={() => {
          (navigation as any).navigate('CreateProject');
        }}
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
  searchbar: {
    margin: 15,
    marginBottom: 5,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  list: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusChip: {
    height: 30,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default ProjectsScreen;
