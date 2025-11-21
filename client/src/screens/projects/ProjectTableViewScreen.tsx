import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Text, TouchableOpacity, TextInput, FlatList, Modal, Platform } from 'react-native';
import { ActivityIndicator, FAB, IconButton, Switch, Button } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { projectsAPI, clientsAPI, settingsAPI } from '../../services/api';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Delete02Icon, AddCircleIcon, Edit02Icon, Tick02Icon, Cancel01Icon, Settings02Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCustomColorTheme } from '../../contexts/CustomColorThemeContext';
import EditProjectModal from '../../components/EditProjectModal';
import { CustomDialog } from '../../components/CustomDialog';
import { logger } from '../../utils/logger';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../../utils/apiWithTimeout';

const { width } = Dimensions.get('window');
const TABLE_WIDTH = width > 1800 ? 1800 : width - 40;
const PROJECT_NUM_WIDTH = 110;
const PROJECT_NAME_WIDTH = 220;
const CLIENT_WIDTH = 180;
const COMMON_NAME_WIDTH = 150;
const HOURS_WIDTH = 90;
const HOURS_WEEK_WIDTH = 90;
const HOURS_MONTH_WIDTH = 100;
const HOURS_QUARTER_WIDTH = 100;
const PROJECT_VALUE_WIDTH = 130;
const BILLABLE_AMOUNT_WIDTH = 130;
const PROGRESS_WIDTH = 100;
const ACTIONS_WIDTH = 90;

interface Project {
  id: string;
  projectNumber?: string;
  name: string;
  description?: string;
  clientId: string;
  client?: { id: string; name: string };
  budgetHours?: number;
  projectValue?: number;
  timeEntries?: any[];
  planningTasks?: { span: number; date: string; userId: string }[];
  useStandardRate?: boolean;
  standardHourlyRate?: number;
  members?: {
    userId: string;
    customHourlyRate?: number;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      defaultHourlyRate?: number;
    };
  }[];
}

interface Client {
  id: string;
  name: string;
}

interface ColumnVisibility {
  projectNumber: boolean;
  name: boolean;
  client: boolean;
  description: boolean;
  hours: boolean;
  hoursWeek: boolean;
  hoursMonth: boolean;
  hoursQuarter: boolean;
  projectValue: boolean;
  billableAmount: boolean;
  progress: boolean;
}

