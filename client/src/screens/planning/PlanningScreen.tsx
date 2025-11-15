import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, Text, TouchableOpacity, Modal, PanResponder, TextInput as RNTextInput, FlatList, Pressable, TouchableWithoutFeedback, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Title, ActivityIndicator, IconButton, Button, Checkbox, TextInput, Menu, Divider, Portal, Switch } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Settings01Icon, DragDropIcon, ArrowLeft01Icon, ArrowRight01Icon, CheckmarkCircle02Icon, CircleIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { usersAPI, projectsAPI, planningTasksAPI, settingsAPI, deadlineTasksAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePlanningColors } from '../../contexts/PlanningColorsContext';
import { useCustomColorTheme } from '../../contexts/CustomColorThemeContext';
import { colorPalettes } from '../../theme/colorPalettes';
import DeadlineTaskModal, { DeadlineTask, DeadlineTaskData } from '../../components/DeadlineTaskModal';
import { CustomDialog } from '../../components/CustomDialog';

const { width } = Dimensions.get('window');
const WEEK_WIDTH = width > 1200 ? 1200 : width - 40; // Max width for week view
const DAY_CELL_WIDTH = 180; // Fixed width for each day column
const USER_COLUMN_WIDTH = 100; // Fixed width for user names column
const TIME_BLOCK_HEIGHT = 48; // Height for each 2-hour block

