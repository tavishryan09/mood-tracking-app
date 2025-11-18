import React, { useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, Platform, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CircleIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardScreenProps } from '../../types/navigation';
import { PlanningTask, DeadlineTask } from '../../types/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePlanningColors } from '../../contexts/PlanningColorsContext';
import { useCustomColorTheme } from '../../contexts/CustomColorThemeContext';
import { planningTasksAPI, deadlineTasksAPI } from '../../services/api';
import { logger } from '../../utils/logger';

const DashboardScreen = React.memo(({ navigation, route }: DashboardScreenProps) => {
  const { user } = useAuth();
  const { currentColors } = useTheme();
  const { planningColors } = usePlanningColors();
  const { getColorForElement } = useCustomColorTheme();
  const queryClient = useQueryClient();

  // Memoize all dashboard color lookups to prevent unnecessary re-renders
  const dashboardColors = useMemo(() => ({
    // Basic dashboard colors
    dashboardBg: getColorForElement('dashboard', 'background'),
    cardBg: getColorForElement('dashboard', 'cardBackground'),
    headerBg: getColorForElement('dashboard', 'headerBackground'),
    headerText: getColorForElement('dashboard', 'headerText'),

    // Section card backgrounds
    upcomingDeadlinesCardBg: getColorForElement('dashboard', 'upcomingDeadlinesCardBackground'),
    todaysTasksCardBg: getColorForElement('dashboard', 'todaysTasksCardBackground'),
    thisWeeksTasksCardBg: getColorForElement('dashboard', 'thisWeeksTasksCardBackground'),

    // Section card text colors
    upcomingDeadlinesCardTextColor: getColorForElement('dashboard', 'upcomingDeadlinesCardText'),
    todaysTasksCardTextColor: getColorForElement('dashboard', 'todaysTasksCardText'),
    thisWeeksTasksCardTextColor: getColorForElement('dashboard', 'thisWeeksTasksCardText'),

    // Task type backgrounds
    dashboardProjectTaskBg: getColorForElement('dashboard', 'projectTaskBackground'),
    dashboardAdminTaskBg: getColorForElement('dashboard', 'adminTaskBackground'),
    dashboardMarketingTaskBg: getColorForElement('dashboard', 'marketingTaskBackground'),
    dashboardOutOfOfficeBg: getColorForElement('dashboard', 'outOfOfficeBackground'),
    dashboardUnavailableBg: getColorForElement('dashboard', 'unavailableBackground'),
    dashboardTimeOffBg: getColorForElement('dashboard', 'timeOffBackground'),

    // Task type text colors
    dashboardProjectTaskText: getColorForElement('dashboard', 'projectTaskText'),
    dashboardAdminTaskText: getColorForElement('dashboard', 'adminTaskText'),
    dashboardMarketingTaskText: getColorForElement('dashboard', 'marketingTaskText'),
    dashboardOutOfOfficeText: getColorForElement('dashboard', 'outOfOfficeText'),
    dashboardUnavailableText: getColorForElement('dashboard', 'unavailableText'),
    dashboardTimeOffText: getColorForElement('dashboard', 'timeOffText'),

    // Deadline type backgrounds
    dashboardDeadlineBg: getColorForElement('dashboard', 'deadlineBackground'),
    dashboardInternalDeadlineBg: getColorForElement('dashboard', 'internalDeadlineBackground'),
    dashboardMilestoneBg: getColorForElement('dashboard', 'milestoneBackground'),

    // Deadline type text colors
    dashboardDeadlineText: getColorForElement('dashboard', 'deadlineText'),
    dashboardInternalDeadlineText: getColorForElement('dashboard', 'internalDeadlineText'),
    dashboardMilestoneText: getColorForElement('dashboard', 'milestoneText'),
  }), [getColorForElement]);

  // Destructure memoized colors
  const {
    dashboardBg, cardBg, headerBg, headerText,
    upcomingDeadlinesCardBg, todaysTasksCardBg, thisWeeksTasksCardBg,
    upcomingDeadlinesCardTextColor, todaysTasksCardTextColor, thisWeeksTasksCardTextColor,
    dashboardProjectTaskBg, dashboardAdminTaskBg, dashboardMarketingTaskBg,
    dashboardOutOfOfficeBg, dashboardUnavailableBg, dashboardTimeOffBg,
    dashboardProjectTaskText, dashboardAdminTaskText, dashboardMarketingTaskText,
    dashboardOutOfOfficeText, dashboardUnavailableText, dashboardTimeOffText,
    dashboardDeadlineBg, dashboardInternalDeadlineBg, dashboardMilestoneBg,
    dashboardDeadlineText, dashboardInternalDeadlineText, dashboardMilestoneText,
  } = dashboardColors;

  // Calculate date ranges using local timezone
  const today = new Date();
  // Get local date string (YYYY-MM-DD) without timezone conversion
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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
      const response = await deadlineTasksAPI.getAll({
        startDate: todayStr,
        endDate: endDateStr,
      });
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
      const response = await planningTasksAPI.getAll({
        userId: user?.id,
        startDate: todayStr,
        endDate: endOfMonthStr,
      });
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Organize planning tasks by period
  const tasksByPeriod = useMemo(() => {
    console.log('[Dashboard] Computing tasksByPeriod with safe null checks - v2025.11.18.2');
    if (!planningTasksData || !Array.isArray(planningTasksData)) {
      return { today: [], thisWeek: [], thisMonth: [] };
    }

    const today: any[] = [];
    const thisWeek: any[] = [];
    const thisMonth: any[] = [];

    try {
      planningTasksData.forEach((task: any) => {
        // Skip invalid tasks or tasks with no date
        if (!task || !task.date || typeof task.date !== 'string') {
          return;
        }

        // Parse date - handle both formats: 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ'
        let taskDate: Date;
        try {
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
            return;
          }
        } catch (dateError) {
          // Skip tasks with date parsing errors
          return;
        }

        // Get local date string without timezone conversion
        const taskDateStr = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;

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
    } catch (error) {
      logger.error('[Dashboard] Error processing planning tasks:', error, 'DashboardScreen');
    }

    return { today, thisWeek, thisMonth };
  }, [planningTasksData, todayStr, startOfWeek, endOfWeek, startOfMonth, endOfMonth]);

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

  // Get planning color for deadline borders (from planning colors context)
  const getDeadlineBorderColor = useCallback((type: string) => {
    switch (type) {
      case 'DEADLINE': return planningColors.deadlineBg || currentColors.primary;
      case 'INTERNAL_DEADLINE': return planningColors.internalDeadlineBg || currentColors.primary;
      case 'MILESTONE': return planningColors.milestoneBg || currentColors.primary;
      default: return currentColors.primary;
    }
  }, [planningColors, currentColors]);

  // Get dashboard background color for deadline items
  const getDeadlineBgColor = useCallback((type: string) => {
    switch (type) {
      case 'DEADLINE': return dashboardDeadlineBg || currentColors.primary;
      case 'INTERNAL_DEADLINE': return dashboardInternalDeadlineBg || currentColors.primary;
      case 'MILESTONE': return dashboardMilestoneBg || currentColors.primary;
      default: return currentColors.primary;
    }
  }, [dashboardDeadlineBg, dashboardInternalDeadlineBg, dashboardMilestoneBg, currentColors]);

  // Get dashboard text color for deadline items
  const getDeadlineTextColor = useCallback((type: string) => {
    switch (type) {
      case 'DEADLINE': return dashboardDeadlineText || currentColors.text;
      case 'INTERNAL_DEADLINE': return dashboardInternalDeadlineText || currentColors.text;
      case 'MILESTONE': return dashboardMilestoneText || currentColors.text;
      default: return currentColors.text;
    }
  }, [dashboardDeadlineText, dashboardInternalDeadlineText, dashboardMilestoneText, currentColors]);

  // Get planning color for borders and checkboxes (from planning colors context)
  const getPlanningColor = useCallback((project: any, taskDescription: string = '') => {
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
    const projectNameLower = projectName.toLowerCase();

    // Task types based on project name
    if (projectNameLower.includes('admin')) {
      return planningColors.adminTaskBg || currentColors.primary;
    } else if (projectNameLower.includes('marketing')) {
      return planningColors.marketingTaskBg || currentColors.primary;
    }

    return planningColors.projectTaskBg || currentColors.primary;
  }, [planningColors, currentColors]);

  // Get dashboard background color for task items
  const getTaskBgColor = useCallback((project: any, taskDescription: string = '') => {
    const taskDescLower = taskDescription.toLowerCase();

    // Check task description for category markers FIRST (works for tasks with OR without projects)
    if (taskDescription.includes('[OUT_OF_OFFICE]') || taskDescription.includes('[OUT OF OFFICE]') || taskDescription === 'Out of Office') {
      return dashboardOutOfOfficeBg || currentColors.primary;
    }
    if (taskDescription.includes('[TIME_OFF]') || taskDescription.includes('[TIME OFF]') || taskDescLower.includes('[time off]') || taskDescription === 'Time Off') {
      return dashboardTimeOffBg || currentColors.primary;
    }
    if (taskDescription.includes('[UNAVAILABLE]') || taskDescLower.includes('[unavailable]') || taskDescription === 'Unavailable') {
      return dashboardUnavailableBg || currentColors.primary;
    }

    // If no project, return default project task color
    if (!project) {
      return dashboardProjectTaskBg || currentColors.primary;
    }

    const projectName = project.name || '';
    const projectNameLower = projectName.toLowerCase();

    // Task types based on project name
    if (projectNameLower.includes('admin')) {
      return dashboardAdminTaskBg || currentColors.primary;
    } else if (projectNameLower.includes('marketing')) {
      return dashboardMarketingTaskBg || currentColors.primary;
    }

    return dashboardProjectTaskBg || currentColors.primary; // Default color for regular projects
  }, [dashboardOutOfOfficeBg, dashboardTimeOffBg, dashboardUnavailableBg, dashboardProjectTaskBg, dashboardAdminTaskBg, dashboardMarketingTaskBg, currentColors]);

  // Get dashboard text color for task items
  const getTaskTextColor = useCallback((project: any, taskDescription: string = '') => {
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

    // If no project, return default project task color
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
  }, [dashboardOutOfOfficeText, dashboardTimeOffText, dashboardUnavailableText, dashboardProjectTaskText, dashboardAdminTaskText, dashboardMarketingTaskText, currentColors]);

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

    // Build the title: "Task Type - Project Common Name"
    const projectName = deadline.project ? (deadline.project.description || deadline.project.name) : '';
    const titleText = projectName
      ? `${getDeadlineTypeLabel(deadline.deadlineType)} - ${projectName}`
      : getDeadlineTypeLabel(deadline.deadlineType);

    return (
      <View key={deadline.id} style={[styles.deadlineItem, { borderLeftColor: deadlineBorderColor, backgroundColor: deadlineBgColor }]}>
        <View style={styles.deadlineHeader}>
          <Text style={[styles.deadlineType, { color: deadlineTextColor }]}>
            {titleText}
          </Text>
          <Text style={[styles.deadlineDate, { color: deadlineTextColor, opacity: 0.8 }]}>{formattedDate}</Text>
        </View>
        {deadline.description && (
          <Text style={[styles.deadlineDescription, { color: deadlineTextColor }]}>{deadline.description}</Text>
        )}
      </View>
    );
  };

  const renderTaskItem = (task: any, showCheckbox: boolean = false) => {
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
          {deadlinesData?.length ? (
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
          {tasksByPeriod?.today?.length ? (
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
          {tasksByPeriod?.thisWeek?.length ? (
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
});

DashboardScreen.displayName = 'DashboardScreen';

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
    borderRadius: 10,
  },
  deadlinesList: {
    marginTop: 10,
  },
  deadlineItem: {
    padding: 10,
    borderLeftWidth: 10,
    marginBottom: 10,
    borderRadius: 5,
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
    padding: 10,
    borderLeftWidth: 10,
    marginBottom: 10,
    borderRadius: 5,
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