const ProjectTableViewScreen = React.memo(() => {
  const { currentColors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { getColorForElement } = useCustomColorTheme();

  // Get custom colors for table header
  const tableHeaderBg = getColorForElement('projects', 'tableHeaderBackground');
  const tableHeaderText = getColorForElement('projects', 'tableHeaderText');

  const styles = getStyles(currentColors);
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    projectNumber: true,
    name: true,
    client: true,
    description: true,
    hours: true,
    hoursWeek: true,
    hoursMonth: true,
    hoursQuarter: true,
    projectValue: true,
    billableAmount: true,
    progress: true,
  });

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Error');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('Success');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
      loadClients();
      loadColumnVisibility();
    }, [])
  );

  const loadColumnVisibility = async () => {
    try {
      // Try to load user-specific settings first from database
      try {
        const userResponse = await settingsAPI.user.get('project_table_columns');
        if (userResponse.data?.value) {

          setColumnVisibility(userResponse.data.value);
          return;
        }
      } catch (error: any) {
        // 404 means no user setting exists, continue to check app-wide default
        if (error.response?.status !== 404) {
          throw error;
        }
      }

      // Fall back to app-wide default settings
      try {
        const defaultResponse = await settingsAPI.app.get('project_table_columns_default');
        if (defaultResponse.data?.value) {

          setColumnVisibility(defaultResponse.data.value);
        }
      } catch (error: any) {
        // 404 means no default setting exists, use hardcoded defaults
        if (error.response?.status !== 404) {
          throw error;
        }

      }
    } catch (error) {
      logger.error('Error loading column visibility:', error);
    }
  };

  const saveToProfile = async () => {
    try {
      await settingsAPI.user.set('project_table_columns', columnVisibility);

      setSuccessTitle('Success');
      setSuccessMessage('Column visibility saved to your profile');
      setShowSuccessDialog(true);
      setShowSettingsModal(false);
    } catch (error) {
      logger.error('Error saving to profile:', error);
      setErrorTitle('Error');
      setErrorMessage('Failed to save column visibility');
      setShowErrorDialog(true);
    }
  };

  const saveAsDefault = async () => {
    try {
      if (user?.role !== 'ADMIN') {
        setPermissionMessage('Only administrators can set default column visibility for all users');
        setShowPermissionDialog(true);
        return;
      }

      await settingsAPI.app.set('project_table_columns_default', columnVisibility);

      setSuccessTitle('Success');
      setSuccessMessage('Column visibility saved as default for all users');
      setShowSuccessDialog(true);
      setShowSettingsModal(false);
    } catch (error) {
      logger.error('Error saving as default:', error);
      setErrorTitle('Error');
      setErrorMessage('Failed to save default column visibility');
      setShowErrorDialog(true);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAll();

      setProjects(response.data);
    } catch (error) {
      logger.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll();

      setClients(response.data);
    } catch (error) {
      logger.error('Error loading clients:', error);
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

  const calculateHoursThisWeek = (project: Project): number => {
    if (!project.planningTasks || project.planningTasks.length === 0) return 0;

    const now = new Date();
    // Get Monday of current week (week starts on Monday)
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get Sunday of current week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return project.planningTasks.reduce((total, task) => {
      const taskDate = new Date(task.date);
      if (taskDate >= startOfWeek && taskDate <= endOfWeek) {
        return total + (task.span * 2);
      }
      return total;
    }, 0);
  };

  const calculateHoursThisMonth = (project: Project): number => {
    if (!project.planningTasks || project.planningTasks.length === 0) return 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return project.planningTasks.reduce((total, task) => {
      const taskDate = new Date(task.date);
      if (taskDate >= startOfMonth && taskDate <= endOfMonth) {
        return total + (task.span * 2);
      }
      return total;
    }, 0);
  };

  const calculateHoursThisQuarter = (project: Project): number => {
    if (!project.planningTasks || project.planningTasks.length === 0) return 0;

    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const endOfQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);

    return project.planningTasks.reduce((total, task) => {
      const taskDate = new Date(task.date);
      if (taskDate >= startOfQuarter && taskDate <= endOfQuarter) {
        return total + (task.span * 2);
      }
      return total;
    }, 0);
  };

  const calculateEstimatedBillableAmount = (project: Project): number => {
    if (!project.planningTasks || project.planningTasks.length === 0) return 0;

    // If using standard rate, calculate total hours * standard rate
    if (project.useStandardRate && project.standardHourlyRate) {
      const totalHours = calculateTotalHours(project);
      return totalHours * project.standardHourlyRate;
    }

    // If not using standard rate, calculate per team member based on their tasks
    if (!project.useStandardRate && project.members) {
      let totalAmount = 0;

      // Group tasks by userId
      const tasksByUser: { [userId: string]: number } = {};

      project.planningTasks.forEach((task) => {
        const hours = task.span * 2;
        tasksByUser[task.userId] = (tasksByUser[task.userId] || 0) + hours;
      });

      // Calculate billable amount for each user
      Object.entries(tasksByUser).forEach(([userId, hours]) => {
        const member = project.members?.find(m => m.userId === userId);
        if (member) {
          // Use custom rate, or fall back to user's default rate
          const rate = member.customHourlyRate || member.user.defaultHourlyRate || 0;
          totalAmount += hours * rate;
        }
      });

      return totalAmount;
    }

    return 0;
  };

  const calculateProgressPercentage = (project: Project): number => {
    const projectValue = Number(project.projectValue) || 0;
    if (projectValue === 0) return 0;

    const estimatedBillable = calculateEstimatedBillableAmount(project);
    return (estimatedBillable / projectValue) * 100;
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
        logger.error('Error updating project:', error);
        setErrorTitle('Error');
        setErrorMessage('Failed to update project. Please try again.');
        setShowErrorDialog(true);
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
      logger.error('Error updating client:', error);
      setErrorTitle('Error');
      setErrorMessage('Failed to update client. Please try again.');
      setShowErrorDialog(true);
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
      logger.error('Error creating client:', error);
      setErrorTitle('Error');
      setErrorMessage('Failed to create client. Please try again.');
      setShowErrorDialog(true);
    }
  };

  const handleProjectClick = (projectId: string) => {
    setEditingProjectId(projectId);
    setShowEditModal(true);
  };

  const handleDeleteClick = (projectId: string) => {
    setDeletingProjectId(projectId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProjectId) return;

    try {
      await projectsAPI.delete(deletingProjectId);
      setDeletingProjectId(null);
      loadProjects();
    } catch (error) {
      logger.error('Error deleting project:', error);
      setDeletingProjectId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingProjectId(null);
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
      setValidationMessage('Project name is required');
      setShowValidationDialog(true);
      return;
    }
    if (!newProjectData.clientId) {
      setValidationMessage('Client is required');
      setShowValidationDialog(true);
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
      logger.error('Error creating project:', error);
      setErrorTitle('Error');
      setErrorMessage('Failed to create project. Please try again.');
      setShowErrorDialog(true);
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
      logger.error('Error creating client:', error);
      setErrorTitle('Error');
      setErrorMessage('Failed to create client. Please try again.');
      setShowErrorDialog(true);
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
        case 'hoursWeek':
          valueA = calculateHoursThisWeek(a);
          valueB = calculateHoursThisWeek(b);
          break;
        case 'hoursMonth':
          valueA = calculateHoursThisMonth(a);
          valueB = calculateHoursThisMonth(b);
          break;
        case 'hoursQuarter':
          valueA = calculateHoursThisQuarter(a);
          valueB = calculateHoursThisQuarter(b);
          break;
        case 'projectValue':
          valueA = Number(a.projectValue) || 0;
          valueB = Number(b.projectValue) || 0;
          break;
        case 'billableAmount':
          valueA = calculateEstimatedBillableAmount(a);
          valueB = calculateEstimatedBillableAmount(b);
          break;
        case 'progress':
          valueA = calculateProgressPercentage(a);
          valueB = calculateProgressPercentage(b);
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
      <Text style={[styles.sortIndicator, { color: tableHeaderText }]}>
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
    <View style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
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
          <View style={[styles.headerRow, { backgroundColor: tableHeaderBg, height: 75 }]}>
            {columnVisibility.projectNumber && (
              <TouchableOpacity
                style={[styles.headerCell, { width: PROJECT_NUM_WIDTH }]}
                onPress={() => handleHeaderClick('projectNumber')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Project #</Text>
                  {renderSortIndicator('projectNumber')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.name && (
              <TouchableOpacity
                style={[styles.headerCell, { width: PROJECT_NAME_WIDTH }]}
                onPress={() => handleHeaderClick('name')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Project Name</Text>
                  {renderSortIndicator('name')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.client && (
              <TouchableOpacity
                style={[styles.headerCell, { width: CLIENT_WIDTH }]}
                onPress={() => handleHeaderClick('client')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Client</Text>
                  {renderSortIndicator('client')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.description && (
              <TouchableOpacity
                style={[styles.headerCell, {
                  width: COMMON_NAME_WIDTH,
                  ...(Platform.OS === 'web' && {
                    position: 'sticky' as any,
                    left: 0,
                  }),
                  zIndex: 10,
                  backgroundColor: tableHeaderBg,
                }]}
                onPress={() => handleHeaderClick('description')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Common Name</Text>
                  {renderSortIndicator('description')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.hours && (
              <TouchableOpacity
                style={[styles.headerCell, { width: HOURS_WIDTH }]}
                onPress={() => handleHeaderClick('hours')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Hours</Text>
                  {renderSortIndicator('hours')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.hoursWeek && (
              <TouchableOpacity
                style={[styles.headerCell, { width: HOURS_WEEK_WIDTH }]}
                onPress={() => handleHeaderClick('hoursWeek')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>This Week</Text>
                  {renderSortIndicator('hoursWeek')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.hoursMonth && (
              <TouchableOpacity
                style={[styles.headerCell, { width: HOURS_MONTH_WIDTH }]}
                onPress={() => handleHeaderClick('hoursMonth')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>This Month</Text>
                  {renderSortIndicator('hoursMonth')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.hoursQuarter && (
              <TouchableOpacity
                style={[styles.headerCell, { width: HOURS_QUARTER_WIDTH }]}
                onPress={() => handleHeaderClick('hoursQuarter')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>This Quarter</Text>
                  {renderSortIndicator('hoursQuarter')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.projectValue && (
              <TouchableOpacity
                style={[styles.headerCell, { width: PROJECT_VALUE_WIDTH }]}
                onPress={() => handleHeaderClick('projectValue')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Project Value</Text>
                  {renderSortIndicator('projectValue')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.billableAmount && (
              <TouchableOpacity
                style={[styles.headerCell, { width: BILLABLE_AMOUNT_WIDTH }]}
                onPress={() => handleHeaderClick('billableAmount')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Est. Billable</Text>
                  {renderSortIndicator('billableAmount')}
                </View>
              </TouchableOpacity>
            )}
            {columnVisibility.progress && (
              <TouchableOpacity
                style={[styles.headerCell, { width: PROGRESS_WIDTH }]}
                onPress={() => handleHeaderClick('progress')}
                activeOpacity={0.7}
              >
                <View style={styles.headerContent}>
                  <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Progress %</Text>
                  {renderSortIndicator('progress')}
                </View>
              </TouchableOpacity>
            )}
            <View style={[styles.headerCell, { width: ACTIONS_WIDTH }]}>
              <Text style={[styles.headerText, { color: tableHeaderText, fontFamily: 'Juana' }]}>Actions</Text>
            </View>
          </View>

          {/* Data Rows */}
          {getSortedProjects().map((project, index) => {
            const totalHours = calculateTotalHours(project);
            const hoursThisWeek = calculateHoursThisWeek(project);
            const hoursThisMonth = calculateHoursThisMonth(project);
            const hoursThisQuarter = calculateHoursThisQuarter(project);
            const estimatedBillableAmount = calculateEstimatedBillableAmount(project);
            const progressPercentage = calculateProgressPercentage(project);
            const projectNumber = getProjectNumber(project, index);

            const isEditingProjectNum = editingCell?.projectId === project.id && editingCell?.field === 'projectNumber';
            const isEditingName = editingCell?.projectId === project.id && editingCell?.field === 'name';
            const isEditingClient = editingCell?.projectId === project.id && editingCell?.field === 'client';
            const isEditingDescription = editingCell?.projectId === project.id && editingCell?.field === 'description';

            return (
              <View key={project.id} style={[styles.dataRow, { backgroundColor: currentColors.background.bg300 }, isEditingClient && { zIndex: 999, overflow: 'visible' }]}>
                {columnVisibility.projectNumber && (
                  <TouchableOpacity
                    style={[styles.dataCell, { width: PROJECT_NUM_WIDTH }]}
                    onPress={() => handleCellEdit(project.id, 'projectNumber', projectNumber)}
                    activeOpacity={0.7}
                  >
                    {isEditingProjectNum ? (
                      <TextInput
                        style={[styles.cellInput, { borderColor: currentColors.primary, backgroundColor: currentColors.background.bg500, color: currentColors.text }]}
                        value={editValues[`${project.id}-projectNumber`] || projectNumber}
                        onChangeText={(text) => handleCellChange(project.id, 'projectNumber', text)}
                        onBlur={() => handleCellBlur(project.id, 'projectNumber')}
                        autoFocus
                      />
                    ) : (
                      <Text style={[styles.cellText, { color: currentColors.text }]}>{projectNumber}</Text>
                    )}
                  </TouchableOpacity>
                )}
                {columnVisibility.name && (
                  <TouchableOpacity
                    style={[styles.dataCell, { width: PROJECT_NAME_WIDTH }]}
                    onPress={() => handleCellEdit(project.id, 'name', project.name)}
                    activeOpacity={0.7}
                  >
                    {isEditingName ? (
                      <TextInput
                        style={[styles.cellInput, { borderColor: currentColors.primary, backgroundColor: currentColors.background.bg500, color: currentColors.text }]}
                        value={editValues[`${project.id}-name`] || project.name}
                        onChangeText={(text) => handleCellChange(project.id, 'name', text)}
                        onBlur={() => handleCellBlur(project.id, 'name')}
                        autoFocus
                        multiline
                      />
                    ) : (
                      <Text style={[styles.cellText, { color: currentColors.text }]} numberOfLines={2}>
                        {project.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                {columnVisibility.client && (
                  <View style={[styles.dataCell, { width: CLIENT_WIDTH, zIndex: isEditingClient ? 1000 : 1, overflow: 'visible' }]}>
                    <TouchableOpacity
                      style={{ width: '100%' }}
                      onPress={() => handleCellEdit(project.id, 'client', project.client?.name || '')}
                      activeOpacity={0.7}
                    >
                      {isEditingClient ? (
                        <View style={{ position: 'relative', zIndex: 1000 }}>
                          <TextInput
                            style={[styles.cellInput, { borderColor: currentColors.primary, backgroundColor: currentColors.background.bg500, color: currentColors.text }]}
                            value={editValues[`${project.id}-client`] || project.client?.name || ''}
                            onChangeText={(text) => handleCellChange(project.id, 'client', text)}
                            onBlur={() => {
                              // Delay blur to allow click events to fire first
                              setTimeout(() => handleCellBlur(project.id, 'client'), 200);
                            }}
                            autoFocus
                          />
                          {showClientSuggestions && (
                            <View style={[styles.suggestionsContainer, { backgroundColor: currentColors.background.bg300, borderColor: currentColors.primary }]}>
                              <FlatList
                                data={filteredClients}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                  <TouchableOpacity
                                    style={[styles.suggestionItem, { backgroundColor: currentColors.background.bg300 }]}
                                    onPress={() => handleSelectClient(project.id, item)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={[styles.suggestionText, { color: currentColors.text }]}>{item.name}</Text>
                                  </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                  editValues[`${project.id}-client`]?.trim() ? (
                                    <TouchableOpacity
                                      style={[styles.suggestionItem, { backgroundColor: currentColors.background.bg300 }]}
                                      onPress={() => {
                                        const clientName = editValues[`${project.id}-client`] || '';
                                        if (clientName.trim()) {
                                          handleCreateClient(project.id, clientName.trim());
                                        }
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={[styles.createClientText, { color: currentColors.primary }]}>
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
                        <Text style={[styles.cellText, { color: currentColors.text }]} numberOfLines={1}>
                          {project.client?.name || 'N/A'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {columnVisibility.description && (
                  <TouchableOpacity
                    style={[styles.dataCell, {
                      width: COMMON_NAME_WIDTH,
                      ...(Platform.OS === 'web' && {
                        position: 'sticky' as any,
                        left: 0,
                      }),
                      zIndex: 5,
                      backgroundColor: currentColors.background.bg300,
                    }]}
                    onPress={() => handleCellEdit(project.id, 'description', project.description || '')}
                    activeOpacity={0.7}
                  >
                    {isEditingDescription ? (
                      <TextInput
                        style={[styles.cellInput, { borderColor: currentColors.primary, backgroundColor: currentColors.background.bg500, color: currentColors.text }]}
                        value={editValues[`${project.id}-description`] || project.description || ''}
                        onChangeText={(text) => handleCellChange(project.id, 'description', text)}
                        onBlur={() => handleCellBlur(project.id, 'description')}
                        autoFocus
                        multiline
                      />
                    ) : (
                      <Text style={[styles.cellText, { color: currentColors.text }]} numberOfLines={2}>
                        {project.description || '-'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                {columnVisibility.hours && (
                  <View style={[styles.dataCell, { width: HOURS_WIDTH }]}>
                    <Text style={[styles.cellText, { color: currentColors.text }]}>
                      {totalHours.toFixed(2)}h
                    </Text>
                  </View>
                )}
                {columnVisibility.hoursWeek && (
                  <View style={[styles.dataCell, { width: HOURS_WEEK_WIDTH }]}>
                    <Text style={[styles.cellText, { color: currentColors.text }]}>
                      {hoursThisWeek.toFixed(2)}h
                    </Text>
                  </View>
                )}
                {columnVisibility.hoursMonth && (
                  <View style={[styles.dataCell, { width: HOURS_MONTH_WIDTH }]}>
                    <Text style={[styles.cellText, { color: currentColors.text }]}>
                      {hoursThisMonth.toFixed(2)}h
                    </Text>
                  </View>
                )}
                {columnVisibility.hoursQuarter && (
                  <View style={[styles.dataCell, { width: HOURS_QUARTER_WIDTH }]}>
                    <Text style={[styles.cellText, { color: currentColors.text }]}>
                      {hoursThisQuarter.toFixed(2)}h
                    </Text>
                  </View>
                )}
                {columnVisibility.projectValue && (
                  <View style={[styles.dataCell, { width: PROJECT_VALUE_WIDTH }]}>
                    <Text style={[styles.cellText, { color: currentColors.text }]}>
                      {project.projectValue ? `$${Number(project.projectValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </Text>
                  </View>
                )}
                {columnVisibility.billableAmount && (
                  <View style={[styles.dataCell, { width: BILLABLE_AMOUNT_WIDTH }]}>
                    <Text style={[styles.cellText, { color: currentColors.text }]}>
                      ${estimatedBillableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
                {columnVisibility.progress && (
                  <View style={[styles.dataCell, { width: PROGRESS_WIDTH }]}>
                    {project.projectValue ? (
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { backgroundColor: '#e0e0e0' }]}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.min(progressPercentage, 100)}%`,
                                backgroundColor: progressPercentage > 100 ? currentColors.error : progressPercentage >= 75 ? currentColors.warning : currentColors.success
                              }
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressText, { color: currentColors.text }]}>
                          {progressPercentage.toFixed(1)}%
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.cellText, { color: currentColors.text }]}>-</Text>
                    )}
                  </View>
                )}
                <View style={[styles.dataCell, styles.actionsCell, { width: ACTIONS_WIDTH }]}>
                  <TouchableOpacity
                    onPress={() => handleProjectClick(project.id)}
                    style={styles.actionButton}
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={20} color={currentColors.icon} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Add New Project Row */}
          {!isAddingNewProject ? (
            <View style={[styles.addProjectRow, { backgroundColor: currentColors.background.bg500 }]}>
              <TouchableOpacity
                style={styles.addProjectButton}
                onPress={handleAddProject}
                activeOpacity={0.7}
              >
                {columnVisibility.projectNumber && (
                  <View style={[styles.dataCell, { width: PROJECT_NUM_WIDTH }]}>
                    <HugeiconsIcon icon={AddCircleIcon} size={24} color={currentColors.primary} />
                  </View>
                )}
                {columnVisibility.name && (
                  <View style={[styles.dataCell, { width: PROJECT_NAME_WIDTH }]}>
                    <Text style={[styles.addProjectText, { color: currentColors.primary }]}>Add New Project</Text>
                  </View>
                )}
                {columnVisibility.client && (
                  <View style={[styles.dataCell, { width: CLIENT_WIDTH }]} />
                )}
                {columnVisibility.description && (
                  <View style={[styles.dataCell, {
                    width: COMMON_NAME_WIDTH,
                    ...(Platform.OS === 'web' && {
                      position: 'sticky' as any,
                      left: 0,
                    }),
                    zIndex: 5,
                    backgroundColor: currentColors.background.bg300,
                  }]} />
                )}
                {columnVisibility.hours && (
                  <View style={[styles.dataCell, { width: HOURS_WIDTH }]} />
                )}
                {columnVisibility.hoursWeek && (
                  <View style={[styles.dataCell, { width: HOURS_WEEK_WIDTH }]} />
                )}
                {columnVisibility.hoursMonth && (
                  <View style={[styles.dataCell, { width: HOURS_MONTH_WIDTH }]} />
                )}
                {columnVisibility.hoursQuarter && (
                  <View style={[styles.dataCell, { width: HOURS_QUARTER_WIDTH }]} />
                )}
                {columnVisibility.projectValue && (
                  <View style={[styles.dataCell, { width: PROJECT_VALUE_WIDTH }]} />
                )}
                {columnVisibility.billableAmount && (
                  <View style={[styles.dataCell, { width: BILLABLE_AMOUNT_WIDTH }]} />
                )}
                {columnVisibility.progress && (
                  <View style={[styles.dataCell, { width: PROGRESS_WIDTH }]} />
                )}
              </TouchableOpacity>
              <View style={[styles.dataCell, { width: ACTIONS_WIDTH }]} />
            </View>
          ) : (
            <View style={[styles.dataRow, { backgroundColor: currentColors.background.bg300, zIndex: 999, overflow: 'visible' }]}>
              {columnVisibility.projectNumber && (
                <View style={[styles.dataCell, { width: PROJECT_NUM_WIDTH }]}>
                  <TextInput
                    style={[styles.cellInput, { borderColor: currentColors.primary, backgroundColor: currentColors.background.bg500, color: currentColors.text }]}
                    value={newProjectData.projectNumber}
                    onChangeText={(text) => setNewProjectData({ ...newProjectData, projectNumber: text })}
                    placeholder="P-0001"
                  />
                </View>
              )}
              {columnVisibility.name && (
                <View style={[styles.dataCell, { width: PROJECT_NAME_WIDTH }]}>
                  <TextInput
                    style={[styles.cellInput, { borderColor: currentColors.primary, backgroundColor: currentColors.background.bg500, color: currentColors.text }]}
                    value={newProjectData.name}
                    onChangeText={(text) => setNewProjectData({ ...newProjectData, name: text })}
                    placeholder="Project Name *"
                    autoFocus
                  />
                </View>
              )}
              {columnVisibility.client && (
                <View style={[styles.dataCell, { width: CLIENT_WIDTH, zIndex: 1000, overflow: 'visible' }]}>
                  <View style={{ position: 'relative', zIndex: 1000 }}>
                    <TextInput
                      style={[styles.cellInput, { borderColor: currentColors.primary, backgroundColor: currentColors.background.bg500, color: currentColors.text }]}
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
                      <View style={[styles.suggestionsContainer, { backgroundColor: currentColors.background.bg300, borderColor: currentColors.primary }]}>
                        <FlatList
                          data={filteredClients}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[styles.suggestionItem, { backgroundColor: currentColors.background.bg300 }]}
                              onPress={() => handleNewProjectClientSelect(item)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.suggestionText, { color: currentColors.text }]}>{item.name}</Text>
                            </TouchableOpacity>
                          )}
                          ListEmptyComponent={
                            newProjectClientInput.trim() ? (
                              <TouchableOpacity
                                style={[styles.suggestionItem, { backgroundColor: currentColors.background.bg300 }]}
                                onPress={() => {
                                  if (newProjectClientInput.trim()) {
                                    handleNewProjectCreateClient(newProjectClientInput.trim());
                                  }
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.createClientText, { color: currentColors.primary }]}>
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
              )}
              {columnVisibility.description && (
                <View style={[styles.dataCell, {
                  width: COMMON_NAME_WIDTH,
                  ...(Platform.OS === 'web' && {
                    position: 'sticky' as any,
                    left: 0,
                  }),
                  zIndex: 5,
                  backgroundColor: currentColors.background.bg300,
                }]}>
                  <TextInput
                    style={[styles.cellInput, { borderColor: currentColors.primary, backgroundColor: currentColors.background.bg500, color: currentColors.text }]}
                    value={newProjectData.description}
                    onChangeText={(text) => setNewProjectData({ ...newProjectData, description: text })}
                    placeholder="Description"
                  />
                </View>
              )}
              {columnVisibility.hours && (
                <View style={[styles.dataCell, { width: HOURS_WIDTH }]}>
                  <Text style={[styles.cellText, { color: currentColors.text }]}>0.00h</Text>
                </View>
              )}
              {columnVisibility.hoursWeek && (
                <View style={[styles.dataCell, { width: HOURS_WEEK_WIDTH }]}>
                  <Text style={[styles.cellText, { color: currentColors.text }]}>0.00h</Text>
                </View>
              )}
              {columnVisibility.hoursMonth && (
                <View style={[styles.dataCell, { width: HOURS_MONTH_WIDTH }]}>
                  <Text style={[styles.cellText, { color: currentColors.text }]}>0.00h</Text>
                </View>
              )}
              {columnVisibility.hoursQuarter && (
                <View style={[styles.dataCell, { width: HOURS_QUARTER_WIDTH }]}>
                  <Text style={[styles.cellText, { color: currentColors.text }]}>0.00h</Text>
                </View>
              )}
              {columnVisibility.projectValue && (
                <View style={[styles.dataCell, { width: PROJECT_VALUE_WIDTH }]}>
                  <Text style={[styles.cellText, { color: currentColors.text }]}>-</Text>
                </View>
              )}
              {columnVisibility.billableAmount && (
                <View style={[styles.dataCell, { width: BILLABLE_AMOUNT_WIDTH }]}>
                  <Text style={[styles.cellText, { color: currentColors.text }]}>$0.00</Text>
                </View>
              )}
              {columnVisibility.progress && (
                <View style={[styles.dataCell, { width: PROGRESS_WIDTH }]}>
                  <Text style={[styles.cellText, { color: currentColors.text }]}>-</Text>
                </View>
              )}
              <View style={[styles.dataCell, styles.actionsCell, { width: ACTIONS_WIDTH }]}>
                <TouchableOpacity
                  onPress={handleSaveNewProject}
                  style={styles.actionButton}
                >
                  <HugeiconsIcon icon={Tick02Icon} size={20} color={currentColors.success} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancelNewProject}
                  style={styles.actionButton}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={20} color={currentColors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      </ScrollView>

      {/* Settings Icon */}
      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: currentColors.secondary }]}
        onPress={() => setShowSettingsModal(true)}
        activeOpacity={0.8}
      >
        <HugeiconsIcon icon={Settings02Icon} size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background.bg300 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentColors.text, flex: 1 }]}>Table Column Settings</Text>
              <IconButton
                icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
                onPress={() => setShowSettingsModal(false)}
              />
            </View>

            <ScrollView style={styles.settingsScroll}>
              {Object.entries({
                projectNumber: 'Project #',
                name: 'Project Name',
                client: 'Client',
                description: 'Common Name',
                hours: 'Hours',
                hoursWeek: 'This Week',
                hoursMonth: 'This Month',
                hoursQuarter: 'This Quarter',
                projectValue: 'Project Value',
                billableAmount: 'Est. Billable',
                progress: 'Progress %',
              }).map(([key, label]) => (
                <View key={key} style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: currentColors.text }]}>{label}</Text>
                  <Switch
                    value={columnVisibility[key as keyof ColumnVisibility]}
                    onValueChange={(value) =>
                      setColumnVisibility({ ...columnVisibility, [key]: value })
                    }
                    color={currentColors.primary}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                mode="contained"
                onPress={saveToProfile}
                style={styles.modalButton}
                buttonColor={currentColors.primary}
              >
                Save to My Profile
              </Button>

              {user?.role === 'ADMIN' && (
                <Button
                  mode="outlined"
                  onPress={saveAsDefault}
                  style={[styles.modalButton, { marginTop: 10 }]}
                >
                  Save as Default for All Users
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Project Modal */}
      <EditProjectModal
        visible={showEditModal}
        projectId={editingProjectId}
        onDismiss={() => {
          setShowEditModal(false);
          setEditingProjectId(null);
        }}
        onSuccess={() => {
          loadProjects();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <Modal
          visible={!!deletingProjectId}
          transparent={true}
          animationType="fade"
          onRequestClose={handleDeleteCancel}
        >
          <View style={styles.confirmationOverlay}>
            <View style={[styles.confirmationCard, { backgroundColor: currentColors.background.bg300 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.confirmationTitle, { color: currentColors.text, flex: 1 }]}>
                  Delete Project
                </Text>
                <IconButton
                  icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
                  onPress={handleDeleteCancel}
                />
              </View>

              {(() => {
                const project = projects.find(p => p.id === deletingProjectId);
                return (
                  <Text style={[styles.confirmationMessage, { color: currentColors.text }]}>
                    Are you sure you want to delete "{project?.name || 'this project'}"? This action cannot be undone.
                  </Text>
                );
              })()}

              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={[styles.confirmationButtonCancel, { borderColor: currentColors.primary }]}
                  onPress={handleDeleteCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.confirmationButtonCancelText, { color: currentColors.primary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmationButtonDelete}
                  onPress={handleDeleteConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmationButtonDeleteText}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Error Dialog */}
      <CustomDialog
        visible={showErrorDialog}
        title={errorTitle}
        message={errorMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowErrorDialog(false),
            style: 'default',
          }
        ]}
        onDismiss={() => setShowErrorDialog(false)}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title={successTitle}
        message={successMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowSuccessDialog(false),
            style: 'default',
          }
        ]}
        onDismiss={() => setShowSuccessDialog(false)}
      />

      {/* Permission Dialog */}
      <CustomDialog
        visible={showPermissionDialog}
        title="Permission Denied"
        message={permissionMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowPermissionDialog(false),
            style: 'default',
          }
        ]}
        onDismiss={() => setShowPermissionDialog(false)}
      />

      {/* Validation Dialog */}
      <CustomDialog
        visible={showValidationDialog}
        title="Validation Error"
        message={validationMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowValidationDialog(false),
            style: 'default',
          }
        ]}
        onDismiss={() => setShowValidationDialog(false)}
      />
    </View>
  );
});

const getStyles = (currentColors: any) => StyleSheet.create({
  container: {
    flex: 1,
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
    flexGrow: 1,
  },
  scrollableTable: {
    flex: 1,
  },
  tableContainer: {
    minWidth: TABLE_WIDTH,
    overflow: 'visible',
    paddingBottom: 100,
    backgroundColor: currentColors.background.bg300,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: currentColors.border,
  },
  headerCell: {
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: currentColors.border,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    color: currentColors.white,
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'capitalize',
    fontFamily: 'Juana',
  },
  sortIndicator: {
    color: currentColors.white,
    fontSize: 12,
    marginLeft: 4,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: currentColors.border,
  },
  dataCell: {
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: currentColors.border,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: currentColors.text,
  },
  cellInput: {
    fontSize: 14,
    padding: 5,
    borderWidth: 1,
    borderRadius: 4,
    minHeight: 30,
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRightWidth: 1,
    borderRightColor: currentColors.border,
  },
  actionButton: {
    padding: 5,
  },
  addProjectRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: currentColors.border,
  },
  addProjectButton: {
    flexDirection: 'row',
    flex: 1,
  },
  addProjectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: currentColors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: 45,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 4,
    maxHeight: 200,
    zIndex: 9999,
    elevation: 10,
    shadowColor: currentColors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: currentColors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: currentColors.text,
  },
  createClientText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  settingsScroll: {
    maxHeight: 400,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  modalButtons: {
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    marginVertical: 4,
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationCard: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    elevation: 8,
    shadowColor: currentColors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmationButtonCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1.5,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmationButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationButtonDelete: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: currentColors.error,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmationButtonDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: currentColors.white,
  },
});

ProjectTableViewScreen.displayName = 'ProjectTableViewScreen';

export default ProjectTableViewScreen;
