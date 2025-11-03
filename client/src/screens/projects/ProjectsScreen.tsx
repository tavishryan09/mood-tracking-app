import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Chip, FAB, ActivityIndicator, Searchbar, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserGroupIcon, TaskDaily01Icon, GridTableIcon } from '@hugeicons/core-free-icons';
import { projectsAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProjectsScreen = () => {
  const navigation = useNavigation();
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
      checkDefaultView();
    }, [])
  );

  const checkDefaultView = async () => {
    try {
      const defaultToTableView = await AsyncStorage.getItem('@projects_default_table_view');
      if (defaultToTableView === 'true') {
        // Auto-navigate to table view if that's the default
        (navigation as any).navigate('ProjectTableView');
      }
    } catch (error) {
      console.error('[ProjectsScreen] Error checking default view:', error);
    }
  };

  useEffect(() => {
    filterProjects();
  }, [searchQuery, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // Add timeout to prevent infinite loading
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const response = await Promise.race([projectsAPI.getAll(), timeout]) as any;
      setProjects(response.data);
      setFilteredProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
      // Set empty data so UI still loads
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    if (!searchQuery) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProjects(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#4caf50';
      case 'ON_HOLD':
        return '#ff9800';
      case 'COMPLETED':
        return '#2196f3';
      case 'ARCHIVED':
        return '#9e9e9e';
      default:
        return '#666';
    }
  };

  const renderProject = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => (navigation as any).navigate('EditProject', { projectId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>{item.name}</Title>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={styles.chipText}
            >
              {item.status}
            </Chip>
          </View>
          <Paragraph>Client: {item.client?.name || 'N/A'}</Paragraph>
          {item.description && <Paragraph>{item.description}</Paragraph>}
          <View style={styles.stats}>
            <Paragraph>Team: {item.members?.length || 0} members</Paragraph>
            <Paragraph>Events: {item._count?.events || 0}</Paragraph>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search projects..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        icon={() => <HugeiconsIcon icon={TaskDaily01Icon} size={24} color="#666" />}
      />

      <View style={styles.buttonsRow}>
        <Button
          mode="outlined"
          icon={() => <HugeiconsIcon icon={UserGroupIcon} size={20} color="#6200ee" />}
          onPress={() => (navigation as any).navigate('ClientsList')}
          style={styles.actionButton}
        >
          Manage Clients
        </Button>
        <Button
          mode="contained"
          icon={() => <HugeiconsIcon icon={GridTableIcon} size={20} color="#fff" />}
          onPress={() => (navigation as any).navigate('ProjectTableView')}
          style={styles.actionButton}
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
        style={styles.fab}
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#6200ee',
  },
});

export default ProjectsScreen;
