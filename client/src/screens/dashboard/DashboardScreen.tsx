import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, Platform, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CircleIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePlanningColors } from '../../contexts/PlanningColorsContext';
import { useCustomColorTheme } from '../../contexts/CustomColorThemeContext';
import { planningTasksAPI, deadlineTasksAPI } from '../../services/api';

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { currentColors } = useTheme();
  const { planningColors } = usePlanningColors();
  const { getColorForElement } = useCustomColorTheme();
  const queryClient = useQueryClient();

  console.log('=== DASHBOARD SCREEN RENDER ===');
  console.log('Planning Colors Available:', {
    projectTaskBg: planningColors.projectTaskBg,
    marketingTaskBg: planningColors.marketingTaskBg,
    adminTaskBg: planningColors.adminTaskBg,
    outOfOfficeBg: planningColors.outOfOfficeBg,
    timeOffBg: planningColors.timeOffBg,
    unavailableBg: planningColors.unavailableBg,
  });

  // Get dashboard colors from Element Color Mapper
  const cardBg = getColorForElement('dashboard', 'cardBackground');
  const headerBg = getColorForElement('dashboard', 'headerBackground');
  const headerText = getColorForElement('dashboard', 'headerText');

  // Calculate date ranges using local timezone
  const today = new Date();
  // Get local date string (YYYY-MM-DD) without timezone conversion
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  console.log('[Dashboard] Today\'s date:', todayStr, 'Full date object:', today);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Fetch upcoming deadlines (next 30 days)
  const { data: deadlinesData, isLoading: deadlinesLoading, refetch: refetchDeadlines } = useQuery({
    queryKey: ['deadlines', 'upcoming'],
    queryFn: async () => {
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);
      // Use local date string without timezone conversion
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      console.log('[Dashboard] Fetching deadlines from', todayStr, 'to', endDateStr);
      const response = await deadlineTasksAPI.getAll({
        startDate: todayStr,
        endDate: endDateStr,
      });
      console.log('[Dashboard] Deadlines response:', response.data);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch planning tasks for today, this week, and this month
  const { data: planningTasksData, isLoading: planningLoading, refetch: refetchPlanning } = useQuery({
    queryKey: ['planningTasks', 'dashboard', user?.id],
    queryFn: async () => {
      // Use local date string without timezone conversion
      const endOfMonthStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
      console.log('[Dashboard] Fetching planning tasks from', todayStr, 'to', endOfMonthStr, 'for user', user?.id);
      const response = await planningTasksAPI.getAll({
        userId: user?.id,
        startDate: todayStr,
        endDate: endOfMonthStr,
      });
      console.log('[Dashboard] Planning tasks response:', response.data);
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Organize planning tasks by period
  const tasksByPeriod = useMemo(() => {
    if (!planningTasksData) return { today: [], thisWeek: [], thisMonth: [] };

    const today: any[] = [];
    const thisWeek: any[] = [];
    const thisMonth: any[] = [];

    planningTasksData.forEach((task: any) => {
      console.log('[Dashboard] Processing task:', {
        id: task.id,
        rawDate: task.date,
        project: task.project?.name,
        task: task.task
      });

      // Skip tasks with no date or invalid date
      if (!task.date) {
        console.log('[Dashboard] Skipping task with no date:', task.id);
        return;
      }

      // Parse date as local date (task.date is stored as YYYY-MM-DD string)
      const taskDate = new Date(task.date + 'T00:00:00'); // Treat as local midnight

      // Check if date is valid
      if (isNaN(taskDate.getTime())) {
        console.log('[Dashboard] Skipping task with invalid date:', task.id, task.date);
        return;
      }

      // Get local date string without timezone conversion
      const taskDateStr = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;

      console.log('[Dashboard] Task date comparison:', {
        taskDateStr,
        todayStr,
        isToday: taskDateStr === todayStr,
        taskDate: taskDate.toISOString(),
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString(),
        isThisWeek: taskDate >= startOfWeek && taskDate <= endOfWeek
      });

      if (taskDateStr === todayStr) {
        today.push(task);
      }
      if (taskDate >= startOfWeek && taskDate <= endOfWeek) {
        thisWeek.push(task);
      }
      if (taskDate >= startOfMonth && taskDate <= endOfMonth) {
        thisMonth.push(task);
      }
    });

    console.log('=== DASHBOARD TASKS DEBUG ===');
    console.log('Today tasks:', today.map(t => ({ id: t.id, date: t.date, project: t.project?.name, task: t.task })));
    console.log('This week tasks:', thisWeek.map(t => ({ id: t.id, date: t.date, project: t.project?.name, task: t.task })));
    console.log('Today string for comparison:', todayStr);
    console.log('Week range:', { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() });

    return { today, thisWeek, thisMonth };
  }, [planningTasksData, todayStr, startOfWeek, endOfWeek]);

  const loading = deadlinesLoading || planningLoading;
  const refreshing = false;

  const onRefresh = async () => {
    await Promise.all([refetchDeadlines(), refetchPlanning()]);
  };

  // Mutation to toggle task completion
  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      return await planningTasksAPI.update(taskId, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planningTasks', 'dashboard', user?.id] });
    },
  });

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: currentColors.background.bg700 }]}>
        <ActivityIndicator size="large" color={currentColors.primary} />
      </View>
    );
  }

  const renderDeadlineItem = (deadline: any) => {
    // Parse as local date
    const deadlineDate = new Date(deadline.date + 'T00:00:00');
    const formattedDate = deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const getDeadlineTypeLabel = (type: string) => {
      switch (type) {
        case 'DEADLINE': return 'Deadline';
        case 'INTERNAL_DEADLINE': return 'Internal Deadline';
        case 'MILESTONE': return 'Milestone';
        default: return type;
      }
    };

    return (
      <View key={deadline.id} style={[styles.deadlineItem, { borderLeftColor: getDeadlineColor(deadline.deadlineType) }]}>
        <View style={styles.deadlineHeader}>
          <Text style={[styles.deadlineType, { color: currentColors.textSecondary }]}>
            {getDeadlineTypeLabel(deadline.deadlineType)}
          </Text>
          <Text style={[styles.deadlineDate, { color: currentColors.textSecondary }]}>{formattedDate}</Text>
        </View>
        {deadline.description && (
          <Text style={[styles.deadlineDescription, { color: currentColors.text }]}>{deadline.description}</Text>
        )}
        {deadline.project && (
          <Text style={[styles.deadlineClient, { color: currentColors.textSecondary }]}>
            {deadline.project.description || deadline.project.name}
          </Text>
        )}
      </View>
    );
  };

  const getDeadlineColor = (type: string) => {
    switch (type) {
      case 'DEADLINE': return planningColors.deadlineBg || '#ef4444';
      case 'INTERNAL_DEADLINE': return planningColors.internalDeadlineBg || '#f59e0b';
      case 'MILESTONE': return planningColors.milestoneBg || '#8b5cf6';
      default: return currentColors.primary;
    }
  };

  const getTaskColor = (project: any, taskDescription: string = '') => {
    const taskDescLower = taskDescription.toLowerCase();

    console.log('[Dashboard] getTaskColor called:', { project, taskDescription });

    // Check task description for category markers FIRST (works for tasks with OR without projects)
    if (taskDescription.includes('[OUT_OF_OFFICE]') || taskDescription.includes('[OUT OF OFFICE]') || taskDescription === 'Out of Office') {
      console.log('[Dashboard] Task is OUT_OF_OFFICE, returning:', planningColors.outOfOfficeBg);
      return planningColors.outOfOfficeBg || currentColors.primary;
    }
    if (taskDescription.includes('[TIME_OFF]') || taskDescription.includes('[TIME OFF]') || taskDescLower.includes('[time off]') || taskDescription === 'Time Off') {
      console.log('[Dashboard] Task is TIME_OFF, returning:', planningColors.timeOffBg);
      return planningColors.timeOffBg || currentColors.primary;
    }
    if (taskDescription.includes('[UNAVAILABLE]') || taskDescLower.includes('[unavailable]') || taskDescription === 'Unavailable') {
      console.log('[Dashboard] Task is UNAVAILABLE, returning:', planningColors.unavailableBg);
      return planningColors.unavailableBg || currentColors.primary;
    }

    // If no project, return default project task color
    if (!project) {
      console.log('[Dashboard] No project, returning default projectTaskBg:', planningColors.projectTaskBg);
      return planningColors.projectTaskBg || currentColors.primary;
    }

    const projectName = project.name || '';
    const projectColor = project.color;
    const projectNameLower = projectName.toLowerCase();

    // If project has a custom color assigned, use it
    if (projectColor) {
      console.log('[Dashboard] Using project custom color:', projectColor);
      return projectColor;
    }

    // Task types based on project name
    if (projectNameLower.includes('admin')) {
      console.log('[Dashboard] Matched Admin, returning:', planningColors.adminTaskBg);
      return planningColors.adminTaskBg || currentColors.primary;
    } else if (projectNameLower.includes('marketing')) {
      console.log('[Dashboard] Matched Marketing, returning:', planningColors.marketingTaskBg);
      return planningColors.marketingTaskBg || currentColors.primary;
    }

    console.log('[Dashboard] No match, returning default projectTaskBg:', planningColors.projectTaskBg);
    return planningColors.projectTaskBg || currentColors.primary; // Default color for regular projects
  };

  const renderTaskItem = (task: any, showCheckbox: boolean = false) => {
    console.log('=== RENDER TASK ITEM ===', task.project);
    // Parse as local date
    const taskDate = new Date(task.date + 'T00:00:00');
    const formattedDate = taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const isCompleted = task.completed || false;

    // Get task background color based on project (use project color if set, otherwise category-based colors)
    const taskBgColor = getTaskColor(task.project, task.task || '');
    console.log('=== TASK COLOR RESULT ===', task.project?.name, 'task:', task.task, '→', taskBgColor);

    // Determine task type label (for project name display only)
    const taskDescription = task.task || '';
    let taskTypeLabel = '';

    if (taskDescription.includes('[OUT_OF_OFFICE]') || taskDescription.includes('[OUT OF OFFICE]') || taskDescription === 'Out of Office') {
      taskTypeLabel = ' (Out of Office)';
    } else if (taskDescription.includes('[TIME_OFF]') || taskDescription.includes('[TIME OFF]') || taskDescription === 'Time Off') {
      taskTypeLabel = ' (Time Off)';
    } else if (taskDescription.includes('[UNAVAILABLE]') || taskDescription === 'Unavailable') {
      taskTypeLabel = ' (Unavailable)';
    }

    const handleToggleComplete = () => {
      toggleCompletionMutation.mutate({
        taskId: task.id,
        completed: !isCompleted,
      });
    };

    // Remove markers from display (but don't modify the actual data)
    const displayTaskDescription = taskDescription
      .replace(/\[OUT_OF_OFFICE\]/gi, '')
      .replace(/\[OUT OF OFFICE\]/gi, '')
      .replace(/\[TIME_OFF\]/gi, '')
      .replace(/\[TIME OFF\]/gi, '')
      .replace(/\[UNAVAILABLE\]/gi, '')
      .trim();

    return (
      <View key={task.id} style={[styles.taskItemNew, { borderLeftColor: taskBgColor }]}>
        <View style={styles.taskHeader}>
          <View style={styles.taskLeftContent}>
            {showCheckbox && (
              <TouchableOpacity
                onPress={handleToggleComplete}
                style={styles.checkboxContainer}
              >
                <HugeiconsIcon
                  icon={isCompleted ? CheckmarkCircle01Icon : CircleIcon}
                  size={20}
                  color={taskBgColor}
                />
              </TouchableOpacity>
            )}
            <View style={styles.taskTextContainer}>
              {task.project ? (
                <Text style={[styles.taskProjectName, { color: currentColors.textSecondary }]}>
                  {task.project.description || task.project.name}{taskTypeLabel}
                </Text>
              ) : taskTypeLabel ? (
                <Text style={[styles.taskProjectName, { color: currentColors.textSecondary }]}>
                  {taskTypeLabel.trim().replace(/^\(|\)$/g, '')}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.taskDateRight, { color: currentColors.textSecondary }]}>{formattedDate}</Text>
        </View>
        {displayTaskDescription && (task.project || !taskTypeLabel) && (
          <Text style={[styles.taskDescriptionText, { color: currentColors.text, textDecorationLine: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }]}>
            {displayTaskDescription}
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <Title style={[styles.greeting, { color: headerText }]}>
          Welcome back, {user?.firstName}!
        </Title>
      </View>

      {/* Upcoming Deadlines Section */}
      <Card style={[styles.sectionCard, { backgroundColor: cardBg }]}>
        <Card.Content>
          <Title style={{ color: currentColors.text }}>Upcoming Deadlines / Milestones</Title>
          {deadlinesData && deadlinesData.length > 0 ? (
            <View style={styles.deadlinesList}>
              {deadlinesData.slice(0, 5).map(renderDeadlineItem)}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
              No upcoming deadlines
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Today's Tasks Section */}
      <Card style={[styles.sectionCard, { backgroundColor: cardBg }]}>
        <Card.Content>
          <Title style={{ color: currentColors.text }}>Today's Tasks</Title>
          {tasksByPeriod.today.length > 0 ? (
            <View style={styles.tasksList}>
              {tasksByPeriod.today.map((task) => renderTaskItem(task, true))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
              No tasks scheduled for today
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* This Week's Tasks Section */}
      <Card style={[styles.sectionCard, { backgroundColor: cardBg }]}>
        <Card.Content>
          <Title style={{ color: currentColors.text }}>This Week's Tasks</Title>
          {tasksByPeriod.thisWeek.length > 0 ? (
            <View style={styles.tasksList}>
              {tasksByPeriod.thisWeek.slice(0, 5).map((task) => renderTaskItem(task, true))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
              No tasks scheduled for this week
            </Text>
          )}
        </Card.Content>
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
    fontWeight: '700',
    fontFamily: 'Josefin Sans',
  },
  sectionCard: {
    margin: 15,
    marginBottom: 10,
    borderRadius:4,
  },
  deadlinesList: {
    marginTop: 10,
  },
  deadlineItem: {
    padding: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    borderRadius: 4,
  },
  deadlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deadlineType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deadlineDate: {
    fontSize: 12,
  },
  deadlineDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  deadlineClient: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  tasksList: {
    marginTop: 10,
  },
  taskItemNew: {
    padding: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    borderRadius: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkboxContainer: {
    marginRight: 8,
  },
  taskTextContainer: {
    flex: 1,
  },
  taskProjectName: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  taskDateRight: {
    fontSize: 12,
  },
  taskDescriptionText: {
    fontSize: 14,
    marginTop: 4,
    marginLeft: 28,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  moreText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;
