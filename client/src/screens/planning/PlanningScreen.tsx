import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, Text, TouchableOpacity, Modal, PanResponder, TextInput as RNTextInput, FlatList, Pressable, TouchableWithoutFeedback, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Title, ActivityIndicator, IconButton, Button, Checkbox, TextInput, Menu, Divider, Portal, Switch } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
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
import { PlanningScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import PlanningHeader from '../../components/planning/PlanningHeader';
import ManageTeamMembersModal from '../../components/planning/ManageTeamMembersModal';
import ProjectAssignmentModal from '../../components/planning/ProjectAssignmentModal';
import PlanningTaskCell from '../../components/planning/PlanningTaskCell';
import { usePlanningNavigation } from '../../hooks/usePlanningNavigation';
import { usePlanningData } from '../../hooks/usePlanningData';
import { usePlanningDragDrop } from '../../hooks/usePlanningDragDrop';

const { width } = Dimensions.get('window');
const WEEK_WIDTH = width > 1200 ? 1200 : width - 40; // Max width for week view
const DAY_CELL_WIDTH = 180; // Fixed width for each day column
const USER_COLUMN_WIDTH = 100; // Fixed width for user names column
const TIME_BLOCK_HEIGHT = 48; // Height for each 2-hour block

const PlanningScreen = React.memo(({ navigation, route }: PlanningScreenProps) => {
  const { currentColors, selectedPalette } = useTheme();
  const { user } = useAuth();
  const { planningColors } = usePlanningColors();
  const queryClient = useQueryClient();

  // Use custom hooks for navigation and data
  const navigationHook = usePlanningNavigation();
  const dataHook = usePlanningData();

  // Navigation from hook
  const {
    currentQuarter: hookCurrentQuarter,
    currentWeekStart: hookCurrentWeekStart,
    visibleWeekIndex: hookVisibleWeekIndex,
    quarterWeeks: hookQuarterWeeks,
    visibleWeekStart: hookVisibleWeekStart,
    weekNumber: hookWeekNumber,
    weekTitle: hookWeekTitle,
    showQuarterPrompt: hookShowQuarterPrompt,
    nextQuarterInfo: hookNextQuarterInfo,
    previousQuarterInfo: hookPreviousQuarterInfo,
    loadedQuarters: hookLoadedQuarters,
    setVisibleWeekIndex: hookSetVisibleWeekIndex,
    loadNextWeek: hookLoadNextWeek,
    loadPreviousWeek: hookLoadPreviousWeek,
    confirmLoadNextQuarter: hookConfirmLoadNextQuarter,
    confirmLoadPreviousQuarter: hookConfirmLoadPreviousQuarter,
    cancelLoadNextQuarter: hookCancelLoadNextQuarter,
    getWeekNumber: hookGetWeekNumber,
    getQuarterFromDate: hookGetQuarterFromDate,
    generateQuarterWeeks: hookGenerateQuarterWeeks,
    updatePersistedQuarters: hookUpdatePersistedQuarters,
    isDateInNextUnloadedQuarter: hookIsDateInNextUnloadedQuarter,
    autoAppendNextQuarterIfNeeded: hookAutoAppendNextQuarterIfNeeded,
  } = navigationHook;

  // Data from hook
  const {
    users: hookUsers,
    projects: hookProjects,
    filteredProjects: hookFilteredProjects,
    blockAssignments: hookBlockAssignments,
    deadlineTasks: hookDeadlineTasks,
    visibleUserIds: hookVisibleUserIds,
    loading: hookLoading,
    setUsers: hookSetUsers,
    setProjects: hookSetProjects,
    setFilteredProjects: hookSetFilteredProjects,
    setBlockAssignments: hookSetBlockAssignments,
    setDeadlineTasks: hookSetDeadlineTasks,
    setVisibleUserIds: hookSetVisibleUserIds,
    loadData: hookLoadData,
  } = dataHook;

  // Use hook values directly (no fallback needed - hook manages state)
  const users = hookUsers;
  const projects = hookProjects;
  const filteredProjects = hookFilteredProjects;
  const blockAssignments = hookBlockAssignments;
  const deadlineTasks = hookDeadlineTasks;
  const visibleUserIds = hookVisibleUserIds;
  const loading = hookLoading;
  const currentQuarter = hookCurrentQuarter;
  const currentWeekStart = hookCurrentWeekStart;
  const visibleWeekIndex = hookVisibleWeekIndex;
  const quarterWeeks = hookQuarterWeeks;
  const visibleWeekStart = hookVisibleWeekStart;
  const weekNumber = hookWeekNumber;
  const weekTitle = hookWeekTitle;
  const setVisibleWeekIndex = hookSetVisibleWeekIndex;
  const loadNextWeek = hookLoadNextWeek;
  const loadPreviousWeek = hookLoadPreviousWeek;
  const getWeekNumber = hookGetWeekNumber;
  const getQuarterFromDate = hookGetQuarterFromDate;
  const generateQuarterWeeks = hookGenerateQuarterWeeks;

  // Setters - use hook setters
  const setUsers = hookSetUsers;
  const setProjects = hookSetProjects;
  const setFilteredProjects = hookSetFilteredProjects;
  const setBlockAssignments = hookSetBlockAssignments;
  const setDeadlineTasks = hookSetDeadlineTasks;
  const setVisibleUserIds = hookSetVisibleUserIds;

  // Error dialog state (needed by drag-drop hook)
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Helper function to invalidate dashboard queries after task changes
  const invalidateDashboardQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['planningTasks', 'dashboard', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['deadlines', 'upcoming'] });
  }, [queryClient, user?.id]);

  // Drag & Drop hook
  const dragDropHook = usePlanningDragDrop({
    blockAssignments,
    setBlockAssignments,
    deadlineTasks,
    setDeadlineTasks,
    users,
    setUsers,
    currentQuarter,
    hookLoadData,
    setErrorMessage,
    setShowErrorDialog,
    invalidateDashboardQueries,
  });

  // Extract drag & drop values and handlers
  const {
    draggedTask,
    dragOverCell,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDrop,
    handleTaskDragEnd,
    draggedDeadlineTask,
    dragOverDeadlineCell,
    handleDeadlineTaskDragStart,
    handleDeadlineCellDragOver,
    handleDeadlineTaskDrop,
    handleDeadlineTaskDragEnd,
    draggingEdge,
    isDraggingEdgeRef,
    handleEdgeDragStart,
    draggedUserId,
    dragOverUserId,
    handleUserDragStart: handleDragStart,
    handleUserDragOver: handleDragOver,
    handleUserDrop: handleDrop,
    handleUserDragEnd: handleDragEnd,
  } = dragDropHook;

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContainerRef = navigationHook.scrollContainerRef;
  const currentWeekRef = useRef<HTMLElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const hasFocusScrolledRef = useRef(false); // Track if we've scrolled on this focus session
  const [showManageModal, setShowManageModal] = useState(false);

  // View preferences
  const [showWeekendsDefault, setShowWeekendsDefault] = useState(false);
  const [defaultProjectsTableView, setDefaultProjectsTableView] = useState(false);

  // Project assignment modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDeletePlanningDialog, setShowDeletePlanningDialog] = useState(false);
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
  const weekendDeadlineCellBg = getColorForElement('planningGrid', 'weekendCellBackground');
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
  const cellBorderColor = getColorForElement('planningGrid', 'cellBorderColor') || '#C7C7CC'; // Fallback to light gray
  const teamMemberBorderColor = getColorForElement('planningGrid', 'teamMemberBorderColor');
  const cellHoverBg = getColorForElement('planningGrid', 'cellHoverBackground');

  // Mobile detection - not currently used but available for future features
  const isMobile = width < 768;

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

  // Deadline tasks state
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [selectedDeadlineSlot, setSelectedDeadlineSlot] = useState<{
    date: Date;
    slotIndex: number;
  } | null>(null);
  const [editingDeadlineTask, setEditingDeadlineTask] = useState<DeadlineTask | null>(null);

  // Ref to store the span at the start of drag (for collapse detection)
  const dragStartSpanRef = useRef<number>(1);

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

  // Update persisted quarters when planning tasks or deadline tasks change
  useEffect(() => {
    // Convert blockAssignments object to array format expected by updatePersistedQuarters
    const planningTasksArray = Object.entries(blockAssignments).map(([key, assignment]) => {
      // Extract date from the key format: userId-YYYY-MM-DD-blockIndex
      const parts = key.split('-');
      // The date is always the last 3 parts before the blockIndex: YYYY, MM, DD
      const datePart = parts.slice(-4, -1).join('-'); // Gets YYYY-MM-DD
      return {
        date: datePart,
        ...assignment
      };
    });

    console.log('[PlanningScreen] Updating persisted quarters with planning tasks:', planningTasksArray.map(t => t.date));
    console.log('[PlanningScreen] Updating persisted quarters with deadline tasks:', deadlineTasks.map(t => t.date));
    hookUpdatePersistedQuarters(planningTasksArray, deadlineTasks);
  }, [blockAssignments, deadlineTasks, hookUpdatePersistedQuarters]);

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

  // Initial data load on mount and when loaded quarters change
  // Use a ref to track loaded quarters to avoid infinite loops
  const loadedQuartersRef = useRef<string>('');

  useEffect(() => {
    const quartersKey = JSON.stringify(hookLoadedQuarters);
    console.log('[PlanningScreen] Loaded quarters changed:', hookLoadedQuarters);
    console.log('[PlanningScreen] Previous key:', loadedQuartersRef.current);
    console.log('[PlanningScreen] New key:', quartersKey);
    if (loadedQuartersRef.current !== quartersKey) {
      console.log('[PlanningScreen] Loading data for quarters:', hookLoadedQuarters);
      loadedQuartersRef.current = quartersKey;
      hookLoadData(hookLoadedQuarters);
    }
  }, [hookLoadData, hookLoadedQuarters]);


  // Note: Removed useFocusEffect data reload - it was causing:
  // 1. Unnecessary API calls on every navigation
  // 2. Resetting hasScrolled, which broke auto-scroll
  // 3. Loading spinner flashes
  // Data loads on mount via useEffect, which is sufficient

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





  // Handle task drag end

  // Handle deadline task drag start


  // Handle block click (single or double)
  const handleBlockClick = async (userId: string, date: string, blockIndex: number) => {
    const blockKey = `${userId}-${date}-${blockIndex}`;
    const existing = blockAssignments[blockKey];

    // Set this cell as selected
    setSelectedCell(blockKey);

    // If there's a copied cell and this cell is empty, paste immediately (works for mobile tap or desktop click)
    if (!existing && copiedCell) {
      await handleMobilePaste(userId, date, blockIndex);
      return;
    }

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

  // Handle cell hover to show expand options
  const handleCellHover = (userId: string, date: string, blockIndex: number, isHovering: boolean) => {
    const blockKey = `${userId}-${date}-${blockIndex}`;

    // Allow hover effects for all cells
    if (isHovering) {
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

      // Invalidate dashboard queries to reflect the changes
      invalidateDashboardQueries();

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
          logger.error('Error deleting source task:', deleteError, 'PlanningScreen');
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
      logger.error('Error pasting:', error, 'PlanningScreen');
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

      // Invalidate dashboard queries to reflect the changes
      invalidateDashboardQueries();

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
          logger.error('Error deleting source deadline task:', deleteError, 'PlanningScreen');
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
      logger.error('Error pasting deadline task:', error, 'PlanningScreen');
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
      logger.error('Delete planning task error:', error, 'PlanningScreen');
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

      // Invalidate dashboard queries to reflect the changes
      invalidateDashboardQueries();

      setShowDeleteDialog(false);
      setDeleteTaskId(null);
      setDeleteTaskBlockKey(null);

      setSuccessMessage('Planning task deleted successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      logger.error('Delete planning task error:', error, 'PlanningScreen');
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

      // Auto-append next quarter if any task is being added to it
      datesToCreate.forEach(date => {
        hookAutoAppendNextQuarterIfNeeded(date);
      });

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

      // Invalidate dashboard queries to reflect the changes
      invalidateDashboardQueries();

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
      logger.error('Save planning task error:', error, 'PlanningScreen');
      logger.error('Error response:', error.response?.data, 'PlanningScreen');
      logger.error('Error status:', error.response?.status, 'PlanningScreen');
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
      // Auto-append next quarter if task is being added to it
      hookAutoAppendNextQuarterIfNeeded(selectedDeadlineSlot.date);

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

      // Invalidate dashboard queries to reflect the changes
      invalidateDashboardQueries();

      setShowDeadlineModal(false);
      setSelectedDeadlineSlot(null);
      setEditingDeadlineTask(null);
    } catch (error: any) {
      logger.error('Error saving deadline task:', error, 'PlanningScreen');
      setErrorMessage(error.response?.data?.error || 'Failed to save deadline task');
      setShowErrorDialog(true);
    }
  };

  const handleDeleteDeadlineTask = async (taskId: string) => {

    try {

      await deadlineTasksAPI.delete(taskId);

      setDeadlineTasks(deadlineTasks.filter((task) => task.id !== taskId));

      // Invalidate dashboard queries to reflect the changes
      invalidateDashboardQueries();

    } catch (error: any) {
      logger.error('Error deleting deadline task:', error, 'PlanningScreen');
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
      logger.error('Error syncing project due dates:', error, 'PlanningScreen');
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
      logger.error('Error saving settings:', error, 'PlanningScreen');
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
      logger.error('Error saving default settings:', error, 'PlanningScreen');
      setErrorMessage('Failed to save default settings. Please try again.');
      setShowErrorDialog(true);
    }
  };

  // Get quarter and year from visibleWeekStart (from hook)
  const quarter = getQuarterFromDate(visibleWeekStart);
  const year = visibleWeekStart.getFullYear();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Reset hasScrolled and force scroll when navigating to screen from a different screen
  useFocusEffect(
    useCallback(() => {
      console.log('[PlanningScreen] Screen focused - resetting hasFocusScrolledRef');
      // Reset the flag when screen comes into focus (from a different screen)
      // This allows the scroll to happen once per navigation
      if (!hasFocusScrolledRef.current) {
        setHasScrolled(false);
      }

      // Reset the flag when leaving the screen
      return () => {
        console.log('[PlanningScreen] Screen blurred - will allow scroll on next focus');
        hasFocusScrolledRef.current = false;
      };
    }, [])
  );

  // Auto-scroll to the current week when component mounts
  useEffect(() => {
    console.log('[PlanningScreen] Auto-scroll useEffect triggered', { hasScrolled, hasFocusScrolled: hasFocusScrolledRef.current, quarterWeeksLength: quarterWeeks.length, loading });
    if (!hasScrolled && !hasFocusScrolledRef.current && quarterWeeks.length > 0 && Platform.OS === 'web') {
      const attemptScroll = () => {
        const scrollContainer = document.querySelector('[data-planning-scroll]') as HTMLDivElement;
        if (!scrollContainer) {
          console.log('[PlanningScreen] Scroll container not found');
          return false;
        }

        // Determine which week to scroll to
        let targetWeekIndex = -1;

        // Try using the ref
        if (currentWeekRef.current) {
          targetWeekIndex = parseInt(currentWeekRef.current.id.replace('week-', ''), 10);
        }

        // Try finding by data attribute
        if (targetWeekIndex === -1) {
          const currentWeekElement = document.querySelector('[data-current-week="true"]') as HTMLElement;
          if (currentWeekElement) {
            targetWeekIndex = parseInt(currentWeekElement.id.replace('week-', ''), 10);
          }
        }

        // Calculate manually as fallback
        if (targetWeekIndex === -1) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          targetWeekIndex = quarterWeeks.findIndex((weekStart) => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return today >= weekStart && today <= weekEnd;
          });
        }

        // Scroll to the target week
        if (targetWeekIndex !== -1) {
          const mondayPosition = targetWeekIndex * 7 * DAY_CELL_WIDTH;
          console.log('[PlanningScreen] Scrolling to week index:', targetWeekIndex, 'position:', mondayPosition);
          scrollContainer.scrollLeft = mondayPosition;
          scrollContainerRef.current = scrollContainer;
          setVisibleWeekIndex(targetWeekIndex);
          setHasScrolled(true);
          hasFocusScrolledRef.current = true; // Mark that we've scrolled on this focus
          return true;
        }

        console.log('[PlanningScreen] No target week found');
        return false;
      };

      // Try immediately, with fallback after delay
      if (!attemptScroll()) {
        console.log('[PlanningScreen] Initial scroll attempt failed, trying again in 500ms');
        setTimeout(attemptScroll, 500);
      }
    }
  }, [hasScrolled, quarterWeeks, loading]);

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
            logger.error('Invalid cell key format:', selectedCell, 'PlanningScreen');
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

            // Invalidate dashboard queries to reflect the changes
            invalidateDashboardQueries();

            // Clear error state and set success
            setShowErrorDialog(false);
            setErrorMessage('');
            setSuccessMessage('Task pasted successfully');
            setShowSuccessDialog(true);

            // Note: We don't clear copiedCell, allowing multiple pastes
          } catch (error) {
            logger.error('Error pasting:', error, 'PlanningScreen');
            logger.error('Full error details:', JSON.stringify(error, null, 2), 'PlanningScreen');
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

  // Only show loading spinner on initial mount with no data
  // Once we've scrolled or have users, never show spinner (preserves scroll position)
  if (loading && users.length === 0 && !hasScrolled) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }


  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      {/* Header */}
      <PlanningHeader
        weekTitle={weekTitle}
        onPrevious={loadPreviousWeek}
        onNext={loadNextWeek}
        headerBgColor={calendarHeaderBg}
        headerTextColor={calendarHeaderFont}
        iconColor={prevNextIconColor}
        borderColor={currentColors.text}
      />

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
                  border-right-width: 5px !important;
                  border-bottom-width: 5px !important;
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
            <div>
            <table style={{
              borderCollapse: 'collapse',
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
                      borderBottom: `5px solid ${headerBorderColor}`,
                      borderRight: '0px',
                      backgroundColor: dateCellBg,
                      color: dateCellText,
                      fontWeight: 'bold',
                      fontSize: '13px',
                      fontFamily: 'Juana',
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
                          borderBottom: `5px solid ${headerBorderColor}`,
                          borderLeft: `1px solid ${cellBorderColor}`,
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
                <tr key={`deadline-row-${slotIndex}`} style={{ height: '50px' }}>
                  {/* Label cell - only render on first slot */}
                  {slotIndex === 0 && (
                    <td
                      className="deadline-label-cell juana-font"
                      rowSpan={2}
                      style={{
                        width: `${USER_COLUMN_WIDTH}px`,
                        minWidth: `${USER_COLUMN_WIDTH}px`,
                        maxWidth: `${USER_COLUMN_WIDTH}px`,
                        height: '100px',
                        borderBottom: `5px solid ${headerBorderColor}`,
                        borderRight: '0px',
                        backgroundColor: deadlinesRowBg,
                        color: deadlinesRowText,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        fontFamily: 'Juana',
                        position: 'sticky',
                        left: 0,
                        zIndex: 15,
                      }}
                    >
                      Deadlines & Milestones
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

                    return weekDays.map((day, dayIndex) => {
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

                      // Check if this day is in next unloaded quarter
                      const isInNextUnloadedQuarter = hookIsDateInNextUnloadedQuarter(day);

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
                            height: 'auto',
                            borderRight: `1px solid ${cellBorderColor}`,
                            borderBottom: slotIndex === 1 ? `5px solid ${headerBorderColor}` : `1px solid ${cellBorderColor}`,
                            backgroundColor: isDragOver
                              ? currentColors.primary + '40' // Highlight when dragging over
                              : deadlineTask
                              ? colors?.bg
                              : (isWeekend || isInNextUnloadedQuarter)
                              ? weekendDeadlineCellBg
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
                              height: '200px',
                              borderBottom: isLastUser ? '0px' : `5px solid ${teamMemberBorderColor}`,
                              borderRight: '0px',
                              backgroundColor: teamMemberColBg,
                              color: teamMemberColText,
                              verticalAlign: 'middle',
                              textAlign: 'center',
                              padding: '12px',
                              fontWeight: '700',
                              fontSize: '17px',
                              fontFamily: 'Juana',
                              position: 'sticky',
                              left: 0,
                              zIndex: 15,
                            }}
                            className="juana-font"
                          >
                            {user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase()}
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
                            const assignment = blockAssignments[`${user.id}-${dateString}-${blockIndex}`];

                            return (
                              <PlanningTaskCell
                                key={`${weekIndex}-${dayIndex}`}
                                userId={user.id}
                                date={day}
                                dateString={dateString}
                                blockIndex={blockIndex}
                                assignment={assignment}
                                blockAssignments={blockAssignments}
                                hoveredBlock={hoveredBlock}
                                selectedCell={selectedCell}
                                copiedCell={copiedCell}
                                dragOverCell={dragOverCell}
                                draggedTask={draggedTask}
                                currentQuarter={currentQuarter}
                                isLastUser={isLastUser}
                                weekIndex={weekIndex}
                                dayIndex={dayIndex}
                                handleTaskDragOver={handleTaskDragOver}
                                handleTaskDrop={handleTaskDrop}
                                handleCellHover={handleCellHover}
                                handleBlockClick={handleBlockClick}
                                handleTaskDragStart={handleTaskDragStart}
                                handleTaskDragEnd={handleTaskDragEnd}
                                handleEdgeDragStart={handleEdgeDragStart}
                                handleMobileLongPressStart={handleMobileLongPressStart}
                                handleMobileLongPressEnd={handleMobileLongPressEnd}
                                handleMobileCellTap={handleMobileCellTap}
                                getQuarterFromDate={getQuarterFromDate}
                                isDateInNextUnloadedQuarter={hookIsDateInNextUnloadedQuarter}
                                currentColors={currentColors}
                                cellBorderColor={cellBorderColor}
                                teamMemberBorderColor={teamMemberBorderColor}
                                cellHoverBg={cellHoverBg}
                                weekdayCellBg={weekdayCellBg}
                                weekendCellBg={weekendCellBg}
                                todayCellBg={todayCellBg}
                                projectTaskBg={projectTaskBg}
                                projectTaskFont={projectTaskFont}
                                adminTaskBg={adminTaskBg}
                                adminTaskFont={adminTaskFont}
                                marketingTaskBg={marketingTaskBg}
                                marketingTaskFont={marketingTaskFont}
                                outOfOfficeBg={outOfOfficeBg}
                                outOfOfficeFont={outOfOfficeFont}
                                unavailableBg={unavailableBg}
                                unavailableFont={unavailableFont}
                                timeOffBg={timeOffBg}
                                timeOffFont={timeOffFont}
                              />
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
      <ManageTeamMembersModal
        visible={showManageModal}
        onClose={() => setShowManageModal(false)}
        users={users}
        visibleUserIds={visibleUserIds}
        draggedUserId={draggedUserId}
        dragOverUserId={dragOverUserId}
        currentUserRole={user?.role}
        currentColors={currentColors}
        onToggleUserVisibility={toggleUserVisibility}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={() => setDragOverUserId(null)}
        onSaveSettings={handleSaveSettings}
        onSaveAsDefaultForAll={handleSaveAsDefaultForAll}
      />

      {/* Project Assignment Modal */}
      <ProjectAssignmentModal
        visible={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        currentColors={currentColors}
        selectedBlock={selectedBlock}
        blockAssignments={blockAssignments}
        projectSearch={projectSearch}
        setProjectSearch={setProjectSearch}
        taskDescription={taskDescription}
        setTaskDescription={setTaskDescription}
        filteredProjects={filteredProjects}
        isOutOfOffice={isOutOfOffice}
        setIsOutOfOffice={setIsOutOfOffice}
        isTimeOff={isTimeOff}
        setIsTimeOff={setIsTimeOff}
        isUnavailable={isUnavailable}
        setIsUnavailable={setIsUnavailable}
        isRepeatEvent={isRepeatEvent}
        setIsRepeatEvent={setIsRepeatEvent}
        repeatType={repeatType}
        setRepeatType={setRepeatType}
        repeatWeeklyDays={repeatWeeklyDays}
        setRepeatWeeklyDays={setRepeatWeeklyDays}
        monthlyRepeatType={monthlyRepeatType}
        setMonthlyRepeatType={setMonthlyRepeatType}
        monthlyWeekNumber={monthlyWeekNumber}
        setMonthlyWeekNumber={setMonthlyWeekNumber}
        monthlyDayOfWeek={monthlyDayOfWeek}
        setMonthlyDayOfWeek={setMonthlyDayOfWeek}
        repeatEndDate={repeatEndDate}
        setRepeatEndDate={setRepeatEndDate}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        setSelectedBlock={setSelectedBlock}
        setShowDeletePlanningDialog={setShowDeletePlanningDialog}
        onSaveProjectAssignment={handleSaveProjectAssignment}
      />

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

      {/* Load Quarter Dialog (Next or Previous) */}
      <CustomDialog
        visible={hookShowQuarterPrompt}
        title={hookNextQuarterInfo ? 'Load Next Quarter?' : 'Load Previous Quarter?'}
        message={
          hookNextQuarterInfo
            ? `Would you like to load Q${hookNextQuarterInfo.quarter} ${hookNextQuarterInfo.year} to continue adding and editing planning tasks?`
            : hookPreviousQuarterInfo
            ? `Would you like to load Q${hookPreviousQuarterInfo.quarter} ${hookPreviousQuarterInfo.year}?`
            : ''
        }
        buttons={[
          {
            label: 'Cancel',
            onPress: hookCancelLoadNextQuarter,
          },
          {
            label: 'Load Quarter',
            onPress: hookNextQuarterInfo ? hookConfirmLoadNextQuarter : hookConfirmLoadPreviousQuarter,
            variant: 'solid',
            color: currentColors.primary,
          },
        ]}
        onDismiss={hookCancelLoadNextQuarter}
      />
    </View>
  );
});

PlanningScreen.displayName = 'PlanningScreen';

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
