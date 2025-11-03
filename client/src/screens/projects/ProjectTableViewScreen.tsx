import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Text, TouchableOpacity, Alert, TextInput, FlatList } from 'react-native';
import { ActivityIndicator, FAB, IconButton } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { projectsAPI, clientsAPI } from '../../services/api';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Delete02Icon, AddCircleIcon, Edit02Icon, Tick02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

const { width } = Dimensions.get('window');
const TABLE_WIDTH = width > 1400 ? 1400 : width - 40;
const PROJECT_NUM_WIDTH = 100;
const PROJECT_NAME_WIDTH = 250;
const CLIENT_WIDTH = 200;
const COMMON_NAME_WIDTH = 200;
const HOURS_WIDTH = 100;
const ACTIONS_WIDTH = 100;

interface Project {
  id: string;
  projectNumber?: string;
  name: string;
  description?: string;
  clientId: string;
  client?: { id: string; name: string };
  budgetHours?: number;
  timeEntries?: any[];
  planningTasks?: { span: number }[];
}

interface Client {
  id: string;
  name: string;
}

const ProjectTableViewScreen = () => {
  const navigation = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ projectId: string; field: string } | null>(null);
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [isAddingNewProject, setIsAddingNewProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    projectNumber: '',
    name: '',
    clientId: '',
    description: '',
  });
  const [newProjectClientInput, setNewProjectClientInput] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('projectNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
      loadClients();
    }, [])
  );

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAll();
      console.log('[ProjectTableView] Projects loaded:', response.data.length);
      setProjects(response.data);
    } catch (error) {
      console.error('[ProjectTableView] Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      console.log('[ProjectTableView] Clients loaded:', response.data.length);
      setClients(response.data);
    } catch (error) {
      console.error('[ProjectTableView] Error loading clients:', error);
      setClients([]);
    }
  };

  const calculateTotalHours = (project: Project): number => {
    // Calculate hours based on planning tasks (each cell = 2 hours, span multiplies)
    if (!project.planningTasks || project.planningTasks.length === 0) return 0;

    return project.planningTasks.reduce((total, task) => {
      return total + (task.span * 2); // Each cell = 2 hours, span = number of cells
    }, 0);
  };

  const getProjectNumber = (project: Project, index: number): string => {
    // Use stored projectNumber if available, otherwise compute from index
    return project.projectNumber || `P-${String(index + 1).padStart(4, '0')}`;
  };

  const handleCellEdit = (projectId: string, field: string, currentValue: string) => {
    setEditingCell({ projectId, field });
    setEditValues({ ...editValues, [`${projectId}-${field}`]: currentValue });
  };

  const handleCellChange = (projectId: string, field: string, value: string) => {
    setEditValues({ ...editValues, [`${projectId}-${field}`]: value });

    // Filter clients if editing client field
    if (field === 'client') {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowClientSuggestions(true);
    }
  };

  const handleCellBlur = async (projectId: string, field: string) => {
    const key = `${projectId}-${field}`;
    const newValue = editValues[key];

    // Don't handle client field here - it's handled by handleSelectClient or handleCreateClient
    if (field === 'client') {
      setShowClientSuggestions(false);
      setEditingCell(null);
      return;
    }

    if (newValue !== undefined) {
      try {
        // Update the project via API
        const updateData: any = {};
        if (field === 'name') {
          updateData.name = newValue;
        } else if (field === 'description') {
          updateData.description = newValue;
        } else if (field === 'projectNumber') {
          updateData.projectNumber = newValue;
        }

        if (Object.keys(updateData).length > 0) {
          await projectsAPI.update(projectId, updateData);
          // Reload projects to reflect changes
          loadProjects();
        }
      } catch (error) {
        console.error('[ProjectTableView] Error updating project:', error);
        Alert.alert('Error', 'Failed to update project. Please try again.');
      }
    }

    setEditingCell(null);
  };

  const handleSelectClient = async (projectId: string, client: Client) => {
    try {
      await projectsAPI.update(projectId, { clientId: client.id });
      setShowClientSuggestions(false);
      setEditingCell(null);
      // Reload projects to reflect changes
      loadProjects();
    } catch (error) {
      console.error('[ProjectTableView] Error updating client:', error);
      Alert.alert('Error', 'Failed to update client. Please try again.');
    }
  };

  const handleCreateClient = async (projectId: string, clientName: string) => {
    try {
      // Create new client
      const response = await clientsAPI.create({ name: clientName });
      const newClient = response.data;

      // Update project with new client
      await projectsAPI.update(projectId, { clientId: newClient.id });

      setShowClientSuggestions(false);
      setEditingCell(null);

      // Reload both clients and projects
      loadClients();
      loadProjects();
    } catch (error) {
      console.error('[ProjectTableView] Error creating client:', error);
      Alert.alert('Error', 'Failed to create client. Please try again.');
    }
  };

  const handleProjectClick = (projectId: string) => {
    (navigation as any).navigate('EditProject', { projectId });
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsAPI.delete(projectId);
              // Reload projects after deletion
              loadProjects();
            } catch (error) {
              console.error('[ProjectTableView] Error deleting project:', error);
              Alert.alert('Error', 'Failed to delete project. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddProject = () => {
    setIsAddingNewProject(true);
    setNewProjectData({
      projectNumber: '',
      name: '',
      clientId: '',
      description: '',
    });
    setNewProjectClientInput('');
  };

  const handleSaveNewProject = async () => {
    if (!newProjectData.name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }
    if (!newProjectData.clientId) {
      Alert.alert('Error', 'Client is required');
      return;
    }

    try {
      await projectsAPI.create({
        projectNumber: newProjectData.projectNumber || undefined,
        name: newProjectData.name,
        description: newProjectData.description || undefined,
        clientId: newProjectData.clientId,
      });

      setIsAddingNewProject(false);
      setNewProjectData({
        projectNumber: '',
        name: '',
        clientId: '',
        description: '',
      });

      // Reload projects
      loadProjects();
    } catch (error) {
      console.error('[ProjectTableView] Error creating project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    }
  };

  const handleCancelNewProject = () => {
    setIsAddingNewProject(false);
    setNewProjectData({
      projectNumber: '',
      name: '',
      clientId: '',
      description: '',
    });
    setNewProjectClientInput('');
  };

  const handleNewProjectClientSelect = async (client: Client) => {
    setNewProjectData({ ...newProjectData, clientId: client.id });
    setNewProjectClientInput(client.name);
    setShowClientSuggestions(false);
  };

  const handleNewProjectCreateClient = async (clientName: string) => {
    try {
      const response = await clientsAPI.create({ name: clientName });
      const newClient = response.data;

      setNewProjectData({ ...newProjectData, clientId: newClient.id });
      setNewProjectClientInput(newClient.name);
      setShowClientSuggestions(false);

      // Reload clients
      loadClients();
    } catch (error) {
      console.error('[ProjectTableView] Error creating client:', error);
      Alert.alert('Error', 'Failed to create client. Please try again.');
    }
  };

  const handleHeaderClick = (column: string) => {
    if (sortColumn === column) {
      // If clicking the same column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a different column, sort by that column ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedProjects = () => {
    const sorted = [...projects].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortColumn) {
        case 'projectNumber':
          valueA = a.projectNumber || getProjectNumber(a, projects.indexOf(a));
          valueB = b.projectNumber || getProjectNumber(b, projects.indexOf(b));
          break;
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'client':
          valueA = a.client?.name.toLowerCase() || '';
          valueB = b.client?.name.toLowerCase() || '';
          break;
        case 'description':
          valueA = a.description?.toLowerCase() || '';
          valueB = b.description?.toLowerCase() || '';
          break;
        case 'hours':
          valueA = calculateTotalHours(a);
          valueB = calculateTotalHours(b);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    return (
      <Text style={styles.sortIndicator}>
        {sortDirection === 'asc' ? ' ▲' : ' ▼'}
      </Text>
    );
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
      {/* Main content area - vertical and horizontal scrolling table */}
      <ScrollView
        style={styles.verticalScrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.verticalScrollContent}
      >
        <ScrollView
          horizontal
          style={styles.scrollableTable}
          showsHorizontalScrollIndicator={true}
        >
          <View style={styles.tableContainer}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[styles.headerCell, { width: PROJECT_NUM_WIDTH }]}
              onPress={() => handleHeaderClick('projectNumber')}
              activeOpacity={0.7}
            >
              <View style={styles.headerContent}>
                <Text style={styles.headerText}>Project #</Text>
                {renderSortIndicator('projectNumber')}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerCell, { width: PROJECT_NAME_WIDTH }]}
              onPress={() => handleHeaderClick('name')}
              activeOpacity={0.7}
            >
              <View style={styles.headerContent}>
                <Text style={styles.headerText}>Project Name</Text>
                {renderSortIndicator('name')}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerCell, { width: CLIENT_WIDTH }]}
              onPress={() => handleHeaderClick('client')}
              activeOpacity={0.7}
            >
              <View style={styles.headerContent}>
                <Text style={styles.headerText}>Client</Text>
                {renderSortIndicator('client')}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerCell, { width: COMMON_NAME_WIDTH }]}
              onPress={() => handleHeaderClick('description')}
              activeOpacity={0.7}
            >
              <View style={styles.headerContent}>
                <Text style={styles.headerText}>Common Name</Text>
                {renderSortIndicator('description')}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerCell, { width: HOURS_WIDTH }]}
              onPress={() => handleHeaderClick('hours')}
              activeOpacity={0.7}
            >
              <View style={styles.headerContent}>
                <Text style={styles.headerText}>Hours</Text>
                {renderSortIndicator('hours')}
              </View>
            </TouchableOpacity>
            <View style={[styles.headerCell, { width: ACTIONS_WIDTH }]}>
              <Text style={styles.headerText}>Actions</Text>
            </View>
          </View>

          {/* Data Rows */}
          {getSortedProjects().map((project, index) => {
            const totalHours = calculateTotalHours(project);
            const projectNumber = getProjectNumber(project, index);

            const isEditingProjectNum = editingCell?.projectId === project.id && editingCell?.field === 'projectNumber';
            const isEditingName = editingCell?.projectId === project.id && editingCell?.field === 'name';
            const isEditingClient = editingCell?.projectId === project.id && editingCell?.field === 'client';
            const isEditingDescription = editingCell?.projectId === project.id && editingCell?.field === 'description';

            return (
              <View key={project.id} style={[styles.dataRow, isEditingClient && { zIndex: 999, overflow: 'visible' }]}>
                <TouchableOpacity
                  style={[styles.dataCell, { width: PROJECT_NUM_WIDTH }]}
                  onPress={() => handleCellEdit(project.id, 'projectNumber', projectNumber)}
                  activeOpacity={0.7}
                >
                  {isEditingProjectNum ? (
                    <TextInput
                      style={styles.cellInput}
                      value={editValues[`${project.id}-projectNumber`] || projectNumber}
                      onChangeText={(text) => handleCellChange(project.id, 'projectNumber', text)}
                      onBlur={() => handleCellBlur(project.id, 'projectNumber')}
                      autoFocus
                    />
                  ) : (
                    <Text style={styles.cellText}>{projectNumber}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dataCell, { width: PROJECT_NAME_WIDTH }]}
                  onPress={() => handleCellEdit(project.id, 'name', project.name)}
                  activeOpacity={0.7}
                >
                  {isEditingName ? (
                    <TextInput
                      style={styles.cellInput}
                      value={editValues[`${project.id}-name`] || project.name}
                      onChangeText={(text) => handleCellChange(project.id, 'name', text)}
                      onBlur={() => handleCellBlur(project.id, 'name')}
                      autoFocus
                      multiline
                    />
                  ) : (
                    <Text style={styles.cellText} numberOfLines={2}>
                      {project.name}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={[styles.dataCell, { width: CLIENT_WIDTH, zIndex: isEditingClient ? 1000 : 1, overflow: 'visible' }]}>
                  <TouchableOpacity
                    style={{ width: '100%' }}
                    onPress={() => handleCellEdit(project.id, 'client', project.client?.name || '')}
                    activeOpacity={0.7}
                  >
                    {isEditingClient ? (
                      <View style={{ position: 'relative', zIndex: 1000 }}>
                        <TextInput
                          style={styles.cellInput}
                          value={editValues[`${project.id}-client`] || project.client?.name || ''}
                          onChangeText={(text) => handleCellChange(project.id, 'client', text)}
                          onBlur={() => {
                            // Delay blur to allow click events to fire first
                            setTimeout(() => handleCellBlur(project.id, 'client'), 200);
                          }}
                          autoFocus
                        />
                        {showClientSuggestions && (
                          <View style={styles.suggestionsContainer}>
                            <FlatList
                              data={filteredClients}
                              keyExtractor={(item) => item.id}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={styles.suggestionItem}
                                  onPress={() => handleSelectClient(project.id, item)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.suggestionText}>{item.name}</Text>
                                </TouchableOpacity>
                              )}
                              ListEmptyComponent={
                                editValues[`${project.id}-client`]?.trim() ? (
                                  <TouchableOpacity
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                      const clientName = editValues[`${project.id}-client`] || '';
                                      if (clientName.trim()) {
                                        handleCreateClient(project.id, clientName.trim());
                                      }
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.createClientText}>
                                      + Create "{editValues[`${project.id}-client`]?.trim() || ''}"
                                    </Text>
                                  </TouchableOpacity>
                                ) : null
                              }
                            />
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.cellText} numberOfLines={1}>
                        {project.client?.name || 'N/A'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.dataCell, { width: COMMON_NAME_WIDTH }]}
                  onPress={() => handleCellEdit(project.id, 'description', project.description || '')}
                  activeOpacity={0.7}
                >
                  {isEditingDescription ? (
                    <TextInput
                      style={styles.cellInput}
                      value={editValues[`${project.id}-description`] || project.description || ''}
                      onChangeText={(text) => handleCellChange(project.id, 'description', text)}
                      onBlur={() => handleCellBlur(project.id, 'description')}
                      autoFocus
                      multiline
                    />
                  ) : (
                    <Text style={styles.cellText} numberOfLines={2}>
                      {project.description || '-'}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={[styles.dataCell, { width: HOURS_WIDTH }]}>
                  <Text style={styles.cellText}>
                    {totalHours.toFixed(2)}h
                  </Text>
                </View>
                <View style={[styles.dataCell, styles.actionsCell, { width: ACTIONS_WIDTH }]}>
                  <TouchableOpacity
                    onPress={() => handleProjectClick(project.id)}
                    style={styles.actionButton}
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteProject(project.id, project.name)}
                    style={styles.actionButton}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={20} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Add New Project Row */}
          {!isAddingNewProject ? (
            <View style={styles.addProjectRow}>
              <TouchableOpacity
                style={styles.addProjectButton}
                onPress={handleAddProject}
                activeOpacity={0.7}
              >
                <View style={[styles.dataCell, { width: PROJECT_NUM_WIDTH }]}>
                  <HugeiconsIcon icon={AddCircleIcon} size={24} color="#666" />
                </View>
                <View style={[styles.dataCell, { width: PROJECT_NAME_WIDTH }]}>
                  <Text style={styles.addProjectText}>Add New Project</Text>
                </View>
                <View style={[styles.dataCell, { width: CLIENT_WIDTH }]} />
                <View style={[styles.dataCell, { width: COMMON_NAME_WIDTH }]} />
                <View style={[styles.dataCell, { width: HOURS_WIDTH }]} />
              </TouchableOpacity>
              <View style={[styles.dataCell, { width: ACTIONS_WIDTH }]} />
            </View>
          ) : (
            <View style={[styles.dataRow, { zIndex: 999, overflow: 'visible' }]}>
              <View style={[styles.dataCell, { width: PROJECT_NUM_WIDTH }]}>
                <TextInput
                  style={styles.cellInput}
                  value={newProjectData.projectNumber}
                  onChangeText={(text) => setNewProjectData({ ...newProjectData, projectNumber: text })}
                  placeholder="P-0001"
                />
              </View>
              <View style={[styles.dataCell, { width: PROJECT_NAME_WIDTH }]}>
                <TextInput
                  style={styles.cellInput}
                  value={newProjectData.name}
                  onChangeText={(text) => setNewProjectData({ ...newProjectData, name: text })}
                  placeholder="Project Name *"
                  autoFocus
                />
              </View>
              <View style={[styles.dataCell, { width: CLIENT_WIDTH, zIndex: 1000, overflow: 'visible' }]}>
                <View style={{ position: 'relative', zIndex: 1000 }}>
                  <TextInput
                    style={styles.cellInput}
                    value={newProjectClientInput}
                    onChangeText={(text) => {
                      setNewProjectClientInput(text);
                      const filtered = clients.filter(client =>
                        client.name.toLowerCase().includes(text.toLowerCase())
                      );
                      setFilteredClients(filtered);
                      setShowClientSuggestions(true);
                    }}
                    placeholder="Client *"
                    onFocus={() => {
                      setFilteredClients(clients);
                      setShowClientSuggestions(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowClientSuggestions(false), 200);
                    }}
                  />
                  {showClientSuggestions && (
                    <View style={styles.suggestionsContainer}>
                      <FlatList
                        data={filteredClients}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() => handleNewProjectClientSelect(item)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.suggestionText}>{item.name}</Text>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          newProjectClientInput.trim() ? (
                            <TouchableOpacity
                              style={styles.suggestionItem}
                              onPress={() => {
                                if (newProjectClientInput.trim()) {
                                  handleNewProjectCreateClient(newProjectClientInput.trim());
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.createClientText}>
                                + Create "{newProjectClientInput.trim()}"
                              </Text>
                            </TouchableOpacity>
                          ) : null
                        }
                      />
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.dataCell, { width: COMMON_NAME_WIDTH }]}>
                <TextInput
                  style={styles.cellInput}
                  value={newProjectData.description}
                  onChangeText={(text) => setNewProjectData({ ...newProjectData, description: text })}
                  placeholder="Description"
                />
              </View>
              <View style={[styles.dataCell, { width: HOURS_WIDTH }]}>
                <Text style={styles.cellText}>0.00h</Text>
              </View>
              <View style={[styles.dataCell, styles.actionsCell, { width: ACTIONS_WIDTH }]}>
                <TouchableOpacity
                  onPress={handleSaveNewProject}
                  style={styles.actionButton}
                >
                  <HugeiconsIcon icon={Tick02Icon} size={20} color="#4caf50" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancelNewProject}
                  style={styles.actionButton}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={20} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      </ScrollView>

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
  verticalScrollView: {
    flex: 1,
  },
  verticalScrollContent: {
    paddingBottom: 100,
  },
  scrollableTable: {
    flex: 1,
  },
  tableContainer: {
    minWidth: TABLE_WIDTH,
    overflow: 'visible',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#10131b',
    borderBottomWidth: 2,
    borderBottomColor: '#0a0c12',
  },
  headerCell: {
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#0a0c12',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  sortIndicator: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dataCell: {
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: '#333',
  },
  cellInput: {
    fontSize: 14,
    color: '#333',
    padding: 5,
    borderWidth: 1,
    borderColor: '#10131b',
    borderRadius: 4,
    backgroundColor: '#f0f0ff',
    minHeight: 30,
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  addProjectRow: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addProjectButton: {
    flexDirection: 'row',
    flex: 1,
  },
  addProjectText: {
    fontSize: 14,
    color: '#10131b',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#10131b',
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: 45,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#10131b',
    borderRadius: 4,
    maxHeight: 200,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  createClientText: {
    fontSize: 14,
    color: '#10131b',
    fontWeight: '600',
  },
});

export default ProjectTableViewScreen;
