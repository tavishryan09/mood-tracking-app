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
  const dashboardBg = getColorForElement('dashboard', 'background');
  const cardBg = getColorForElement('dashboard', 'cardBackground');
  const headerBg = getColorForElement('dashboard', 'headerBackground');
  const headerText = getColorForElement('dashboard', 'headerText');

  // Section card backgrounds
  const upcomingDeadlinesCardBg = getColorForElement('dashboard', 'upcomingDeadlinesCardBackground');
  const todaysTasksCardBg = getColorForElement('dashboard', 'todaysTasksCardBackground');
  const thisWeeksTasksCardBg = getColorForElement('dashboard', 'thisWeeksTasksCardBackground');

  // Section card text colors
  const upcomingDeadlinesCardTextColor = getColorForElement('dashboard', 'upcomingDeadlinesCardText');
  const todaysTasksCardTextColor = getColorForElement('dashboard', 'todaysTasksCardText');
  const thisWeeksTasksCardTextColor = getColorForElement('dashboard', 'thisWeeksTasksCardText');

  console.log('[Dashboard] Section card backgrounds:', {
    upcomingDeadlinesCardBg,
    todaysTasksCardBg,
    thisWeeksTasksCardBg,
  });

  // Task type backgrounds
  const dashboardProjectTaskBg = getColorForElement('dashboard', 'projectTaskBackground');
  const dashboardAdminTaskBg = getColorForElement('dashboard', 'adminTaskBackground');
  const dashboardMarketingTaskBg = getColorForElement('dashboard', 'marketingTaskBackground');
  const dashboardOutOfOfficeBg = getColorForElement('dashboard', 'outOfOfficeBackground');
  const dashboardUnavailableBg = getColorForElement('dashboard', 'unavailableBackground');
  const dashboardTimeOffBg = getColorForElement('dashboard', 'timeOffBackground');

  // Task type text colors
  const dashboardProjectTaskText = getColorForElement('dashboard', 'projectTaskText');
  const dashboardAdminTaskText = getColorForElement('dashboard', 'adminTaskText');
  const dashboardMarketingTaskText = getColorForElement('dashboard', 'marketingTaskText');
  const dashboardOutOfOfficeText = getColorForElement('dashboard', 'outOfOfficeText');
  const dashboardUnavailableText = getColorForElement('dashboard', 'unavailableText');
  const dashboardTimeOffText = getColorForElement('dashboard', 'timeOffText');

  // Deadline type backgrounds
  const dashboardDeadlineBg = getColorForElement('dashboard', 'deadlineBackground');
  const dashboardInternalDeadlineBg = getColorForElement('dashboard', 'internalDeadlineBackground');
  const dashboardMilestoneBg = getColorForElement('dashboard', 'milestoneBackground');

  // Deadline type text colors
  const dashboardDeadlineText = getColorForElement('dashboard', 'deadlineText');
  const dashboardInternalDeadlineText = getColorForElement('dashboard', 'internalDeadlineText');
  const dashboardMilestoneText = getColorForElement('dashboard', 'milestoneText');

  // Calculate date ranges using local timezone
  const today = new Date();
  // Get local date string (YYYY-MM-DD) without timezone conversion
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  console.log('[Dashboard] Today\'s date:', todayStr, 'Full date object:', today);

  const startOfWeek = new Date(today);
  // Calculate Monday as start of week (getDay() returns 0 for Sunday, 1 for Monday, etc.)
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
  startOfWeek.setDate(today.getDate() - daysFromMonday); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
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

      // Parse date - handle both formats: 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ'
      let taskDate: Date;
      if (task.date.includes('T')) {
        // ISO timestamp - extract date part only and treat as local
        const datePart = task.date.split('T')[0]; // Get 'YYYY-MM-DD'
        taskDate = new Date(datePart + 'T00:00:00');
      } else {
        // Date-only string, treat as local midnight
        taskDate = new Date(task.date + 'T00:00:00');
      }

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
      } else if (taskDate >= startOfWeek && taskDate <= endOfWeek) {
        // Only add to "This Week" if it's NOT today
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
      <View style={[styles.centered, { backgroundColor: dashboardBg }]}>
        <ActivityIndicator size="large" color={currentColors.primary} />
      </View>
    );
  }

  const renderDeadlineItem = (deadline: any) => {
    // Parse date - handle both formats: 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ'
    let deadlineDate: Date;
    if (deadline.date.includes('T')) {
      // ISO timestamp - extract date part only and treat as local
      const datePart = deadline.date.split('T')[0]; // Get 'YYYY-MM-DD'
      deadlineDate = new Date(datePart + 'T00:00:00');
    } else {
      // Date-only string, treat as local midnight
      deadlineDate = new Date(deadline.date + 'T00:00:00');
    }
    const formattedDate = deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const getDeadlineTypeLabel = (type: string) => {
      switch (type) {
        case 'DEADLINE': return 'Deadline';
        case 'INTERNAL_DEADLINE': return 'Internal Deadline';
        case 'MILESTONE': return 'Milestone';
        default: return type;
      }
    };

    const deadlineBgColor = getDeadlineBgColor(deadline.deadlineType);
    const deadlineBorderColor = getDeadlineBorderColor(deadline.deadlineType);
    const deadlineTextColor = getDeadlineTextColor(deadline.deadlineType);

    return (
      <View key={deadline.id} style={[styles.deadlineItem, { borderLeftColor: deadlineBorderColor, backgroundColor: deadlineBgColor }]}>
        <View style={styles.deadlineHeader}>
          <Text style={[styles.deadlineType, { color: deadlineTextColor }]}>
            {getDeadlineTypeLabel(deadline.deadlineType)}
          </Text>
          <Text style={[styles.deadlineDate, { color: deadlineTextColor, opacity: 0.8 }]}>{formattedDate}</Text>
        </View>
        {deadline.description && (
          <Text style={[styles.deadlineDescription, { color: deadlineTextColor }]}>{deadline.description}</Text>
        )}
        {deadline.project && (
          <Text style={[styles.deadlineClient, { color: deadlineTextColor, opacity: 0.7 }]}>
            {deadline.project.description || deadline.project.name}
          </Text>
        )}
      </View>
    );
  };

  // Get planning color for deadline borders (from planning colors context)
  const getDeadlineBorderColor = (type: string) => {
    switch (type) {
      case 'DEADLINE': return planningColors.deadlineBg || currentColors.primary;
      case 'INTERNAL_DEADLINE': return planningColors.internalDeadlineBg || currentColors.primary;
      case 'MILESTONE': return planningColors.milestoneBg || currentColors.primary;
      default: return currentColors.primary;
    }
  };

  // Get dashboard background color for deadline items
  const getDeadlineBgColor = (type: string) => {
    switch (type) {
      case 'DEADLINE': return dashboardDeadlineBg || currentColors.primary;
      case 'INTERNAL_DEADLINE': return dashboardInternalDeadlineBg || currentColors.primary;
      case 'MILESTONE': return dashboardMilestoneBg || currentColors.primary;
      default: return currentColors.primary;
    }
  };

  // Get dashboard text color for deadline items
  const getDeadlineTextColor = (type: string) => {
    switch (type) {
      case 'DEADLINE': return dashboardDeadlineText || currentColors.text;
      case 'INTERNAL_DEADLINE': return dashboardInternalDeadlineText || currentColors.text;
      case 'MILESTONE': return dashboardMilestoneText || currentColors.text;
      default: return currentColors.text;
    }
  };

  // Get planning color for borders and checkboxes (from planning colors context)
  const getPlanningColor = (project: any, taskDescription: string = '') => {
    const taskDescLower = taskDescription.toLowerCase();

    // Check task description for category markers FIRST
    if (taskDescription.includes('[OUT_OF_OFFICE]') || taskDescription.includes('[OUT OF OFFICE]') || taskDescription === 'Out of Office') {
      return planningColors.outOfOfficeBg || currentColors.primary;
    }
    if (taskDescription.includes('[TIME_OFF]') || taskDescription.includes('[TIME OFF]') || taskDescLower.includes('[time off]') || taskDescription === 'Time Off') {
      return planningColors.timeOffBg || currentColors.primary;
    }
    if (taskDescription.includes('[UNAVAILABLE]') || taskDescLower.includes('[unavailable]') || taskDescription === 'Unavailable') {
      return planningColors.unavailableBg || currentColors.primary;
    }

    // If no project, return default project task color
    if (!project) {
      return planningColors.projectTaskBg || currentColors.primary;
    }

    const projectName = project.name || '';
    const projectColor = project.color;
    const projectNameLower = projectName.toLowerCase();

    // If project has a custom color assigned, use it
    if (projectColor) {
      return projectColor;
    }

    // Task types based on project name
    if (projectNameLower.includes('admin')) {
      return planningColors.adminTaskBg || currentColors.primary;
    } else if (projectNameLower.includes('marketing')) {
      return planningColors.marketingTaskBg || currentColors.primary;
    }

    return planningColors.projectTaskBg || currentColors.primary;
  };

  // Get dashboard background color for task items
  const getTaskBgColor = (project: any, taskDescription: string = '') => {
    const taskDescLower = taskDescription.toLowerCase();

    console.log('[Dashboard] getTaskBgColor called:', { project, taskDescription });

    // Check task description for category markers FIRST (works for tasks with OR without projects)
    if (taskDescription.includes('[OUT_OF_OFFICE]') || taskDescription.includes('[OUT OF OFFICE]') || taskDescription === 'Out of Office') {
      console.log('[Dashboard] Task is OUT_OF_OFFICE, returning:', dashboardOutOfOfficeBg);
      return dashboardOutOfOfficeBg || currentColors.primary;
    }
    if (taskDescription.includes('[TIME_OFF]') || taskDescription.includes('[TIME OFF]') || taskDescLower.includes('[time off]') || taskDescription === 'Time Off') {
      console.log('[Dashboard] Task is TIME_OFF, returning:', dashboardTimeOffBg);
      return dashboardTimeOffBg || currentColors.primary;
    }
    if (taskDescription.includes('[UNAVAILABLE]') || taskDescLower.includes('[unavailable]') || taskDescription === 'Unavailable') {
      console.log('[Dashboard] Task is UNAVAILABLE, returning:', dashboardUnavailableBg);
      return dashboardUnavailableBg || currentColors.primary;
    }

    // If no project, return default project task color
    if (!project) {
      console.log('[Dashboard] No project, returning default projectTaskBg:', dashboardProjectTaskBg);
      return dashboardProjectTaskBg || currentColors.primary;
    }

    const projectName = project.name || '';
    const projectNameLower = projectName.toLowerCase();

    // Task types based on project name
    if (projectNameLower.includes('admin')) {
      console.log('[Dashboard] Matched Admin, returning:', dashboardAdminTaskBg);
      return dashboardAdminTaskBg || currentColors.primary;
    } else if (projectNameLower.includes('marketing')) {
      console.log('[Dashboard] Matched Marketing, returning:', dashboardMarketingTaskBg);
      return dashboardMarketingTaskBg || currentColors.primary;
    }

    console.log('[Dashboard] No match, returning default projectTaskBg:', dashboardProjectTaskBg);
    return dashboardProjectTaskBg || currentColors.primary; // Default color for regular projects
  };

  // Get dashboard text color for task items
  const getTaskTextColor = (project: any, taskDescription: string = '') => {
    const taskDescLower = taskDescription.toLowerCase();

    // Check task description for category markers FIRST
    if (taskDescription.includes('[OUT_OF_OFFICE]') || taskDescription.includes('[OUT OF OFFICE]') || taskDescription === 'Out of Office') {
      return dashboardOutOfOfficeText || currentColors.text;
    }
    if (taskDescription.includes('[TIME_OFF]') || taskDescription.includes('[TIME OFF]') || taskDescLower.includes('[time off]') || taskDescription === 'Time Off') {
      return dashboardTimeOffText || currentColors.text;
    }
    if (taskDescription.includes('[UNAVAILABLE]') || taskDescLower.includes('[unavailable]') || taskDescription === 'Unavailable') {
      return dashboardUnavailableText || currentColors.text;
    }

    // If no project, return default project task text color
    if (!project) {
      return dashboardProjectTaskText || currentColors.text;
    }

    const projectName = project.name || '';
    const projectNameLower = projectName.toLowerCase();

    // Task types based on project name
    if (projectNameLower.includes('admin')) {
      return dashboardAdminTaskText || currentColors.text;
    } else if (projectNameLower.includes('marketing')) {
      return dashboardMarketingTaskText || currentColors.text;
    }

    return dashboardProjectTaskText || currentColors.text;
  };

  const renderTaskItem = (task: any, showCheckbox: boolean = false) => {
    console.log('=== RENDER TASK ITEM ===', task.project);
    // Parse date - handle both formats: 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ'
    let taskDate: Date;
    if (task.date.includes('T')) {
      // ISO timestamp - extract date part only and treat as local
      const datePart = task.date.split('T')[0]; // Get 'YYYY-MM-DD'
      taskDate = new Date(datePart + 'T00:00:00');
    } else {
      // Date-only string, treat as local midnight
      taskDate = new Date(task.date + 'T00:00:00');
    }
    const formattedDate = taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const isCompleted = task.completed || false;

    // Get colors - dashboard bg for background, planning color for border/checkbox, dashboard text for text
    const taskBgColor = getTaskBgColor(task.project, task.task || '');
    const taskBorderColor = getPlanningColor(task.project, task.task || '');
    const taskTextColor = getTaskTextColor(task.project, task.task || '');
    console.log('=== TASK COLOR RESULT ===', task.project?.name, 'task:', task.task, 'bg:', taskBgColor, 'border:', taskBorderColor, 'text:', taskTextColor);

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
      <View key={task.id} style={[styles.taskItemNew, { borderLeftColor: taskBorderColor, backgroundColor: taskBgColor }]}>
        <View style={styles.taskRowWithCheckbox}>
          {showCheckbox && (
            <TouchableOpacity
              onPress={handleToggleComplete}
              style={styles.checkboxContainer}
            >
              <HugeiconsIcon
                icon={isCompleted ? CheckmarkCircle01Icon : CircleIcon}
                size={20}
                color={taskBorderColor}
              />
            </TouchableOpacity>
          )}
          <View style={styles.taskContent}>
            <View style={styles.taskHeader}>
              <View style={styles.taskTextContainer}>
                {task.project ? (
                  <Text style={[styles.taskProjectName, { color: taskTextColor, textDecorationLine: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }]}>
                    {task.project.description || task.project.name}{taskTypeLabel}
                  </Text>
                ) : taskTypeLabel ? (
                  <Text style={[styles.taskProjectName, { color: taskTextColor, textDecorationLine: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }]}>
                    {taskTypeLabel.trim().replace(/^\(|\)$/g, '')}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.taskDateRight, { color: taskTextColor, opacity: 0.8 }]}>{formattedDate}</Text>
            </View>
            {displayTaskDescription && (task.project || !taskTypeLabel) && (
              <Text style={[styles.taskDescriptionText, { color: taskTextColor, textDecorationLine: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }]}>
                {displayTaskDescription}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: dashboardBg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Upcoming Deadlines Section */}
      <Card style={[styles.sectionCard, { backgroundColor: upcomingDeadlinesCardBg }]}>
        <Card.Content>
          <Title style={{ color: upcomingDeadlinesCardTextColor }}>Upcoming Deadlines / Milestones</Title>
          {deadlinesData && deadlinesData.length > 0 ? (
            <View style={styles.deadlinesList}>
              {deadlinesData.slice(0, 5).map(renderDeadlineItem)}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: upcomingDeadlinesCardTextColor, opacity: 0.7 }]}>
              No upcoming deadlines
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Today's Tasks Section */}
      <Card style={[styles.sectionCard, { backgroundColor: todaysTasksCardBg }]}>
        <Card.Content>
          <Title style={{ color: todaysTasksCardTextColor }}>Today's Tasks</Title>
          {tasksByPeriod.today.length > 0 ? (
            <View style={styles.tasksList}>
              {tasksByPeriod.today.map((task) => renderTaskItem(task, true))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: todaysTasksCardTextColor, opacity: 0.7 }]}>
              No tasks scheduled for today
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* This Week's Tasks Section */}
      <Card style={[styles.sectionCard, { backgroundColor: thisWeeksTasksCardBg }]}>
        <Card.Content>
          <Title style={{ color: thisWeeksTasksCardTextColor }}>This Week's Tasks</Title>
          {tasksByPeriod.thisWeek.length > 0 ? (
            <View style={styles.tasksList}>
              {tasksByPeriod.thisWeek.map((task) => renderTaskItem(task, true))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: thisWeeksTasksCardTextColor, opacity: 0.7 }]}>
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
  taskRowWithCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 8,
    alignSelf: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