const PlanningScreen = () => {
  const { currentColors, selectedPalette } = useTheme();
  const { user } = useAuth();
  const { planningColors } = usePlanningColors();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuarter, setCurrentQuarter] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      quarter: Math.floor(now.getMonth() / 3) + 1,
    };
  });
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // Monday-based week: Monday = 0, Sunday = 6
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentWeekRef = useRef<HTMLElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [visibleWeekIndex, setVisibleWeekIndex] = useState(0);
  const [visibleUserIds, setVisibleUserIds] = useState<string[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [dragOverUserId, setDragOverUserId] = useState<string | null>(null);

  // View preferences
  const [showWeekendsDefault, setShowWeekendsDefault] = useState(false);
  const [defaultProjectsTableView, setDefaultProjectsTableView] = useState(false);

  // Project assignment modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDeletePlanningDialog, setShowDeletePlanningDialog] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<{
    userId: string;
    date: string;
    blockIndex: number;
  } | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  // Status checkboxes
  const [isOutOfOffice, setIsOutOfOffice] = useState(false);
  const [isTimeOff, setIsTimeOff] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  // Repeat event configuration
  const [isRepeatEvent, setIsRepeatEvent] = useState(false);
  const [repeatType, setRepeatType] = useState<'weekly' | 'monthly'>('weekly');
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Weekly repeat options
  const [repeatWeeklyDays, setRepeatWeeklyDays] = useState<boolean[]>([false, false, false, false, false, false, false]); // Mon-Sun

  // Monthly repeat options
  const [monthlyRepeatType, setMonthlyRepeatType] = useState<'date' | 'weekday'>('date'); // Same date vs specific weekday
  const [monthlyWeekNumber, setMonthlyWeekNumber] = useState(1); // 1st, 2nd, 3rd, 4th week
  const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState(1); // Monday=1, Sunday=0

  const [blockAssignments, setBlockAssignments] = useState<{
    [key: string]: { id?: string; projectId: string; projectName: string; task?: string; span: number };
  }>({});

  // Ref to hold the latest blockAssignments for drag operations
  const blockAssignmentsRef = useRef(blockAssignments);

  // Double-click detection
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [clickedBlock, setClickedBlock] = useState<string | null>(null);

  // Double-click detection for deadline tasks
  const [deadlineClickTimer, setDeadlineClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [clickedDeadlineSlot, setClickedDeadlineSlot] = useState<string | null>(null);

  // Hover state
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [draggingEdge, setDraggingEdge] = useState<{
    blockKey: string;
    edge: 'top' | 'bottom';
    startY: number;
    userId: string;
    date: string;
    blockIndex: number;
    initialSpan: number;
  } | null>(null);

  // Copy/paste state
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [copiedCell, setCopiedCell] = useState<{
    projectId: string;
    projectName: string;
    task?: string;
    span: number;
    sourceId?: string; // ID of the original task (for reposition mode)
    sourceBlockKey?: string; // Block key of source cell (for reposition mode)
  } | null>(null);

  // Mobile gesture state
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [lastTapBlock, setLastTapBlock] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const [longPressAction, setLongPressAction] = useState<{
    userId: string;
    date: string;
    blockIndex: number;
    assignment: { id?: string; projectId: string; projectName: string; task?: string; span: number };
  } | null>(null);
  const [repositionMode, setRepositionMode] = useState(false);

  // Deadline task copy/paste state
  const [copiedDeadlineTask, setCopiedDeadlineTask] = useState<{
    projectId: string | null;
    clientId: string | null;
    description: string;
    deadlineType: 'DEADLINE' | 'INTERNAL_DEADLINE' | 'MILESTONE';
    sourceId?: string; // ID of the original task (for reposition mode)
    sourceSlotKey?: string; // Slot key of source cell (for reposition mode)
  } | null>(null);
  const [longPressDeadlineAction, setLongPressDeadlineAction] = useState<{
    task: DeadlineTask;
    date: Date;
    slotIndex: number;
  } | null>(null);
  const [longPressDeadlineTimer, setLongPressDeadlineTimer] = useState<NodeJS.Timeout | null>(null);
  const [repositionDeadlineMode, setRepositionDeadlineMode] = useState(false);
  const [selectedDeadlineCell, setSelectedDeadlineCell] = useState<string | null>(null);

  // CustomDialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteTaskBlockKey, setDeleteTaskBlockKey] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showNoticeDialog, setShowNoticeDialog] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showDeleteDeadlineDialog, setShowDeleteDeadlineDialog] = useState(false);
  const [deleteDeadlineTaskId, setDeleteDeadlineTaskId] = useState<string | null>(null);

  // Missing state variable for color menu
  const [openColorMenu, setOpenColorMenu] = useState<string | null>(null);

  // Get planning page colors from Element Color Mapper
  const { getColorForElement } = useCustomColorTheme();

  // Planning Grid colors from Element Color Mapper
  const screenBackground = getColorForElement('planningGrid', 'screenBackground');
  const headerBg = getColorForElement('planningGrid', 'headerBackground');
  const headerText = getColorForElement('planningGrid', 'headerText');
  const headerIcon = getColorForElement('planningGrid', 'headerIcon');
  const settingsIconColor = getColorForElement('planningGrid', 'settingsIconColor');
  const dateCellBg = getColorForElement('planningGrid', 'dateCellBackground');
  const dateCellText = getColorForElement('planningGrid', 'dateCellText');
  const deadlinesRowBg = getColorForElement('planningGrid', 'deadlinesRowBackground');
  const deadlinesRowText = getColorForElement('planningGrid', 'deadlinesRowText');
  const emptyDeadlineCellBg = getColorForElement('planningGrid', 'emptyDeadlineCellBackground');
  const teamMemberColBg = getColorForElement('planningGrid', 'teamMemberCellBackground');
  const teamMemberColText = getColorForElement('planningGrid', 'teamMemberCellText');
  const weekdayHeaderBg = getColorForElement('planningGrid', 'weekdayHeaderBackground');
  const weekdayHeaderFont = getColorForElement('planningGrid', 'weekdayHeaderText');
  const weekendHeaderBg = getColorForElement('planningGrid', 'weekendHeaderBackground');
  const weekendHeaderFont = getColorForElement('planningGrid', 'weekendHeaderText');
  const weekdayCellBg = getColorForElement('planningGrid', 'weekdayCellBackground');
  const weekendCellBg = getColorForElement('planningGrid', 'weekendCellBackground');
  const todayCellBg = getColorForElement('planningGrid', 'todayCellBackground');
  const todayHeaderBg = getColorForElement('planningGrid', 'todayHeaderBackground');
  const todayHeaderFont = getColorForElement('planningGrid', 'todayHeaderText');
  const headerBorderColor = getColorForElement('planningGrid', 'headerBorderColor');
  const cellBorderColor = getColorForElement('planningGrid', 'cellBorderColor');
  const teamMemberBorderColor = getColorForElement('planningGrid', 'teamMemberBorderColor');

  // Legacy color mappings (for backward compatibility)
  const calendarHeaderBg = planningColors.calendarHeaderBg || headerBg;
  const calendarHeaderFont = planningColors.calendarHeaderFont || headerText;
  const prevNextIconColor = planningColors.prevNextIconColor || headerIcon;
  const projectTaskBg = planningColors.projectTaskBg || currentColors.primary;
  const projectTaskFont = planningColors.projectTaskFont || currentColors.white;
  const adminTaskBg = planningColors.adminTaskBg || currentColors.secondary;
  const adminTaskFont = planningColors.adminTaskFont || currentColors.white;
  const marketingTaskBg = planningColors.marketingTaskBg || currentColors.planning.marketingTask;
  const marketingTaskFont = planningColors.marketingTaskFont || currentColors.white;
  const outOfOfficeBg = planningColors.outOfOfficeBg || currentColors.planning.outOfOffice;
  const outOfOfficeFont = planningColors.outOfOfficeFont || currentColors.planning.outOfOfficeFont;
  const unavailableBg = planningColors.unavailableBg || currentColors.planning.unavailable;
  const unavailableFont = planningColors.unavailableFont || currentColors.white;
  const timeOffBg = getColorForElement('planningTasks', 'timeOffBackground');
  const timeOffFont = getColorForElement('planningTasks', 'timeOffText');
  const deadlineRowBg = planningColors.deadlineRowBg || currentColors.background.bg500;
  const deadlineBg = getColorForElement('planningTasks', 'deadlineBackground');
  const deadlineFont = getColorForElement('planningTasks', 'deadlineText');
  const internalDeadlineBg = getColorForElement('planningTasks', 'internalDeadlineBackground');
  const internalDeadlineFont = getColorForElement('planningTasks', 'internalDeadlineText');
  const milestoneBg = getColorForElement('planningTasks', 'milestoneBackground');
  const milestoneFont = getColorForElement('planningTasks', 'milestoneText');

  // Drag and drop state for moving tasks
  const [draggedTask, setDraggedTask] = useState<{
    id: string;
    userId: string;
    date: string;
    blockIndex: number;
    projectId: string;
    projectName: string;
    task?: string;
    span: number;
  } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Drag and drop state for deadline tasks
  const [draggedDeadlineTask, setDraggedDeadlineTask] = useState<DeadlineTask | null>(null);
  const [dragOverDeadlineCell, setDragOverDeadlineCell] = useState<string | null>(null);

  // Deadline tasks state
  const [deadlineTasks, setDeadlineTasks] = useState<DeadlineTask[]>([]);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [selectedDeadlineSlot, setSelectedDeadlineSlot] = useState<{
    date: Date;
    slotIndex: number;
  } | null>(null);
  const [editingDeadlineTask, setEditingDeadlineTask] = useState<DeadlineTask | null>(null);

  // Ref to store the span at the start of drag (for collapse detection)
  const dragStartSpanRef = useRef<number>(1);

  // Ref to track if we're currently dragging an edge (to prevent cell drag)
  const isDraggingEdgeRef = useRef<boolean>(false);

  // Generate color options from current palette's iOS colors only
  const colorOptions: Array<{ label: string; value: string }> = React.useMemo(() => {
    const palette = colorPalettes[selectedPalette];
    if (!palette.ios) return [];

    return Object.entries(palette.ios).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
      value: value,
    }));
  }, [selectedPalette]);

  // Helper function to render a color picker
  const renderColorPicker = (label: string, value: string, onSelect: (color: string) => void, defaultColor: string, menuKey: string) => {
    const displayColor = value || defaultColor;
    const displayLabel = value ? colorOptions.find(c => c.value === value)?.label || 'Custom' : 'Select Color';

    return (
      <View style={styles.colorPickerRow}>
        <Text style={[styles.colorLabel, { color: currentColors.textSecondary }]}>{label}:</Text>
        <Portal>
          <Menu
            visible={openColorMenu === menuKey}
            onDismiss={() => setOpenColorMenu(null)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setOpenColorMenu(menuKey)}
                style={styles.colorButton}
                contentStyle={{ justifyContent: 'flex-start' }}
              >
                <View style={[styles.colorPreview, { backgroundColor: displayColor, borderColor: currentColors.border }]} />
                <Text style={{ color: currentColors.text }}>{displayLabel}</Text>
              </Button>
            }
          >
            {colorOptions.map((color) => (
              <Menu.Item
                key={color.value}
                onPress={() => {
                  onSelect(color.value);
                  setOpenColorMenu(null);
                }}
                title={color.label}
                leadingIcon={() => <View style={[styles.colorPreview, { backgroundColor: color.value, borderColor: currentColors.border }]} />}
              />
            ))}
          </Menu>
        </Portal>
      </View>
    );
  };

  // Update ref whenever blockAssignments changes
  useEffect(() => {
    blockAssignmentsRef.current = blockAssignments;
  }, [blockAssignments]);

  // Keyboard event handler for deleting selected cells
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = async (event: KeyboardEvent) => {
      // Check if Delete or Backspace key is pressed
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't delete if user is typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        // Don't delete if modal is open
        if (showProjectModal || showManageModal) {
          return;
        }

        // Check if a cell is selected
        if (!selectedCell) {
          return;
        }

        // Prevent default behavior
        event.preventDefault();

        // Parse the selected cell key to get userId, date, and blockIndex
        const parts = selectedCell.split('-');
        if (parts.length < 3) return;

        const userId = parts[0];
        const blockIndex = parseInt(parts[parts.length - 1], 10);
        const date = parts.slice(1, -1).join('-');

        const blockKey = `${userId}-${date}-${blockIndex}`;
        const existing = blockAssignments[blockKey];

        if (!existing?.id) {
          return;
        }

        // Show confirmation dialog instead of using confirm()
        setDeleteTaskId(existing.id);
        setDeleteTaskBlockKey(blockKey);
        setShowDeleteDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCell, blockAssignments, showProjectModal, showManageModal]);

  // Debug: Log planning colors when they change
  useEffect(() => {

  }, [planningColors]);

  useFocusEffect(
    React.useCallback(() => {

      setHasScrolled(false);
      loadData();
    }, [currentQuarter])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      // Calculate quarter range for loading planning tasks
      const { year, quarter } = currentQuarter;
      const startMonth = (quarter - 1) * 3;
      const quarterStart = new Date(year, startMonth, 1);
      quarterStart.setHours(0, 0, 0, 0);

      const quarterEnd = new Date(year, startMonth + 3, 0);
      quarterEnd.setHours(23, 59, 59, 999);

      // Load users, projects, planning tasks, and deadline tasks for the entire quarter
      const [usersResponse, projectsResponse, planningTasksResponse, deadlineTasksResponse] = await Promise.all([
        usersAPI.getAll(),
        projectsAPI.getAll(),
        planningTasksAPI.getAll({
          startDate: quarterStart.toISOString(),
          endDate: quarterEnd.toISOString(),
        }),
        deadlineTasksAPI.getAll({
          startDate: quarterStart.toISOString(),
          endDate: quarterEnd.toISOString(),
        }),
      ]);

      // Set deadline tasks
      setDeadlineTasks(deadlineTasksResponse.data);

      let loadedUsers = usersResponse.data;
      setProjects(projectsResponse.data);
      setFilteredProjects(projectsResponse.data);

      // Transform planning tasks into blockAssignments with span values
      const assignments: { [key: string]: { id?: string; projectId: string; projectName: string; task?: string; span: number } } = {};

      planningTasksResponse.data.forEach((task: any) => {
        const dateString = new Date(task.date).toISOString().split('T')[0];
        const blockKey = `${task.userId}-${dateString}-${task.blockIndex}`;

        // Get span directly from task (migrated from expansionBlocks)
        const span = task.span || 1;

        // Check if this is a status event (no projectId means status event)
        const isStatusEvent = !task.projectId;

        // Check if this is a project with Out of Office status
        const hasOutOfOfficeMarker = task.task?.startsWith('[OUT_OF_OFFICE]');
        const isProjectWithOutOfOffice = task.projectId && hasOutOfOfficeMarker;

        // Determine project name
        let projectName = '';
        let taskDescription = task.task;

        if (isStatusEvent) {
          // Pure status event - use task field as project name
          projectName = task.task || '';
          taskDescription = undefined;
        } else if (isProjectWithOutOfOffice) {
          // Project + Out of Office - append status to project name
          projectName = (task.project?.description || task.project?.name || '') + ' (Out of Office)';
          // Extract task description after marker
          taskDescription = task.task.replace('[OUT_OF_OFFICE]', '') || undefined;
        } else {
          // Regular project
          projectName = task.project?.description || task.project?.name || '';
          taskDescription = task.task || undefined;
        }

        assignments[blockKey] = {
          id: task.id,
          projectId: task.projectId,
          projectName: projectName,
          task: taskDescription,
          span: span,
        };

      });

      setBlockAssignments(assignments);

      // Load user preferences: try database first, then global defaults
      try {
        let userIds: string[] | null = null;
        let visibleIds: string[] | null = null;

        // Try to load user-specific preferences from database
        try {
          const userOrderResponse = await settingsAPI.user.get(`planning_user_order`);
          if (userOrderResponse.data?.value) {
            userIds = userOrderResponse.data.value;

          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('[PlanningScreen] Error loading user order:', error);
          }
        }

        try {
          const visibleUsersResponse = await settingsAPI.user.get(`planning_visible_users`);
          if (visibleUsersResponse.data?.value) {
            visibleIds = visibleUsersResponse.data.value;

          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('[PlanningScreen] Error loading visible users:', error);
          }
        }

        // If no user-specific preferences, try global defaults
        if (!userIds || !visibleIds) {
          const globalDefaults = await loadGlobalDefaults();
          if (globalDefaults) {

            if (!userIds && globalDefaults.userOrder) {
              userIds = globalDefaults.userOrder;
            }
            if (!visibleIds && globalDefaults.visibleUsers) {
              visibleIds = globalDefaults.visibleUsers;
            }
          }
        }

        // Apply user order if available
        if (userIds) {
          const orderedUsers: any[] = [];
          userIds.forEach((userId: string) => {
            const user = loadedUsers.find((u: any) => u.id === userId);
            if (user) {
              orderedUsers.push(user);
            }
          });

          // Add any new users that weren't in the saved order
          loadedUsers.forEach((user: any) => {
            if (!userIds!.includes(user.id)) {
              orderedUsers.push(user);
            }
          });

          loadedUsers = orderedUsers;
        }

        setUsers(loadedUsers);

        // Apply visible users if available, otherwise default to all visible
        if (visibleIds) {
          setVisibleUserIds(visibleIds);
        } else {
          setVisibleUserIds(loadedUsers.map((u: any) => u.id));
        }
      } catch (error) {
        console.error('[PlanningScreen] Error loading preferences:', error);
        // Fall back to defaults
        setVisibleUserIds(loadedUsers.map((u: any) => u.id));
      }
    } catch (error) {
      console.error('[PlanningScreen] Error loading data:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get ISO week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Get quarter from date
  const getQuarterFromDate = (date: Date): number => {
    return Math.floor(date.getMonth() / 3) + 1;
  };

  // Generate weeks for the current quarter
  const generateQuarterWeeks = () => {
    const { year, quarter } = currentQuarter;
    const startMonth = (quarter - 1) * 3;

    // Find the first Monday of the quarter (or before if quarter doesn't start on Monday)
    const quarterStart = new Date(year, startMonth, 1);
    const firstMonday = new Date(quarterStart);
    const dayOfWeek = quarterStart.getDay();
    // Monday-based week: if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    firstMonday.setDate(quarterStart.getDate() - daysFromMonday);

    // Find the last day of the quarter
    const quarterEnd = new Date(year, startMonth + 3, 0);

    // Generate all weeks in the quarter
    const weeks: Date[] = [];
    const currentWeek = new Date(firstMonday);

    while (currentWeek <= quarterEnd) {
      weeks.push(new Date(currentWeek));
      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    return weeks;
  };

  // Scroll to next week
  const loadNextWeek = () => {
    if (Platform.OS === 'web') {
      const scrollContainer = scrollContainerRef.current || (document.querySelector('[data-planning-scroll]') as HTMLDivElement);
      if (!scrollContainer) {

        return;
      }

      const nextWeekIndex = visibleWeekIndex + 1;
      const scrollLeft = nextWeekIndex * 7 * DAY_CELL_WIDTH;

      scrollContainer.scrollLeft = scrollLeft;
      setVisibleWeekIndex(nextWeekIndex);
    }
  };

  // Scroll to previous week
  const loadPreviousWeek = () => {
    if (Platform.OS === 'web') {
      const scrollContainer = scrollContainerRef.current || (document.querySelector('[data-planning-scroll]') as HTMLDivElement);
      if (!scrollContainer) {

        return;
      }

      const prevWeekIndex = Math.max(0, visibleWeekIndex - 1);
      const scrollLeft = prevWeekIndex * 7 * DAY_CELL_WIDTH;

      scrollContainer.scrollLeft = scrollLeft;
      setVisibleWeekIndex(prevWeekIndex);
    }
  };

  // Handle managing team members visibility
  const handleManageTeamMembers = () => {
    setShowManageModal(true);
  };

  // Toggle user visibility
  const toggleUserVisibility = (userId: string) => {
    setVisibleUserIds((prev) => {
      if (prev.includes(userId)) {
        // Don't allow hiding all users - at least one must be visible
        if (prev.length === 1) {
          setNoticeMessage('At least one team member must be visible in the planning view.');
          setShowNoticeDialog(true);
          return prev;
        }
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle drag start
  const handleDragStart = (userId: string) => {
    setDraggedUserId(userId);
  };

  // Handle drag over
  const handleDragOver = (userId: string) => {
    if (draggedUserId && draggedUserId !== userId) {
      setDragOverUserId(userId);
    }
  };

  // Handle drop - reorder users
  const handleDrop = (targetUserId: string) => {
    if (!draggedUserId || draggedUserId === targetUserId) {
      setDraggedUserId(null);
      setDragOverUserId(null);
      return;
    }

    // Reorder the users array
    const newUsers = [...users];
    const draggedIndex = newUsers.findIndex((u) => u.id === draggedUserId);
    const targetIndex = newUsers.findIndex((u) => u.id === targetUserId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove dragged user
      const [draggedUser] = newUsers.splice(draggedIndex, 1);
      // Insert at target position
      newUsers.splice(targetIndex, 0, draggedUser);
      setUsers(newUsers);
    }

    setDraggedUserId(null);
    setDragOverUserId(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedUserId(null);
    setDragOverUserId(null);
  };

  // Handle task drag start
  const handleTaskDragStart = (e: any, userId: string, date: string, blockIndex: number) => {
    const blockKey = `${userId}-${date}-${blockIndex}`;
    const assignment = blockAssignments[blockKey];

    if (!assignment || !assignment.id) {
      return;
    }

    setDraggedTask({
      id: assignment.id,
      userId,
      date,
      blockIndex,
      projectId: assignment.projectId,
      projectName: assignment.projectName,
      task: assignment.task,
      span: assignment.span,
    });

  };

  // Handle task drag over cell
  const handleTaskDragOver = (e: any, userId: string, date: string, blockIndex: number) => {
    e.preventDefault();

    if (!draggedTask) {

      return;
    }

    // Check if all cells needed for the span are available
    const span = draggedTask.span;
    let canDrop = true;

    // Check if span would exceed block limit
    if (blockIndex + span > 4) {

      canDrop = false;
    }

    // Check each cell in the span
    if (canDrop) {
      for (let i = 0; i < span; i++) {
        const checkBlockKey = `${userId}-${date}-${blockIndex + i}`;
        const sourceBlockKey = `${draggedTask.userId}-${draggedTask.date}-${draggedTask.blockIndex}`;

        // Allow dropping on the source location
        if (checkBlockKey !== sourceBlockKey) {
          const existingAssignment = blockAssignments[checkBlockKey];
          if (existingAssignment) {

            canDrop = false;
            break;
          }
        }
      }
    }

    // Set drag over highlight for all cells in the span (or null if can't drop)
    if (canDrop) {
      const blockKey = `${userId}-${date}-${blockIndex}`;

      setDragOverCell(blockKey);
    } else {

      setDragOverCell(null);
    }
  };

  // Handle task drop
  const handleTaskDrop = async (e: any, targetUserId: string, targetDate: string, targetBlockIndex: number) => {
    e.preventDefault();

    if (!draggedTask) {
      return;
    }

    const targetBlockKey = `${targetUserId}-${targetDate}-${targetBlockIndex}`;
    const sourceBlockKey = `${draggedTask.userId}-${draggedTask.date}-${draggedTask.blockIndex}`;

    // Can't drop on the same cell
    if (targetBlockKey === sourceBlockKey) {
      setDraggedTask(null);
      setDragOverCell(null);
      return;
    }

    // Check if span would exceed block limit
    const span = draggedTask.span;
    if (targetBlockIndex + span > 4) {

      setErrorMessage('Cannot move task here - would exceed available blocks');
      setShowErrorDialog(true);
      setDraggedTask(null);
      setDragOverCell(null);
      return;
    }

    // Check if ALL cells needed for the span are empty
    for (let i = 0; i < span; i++) {
      const checkBlockKey = `${targetUserId}-${targetDate}-${targetBlockIndex + i}`;

      // Skip checking the source cell (we're moving from there)
      if (checkBlockKey === sourceBlockKey) {
        continue;
      }

      const existingAssignment = blockAssignments[checkBlockKey];
      if (existingAssignment) {

        setErrorMessage('Cannot move task here - target cells are not empty');
        setShowErrorDialog(true);
        setDraggedTask(null);
        setDragOverCell(null);
        return;
      }
    }

    try {
      // Update the task to move it to the new location
      // This preserves all properties including status events and ensures proper Outlook sync
      const response = await planningTasksAPI.update(draggedTask.id, {
        userId: targetUserId,
        date: targetDate,
        blockIndex: targetBlockIndex,
      });

      // Format the task data the same way we do in loadData
      const task = response.data;
      const isStatusEvent = !task.projectId;
      const hasOutOfOfficeMarker = task.task?.startsWith('[OUT_OF_OFFICE]');
      const isProjectWithOutOfOffice = task.projectId && hasOutOfOfficeMarker;

      let projectName: string;
      let taskDescription: string | undefined;

      if (isStatusEvent) {
        // Pure status event (Out of Office, Time Off, Unavailable)
        projectName = task.task || '';
        taskDescription = undefined;
      } else if (isProjectWithOutOfOffice) {
        // Project + Out of Office - append status to project name
        projectName = (task.project?.description || task.project?.name || '') + ' (Out of Office)';
        // Extract task description after marker
        taskDescription = task.task.replace('[OUT_OF_OFFICE]', '') || undefined;
      } else {
        // Regular project task
        projectName = task.project?.description || task.project?.name || '';
        taskDescription = task.task || undefined;
      }

      // Update state
      setBlockAssignments(prev => {
        const newAssignments = { ...prev };
        // Remove from old location
        delete newAssignments[sourceBlockKey];
        // Add to new location with properly formatted display data
        newAssignments[targetBlockKey] = {
          id: task.id,
          projectId: task.projectId,
          projectName: projectName,
          task: taskDescription,
          span: task.span,
        };
        return newAssignments;
      });

    } catch (error) {
      console.error('[DRAG TASK] Error moving task:', error);
      setErrorMessage('Failed to move task');
      setShowErrorDialog(true);
      // Reload to restore correct state
      await loadData();
    }

    setDraggedTask(null);
    setDragOverCell(null);
  };

  // Handle task drag end
  const handleTaskDragEnd = () => {
    setDraggedTask(null);
    setDragOverCell(null);
  };

  // Handle deadline task drag start
  const handleDeadlineTaskDragStart = (e: React.DragEvent, task: DeadlineTask) => {
    e.stopPropagation();
    setDraggedDeadlineTask(task);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  // Handle deadline cell drag over
  const handleDeadlineCellDragOver = (e: React.DragEvent, date: Date, slotIndex: number) => {
    e.preventDefault();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const cellKey = `${dateString}-${slotIndex}`;
    setDragOverDeadlineCell(cellKey);
  };

  // Handle deadline task drop
  const handleDeadlineTaskDrop = async (e: React.DragEvent, targetDate: Date, targetSlotIndex: number) => {
    e.preventDefault();

    if (!draggedDeadlineTask) {
      return;
    }

    // Use local date (not UTC) since targetDate is already a local Date object representing the day
    const targetDateString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const sourceDateObj = new Date(draggedDeadlineTask.date);
    // Use UTC for source since it comes from the database as UTC
    const sourceDateString = `${sourceDateObj.getUTCFullYear()}-${String(sourceDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(sourceDateObj.getUTCDate()).padStart(2, '0')}`;

    // Can't drop on the same slot
    if (targetDateString === sourceDateString && targetSlotIndex === draggedDeadlineTask.slotIndex) {
      setDraggedDeadlineTask(null);
      setDragOverDeadlineCell(null);
      return;
    }

    // Check if target slot is already occupied
    const existingTask = deadlineTasks.find((task) => {
      const taskDate = new Date(task.date);
      const taskDateString = `${taskDate.getUTCFullYear()}-${String(taskDate.getUTCMonth() + 1).padStart(2, '0')}-${String(taskDate.getUTCDate()).padStart(2, '0')}`;
      return taskDateString === targetDateString && task.slotIndex === targetSlotIndex;
    });

    if (existingTask) {
      setErrorMessage('Target slot is already occupied');
      setShowErrorDialog(true);
      setDraggedDeadlineTask(null);
      setDragOverDeadlineCell(null);
      return;
    }

    try {
      // Store as 12:01 AM Pacific Time (PT is UTC-8, so 08:01 UTC = 00:01 PST)
      // This ensures the date is correct for both Pacific and Eastern timezones
      const targetDateISO = `${targetDateString}T08:01:00.000Z`;

      // Update the deadline task
      const response = await deadlineTasksAPI.update(draggedDeadlineTask.id, {
        date: targetDateISO,
        slotIndex: targetSlotIndex,
      });

      // Update state with new array to trigger re-render
      const updatedTasks = deadlineTasks.map((task) =>
        task.id === draggedDeadlineTask.id ? response.data : task
      );

      setDeadlineTasks(updatedTasks);

    } catch (error) {
      console.error('[DRAG DEADLINE] Error moving deadline task:', error);
      setErrorMessage('Failed to move deadline task');
      setShowErrorDialog(true);
    }

    setDraggedDeadlineTask(null);
    setDragOverDeadlineCell(null);
  };

  // Handle deadline task drag end
  const handleDeadlineTaskDragEnd = () => {
    setDraggedDeadlineTask(null);
    setDragOverDeadlineCell(null);
  };

  // Handle block click (single or double)
  const handleBlockClick = async (userId: string, date: string, blockIndex: number) => {
    const blockKey = `${userId}-${date}-${blockIndex}`;
    const existing = blockAssignments[blockKey];

    // Set this cell as selected
    setSelectedCell(blockKey);

    // Use double-click detection for both existing and empty cells
    if (clickTimer && clickedBlock === blockKey) {
      // This is a double-click

      clearTimeout(clickTimer);
      setClickTimer(null);
      setClickedBlock(null);

      if (existing) {
        // Open modal for edit/delete
        setSelectedBlock({ userId, date, blockIndex });

        // Detect status events and set checkbox states
        const taskName = existing.projectName || '';
        const hasProject = !!existing.projectId;

        if (taskName === 'Out of Office') {
          // Pure Out of Office (no project)
          setProjectSearch('');
          setIsOutOfOffice(true);
          setIsTimeOff(false);
          setIsUnavailable(false);
        } else if (taskName.includes('(Out of Office)')) {
          // Project + Out of Office
          const projectNameOnly = taskName.replace(' (Out of Office)', '');
          setProjectSearch(projectNameOnly);
          setIsOutOfOffice(true);
          setIsTimeOff(false);
          setIsUnavailable(false);
        } else if (taskName === 'Time Off') {
          setProjectSearch('');
          setIsOutOfOffice(false);
          setIsTimeOff(true);
          setIsUnavailable(false);
        } else if (taskName === 'Unavailable') {
          setProjectSearch('');
          setIsOutOfOffice(false);
          setIsTimeOff(false);
          setIsUnavailable(true);
        } else {
          // Regular project - reset all checkboxes
          setProjectSearch(existing.projectName || '');
          setIsOutOfOffice(false);
          setIsTimeOff(false);
          setIsUnavailable(false);
        }

        setTaskDescription(existing.task || '');
        setShowProjectModal(true);
      } else {
        // Open modal for new assignment
        setSelectedBlock({ userId, date, blockIndex });
        setProjectSearch('');
        setTaskDescription('');
        setIsOutOfOffice(false);
        setIsTimeOff(false);
        setIsUnavailable(false);
        setShowProjectModal(true);
      }
    } else {
      // This is a first click - start timer

      const timer = setTimeout(() => {
        setClickTimer(null);
        setClickedBlock(null);
      }, 300); // 300ms window for double-click

      setClickTimer(timer);
      setClickedBlock(blockKey);
    }
  };

  // Handle edge drag start
  const handleEdgeDragStart = (userId: string, date: string, blockIndex: number, edge: 'top' | 'bottom', e: any, currentSpan: number) => {
    // Set flag to prevent cell drag
    isDraggingEdgeRef.current = true;

    // For web, get clientY from the event
    const startY = e.clientY || e.nativeEvent?.clientY || e.pageY || e.nativeEvent?.pageY || 0;

    // Store the initial span
    dragStartSpanRef.current = currentSpan;

    const blockKey = `${userId}-${date}-${blockIndex}`;

    setDraggingEdge({
      blockKey,
      edge,
      startY,
      userId,
      date,
      blockIndex,
      initialSpan: currentSpan,
    });
  };

  // Handle edge drag (global mouse move)
  useEffect(() => {
    if (!draggingEdge || Platform.OS !== 'web') {

      return;
    }

    let lastBlocksMoved = 0;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Get clientY from either mouse or touch event
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      const deltaY = clientY - draggingEdge.startY;
      const blocksMoved = Math.round(deltaY / TIME_BLOCK_HEIGHT);

      // Only process if blocksMoved has changed
      if (blocksMoved === lastBlocksMoved) {

        return;
      }

      lastBlocksMoved = blocksMoved;

      const { userId, date, blockIndex, edge, initialSpan } = draggingEdge;
      const blockKey = `${userId}-${date}-${blockIndex}`;

      // Get the base assignment from the current block
      const baseAssignment = blockAssignmentsRef.current[blockKey];
      const baseProjectId = baseAssignment?.projectId;
      const baseProjectName = baseAssignment?.projectName;

      if (!baseAssignment) {

        return;
      }

      // Calculate new span based on edge and direction
      let newSpan = initialSpan;
      let newBlockIndex = blockIndex;

      if (edge === 'bottom') {
        // Dragging bottom edge
        newSpan = initialSpan + blocksMoved;
        // Clamp to max block index (blockIndex + newSpan - 1 <= 3)
        newSpan = Math.max(1, Math.min(newSpan, 4 - blockIndex));
      } else if (edge === 'top') {
        // Dragging top edge
        const endBlock = blockIndex + initialSpan - 1;
        newBlockIndex = blockIndex + blocksMoved;
        // Clamp to min block index (0)
        newBlockIndex = Math.max(0, Math.min(newBlockIndex, endBlock));
        newSpan = endBlock - newBlockIndex + 1;
      }

      // Check if all blocks in the range are either empty or same project/status
      let canExpand = true;
      for (let i = newBlockIndex; i < newBlockIndex + newSpan; i++) {
        const checkKey = `${userId}-${date}-${i}`;
        const checkAssignment = blockAssignmentsRef.current[checkKey];

        // For status events (null projectId), compare by project name
        // For regular projects, compare by projectId
        if (checkAssignment) {
          const isSameTask = baseProjectId
            ? checkAssignment.projectId === baseProjectId
            : checkAssignment.projectName === baseProjectName;

          if (!isSameTask) {
            canExpand = false;

            break;
          }
        }
      }

      if (!canExpand) {
        return;
      }

      // Update the assignment with new span and potentially new block index
      setBlockAssignments((prev) => {
        const newAssignments = { ...prev };

        // Remove old assignment
        delete newAssignments[blockKey];

        // Add new assignment at new location with new span
        const newKey = `${userId}-${date}-${newBlockIndex}`;
        newAssignments[newKey] = {
          ...baseAssignment,
          span: newSpan,
        };

        return newAssignments;
      });
    };

    const handleMouseUp = async (e: MouseEvent | TouchEvent) => {

      e.preventDefault();
      e.stopPropagation();

      // Save span to database
      if (draggingEdge) {
        const { userId, date, blockIndex, initialSpan } = draggingEdge;
        const originalBlockKey = `${userId}-${date}-${blockIndex}`;
        const originalAssignment = blockAssignmentsRef.current[originalBlockKey];
        const originalProjectId = originalAssignment?.projectId;
        const originalProjectName = originalAssignment?.projectName;

        // Find the current assignment (it may have moved)
        let currentAssignment: any = null;
        let currentBlockIndex = blockIndex;

        // Search for the assignment with the same project ID/name and date
        for (const [key, assignment] of Object.entries(blockAssignmentsRef.current)) {
          if (assignment.id && key.startsWith(`${userId}-${date}-`)) {
            // For status events (null projectId), compare by project name
            // For regular projects, compare by projectId
            const isSameTask = originalProjectId
              ? assignment.projectId === originalProjectId
              : assignment.projectName === originalProjectName;

            if (isSameTask) {
              // Extract the block index from the key using regex to handle UUIDs
              const match = key.match(/(\d{4}-\d{2}-\d{2})-(\d+)$/);
              if (match) {
                currentBlockIndex = parseInt(match[2], 10);
                currentAssignment = assignment;

                break;
              }
            }
          }
        }

        if (currentAssignment?.id) {
          try {
            const newSpan = currentAssignment.span;

            // For status events (no projectId), the status name is in projectName, not task
            // For Out of Office events, we need to preserve the [OUT_OF_OFFICE] marker
            // We need to send it as the task field to preserve it in the database
            const isStatusEvent = !currentAssignment.projectId;
            const isOutOfOffice = currentAssignment.projectName?.includes('(Out of Office)');

            let taskValue: string | undefined;
            if (isStatusEvent) {
              // Pure status event - use projectName as task
              taskValue = currentAssignment.projectName;
            } else if (isOutOfOffice) {
              // Project with Out of Office - add marker back
              taskValue = currentAssignment.task
                ? `[OUT_OF_OFFICE]${currentAssignment.task}`
                : '[OUT_OF_OFFICE]';
            } else {
              // Regular project task
              taskValue = currentAssignment.task;
            }

            await planningTasksAPI.update(currentAssignment.id, {
              projectId: currentAssignment.projectId,
              task: taskValue,
              span: newSpan,
              blockIndex: currentBlockIndex,
            });

          } catch (error) {
            console.error('[DRAG DEBUG] Failed to save span:', error);
            // Reload data to restore correct state
            await loadData();
          }
        }
      }

      // Reset edge drag flag
      isDraggingEdgeRef.current = false;
      setDraggingEdge(null);
    };

    // Add both mouse and touch event listeners for cross-platform support
    document.addEventListener('mousemove', handleMouseMove as EventListener);
    document.addEventListener('mouseup', handleMouseUp as EventListener);
    // Use { passive: false } for touch events to allow preventDefault() to work
    document.addEventListener('touchmove', handleMouseMove as EventListener, { passive: false });
    document.addEventListener('touchend', handleMouseUp as EventListener, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as EventListener);
      document.removeEventListener('mouseup', handleMouseUp as EventListener);
      document.removeEventListener('touchmove', handleMouseMove as EventListener, { passive: false } as any);
      document.removeEventListener('touchend', handleMouseUp as EventListener, { passive: false } as any);
    };
  }, [draggingEdge, blockAssignments]);

  // Handle cell hover to show expand options
  const handleCellHover = (userId: string, date: string, blockIndex: number, isHovering: boolean) => {
    const blockKey = `${userId}-${date}-${blockIndex}`;
    const hasAssignment = !!blockAssignments[blockKey];

    // Only allow hover effects for filled cells
    if (hasAssignment && isHovering) {
      setHoveredBlock(blockKey);
    } else if (!isHovering && hoveredBlock === blockKey) {
      setHoveredBlock(null);
    }
  };

  // Mobile gesture handlers
  const handleMobileCellTap = (userId: string, date: string, blockIndex: number, e: any) => {
    // Allow on mobile web browsers too, not just native apps
    // if (Platform.OS === 'web') return;

    const blockKey = `${userId}-${date}-${blockIndex}`;
    const existing = blockAssignments[blockKey];
    const now = Date.now();

    // Set this cell as selected
    setSelectedCell(blockKey);

    // Check for double-tap (300ms window)
    if (lastTapBlock === blockKey && now - lastTapTime < 300) {
      // Double-tap detected - open modal for edit/delete or create

      setLastTapTime(0);
      setLastTapBlock(null);

      if (existing) {
        // Open modal for edit/delete
        setSelectedBlock({ userId, date, blockIndex });

        // Detect status events and set checkbox states
        const taskName = existing.projectName || '';

        if (taskName === 'Out of Office') {
          setProjectSearch('');
          setIsOutOfOffice(true);
          setIsTimeOff(false);
          setIsUnavailable(false);
        } else if (taskName.includes('(Out of Office)')) {
          const projectNameOnly = taskName.replace(' (Out of Office)', '');
          setProjectSearch(projectNameOnly);
          setIsOutOfOffice(true);
          setIsTimeOff(false);
          setIsUnavailable(false);
        } else if (taskName === 'Time Off') {
          setProjectSearch('');
          setIsOutOfOffice(false);
          setIsTimeOff(true);
          setIsUnavailable(false);
        } else if (taskName === 'Unavailable') {
          setProjectSearch('');
          setIsOutOfOffice(false);
          setIsTimeOff(false);
          setIsUnavailable(true);
        } else {
          setProjectSearch(existing.projectName || '');
          setIsOutOfOffice(false);
          setIsTimeOff(false);
          setIsUnavailable(false);
        }

        setTaskDescription(existing.task || '');
        setShowProjectModal(true);
      } else {
        // Open modal for new assignment
        setSelectedBlock({ userId, date, blockIndex });
        setProjectSearch('');
        setTaskDescription('');
        setIsOutOfOffice(false);
        setIsTimeOff(false);
        setIsUnavailable(false);
        setShowProjectModal(true);
      }
    } else {
      // Single tap - check if we should paste
      if (!existing && copiedCell) {
        // Empty cell with copied data - paste it
        handleMobilePaste(userId, date, blockIndex);
      }

      // Update last tap time and block
      setLastTapTime(now);
      setLastTapBlock(blockKey);
    }
  };

  const handleMobileLongPressStart = (userId: string, date: string, blockIndex: number, e: any) => {
    const blockKey = `${userId}-${date}-${blockIndex}`;
    const existing = blockAssignments[blockKey];

    if (!existing) return; // Only allow long press on filled cells

    // Start 800ms timer to show action menu
    const timer = setTimeout(() => {

      setLongPressAction({
        userId,
        date,
        blockIndex,
        assignment: existing,
      });
    }, 800);

    setLongPressTimer(timer);
  };

  const handleMobileLongPressEnd = () => {
    // Allow on mobile web browsers too
    // if (Platform.OS === 'web') return;

    // Cancel timer if released early
    if (longPressTimer) {

      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMobilePaste = async (userId: string, date: string, blockIndex: number) => {
    if (!copiedCell) return;

    const blockKey = `${userId}-${date}-${blockIndex}`;
    const existing = blockAssignments[blockKey];

    if (existing) {

      // Clear success state before showing error
      setShowSuccessDialog(false);
      setSuccessMessage('');
      setErrorMessage('Cannot paste to a non-empty cell');
      setShowErrorDialog(true);
      return;
    }

    try {
      // Detect what type of event this is
      const isProjectWithOutOfOffice = copiedCell.projectId && copiedCell.projectName.includes('(Out of Office)');
      const isPureStatusEvent = !copiedCell.projectId && (
        copiedCell.projectName === 'Out of Office' ||
        copiedCell.projectName === 'Time Off' ||
        copiedCell.projectName === 'Unavailable'
      );

      // Reconstruct the task field with proper markers
      let taskToStore = copiedCell.task;
      if (isProjectWithOutOfOffice) {
        taskToStore = copiedCell.task ? `[OUT_OF_OFFICE]${copiedCell.task}` : '[OUT_OF_OFFICE]';
      } else if (isPureStatusEvent) {
        taskToStore = copiedCell.projectName;
      }

      // Create the new task
      const response = await planningTasksAPI.create({
        userId,
        projectId: copiedCell.projectId,
        date,
        blockIndex,
        task: taskToStore,
        span: copiedCell.span,
      });

      setBlockAssignments(prev => ({
        ...prev,
        [blockKey]: {
          id: response.data.id,
          projectId: copiedCell.projectId,
          projectName: copiedCell.projectName,
          task: copiedCell.task,
          span: copiedCell.span,
        },
      }));

      // If in reposition mode, delete the original task
      if (repositionMode && copiedCell.sourceId && copiedCell.sourceBlockKey) {

        try {
          await planningTasksAPI.delete(copiedCell.sourceId);

          // Remove from block assignments
          setBlockAssignments(prev => {
            const updated = { ...prev };
            delete updated[copiedCell.sourceBlockKey!];
            return updated;
          });

          // Use setTimeout to ensure success dialog shows after any potential error dialogs are cleared
          setTimeout(() => {
            setShowErrorDialog(false);
            setErrorMessage('');
            setSuccessMessage('Task repositioned successfully');
            setShowSuccessDialog(true);
          }, 0);
        } catch (deleteError) {
          console.error('[MOBILE PASTE] Error deleting source task:', deleteError);
          setWarningMessage('Task copied but original could not be deleted');
          setShowWarningDialog(true);
        }
      } else {

        // Use setTimeout to ensure success dialog shows after any potential error dialogs are cleared
        setTimeout(() => {
          setShowErrorDialog(false);
          setErrorMessage('');
          setSuccessMessage('Task copied successfully');
          setShowSuccessDialog(true);
        }, 0);
      }

      // Clear copied cell and reposition mode
      setCopiedCell(null);
      setRepositionMode(false);
    } catch (error) {
      console.error('[MOBILE PASTE] Error pasting:', error);
      setErrorMessage('Failed to paste task');
      setShowErrorDialog(true);
    }
  };

  const handleMobilePanStart = (userId: string, date: string, blockIndex: number, e: any) => {
    // Allow on mobile web browsers too
    // if (Platform.OS === 'web') return;

    const blockKey = `${userId}-${date}-${blockIndex}`;
    const existing = blockAssignments[blockKey];

    if (!existing) return; // Only allow dragging filled cells

    // Get touch from either native or web event
    const touch = e.nativeEvent?.touches?.[0] || e.touches?.[0];
    if (!touch) return;

    setMobileDragging({
      blockKey,
      userId,
      date,
      blockIndex,
      assignment: existing,
      initialX: touch.pageX,
      initialY: touch.pageY,
      currentX: touch.pageX,
      currentY: touch.pageY,
    });
  };

  // Mobile pan handlers removed - using long-press menu instead

  // Deadline task mobile long-press handlers
  const handleDeadlineLongPressStart = (task: DeadlineTask, date: Date, slotIndex: number, e: any) => {

    // Start 800ms timer to show action menu
    const timer = setTimeout(() => {

      setLongPressDeadlineAction({
        task,
        date,
        slotIndex,
      });
    }, 800);

    setLongPressDeadlineTimer(timer);
  };

  const handleDeadlineLongPressEnd = () => {
    if (longPressDeadlineTimer) {

      clearTimeout(longPressDeadlineTimer);
      setLongPressDeadlineTimer(null);
    }
  };

  const handleDeadlineCellTap = (date: Date, slotIndex: number, e: any) => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const slotKey = `${dateString}-${slotIndex}`;

    // Set this cell as selected
    setSelectedDeadlineCell(slotKey);

    // Check if there's an existing task in this slot
    const existingTask = deadlineTasks.find(
      (task) => {
        const taskDate = new Date(task.date);
        const taskDateString = `${taskDate.getUTCFullYear()}-${String(taskDate.getUTCMonth() + 1).padStart(2, '0')}-${String(taskDate.getUTCDate()).padStart(2, '0')}`;
        return taskDateString === dateString && task.slotIndex === slotIndex;
      }
    );

    // If empty cell and we have copied deadline task, paste it
    if (!existingTask && copiedDeadlineTask) {
      handleDeadlinePaste(date, slotIndex);
    }
  };

  const handleDeadlinePaste = async (date: Date, slotIndex: number) => {
    if (!copiedDeadlineTask) return;

    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const slotKey = `${dateString}-${slotIndex}`;

    // Check if target slot is already occupied
    const existingTask = deadlineTasks.find(
      (task) => {
        const taskDate = new Date(task.date);
        const taskDateString = `${taskDate.getUTCFullYear()}-${String(taskDate.getUTCMonth() + 1).padStart(2, '0')}-${String(taskDate.getUTCDate()).padStart(2, '0')}`;
        return taskDateString === dateString && task.slotIndex === slotIndex;
      }
    );

    if (existingTask) {

      setShowSuccessDialog(false);
      setSuccessMessage('');
      setErrorMessage('Cannot paste to an occupied slot');
      setShowErrorDialog(true);
      return;
    }

    try {
      // Create the new deadline task
      const dateISO = `${dateString}T08:01:00.000Z`; // Store as 12:01 AM Pacific Time
      const response = await deadlineTasksAPI.create({
        date: dateISO,
        slotIndex,
        projectId: copiedDeadlineTask.projectId,
        clientId: copiedDeadlineTask.clientId,
        description: copiedDeadlineTask.description,
        deadlineType: copiedDeadlineTask.deadlineType,
      });

      setDeadlineTasks([...deadlineTasks, response.data]);

      // If in reposition mode, delete the original task
      if (repositionDeadlineMode && copiedDeadlineTask.sourceId) {

        try {
          await deadlineTasksAPI.delete(copiedDeadlineTask.sourceId);

          // Remove from deadline tasks list
          setDeadlineTasks(prev => prev.filter(task => task.id !== copiedDeadlineTask.sourceId));

          setTimeout(() => {
            setShowErrorDialog(false);
            setErrorMessage('');
            setSuccessMessage('Deadline task repositioned successfully');
            setShowSuccessDialog(true);
          }, 0);
        } catch (deleteError) {
          console.error('[DEADLINE PASTE] Error deleting source task:', deleteError);
          setWarningMessage('Task copied but original could not be deleted');
          setShowWarningDialog(true);
        }
      } else {

        setTimeout(() => {
          setShowErrorDialog(false);
          setErrorMessage('');
          setSuccessMessage('Deadline task copied successfully');
          setShowSuccessDialog(true);
        }, 0);
      }

      // Clear copied task and reposition mode
      setCopiedDeadlineTask(null);
      setRepositionDeadlineMode(false);
    } catch (error) {
      console.error('[DEADLINE PASTE] Error pasting:', error);
      setErrorMessage('Failed to paste deadline task');
      setShowErrorDialog(true);
    }
  };

  // Handle delete planning task
  const handleDeletePlanningTask = async () => {
    if (!selectedBlock) return;

    const blockKey = `${selectedBlock.userId}-${selectedBlock.date}-${selectedBlock.blockIndex}`;
    const existing = blockAssignments[blockKey];

    if (!existing?.id) return;

    try {
      await planningTasksAPI.delete(existing.id);

      // Remove from local state
      const newAssignments = { ...blockAssignments };
      delete newAssignments[blockKey];
      setBlockAssignments(newAssignments);

      setShowDeletePlanningDialog(false);
      setShowProjectModal(false);
      setProjectSearch('');
      setTaskDescription('');
      setSelectedBlock(null);

      setSuccessMessage('Planning task deleted successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Delete planning task error:', error);
      setShowDeletePlanningDialog(false);
      setErrorMessage(error.response?.data?.error || 'Failed to delete planning task');
      setShowErrorDialog(true);
    }
  };

  // Handle confirm delete from keyboard shortcut
  const handleConfirmKeyboardDelete = async () => {
    if (!deleteTaskId || !deleteTaskBlockKey) return;

    try {
      await planningTasksAPI.delete(deleteTaskId);

      // Remove from local state
      const newAssignments = { ...blockAssignments };
      delete newAssignments[deleteTaskBlockKey];
      setBlockAssignments(newAssignments);
      setSelectedCell(null);

      setShowDeleteDialog(false);
      setDeleteTaskId(null);
      setDeleteTaskBlockKey(null);

      setSuccessMessage('Planning task deleted successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Delete planning task error:', error);
      setShowDeleteDialog(false);
      setDeleteTaskId(null);
      setDeleteTaskBlockKey(null);
      setErrorMessage(error.response?.data?.error || 'Failed to delete planning task');
      setShowErrorDialog(true);
    }
  };

  // Filter projects based on search (by description/common name)
  useEffect(() => {
    if (!projectSearch) {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter((project) =>
        project.description?.toLowerCase().includes(projectSearch.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [projectSearch, projects]);

  // Save project assignment
  const handleSaveProjectAssignment = async () => {

    // Clear any existing error/success dialogs before starting
    setShowErrorDialog(false);
    setShowSuccessDialog(false);
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedBlock) {

      setErrorMessage('No block selected');
      setShowErrorDialog(true);
      return;
    }

    // Check if this is a status event (Out of Office, Time Off, or Unavailable)
    const isStatusEvent = isOutOfOffice || isTimeOff || isUnavailable;

    // Handle project validation
    let selectedProject = null;

    // Out of Office can have a project, but Time Off and Unavailable cannot
    const requiresProject = !isStatusEvent;
    const allowsProject = !isTimeOff && !isUnavailable;

    if (projectSearch?.trim() && allowsProject) {
      // If there's a project search, try to find the project

      selectedProject = filteredProjects.find(
        (p) => p.description?.toLowerCase() === projectSearch.toLowerCase()
      );

      if (!selectedProject) {

        setErrorMessage('Project not found');
        setShowErrorDialog(true);
        return;
      }
    } else if (requiresProject) {
      // No project provided, but one is required (not a status event)

      setErrorMessage('Please select a project or check a status option');
      setShowErrorDialog(true);
      return;
    }

    try {
      // Get the current assignment to preserve the span
      const originalBlockKey = `${selectedBlock.userId}-${selectedBlock.date}-${selectedBlock.blockIndex}`;
      const originalAssignment = blockAssignments[originalBlockKey];
      const currentSpan = originalAssignment?.span || 1;

      // Determine project name for display
      let displayProjectName = '';
      if (selectedProject) {
        // If a project is selected, use the project name
        displayProjectName = selectedProject.description || selectedProject.name;
        // Append status if Out of Office is checked
        if (isOutOfOffice) {
          displayProjectName += ' (Out of Office)';
        }
      } else if (isOutOfOffice) {
        // Only use status name if no project is selected
        displayProjectName = 'Out of Office';
      } else if (isTimeOff) {
        displayProjectName = 'Time Off';
      } else if (isUnavailable) {
        displayProjectName = 'Unavailable';
      }

      // Generate dates for repeat events
      const datesToCreate: Date[] = [];
      const startDate = new Date(selectedBlock.date);

      if (isRepeatEvent) {
        const endDate = repeatEndDate || new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          if (repeatType === 'weekly') {
            // Weekly repeat - check if current day matches selected days
            const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc
            const mappedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0, Sun=6

            if (repeatWeeklyDays[mappedDay]) {
              datesToCreate.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (repeatType === 'monthly') {
            if (monthlyRepeatType === 'date') {
              // Same date every month
              if (currentDate.getDate() === startDate.getDate()) {
                datesToCreate.push(new Date(currentDate));
              }
              // Move to next month
              if (currentDate.getDate() === startDate.getDate()) {
                currentDate.setMonth(currentDate.getMonth() + 1);
              } else {
                currentDate.setDate(currentDate.getDate() + 1);
              }
            } else {
              // Specific week and day of month
              const targetDayOfWeek = monthlyDayOfWeek === 0 ? 0 : monthlyDayOfWeek; // 0=Sunday, 1=Monday, etc
              const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const firstTargetDay = (7 + targetDayOfWeek - firstDayOfMonth.getDay()) % 7 + 1;
              const targetDate = firstTargetDay + (monthlyWeekNumber - 1) * 7;

              if (currentDate.getDate() === targetDate) {
                datesToCreate.push(new Date(currentDate));
              }

              // Move to next month
              if (currentDate.getDate() >= targetDate) {
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
              } else {
                currentDate.setDate(currentDate.getDate() + 1);
              }
            }
          }
        }
      } else {
        // Single event
        datesToCreate.push(startDate);
      }

      const newAssignments = { ...blockAssignments };

      // Create planning tasks for all dates
      for (const date of datesToCreate) {
        const dateString = date.toISOString().split('T')[0];
        const blockKey = `${selectedBlock.userId}-${dateString}-${selectedBlock.blockIndex}`;
        const existing = blockAssignments[blockKey];

        if (existing?.id) {
          // Update existing planning task
          // For pure status events (no project), store the status name in task field for loading
          // For project + Out of Office, store special marker
          const isPureStatusEvent = isStatusEvent && !selectedProject;
          const isProjectWithOutOfOffice = selectedProject && isOutOfOffice;
          let taskToStore = null;
          if (isPureStatusEvent) {
            taskToStore = displayProjectName;
          } else if (isProjectWithOutOfOffice) {
            // Store marker to indicate Out of Office
            taskToStore = taskDescription ? `[OUT_OF_OFFICE]${taskDescription}` : '[OUT_OF_OFFICE]';
          } else {
            taskToStore = taskDescription || null;
          }

          await planningTasksAPI.update(existing.id, {
            projectId: selectedProject?.id || null,
            task: taskToStore,
          });

          newAssignments[blockKey] = {
            id: existing.id,
            projectId: selectedProject?.id || null,
            projectName: displayProjectName,
            task: isPureStatusEvent ? undefined : taskDescription, // Don't show task for pure status events
            span: existing.span,
          };
        } else {
          // Create new planning task with current span
          // For pure status events (no project), store the status name in task field for loading
          // For project + Out of Office, store special marker
          const isPureStatusEvent = isStatusEvent && !selectedProject;
          const isProjectWithOutOfOffice = selectedProject && isOutOfOffice;
          let taskToStore = null;
          if (isPureStatusEvent) {
            taskToStore = displayProjectName;
          } else if (isProjectWithOutOfOffice) {
            // Store marker to indicate Out of Office
            taskToStore = taskDescription ? `[OUT_OF_OFFICE]${taskDescription}` : '[OUT_OF_OFFICE]';
          } else {
            taskToStore = taskDescription || null;
          }

          const response = await planningTasksAPI.create({
            userId: selectedBlock.userId,
            projectId: selectedProject?.id || null,
            date: dateString,
            blockIndex: selectedBlock.blockIndex,
            task: taskToStore,
            span: currentSpan,
          });

          newAssignments[blockKey] = {
            id: response.data.id,
            projectId: selectedProject?.id || null,
            projectName: displayProjectName,
            task: isPureStatusEvent ? undefined : taskDescription, // Don't show task for pure status events
            span: currentSpan,
          };
        }
      }

      setBlockAssignments(newAssignments);
      setShowProjectModal(false);
      setProjectSearch('');
      setTaskDescription('');
      setIsOutOfOffice(false);
      setIsTimeOff(false);
      setIsUnavailable(false);
      setIsRepeatEvent(false);
      setRepeatEndDate(null);
      setRepeatWeeklyDays([false, false, false, false, false, false, false]);
      setSelectedBlock(null);

      // No need to reload - the UI has already been updated optimistically
      // The task is visible in blockAssignments state
    } catch (error: any) {
      console.error('Save planning task error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setErrorMessage(error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to save planning task');
      setShowErrorDialog(true);
    }
  };

  // Helper function to get deadline task colors
  const getDeadlineTaskColors = (deadlineType: 'DEADLINE' | 'INTERNAL_DEADLINE' | 'MILESTONE') => {
    switch (deadlineType) {
      case 'DEADLINE':
        return { bg: deadlineBg, font: deadlineFont };
      case 'INTERNAL_DEADLINE':
        return { bg: internalDeadlineBg, font: internalDeadlineFont };
      case 'MILESTONE':
        return { bg: milestoneBg, font: milestoneFont };
      default:
        return { bg: deadlineBg, font: deadlineFont };
    }
  };

  // Deadline task handlers
  const handleDeadlineSlotClick = (date: Date, slotIndex: number) => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const slotKey = `${dateString}-${slotIndex}`;

    // Check if there's an existing task in this slot
    const existingTask = deadlineTasks.find(
      (task) => {
        const taskDate = new Date(task.date);
        const taskDateString = `${taskDate.getUTCFullYear()}-${String(taskDate.getUTCMonth() + 1).padStart(2, '0')}-${String(taskDate.getUTCDate()).padStart(2, '0')}`;
        return taskDateString === dateString && task.slotIndex === slotIndex;
      }
    );

    // Use double-click detection
    if (deadlineClickTimer && clickedDeadlineSlot === slotKey) {
      // This is a double-click - open the modal
      clearTimeout(deadlineClickTimer);
      setDeadlineClickTimer(null);
      setClickedDeadlineSlot(null);

      if (existingTask) {
        setEditingDeadlineTask(existingTask);
      } else {
        setEditingDeadlineTask(null);
      }

      setSelectedDeadlineSlot({ date, slotIndex });
      setShowDeadlineModal(true);
    } else {
      // This is a single click - start timer for double-click detection
      if (deadlineClickTimer) {
        clearTimeout(deadlineClickTimer);
      }

      setClickedDeadlineSlot(slotKey);
      const timer = setTimeout(() => {
        // Single click action - just select the slot (no modal)
        setClickedDeadlineSlot(null);
        setDeadlineClickTimer(null);
      }, 300); // 300ms window for double-click
      setDeadlineClickTimer(timer);
    }
  };

  const handleSaveDeadlineTask = async (data: DeadlineTaskData) => {
    if (!selectedDeadlineSlot) return;

    try {
      if (editingDeadlineTask) {
        // Update existing task
        const response = await deadlineTasksAPI.update(editingDeadlineTask.id, data);
        setDeadlineTasks(deadlineTasks.map((task) =>
          task.id === editingDeadlineTask.id ? response.data : task
        ));
      } else {
        // Create new task
        // Store as 12:01 AM Pacific Time (PT is UTC-8, so 08:01 UTC = 00:01 PST)
        const date = selectedDeadlineSlot.date;
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const dateISO = `${dateString}T08:01:00.000Z`;

        const response = await deadlineTasksAPI.create({
          date: dateISO,
          slotIndex: selectedDeadlineSlot.slotIndex,
          ...data,
        });
        setDeadlineTasks([...deadlineTasks, response.data]);
      }

      setShowDeadlineModal(false);
      setSelectedDeadlineSlot(null);
      setEditingDeadlineTask(null);
    } catch (error: any) {
      console.error('Error saving deadline task:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to save deadline task');
      setShowErrorDialog(true);
    }
  };

  const handleDeleteDeadlineTask = async (taskId: string) => {

    try {

      await deadlineTasksAPI.delete(taskId);

      setDeadlineTasks(deadlineTasks.filter((task) => task.id !== taskId));

    } catch (error: any) {
      console.error('[PlanningScreen] Error deleting deadline task:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to delete deadline task');
      setShowErrorDialog(true);
    }
  };

  const handleSyncProjectDueDates = async () => {
    try {
      const response = await deadlineTasksAPI.syncDueDates();
      setSuccessMessage(`Synced ${response.data.created} project due dates`);
      setShowSuccessDialog(true);

      // Reload deadline tasks
      const quarterStart = new Date(currentQuarter.year, (currentQuarter.quarter - 1) * 3, 1);
      const quarterEnd = new Date(currentQuarter.year, (currentQuarter.quarter - 1) * 3 + 3, 0);
      const deadlineTasksResponse = await deadlineTasksAPI.getAll({
        startDate: quarterStart.toISOString(),
        endDate: quarterEnd.toISOString(),
      });
      setDeadlineTasks(deadlineTasksResponse.data);
    } catch (error: any) {
      console.error('Error syncing project due dates:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to sync project due dates');
      setShowErrorDialog(true);
    }
  };

  // Save settings to database
  const handleSaveSettings = async () => {
    try {
      const userIds = users.map((u) => u.id);

      // Save user order to database using user settings API
      await settingsAPI.user.set(`planning_user_order`, userIds);

      // Save visible users to database using user settings API
      await settingsAPI.user.set(`planning_visible_users`, visibleUserIds);

      // Show success message
      setSuccessMessage('Team view settings have been saved successfully.');
      setShowSuccessDialog(true);

      // Close modal
      setShowManageModal(false);
    } catch (error) {
      console.error('[PlanningScreen] Error saving settings:', error);
      setErrorMessage('Failed to save settings. Please try again.');
      setShowErrorDialog(true);
    }
  };

  const handleSaveAsDefaultForAll = async () => {
    try {
      const userIds = users.map((u) => u.id);
      const defaultSettings = {
        userOrder: userIds,
        visibleUsers: visibleUserIds,
      };

      // Save as app-wide default using app settings API
      await settingsAPI.app.set('planning_default_view', defaultSettings);

      // Also save to current user's settings so they see the change immediately
      await settingsAPI.user.set(`planning_user_order`, userIds);
      await settingsAPI.user.set(`planning_visible_users`, visibleUserIds);

      setSuccessMessage('Default view saved for all users. New users will see this configuration by default.');
      setShowSuccessDialog(true);
      setShowManageModal(false);
    } catch (error) {
      console.error('[PlanningScreen] Error saving default settings:', error);
      setErrorMessage('Failed to save default settings. Please try again.');
      setShowErrorDialog(true);
    }
  };

  const loadGlobalDefaults = async () => {
    try {
      const response = await settingsAPI.app.get('planning_default_view');
      if (response.data?.value) {
        return response.data.value;
      }
    } catch (error) {
      // Setting doesn't exist yet, that's okay

    }
    return null;
  };

  // Generate all weeks in the current quarter
  const quarterWeeks = generateQuarterWeeks();

  // Debug: log the first few weeks to verify they start on Monday
  if (quarterWeeks.length > 0 && Platform.OS === 'web') {

  }

  // Calculate visible week based on scroll position or initial state
  const visibleWeekStart = quarterWeeks[visibleWeekIndex] || currentWeekStart;
  const weekNumber = getWeekNumber(visibleWeekStart);
  const quarter = getQuarterFromDate(visibleWeekStart);
  const year = visibleWeekStart.getFullYear();

  const weekTitle = `Q${quarter} ${year} - Week ${weekNumber} Planning`;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Auto-scroll to the current week when component mounts or week changes
  useEffect(() => {
    if (!hasScrolled && quarterWeeks.length > 0 && Platform.OS === 'web') {

      // Try multiple approaches to ensure scroll works
      const attemptScroll = () => {
        // Find the scroll container first
        const scrollContainer = document.querySelector('[data-planning-scroll]') as HTMLDivElement;
        if (!scrollContainer) {

          return false;
        }

        // Determine which week to scroll to
        let targetWeekIndex = -1;

        // Approach 1: Try using the ref
        if (currentWeekRef.current) {
          targetWeekIndex = parseInt(currentWeekRef.current.id.replace('week-', ''), 10);

        }

        // Approach 2: Try finding by data attribute
        if (targetWeekIndex === -1) {
          const currentWeekElement = document.querySelector('[data-current-week="true"]') as HTMLElement;
          if (currentWeekElement) {
            targetWeekIndex = parseInt(currentWeekElement.id.replace('week-', ''), 10);

          }
        }

        // Approach 3: Calculate manually
        if (targetWeekIndex === -1) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          targetWeekIndex = quarterWeeks.findIndex((weekStart) => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return today >= weekStart && today <= weekEnd;
          });

        }

        // If we found a valid week index, scroll to it
        if (targetWeekIndex !== -1) {
          // Calculate scroll position to position Monday as the first visible column
          // The key insight: We want Monday to appear immediately after the sticky user column
          // Since the user column is sticky and USER_COLUMN_WIDTH wide, we need to ensure
          // that the scrollable content positions Monday where the user column ends
          //
          // However, scrollLeft positions content in the scrollable area, not the visible viewport
          // The user column overlays the scrollable area, so:
          // - If we want Monday at visual position USER_COLUMN_WIDTH from left edge
          // - And scrollLeft=0 shows column 0 at visual position USER_COLUMN_WIDTH (under sticky column)
          // - Then we want Monday's actual position (targetWeekIndex * 7 * DAY_CELL_WIDTH)
          //   to be at the left edge of the scrollable area (scrollLeft position 0)
          //
          // But that's not quite right either. Let me think through the geometry:
          // - The sticky user column is 250px wide and overlays the left side
          // - When scrollLeft=0, the first day column (week 0, day 0 = Monday) starts at x=0 in scroll content
          // - Due to sticky overlay, it appears UNDER the user column
          // - The visible part of day columns starts at x=250 in the viewport
          //
          // For week N:
          // - Week N's Monday is at position: N * 7 * 180 in the scroll content
          // - We want it visible just after the user column (at viewport x=250)
          // - To do this, we need scrollLeft = (N * 7 * 180) - 250
          //   Wait no, that would make Monday appear 250px to the RIGHT
          //
          // Actually: scrollLeft is how much we've scrolled, content moves LEFT
          // - scrollLeft=0: content position 0 is at viewport position 0 (under user column)
          // - scrollLeft=X: content position X is at viewport position 0 (under user column)
          // - To see content position X at viewport position 250 (after user column):
          //   scrollLeft = X - 250... no wait
          //
          // Let me reconsider: CSS scroll-snap-align START means the element's start edge
          // aligns with the scroll container's start edge. With scrollPaddingLeft, the
          // "start edge" is offset. So scroll-snap should work, but it's not.
          //
          // Calculate scroll position - scroll to the week's Monday position
          const mondayPosition = targetWeekIndex * 7 * DAY_CELL_WIDTH;

          // Set scroll position and let CSS scroll-snap handle the alignment
          scrollContainer.scrollLeft = mondayPosition;
          scrollContainerRef.current = scrollContainer;
          setVisibleWeekIndex(targetWeekIndex);
          setHasScrolled(true);
          return true;
        }

        return false;
      };

      // Try immediately
      if (!attemptScroll()) {
        // Try after a delay if immediate attempt fails
        setTimeout(() => {

          attemptScroll();
        }, 500);
      }
    }
  }, [hasScrolled, quarterWeeks]);

  // Add scroll listener to update visible week index
  useEffect(() => {
    if (Platform.OS !== 'web' || !scrollContainerRef.current) {
      return;
    }

    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const WEEK_SCROLL_WIDTH = 7 * DAY_CELL_WIDTH;
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const newWeekIndex = Math.round(scrollLeft / WEEK_SCROLL_WIDTH);

        if (newWeekIndex !== visibleWeekIndex && newWeekIndex >= 0 && newWeekIndex < quarterWeeks.length) {
          setVisibleWeekIndex(newWeekIndex);
        }
      }
    };

    const scrollContainer = scrollContainerRef.current;
    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [visibleWeekIndex, quarterWeeks.length]);

  // Add keyboard event listener for copy (Cmd+C) and paste (Cmd+V)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check for Cmd+C (Mac) or Ctrl+C (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedCell && blockAssignments[selectedCell]) {
          e.preventDefault();
          const assignment = blockAssignments[selectedCell];
          setCopiedCell({
            projectId: assignment.projectId,
            projectName: assignment.projectName,
            task: assignment.task,
            span: assignment.span,
          });

        }
      }

      // Check for Cmd+V (Mac) or Ctrl+V (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (selectedCell && copiedCell) {
          e.preventDefault();

          // Check if selected cell is empty
          const existing = blockAssignments[selectedCell];
          if (existing) {

            // Clear success state before showing error
            setShowSuccessDialog(false);
            setSuccessMessage('');
            setErrorMessage('Cannot paste to a non-empty cell');
            setShowErrorDialog(true);
            return;
          }

          // Parse the selected cell key to get userId, date, blockIndex
          // Format: {userId}-{YYYY-MM-DD}-{blockIndex}
          // UUID has dashes, so we need to find the date pattern and work backwards
          const datePattern = /(\d{4}-\d{2}-\d{2})-(\d+)$/;
          const match = selectedCell.match(datePattern);

          if (!match) {
            console.error('[PASTE] Invalid cell key format:', selectedCell);
            return;
          }

          const date = match[1];
          const blockIndex = parseInt(match[2], 10);
          const userId = selectedCell.substring(0, selectedCell.length - match[0].length - 1);

          try {
            // Detect what type of event this is
            const isProjectWithOutOfOffice = copiedCell.projectId && copiedCell.projectName.includes('(Out of Office)');
            const isPureStatusEvent = !copiedCell.projectId && (
              copiedCell.projectName === 'Out of Office' ||
              copiedCell.projectName === 'Time Off' ||
              copiedCell.projectName === 'Unavailable'
            );

            // Reconstruct the task field with proper markers
            let taskToStore = copiedCell.task;
            if (isProjectWithOutOfOffice) {
              // Add the [OUT_OF_OFFICE] marker for project + Out of Office
              taskToStore = copiedCell.task ? `[OUT_OF_OFFICE]${copiedCell.task}` : '[OUT_OF_OFFICE]';
            } else if (isPureStatusEvent) {
              // For pure status events, the status name should be in the task field
              taskToStore = copiedCell.projectName;
            }

            const response = await planningTasksAPI.create({
              userId,
              projectId: copiedCell.projectId,
              date,
              blockIndex,
              task: taskToStore,
              span: copiedCell.span,
            });

            setBlockAssignments(prev => ({
              ...prev,
              [selectedCell]: {
                id: response.data.id,
                projectId: copiedCell.projectId,
                projectName: copiedCell.projectName,
                task: copiedCell.task,
                span: copiedCell.span,
              },
            }));

            // Clear error state and set success
            setShowErrorDialog(false);
            setErrorMessage('');
            setSuccessMessage('Task pasted successfully');
            setShowSuccessDialog(true);

            // Note: We don't clear copiedCell, allowing multiple pastes
          } catch (error) {
            console.error('[PASTE] Error pasting:', error);
            console.error('[PASTE] Full error details:', JSON.stringify(error, null, 2));
            // Clear success state before showing error
            setShowSuccessDialog(false);
            setSuccessMessage('');
            setErrorMessage('Failed to paste task');
            setShowErrorDialog(true);

          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCell, blockAssignments, copiedCell]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: calendarHeaderBg, borderBottomColor: currentColors.text }]}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={loadPreviousWeek} style={styles.navButton}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={28} color={prevNextIconColor} />
          </TouchableOpacity>
          <Title style={[styles.headerTitle, { color: calendarHeaderFont }]}>{weekTitle}</Title>
          <TouchableOpacity onPress={loadNextWeek} style={styles.navButton}>
            <HugeiconsIcon icon={ArrowRight01Icon} size={28} color={prevNextIconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content area - unified table with sticky header and first column */}
      {/* Force rebuild */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {Platform.OS === 'web' ? (
          <div
            data-planning-scroll="true"
            style={{
              width: '100%',
              height: '100%',
              overflow: 'auto',
              position: 'relative',
              backgroundColor: screenBackground,
            }}>
            <style>
              {`
                [data-planning-scroll] table * {
                  box-sizing: border-box !important;
                }

                /* Make user column borders thicker and more prominent */
                [data-planning-scroll] .user-column-cell {
                  border-right-width: 3px !important;
                  border-bottom-width: 3px !important;
                }

                /* Remove any hover effects or overlays on deadline cells */
                [data-planning-scroll] .deadline-cell {
                  position: relative !important;
                }
                [data-planning-scroll] .deadline-cell:hover {
                  background-color: inherit !important;
                }
                [data-planning-scroll] .deadline-cell::before,
                [data-planning-scroll] .deadline-cell::after {
                  display: none !important;
                }
              `}
            </style>
            <table style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              backgroundColor: screenBackground,
              position: 'relative',
            }}>
              <thead>
                <tr>
                  {/* User names header - sticky */}
                  <th
                    style={{
                      width: `${USER_COLUMN_WIDTH}px`,
                      minWidth: `${USER_COLUMN_WIDTH}px`,
                      maxWidth: `${USER_COLUMN_WIDTH}px`,
                      height: '50px',
                      borderBottom: `3px solid ${headerBorderColor}`,
                      borderRight: '0px',
                      backgroundColor: dateCellBg,
                      color: dateCellText,
                      fontWeight: 'bold',
                      fontSize: '13px',
                      textAlign: 'center',
                      position: 'sticky',
                      left: 0,
                      top: 0,
                      zIndex: 20,
                    }}
                    className="juana-font"
                  >
                    Date
                  </th>

                {/* Day headers */}
                {quarterWeeks.map((weekStart, weekIndex) => {
                  const weekDays = [];
                  for (let i = 0; i < 7; i++) {
                    const day = new Date(weekStart);
                    day.setDate(weekStart.getDate() + i);
                    weekDays.push(day);
                  }

                  return weekDays.map((day, dayIndex) => {
                    const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                    // Map day.getDay() to Monday-based index: Monday=0, Sunday=6
                    const dayOfWeekIndex = day.getDay() === 0 ? 6 : day.getDay() - 1;
                    const dayName = dayNames[dayOfWeekIndex];
                    const today = new Date();
                    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    const isToday = dateString === todayString;

                    // Check if this is the current week
                    const isCurrentWeek = today >= weekStart && today <= new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

                    // Check if this is a weekend day (Saturday or Sunday)
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    // Determine header colors based on today/weekend status
                    const headerBg = isToday ? todayHeaderBg : (isWeekend ? weekendHeaderBg : weekdayHeaderBg);
                    const headerFont = isToday ? todayHeaderFont : (isWeekend ? weekendHeaderFont : weekdayHeaderFont);

                    return (
                      <th
                        key={`${weekIndex}-${dayIndex}`}
                        id={dayIndex === 0 ? `week-${weekIndex}` : undefined}
                        ref={dayIndex === 0 && isCurrentWeek ? currentWeekRef : undefined}
                        data-week-start={dayIndex === 0 ? 'true' : undefined}
                        data-current-week={dayIndex === 0 && isCurrentWeek ? 'true' : undefined}
                        style={{
                          width: `${DAY_CELL_WIDTH}px`,
                          minWidth: `${DAY_CELL_WIDTH}px`,
                          maxWidth: `${DAY_CELL_WIDTH}px`,
                          height: '50px',
                          borderBottom: `3px solid ${headerBorderColor}`,
                          borderRight: `1px solid ${cellBorderColor}`,
                          backgroundColor: headerBg,
                          textAlign: 'center',
                          padding: '4px',
                          position: 'sticky',
                          top: 0,
                          boxSizing: 'border-box',
                          zIndex: 18,
                        }}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '11px', color: headerFont }}>
                          {dayName}
                        </div>
                        <div style={{ fontSize: '10px', color: headerFont }}>
                          {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </th>
                    );
                  });
                })}
              </tr>
            </thead>
            <tbody>
              {/* Deadlines & Milestones Row - Two slots per day */}
              {[0, 1].map((slotIndex) => (
                <tr key={`deadline-row-${slotIndex}`} style={{ height: `${TIME_BLOCK_HEIGHT / 2}px` }}>
                  {/* Label cell - only render on first slot */}
                  {slotIndex === 0 && (
                    <td
                      className="deadline-label-cell"
                      rowSpan={2}
                      style={{
                        width: `${USER_COLUMN_WIDTH}px`,
                        minWidth: `${USER_COLUMN_WIDTH}px`,
                        maxWidth: `${USER_COLUMN_WIDTH}px`,
                        height: `${TIME_BLOCK_HEIGHT}px`,
                        borderBottom: `3px solid ${headerBorderColor}`,
                        borderRight: '0px',
                        backgroundColor: deadlinesRowBg,
                        color: deadlinesRowText,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        position: 'sticky',
                        left: 0,
                        zIndex: 15,
                      }}
                      className="juana-font"
                    >
                      DEADLINES & MILESTONES
                    </td>
                  )}

                  {/* Day cells for deadline slots */}
                  {quarterWeeks.map((weekStart, weekIndex) => {
                    const weekDays = [];
                    for (let i = 0; i < 7; i++) {
                      const day = new Date(weekStart);
                      day.setDate(weekStart.getDate() + i);
                      weekDays.push(day);
                    }

                    return weekDays.map((day) => {
                      const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

                      // Find deadline task for this day and slot
                      const deadlineTask = deadlineTasks.find((task) => {
                        const taskDate = new Date(task.date);
                        // Use UTC methods to avoid timezone issues
                        const taskDateString = `${taskDate.getUTCFullYear()}-${String(taskDate.getUTCMonth() + 1).padStart(2, '0')}-${String(taskDate.getUTCDate()).padStart(2, '0')}`;
                        const matches = taskDateString === dateString && task.slotIndex === slotIndex;
                        if (matches) {

                        }
                        return matches;
                      });

                      // Check if this day is a weekend
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                      // Get colors if task exists
                      const colors = deadlineTask ? getDeadlineTaskColors(deadlineTask.deadlineType) : null;

                      const cellKey = `${dateString}-${slotIndex}`;
                      const isDragOver = dragOverDeadlineCell === cellKey;

                      return (
                        <td
                          key={`${dateString}-deadline-${slotIndex}`}
                          className="deadline-cell"
                          draggable={!!deadlineTask}
                          onDragStart={(e) => deadlineTask && handleDeadlineTaskDragStart(e, deadlineTask)}
                          onDragOver={(e) => handleDeadlineCellDragOver(e, day, slotIndex)}
                          onDrop={(e) => handleDeadlineTaskDrop(e, day, slotIndex)}
                          onDragEnd={handleDeadlineTaskDragEnd}
                          onClick={() => handleDeadlineSlotClick(day, slotIndex)}
                          onContextMenu={(e) => {
                            if (deadlineTask) {
                              e.preventDefault();
                              setDeleteDeadlineTaskId(deadlineTask.id);
                              setShowDeleteDeadlineDialog(true);
                            }
                          }}
                          onTouchStart={(e) => {
                            if (deadlineTask) {
                              e.stopPropagation();
                              handleDeadlineLongPressStart(deadlineTask, day, slotIndex, e);
                            }
                          }}
                          onTouchEnd={(e) => {
                            handleDeadlineLongPressEnd();
                            handleDeadlineCellTap(day, slotIndex, e);
                          }}
                          style={{
                            width: `${DAY_CELL_WIDTH}px`,
                            minWidth: `${DAY_CELL_WIDTH}px`,
                            maxWidth: `${DAY_CELL_WIDTH}px`,
                            height: slotIndex === 1 ? `${TIME_BLOCK_HEIGHT / 2 + 6.5}px` : `${TIME_BLOCK_HEIGHT / 2}px`,
                            borderRight: `1px solid ${cellBorderColor}`,
                            borderBottom: slotIndex === 1 ? `3px solid ${headerBorderColor}` : `1px solid ${cellBorderColor}`,
                            backgroundColor: isDragOver
                              ? currentColors.primary + '40' // Highlight when dragging over
                              : deadlineTask
                              ? colors?.bg
                              : emptyDeadlineCellBg,
                            cursor: deadlineTask ? 'move' : 'pointer',
                            padding: '4px',
                            fontSize: '10px',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            color: deadlineTask ? colors?.font : currentColors.textSecondary,
                            fontWeight: deadlineTask ? '600' : 'normal',
                            boxShadow: copiedDeadlineTask && selectedDeadlineCell === cellKey ? `inset 0 0 0 3px ${currentColors.primary}` : 'none',
                            transition: 'none',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          {deadlineTask && (
                            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px', height: '100%', justifyContent: 'center', pointerEvents: 'none' }}>
                              {deadlineTask.project && (
                                <div style={{ fontWeight: '700', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {deadlineTask.project.description || deadlineTask.project.name}
                                </div>
                              )}
                              {deadlineTask.description && (
                                <div style={{ fontSize: '10px', opacity: 0.95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {deadlineTask.description}
                                </div>
                              )}
                              {!deadlineTask.project && !deadlineTask.description && (
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {deadlineTask.client?.name || 'Unknown'}</div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}

              {/* User rows - each user gets 4 rows (one per time block) */}
              {users
                .filter((user) => visibleUserIds.includes(user.id))
                .map((user, userIndex, visibleUsers) => {
                  const isLastUser = userIndex === visibleUsers.length - 1;
                  return [0, 1, 2, 3].map((blockIndex) => {
                    return (
                      <tr key={`${user.id}-${blockIndex}`} style={{ height: `${TIME_BLOCK_HEIGHT}px` }}>
                        {/* User name cell - only render on first block (blockIndex === 0) */}
                        {blockIndex === 0 && (
                          <td
                            className="user-column-cell"
                            rowSpan={4}
                            style={{
                              width: `${USER_COLUMN_WIDTH}px`,
                              minWidth: `${USER_COLUMN_WIDTH}px`,
                              maxWidth: `${USER_COLUMN_WIDTH}px`,
                              height: `${TIME_BLOCK_HEIGHT * 4}px`,
                              borderBottom: isLastUser ? '0px' : `3px solid ${teamMemberBorderColor}`,
                              borderRight: '0px',
                              backgroundColor: teamMemberColBg,
                              color: teamMemberColText,
                              verticalAlign: 'middle',
                              textAlign: 'center',
                              padding: '12px',
                              fontWeight: '700',
                              fontSize: '17px',
                              position: 'sticky',
                              left: 0,
                              zIndex: 15,
                            }}
                            className="juana-font"
                          >
                            {user.firstName.toUpperCase()}
                          </td>
                        )}

                        {/* Day cells for this block */}
                        {quarterWeeks.map((weekStart, weekIndex) => {
                          const weekDays = [];
                          for (let i = 0; i < 7; i++) {
                            const day = new Date(weekStart);
                            day.setDate(weekStart.getDate() + i);
                            weekDays.push(day);
                          }

                          return weekDays.map((day, dayIndex) => {
                            const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                            const blockKey = `${user.id}-${dateString}-${blockIndex}`;
                            const assignment = blockAssignments[blockKey];

                            // Check if this block is spanned by a previous block
                            let isSpanned = false;
                            for (let prevBlock = blockIndex - 1; prevBlock >= 0; prevBlock--) {
                              const prevKey = `${user.id}-${dateString}-${prevBlock}`;
                              const prevAssignment = blockAssignments[prevKey];
                              if (prevAssignment && prevAssignment.span > (blockIndex - prevBlock)) {
                                isSpanned = true;
                                break;
                              }
                            }

                            // Skip rendering cell if it's spanned by a previous block
                            if (isSpanned) {
                              return null;
                            }

                            const span = assignment?.span || 1;
                            const isHovered = hoveredBlock === blockKey;
                            const isSelected = selectedCell === blockKey;
                            const today = new Date();
                            const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            const isToday = dateString === todayString;

                            // Check if this day is outside the current quarter
                            const dayQuarter = getQuarterFromDate(day);
                            const isOutsideQuarter = dayQuarter !== currentQuarter.quarter;

                            // Check if this day is a weekend (Saturday = 6, Sunday = 0)
                            const dayOfWeek = day.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                            // Check if there's an empty cell above (for top edge expansion)
                            const blockAbove = blockIndex - 1;
                            const hasEmptyCellAbove = blockAbove >= 0 && !blockAssignments[`${user.id}-${dateString}-${blockAbove}`];

                            // Check if there's an empty cell below (for bottom edge expansion)
                            const blockBelow = blockIndex + span;
                            const hasEmptyCellBelow = blockBelow <= 3 && !blockAssignments[`${user.id}-${dateString}-${blockBelow}`];

                            // Show top edge if: can expand up (empty cell above) OR can collapse (span > 1)
                            const showTopEdge = hasEmptyCellAbove || span > 1;

                            // Show bottom edge if: can expand down (empty cell below) OR can collapse (span > 1)
                            const showBottomEdge = hasEmptyCellBelow || span > 1;

                            // Determine if this is the last row for this user
                            const isLastBlockForUser = (blockIndex + span - 1) === 3;

                            // Check if this cell is being dragged over (part of the span)
                            let isDragOver = false;
                            if (dragOverCell && draggedTask) {
                              // Parse the dragOverCell to get its blockIndex
                              const match = dragOverCell.match(/(\d{4}-\d{2}-\d{2})-(\d+)$/);
                              if (match) {
                                const dragOverDate = match[1];
                                const dragOverBlockIndex = parseInt(match[2], 10);
                                const dragOverUserId = dragOverCell.substring(0, dragOverCell.length - match[0].length - 1);

                                // Check if this cell is the same user, date, and within the span range
                                if (user.id === dragOverUserId && dateString === dragOverDate) {
                                  if (blockIndex >= dragOverBlockIndex && blockIndex < dragOverBlockIndex + draggedTask.span) {
                                    isDragOver = true;

                                  }
                                }
                              }
                            }

                            return (
                              <td
                                key={`${weekIndex}-${dayIndex}`}
                                rowSpan={span}
                                onDragOver={(e) => handleTaskDragOver(e, user.id, dateString, blockIndex)}
                                onDrop={(e) => handleTaskDrop(e, user.id, dateString, blockIndex)}
                                onClick={() => {
                                  // Desktop: no click-to-paste functionality
                                  // Use keyboard shortcuts (Cmd+C, Cmd+V) only
                                  // Mobile uses tap/long-press handlers instead
                                }}
                                style={{
                                  width: `${DAY_CELL_WIDTH}px`,
                                  minWidth: `${DAY_CELL_WIDTH}px`,
                                  maxWidth: `${DAY_CELL_WIDTH}px`,
                                  height: `${TIME_BLOCK_HEIGHT * span}px`,
                                  borderBottom: (isLastBlockForUser && isLastUser) ? '0px' : (isLastBlockForUser ? `3px solid ${teamMemberBorderColor}` : `1px solid ${cellBorderColor}`),
                                  borderRight: `1px solid ${cellBorderColor}`,
                                  padding: assignment?.projectName === 'Unavailable' ? '0' : '2px',
                                  position: 'relative',
                                  backgroundColor: isToday ? todayCellBg : (isWeekend ? weekendCellBg : weekdayCellBg),
                                  verticalAlign: 'top',
                                  cursor: assignment ? 'pointer' : 'pointer',
                                }}
                                onMouseEnter={() => handleCellHover(user.id, dateString, blockIndex, true)}
                                onMouseLeave={() => handleCellHover(user.id, dateString, blockIndex, false)}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: assignment ? (assignment.projectName === 'Unavailable' ? '100%' : 'calc(100% - 4px)') : '100%',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    position: 'relative',
                                    margin: assignment ? (assignment.projectName === 'Unavailable' ? '0' : '2px') : '0',
                                    borderRadius: assignment ? (assignment.projectName === 'Unavailable' ? '0' : '6px') : '0',
                                    overflow: assignment ? (assignment.projectName === 'Unavailable' ? 'visible' : 'hidden') : 'visible',
                                    backgroundColor: isDragOver ? `${currentColors.secondary}99` : (isSelected ? `${currentColors.primary}66` : (isOutsideQuarter ? 'transparent' : (assignment ? (() => {
                                      // Determine background color based on task type using custom planning colors
                                      const projectName = assignment.projectName || '';
                                      const projectNameLower = projectName.toLowerCase();

                                      // Status events
                                      if (projectName === 'Out of Office' || projectName.includes('(Out of Office)')) {
                                        return outOfOfficeBg;
                                      } else if (projectName === 'Time Off') {
                                        return timeOffBg;
                                      } else if (projectName === 'Unavailable') {
                                        return unavailableBg;
                                      }

                                      // Task types based on project name
                                      if (projectNameLower.includes('admin')) {
                                        return adminTaskBg;
                                      } else if (projectNameLower.includes('marketing')) {
                                        return marketingTaskBg;
                                      }

                                      return projectTaskBg; // Default color for regular projects
                                    })() : 'transparent'))),
                                    borderWidth: copiedCell && selectedCell === blockKey ? 3 : 0,
                                    borderColor: copiedCell && selectedCell === blockKey ? currentColors.primary : 'transparent',
                                    borderStyle: 'solid',
                                  }}
                                  onClick={() => handleBlockClick(user.id, dateString, blockIndex)}
                                  onTouchStart={(e) => {
                                    if (assignment) {
                                      // For filled cells, let the inner div handle it
                                      return;
                                    }
                                    // For empty cells, handle tap for paste
                                    e.stopPropagation();
                                  }}
                                  onTouchEnd={(e) => {
                                    if (assignment) {
                                      // For filled cells, let the inner div handle it
                                      return;
                                    }
                                    // For empty cells, handle tap for paste
                                    e.stopPropagation();
                                    handleMobileCellTap(user.id, dateString, blockIndex, e);
                                  }}
                                >
                                  {/* Draggable top edge */}
                                  {assignment && showTopEdge && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 10,
                                        zIndex: 10,
                                        backgroundColor: isHovered ? `${currentColors.primary}80` : 'transparent',
                                        cursor: 'ns-resize',
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();

                                        handleEdgeDragStart(user.id, dateString, blockIndex, 'top', e, span);
                                      }}
                                      onTouchStart={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault(); // Prevent window scroll during edge drag

                                        handleEdgeDragStart(user.id, dateString, blockIndex, 'top', e.touches[0], span);
                                      }}
                                    />
                                  )}
                                  {assignment && (
                                    <>
                                      {/* Center area for displaying task and long-press menu */}
                                      <div
                                        draggable={Platform.OS === 'web'}
                                        onDragStart={(e) => handleTaskDragStart(e, user.id, dateString, blockIndex)}
                                        onDragEnd={handleTaskDragEnd}
                                        onTouchStart={(e) => {
                                          e.stopPropagation();
                                          handleMobileLongPressStart(user.id, dateString, blockIndex, e);
                                        }}
                                        onTouchEnd={(e) => {
                                          handleMobileLongPressEnd();
                                          handleMobileCellTap(user.id, dateString, blockIndex, e);
                                        }}
                                        style={{
                                          position: 'absolute',
                                          top: '0',
                                          bottom: '0',
                                          left: '4px',
                                          right: '4px',
                                          cursor: 'move',
                                          zIndex: 5,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                          padding: '4px',
                                        }}
                                      >
                                        <div style={{
                                          fontSize: 11,
                                          lineHeight: '1.2',
                                          color: (() => {
                                            const projectName = assignment.projectName || '';
                                            const projectNameLower = projectName.toLowerCase();

                                            // Status events
                                            if (projectName === 'Time Off') {
                                              return timeOffFont;
                                            }
                                            if (projectName === 'Out of Office' || projectName.includes('(Out of Office)')) {
                                              return outOfOfficeFont;
                                            }
                                            if (projectName === 'Unavailable') {
                                              return unavailableFont;
                                            }

                                            // Task types based on project name
                                            if (projectNameLower.includes('admin')) {
                                              return adminTaskFont;
                                            } else if (projectNameLower.includes('marketing')) {
                                              return marketingTaskFont;
                                            }

                                            // Regular projects use custom project font color
                                            return projectTaskFont;
                                          })(),
                                          fontWeight: 700,
                                          marginBottom: 0,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: '-webkit-box',
                                          WebkitLineClamp: Math.max(3, span * 2),
                                          WebkitBoxOrient: 'vertical',
                                          userSelect: 'none',
                                          pointerEvents: 'none',
                                          textAlign: 'center',
                                        }}>
                                          {assignment.projectName}
                                        </div>
                                        {assignment.task && (
                                          <div style={{
                                            fontSize: 9,
                                            lineHeight: '1.2',
                                            marginTop: 2,
                                            color: (() => {
                                              const projectName = assignment.projectName || '';
                                              const projectNameLower = projectName.toLowerCase();

                                              // Status events
                                              if (projectName === 'Time Off') {
                                                return timeOffFont;
                                              }
                                              if (projectName === 'Out of Office' || projectName.includes('(Out of Office)')) {
                                                return outOfOfficeFont;
                                              }
                                              if (projectName === 'Unavailable') {
                                                return unavailableFont;
                                              }

                                              // Task types based on project name
                                              if (projectNameLower.includes('admin')) {
                                                return adminTaskFont;
                                              } else if (projectNameLower.includes('marketing')) {
                                                return marketingTaskFont;
                                              }

                                              // Regular projects use custom project font color
                                              return projectTaskFont;
                                            })(),
                                            fontStyle: 'normal',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: span,
                                            WebkitBoxOrient: 'vertical',
                                            userSelect: 'none',
                                            pointerEvents: 'none',
                                            textAlign: 'center',
                                          }}>
                                            {assignment.task}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}

                                  {/* Draggable bottom edge */}
                                  {assignment && showBottomEdge && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: 10,
                                        zIndex: 10,
                                        backgroundColor: isHovered ? `${currentColors.primary}80` : 'transparent',
                                        cursor: 'ns-resize',
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();

                                        handleEdgeDragStart(user.id, dateString, blockIndex, 'bottom', e, span);
                                      }}
                                      onTouchStart={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault(); // Prevent window scroll during edge drag

                                        handleEdgeDragStart(user.id, dateString, blockIndex, 'bottom', e.touches[0], span);
                                      }}
                                    />
                                  )}
                                </div>
                              </td>
                            );
                          });
                        })}
                      </tr>
                    );
                  });
                })}
            </tbody>
          </table>
          </div>
        ) : (
          // Fallback for non-web platforms - use View-based layout
          <View style={styles.mainContent}>
            {/* Fixed left column */}
            <View style={[styles.staticColumn, { borderRightColor: currentColors.text }]}>
              {/* Date label in header */}
              <View style={[styles.staticHeaderCell, { borderBottomColor: currentColors.text }]}>
                <Text style={[styles.staticHeaderText, { color: currentColors.text }]}>Date</Text>
              </View>

              {/* User names - only show visible users */}
              {users
                .filter((user) => visibleUserIds.includes(user.id))
                .map((user) => (
                  <View key={user.id} style={[styles.staticUserCell, { borderBottomColor: currentColors.text }]}>
                    <Text style={[styles.staticUserText, { color: currentColors.text }]}>{user.firstName.toUpperCase()}</Text>
                  </View>
                ))}

            </View>

            {/* Mobile view - simplified grid */}
            <Text>Mobile view not yet implemented with new table structure</Text>
          </View>
        )}
      </View>

      {/* Floating Settings Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: currentColors.secondary }]}
        onPress={handleManageTeamMembers}
        activeOpacity={0.8}
      >
        <HugeiconsIcon icon={Settings01Icon} size={28} color={settingsIconColor} />
      </TouchableOpacity>

      {/* Team Members Management Modal */}
      <Modal
        visible={showManageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManageModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background.bg300 }]}>
            <Title style={[styles.modalTitle, { color: currentColors.text }]}>Manage Team Members</Title>
            <Text style={[styles.modalSubtitle, { color: currentColors.text }]}>
              Select team members to show in the planning view. Drag and drop to reorder.
            </Text>

            <ScrollView style={styles.modalList}>
              {users.map((user) => {
                const isVisible = visibleUserIds.includes(user.id);
                const isBeingDragged = draggedUserId === user.id;
                const isDragOver = dragOverUserId === user.id;

                return (
                  <View
                    key={user.id}
                    style={[
                      styles.modalListItem,
                      { borderBottomColor: currentColors.border },
                      isBeingDragged && [styles.modalListItemDragging, { backgroundColor: currentColors.background.bg300 }],
                      isDragOver && [styles.modalListItemDragOver, { backgroundColor: currentColors.background.bg300, borderBottomColor: currentColors.primary }],
                    ]}
                    onStartShouldSetResponder={() => false}
                    onMoveShouldSetResponder={() => false}
                  >
                    {/* Drag handle */}
                    <div
                      draggable={Platform.OS === 'web'}
                      onDragStart={(e: any) => {
                        if (Platform.OS === 'web') {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/html', user.id);
                          handleDragStart(user.id);
                        }
                      }}
                      onDragEnd={(e: any) => {
                        if (Platform.OS === 'web') {
                          handleDragEnd();
                        }
                      }}
                      onDragOver={(e: any) => {
                        if (Platform.OS === 'web') {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          handleDragOver(user.id);
                        }
                      }}
                      onDrop={(e: any) => {
                        if (Platform.OS === 'web') {
                          e.preventDefault();
                          handleDrop(user.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (Platform.OS === 'web') {
                          setDragOverUserId(null);
                        }
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: '100%',
                        justifyContent: 'space-between',
                      }}
                    >
                      {/* User name */}
                      <View style={styles.userNameContainer}>
                        <Text style={[styles.modalListItemText, { color: currentColors.text }]}>
                          {user.firstName} {user.lastName}
                        </Text>
                      </View>

                      {/* Visibility Toggle */}
                      <Switch
                        value={isVisible}
                        onValueChange={() => toggleUserVisibility(user.id)}
                        color={currentColors.primary}
                      />
                    </div>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                mode="contained"
                onPress={handleSaveSettings}
                style={styles.modalButton}
                buttonColor={currentColors.primary}
              >
                Save
              </Button>
              {user?.role === 'ADMIN' && (
                <Button
                  mode="outlined"
                  onPress={handleSaveAsDefaultForAll}
                  style={[styles.modalButton, { marginTop: 10 }]}
                >
                  Save as Default for All Users
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Assignment Modal */}
      <Modal
        visible={showProjectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProjectModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background.bg300 }]}>
            <Title style={[styles.modalTitle, { color: currentColors.text }]}>Assign Project</Title>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
              {/* Only show project and task fields if Unavailable or Time Off is NOT selected */}
              {/* Out of Office still allows project assignment */}
              {!isUnavailable && !isTimeOff && (
                <>
                  <TextInput
                    label="Project (by common name)"
                    value={projectSearch}
                    onChangeText={setProjectSearch}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Search by common name..."
                    left={<TextInput.Icon icon={() => <HugeiconsIcon icon={Search01Icon} size={20} color={currentColors.icon} />} />}
                  />

                  {filteredProjects.length > 0 && projectSearch && (
                    <View style={[styles.projectsList, { borderColor: currentColors.border }]}>
                      {filteredProjects.map((project) => (
                        <TouchableOpacity
                          key={project.id}
                          style={[styles.projectItem, { borderBottomColor: currentColors.border }]}
                          onPress={() => setProjectSearch(project.description || project.name)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.projectItemText, { color: currentColors.text }]}>
                            {project.description || project.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TextInput
                    label="Task Description (Optional)"
                    value={taskDescription}
                    onChangeText={setTaskDescription}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                    placeholder="What will you work on?"
                  />
                </>
              )}

            {/* Status Checkboxes */}
            <View style={[styles.checkboxGroup, { borderColor: currentColors.border }]}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setIsOutOfOffice(!isOutOfOffice);
                  if (!isOutOfOffice) {
                    setIsTimeOff(false);
                    setIsUnavailable(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={isOutOfOffice ? CheckmarkCircle02Icon : CircleIcon}
                  size={24}
                  color={currentColors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Out of Office</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setIsTimeOff(!isTimeOff);
                  if (!isTimeOff) {
                    setIsOutOfOffice(false);
                    setIsUnavailable(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={isTimeOff ? CheckmarkCircle02Icon : CircleIcon}
                  size={24}
                  color={currentColors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Time Off</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setIsUnavailable(!isUnavailable);
                  if (!isUnavailable) {
                    setIsOutOfOffice(false);
                    setIsTimeOff(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={isUnavailable ? CheckmarkCircle02Icon : CircleIcon}
                  size={24}
                  color={currentColors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Unavailable</Text>
              </TouchableOpacity>
            </View>

            {/* Repeat Event Section */}
            <View style={[styles.repeatSection, { borderColor: currentColors.border }]}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsRepeatEvent(!isRepeatEvent)}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={isRepeatEvent ? CheckmarkCircle02Icon : CircleIcon}
                  size={24}
                  color={currentColors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Repeat Event</Text>
              </TouchableOpacity>

              {isRepeatEvent && (
                <View style={styles.repeatOptions}>
                  {/* Repeat Type Selection */}
                  <View style={styles.repeatTypeRow}>
                    <TouchableOpacity
                      style={[styles.repeatTypeButton, { borderColor: currentColors.border }, repeatType === 'weekly' && [styles.repeatTypeButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                      onPress={() => setRepeatType('weekly')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.repeatTypeText, { color: currentColors.textSecondary }, repeatType === 'weekly' && [styles.repeatTypeTextActive, { color: currentColors.background.white }]]}>
                        Weekly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.repeatTypeButton, { borderColor: currentColors.border }, repeatType === 'monthly' && [styles.repeatTypeButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                      onPress={() => setRepeatType('monthly')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.repeatTypeText, { color: currentColors.textSecondary }, repeatType === 'monthly' && [styles.repeatTypeTextActive, { color: currentColors.background.white }]]}>
                        Monthly
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Weekly Options */}
                  {repeatType === 'weekly' && (
                    <View style={styles.weeklyOptions}>
                      <Text style={[styles.repeatSubtitle, { color: currentColors.text }]}>Repeat on:</Text>
                      <View style={styles.weekdayButtons}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                          <TouchableOpacity
                            key={day}
                            style={[styles.weekdayButton, { borderColor: currentColors.border }, repeatWeeklyDays[index] && [styles.weekdayButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                            onPress={() => {
                              const newDays = [...repeatWeeklyDays];
                              newDays[index] = !newDays[index];
                              setRepeatWeeklyDays(newDays);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.weekdayText, { color: currentColors.textSecondary }, repeatWeeklyDays[index] && [styles.weekdayTextActive, { color: currentColors.background.white }]]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Monthly Options */}
                  {repeatType === 'monthly' && (
                    <View style={styles.monthlyOptions}>
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setMonthlyRepeatType('date')}
                        activeOpacity={0.7}
                      >
                        <HugeiconsIcon
                          icon={monthlyRepeatType === 'date' ? CheckmarkCircle02Icon : CircleIcon}
                          size={24}
                          color={currentColors.primary}
                        />
                        <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Same date every month</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setMonthlyRepeatType('weekday')}
                        activeOpacity={0.7}
                      >
                        <HugeiconsIcon
                          icon={monthlyRepeatType === 'weekday' ? CheckmarkCircle02Icon : CircleIcon}
                          size={24}
                          color={currentColors.primary}
                        />
                        <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Specific week and day</Text>
                      </TouchableOpacity>

                      {monthlyRepeatType === 'weekday' && (
                        <View style={styles.weekdaySelectors}>
                          <View style={styles.selectorRow}>
                            <Text style={[styles.selectorLabel, { color: currentColors.text }]}>Week:</Text>
                            <View style={styles.weekNumbers}>
                              {[1, 2, 3, 4].map((num) => (
                                <TouchableOpacity
                                  key={num}
                                  style={[styles.weekNumberButton, { borderColor: currentColors.border }, monthlyWeekNumber === num && [styles.weekNumberButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                                  onPress={() => setMonthlyWeekNumber(num)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.weekNumberText, { color: currentColors.textSecondary }, monthlyWeekNumber === num && [styles.weekNumberTextActive, { color: currentColors.background.white }]]}>
                                    {num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : '4th'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={styles.selectorRow}>
                            <Text style={[styles.selectorLabel, { color: currentColors.text }]}>Day:</Text>
                            <View style={styles.weekdayButtons}>
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                                <TouchableOpacity
                                  key={day}
                                  style={[styles.weekdayButton, { borderColor: currentColors.border }, monthlyDayOfWeek === (index + 1) && [styles.weekdayButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                                  onPress={() => setMonthlyDayOfWeek(index + 1)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.weekdayText, { color: currentColors.textSecondary }, monthlyDayOfWeek === (index + 1) && [styles.weekdayTextActive, { color: currentColors.background.white }]]}>
                                    {day}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* End Date */}
                  <View style={styles.endDateSection}>
                    <Text style={styles.repeatSubtitle}>End Date (Optional):</Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={repeatEndDate ? repeatEndDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setRepeatEndDate(new Date(e.target.value));
                          } else {
                            setRepeatEndDate(null);
                          }
                        }}
                        style={{
                          padding: 12,
                          borderWidth: 1,
                          borderColor: currentColors.border,
                          borderRadius: 4,
                          fontSize: 16,
                          fontFamily: 'system-ui',
                        }}
                      />
                    ) : (
                      <Button
                        mode="outlined"
                        onPress={() => setShowDatePicker(true)}
                        style={{ marginTop: 8 }}
                      >
                        {repeatEndDate ? repeatEndDate.toISOString().split('T')[0] : 'Select End Date'}
                      </Button>
                    )}
                  </View>
                </View>
              )}
            </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                mode="text"
                onPress={() => {
                  setShowProjectModal(false);
                  setProjectSearch('');
                  setTaskDescription('');
                  setIsOutOfOffice(false);
                  setIsTimeOff(false);
                  setIsUnavailable(false);
                  setIsRepeatEvent(false);
                  setRepeatType('weekly');
                  setRepeatEndDate(null);
                  setRepeatWeeklyDays([false, false, false, false, false, false, false]);
                  setMonthlyRepeatType('date');
                  setMonthlyWeekNumber(1);
                  setMonthlyDayOfWeek(1);
                  setSelectedBlock(null);
                }}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              {selectedBlock && blockAssignments[`${selectedBlock.userId}-${selectedBlock.date}-${selectedBlock.blockIndex}`]?.id && (
                <Button
                  mode="outlined"
                  onPress={() => setShowDeletePlanningDialog(true)}
                  style={styles.modalButton}
                  textColor={currentColors.secondary}
                >
                  Delete
                </Button>
              )}
              <Button
                mode="contained"
                onPress={handleSaveProjectAssignment}
                style={styles.modalButton}
              >
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Long Press Action Menu */}
      {longPressAction && (
        <Modal
          transparent
          visible={!!longPressAction}
          onRequestClose={() => setLongPressAction(null)}
        >
          <TouchableWithoutFeedback onPress={() => setLongPressAction(null)}>
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <TouchableWithoutFeedback>
                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  width: 300,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginBottom: 16,
                    color: currentColors.text,
                    textAlign: 'center',
                  }}>
                    Task Action
                  </Text>

                  <TouchableOpacity
                    style={{
                      backgroundColor: currentColors.primary,
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                    onPress={() => {
                      const blockKey = `${longPressAction.userId}-${longPressAction.date}-${longPressAction.blockIndex}`;
                      setCopiedCell({
                        projectId: longPressAction.assignment.projectId,
                        projectName: longPressAction.assignment.projectName,
                        task: longPressAction.assignment.task,
                        span: longPressAction.assignment.span,
                      });
                      setLongPressAction(null);
                      setSuccessMessage('Task copied! Tap an empty cell to paste.');
                      setShowSuccessDialog(true);
                    }}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      Copy
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: currentColors.secondary || currentColors.primary,
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                    onPress={() => {
                      const blockKey = `${longPressAction.userId}-${longPressAction.date}-${longPressAction.blockIndex}`;
                      setCopiedCell({
                        projectId: longPressAction.assignment.projectId,
                        projectName: longPressAction.assignment.projectName,
                        task: longPressAction.assignment.task,
                        span: longPressAction.assignment.span,
                        sourceId: longPressAction.assignment.id,
                        sourceBlockKey: blockKey,
                      });
                      setRepositionMode(true);
                      setLongPressAction(null);
                      setSuccessMessage('Ready to reposition! Tap an empty cell to move the task.');
                      setShowSuccessDialog(true);
                    }}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      Reposition
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: currentColors.background.bg300,
                      padding: 16,
                      borderRadius: 8,
                    }}
                    onPress={() => setLongPressAction(null)}
                  >
                    <Text style={{
                      color: currentColors.text,
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Deadline Task Long Press Action Menu */}
      {longPressDeadlineAction && (
        <Modal
          transparent
          visible={!!longPressDeadlineAction}
          onRequestClose={() => setLongPressDeadlineAction(null)}
        >
          <TouchableWithoutFeedback onPress={() => setLongPressDeadlineAction(null)}>
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <TouchableWithoutFeedback>
                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  width: 300,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginBottom: 16,
                    color: currentColors.text,
                    textAlign: 'center',
                  }}>
                    Deadline Task Action
                  </Text>

                  <TouchableOpacity
                    style={{
                      backgroundColor: currentColors.primary,
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                    onPress={() => {
                      const task = longPressDeadlineAction.task;
                      const dateString = `${longPressDeadlineAction.date.getFullYear()}-${String(longPressDeadlineAction.date.getMonth() + 1).padStart(2, '0')}-${String(longPressDeadlineAction.date.getDate()).padStart(2, '0')}`;
                      const slotKey = `${dateString}-${longPressDeadlineAction.slotIndex}`;

                      setCopiedDeadlineTask({
                        projectId: task.projectId,
                        clientId: task.clientId,
                        description: task.description || '',
                        deadlineType: task.deadlineType,
                      });
                      setLongPressDeadlineAction(null);
                      setSuccessMessage('Deadline task copied! Tap an empty slot to paste.');
                      setShowSuccessDialog(true);
                    }}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      Copy
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: currentColors.secondary || currentColors.primary,
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                    onPress={() => {
                      const task = longPressDeadlineAction.task;
                      const dateString = `${longPressDeadlineAction.date.getFullYear()}-${String(longPressDeadlineAction.date.getMonth() + 1).padStart(2, '0')}-${String(longPressDeadlineAction.date.getDate()).padStart(2, '0')}`;
                      const slotKey = `${dateString}-${longPressDeadlineAction.slotIndex}`;

                      setCopiedDeadlineTask({
                        projectId: task.projectId,
                        clientId: task.clientId,
                        description: task.description || '',
                        deadlineType: task.deadlineType,
                        sourceId: task.id,
                        sourceSlotKey: slotKey,
                      });
                      setRepositionDeadlineMode(true);
                      setLongPressDeadlineAction(null);
                      setSuccessMessage('Ready to reposition! Tap an empty slot to move the deadline task.');
                      setShowSuccessDialog(true);
                    }}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      Reposition
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: currentColors.background.bg300,
                      padding: 16,
                      borderRadius: 8,
                    }}
                    onPress={() => setLongPressDeadlineAction(null)}
                  >
                    <Text style={{
                      color: currentColors.text,
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Copy Confirmation Toast */}
      {showCopyConfirmation && Platform.OS === 'web' && (
        <View
          style={{
            position: 'absolute',
            bottom: 80,
            left: '50%',
            transform: [{translateX: -175}],
            width: 350,
            backgroundColor: currentColors.success || '#4CAF50',
            borderRadius: 8,
            padding: 16,
            zIndex: 10000,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Task copied! Tap an empty cell to paste.
          </Text>
        </View>
      )}

      {/* Deadline Task Modal */}
      <DeadlineTaskModal
        visible={showDeadlineModal}
        onDismiss={() => {
          setShowDeadlineModal(false);
          setSelectedDeadlineSlot(null);
          setEditingDeadlineTask(null);
        }}
        onSave={handleSaveDeadlineTask}
        onDelete={editingDeadlineTask ? async () => await handleDeleteDeadlineTask(editingDeadlineTask.id) : undefined}
        date={selectedDeadlineSlot?.date || new Date()}
        slotIndex={selectedDeadlineSlot?.slotIndex || 0}
        existingTask={editingDeadlineTask}
      />

      {/* Delete Planning Task Confirmation Dialog (from keyboard shortcut) */}
      <CustomDialog
        visible={showDeleteDialog}
        title="Delete Planning Task"
        message="Are you sure you want to delete this planning task?"
        buttons={[
          {
            label: 'Cancel',
            onPress: () => {
              setShowDeleteDialog(false);
              setDeleteTaskId(null);
              setDeleteTaskBlockKey(null);
            },
            variant: 'outline',
          },
          {
            label: 'Delete',
            onPress: handleConfirmKeyboardDelete,
            variant: 'solid',
            color: currentColors.error,
          },
        ]}
        onDismiss={() => {
          setShowDeleteDialog(false);
          setDeleteTaskId(null);
          setDeleteTaskBlockKey(null);
        }}
      />

      {/* Delete Deadline Task Confirmation Dialog */}
      <CustomDialog
        visible={showDeleteDeadlineDialog}
        title="Delete Deadline Task"
        message="Are you sure you want to delete this deadline task?"
        buttons={[
          {
            label: 'Cancel',
            onPress: () => {
              setShowDeleteDeadlineDialog(false);
              setDeleteDeadlineTaskId(null);
            },
            variant: 'outline',
          },
          {
            label: 'Delete',
            onPress: async () => {
              if (deleteDeadlineTaskId) {
                await handleDeleteDeadlineTask(deleteDeadlineTaskId);
                setShowDeleteDeadlineDialog(false);
                setDeleteDeadlineTaskId(null);
              }
            },
            variant: 'solid',
            color: currentColors.error,
          },
        ]}
        onDismiss={() => {
          setShowDeleteDeadlineDialog(false);
          setDeleteDeadlineTaskId(null);
        }}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        buttons={[
          {
            label: 'OK',
            onPress: () => setShowSuccessDialog(false),
            variant: 'solid',
          },
        ]}
        onDismiss={() => setShowSuccessDialog(false)}
      />

      {/* Error Dialog */}
      <CustomDialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
        buttons={[
          {
            label: 'OK',
            onPress: () => setShowErrorDialog(false),
            variant: 'solid',
            color: currentColors.error,
          },
        ]}
        onDismiss={() => setShowErrorDialog(false)}
      />

      {/* Delete Planning Task Confirmation Dialog */}
      <CustomDialog
        visible={showDeletePlanningDialog}
        title="Delete Planning Task"
        message="Are you sure you want to delete this planning task?"
        buttons={[
          {
            label: 'Cancel',
            onPress: () => setShowDeletePlanningDialog(false),
            variant: 'outline',
          },
          {
            label: 'Delete',
            onPress: handleDeletePlanningTask,
            variant: 'solid',
            color: currentColors.error,
          },
        ]}
        onDismiss={() => setShowDeletePlanningDialog(false)}
      />

      {/* Notice Dialog */}
      <CustomDialog
        visible={showNoticeDialog}
        title="Notice"
        message={noticeMessage}
        buttons={[
          {
            label: 'OK',
            onPress: () => setShowNoticeDialog(false),
            variant: 'solid',
          },
        ]}
        onDismiss={() => setShowNoticeDialog(false)}
      />

      {/* Warning Dialog */}
      <CustomDialog
        visible={showWarningDialog}
        title="Warning"
        message={warningMessage}
        buttons={[
          {
            label: 'OK',
            onPress: () => setShowWarningDialog(false),
            variant: 'solid',
            color: currentColors.warning || currentColors.secondary,
          },
        ]}
        onDismiss={() => setShowWarningDialog(false)}
      />
    </View>
  );
};

const ROW_HEIGHT = 200; // Increased to fit 4 time blocks

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && { userSelect: 'none' as any }),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 75,
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  // Static left column
  staticColumn: {
    width: USER_COLUMN_WIDTH,
    borderRightWidth: 1,
  },
  staticHeaderCell: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  staticHeaderText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  staticUserCell: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 12,
    borderBottomWidth: 1,
  },
  staticUserText: {
    fontSize: 13,
    fontWeight: '700',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  // Scrollable grid
  scrollableGrid: {
    flex: 1,
  },
  weekColumn: {
    // Each week is a column in the horizontal scroll
  },
  dayHeaderRow: {
    flexDirection: 'row',
    height: 50,
    borderBottomWidth: 1,
  },
  dayHeaderCell: {
    width: DAY_CELL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    paddingVertical: 4,
  },
  todayHeaderCell: {
  },
  dayHeaderName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  todayHeaderName: {
    fontWeight: 'bold',
  },
  dayHeaderDate: {
    fontSize: 10,
  },
  todayHeaderDate: {
    fontWeight: 'bold',
  },
  gridUserRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
  },
  gridDayCell: {
    width: DAY_CELL_WIDTH,
    borderRightWidth: 1,
  },
  timeBlock: {
    height: TIME_BLOCK_HEIGHT,
    borderBottomWidth: 1,
    padding: 4,
    justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' && { userSelect: 'none' as any }),
  },
  timeBlockFilled: {
  },
  timeBlockTouchable: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 5,
  },
  timeBlockContent: {
    flex: 1,
    justifyContent: 'center',
  },
  dragEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
    zIndex: 10,
    backgroundColor: 'transparent',
    cursor: 'ns-resize',
  },
  dragEdgeTop: {
    top: 0,
  },
  dragEdgeBottom: {
    bottom: 0,
  },
  dragEdgeVisible: {
  },
  collapseButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  projectName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    ...(Platform.OS === 'web' && { userSelect: 'none' as any }),
  },
  taskText: {
    fontSize: 9,
    fontStyle: 'normal',
    ...(Platform.OS === 'web' && { userSelect: 'none' as any }),
  },
  input: {
    marginBottom: 15,
  },
  projectsList: {
    maxHeight: 150,
    marginBottom: 15,
    borderWidth: 1,
    borderRadius: 4,
  },
  projectItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  projectItemText: {
    fontSize: 14,
  },
  gridTodayCell: {
  },
  gridOutsideQuarterCell: {
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  loadNextQuarterButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minWidth: 200,
  },
  buttonContent: {
    flexDirection: 'row-reverse',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Platform.select({
      ios: 40,
      android: 20,
      web: 20,
    }),
    paddingHorizontal: 10,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    minWidth: 280,
    maxWidth: 600,
    maxHeight: '75%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalScrollView: {
    maxHeight: Platform.OS === 'web' ? 600 : 500,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  modalListItemDragging: {
    opacity: 0.5,
  },
  modalListItemDragOver: {
    borderBottomWidth: 2,
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 0,
  },
  userNameContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  modalListItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  modalButtons: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  modalButton: {
    minWidth: 100,
  },
  // Preference row styles
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  preferenceLabel: {
    fontSize: 15,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Checkbox styles
  checkboxGroup: {
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  // Repeat event styles
  repeatSection: {
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  repeatOptions: {
    marginTop: 16,
    paddingLeft: 16,
  },
  repeatTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  repeatTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  repeatTypeButtonActive: {
  },
  repeatTypeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  repeatTypeTextActive: {
  },
  repeatSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  weeklyOptions: {
    marginBottom: 16,
  },
  weekdayButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  weekdayButton: {
    width: 45,
    height: 45,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayButtonActive: {
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekdayTextActive: {
  },
  monthlyOptions: {
    marginBottom: 16,
  },
  weekdaySelectors: {
    marginTop: 12,
    paddingLeft: 16,
  },
  selectorRow: {
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  weekNumbers: {
    flexDirection: 'row',
    gap: 8,
  },
  weekNumberButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  weekNumberButtonActive: {
  },
  weekNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekNumberTextActive: {
  },
  endDateSection: {
    marginTop: 16,
  },
  // Color customization styles
  colorSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  colorSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 5,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  colorLabel: {
    fontSize: 14,
    flex: 1,
  },
  colorButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
  },
});

export default PlanningScreen;
