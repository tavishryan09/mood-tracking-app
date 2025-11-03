import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, Text, TouchableOpacity, Alert, Modal, PanResponder, TextInput as RNTextInput, FlatList, Pressable } from 'react-native';
import { Title, ActivityIndicator, IconButton, Button, Checkbox, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { AddCircleIcon, DragDropIcon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { usersAPI, projectsAPI, planningTasksAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const WEEK_WIDTH = width > 1200 ? 1200 : width - 40; // Max width for week view
const DAY_CELL_WIDTH = 180; // Fixed width for each day column
const USER_COLUMN_WIDTH = 100; // Fixed width for user names column
const TIME_BLOCK_HEIGHT = 48; // Height for each 2-hour block

// AsyncStorage keys
const STORAGE_KEYS = {
  USER_ORDER: '@planning_user_order',
  VISIBLE_USERS: '@planning_visible_users',
};

const PlanningScreen = () => {
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

  // Project assignment modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
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
  } | null>(null);

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

  // Ref to store the span at the start of drag (for collapse detection)
  const dragStartSpanRef = useRef<number>(1);

  // Ref to track if we're currently dragging an edge (to prevent cell drag)
  const isDraggingEdgeRef = useRef<boolean>(false);

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

        // Prompt for confirmation
        if (confirm('Are you sure you want to delete this planning task?')) {
          try {
            await planningTasksAPI.delete(existing.id);

            // Remove from local state
            const newAssignments = { ...blockAssignments };
            delete newAssignments[blockKey];
            setBlockAssignments(newAssignments);
            setSelectedCell(null);

            alert('Planning task deleted successfully');
          } catch (error: any) {
            console.error('Delete planning task error:', error);
            alert(error.response?.data?.error || 'Failed to delete planning task');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCell, blockAssignments, showProjectModal, showManageModal]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('[PlanningScreen] useFocusEffect triggered - resetting scroll state');
      setHasScrolled(false);
      loadData();
    }, [currentQuarter])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('[PlanningScreen] Starting to load data...');

      // Calculate quarter range for loading planning tasks
      const { year, quarter } = currentQuarter;
      const startMonth = (quarter - 1) * 3;
      const quarterStart = new Date(year, startMonth, 1);
      quarterStart.setHours(0, 0, 0, 0);

      const quarterEnd = new Date(year, startMonth + 3, 0);
      quarterEnd.setHours(23, 59, 59, 999);

      console.log('[PlanningScreen] Loading planning tasks for quarter:', {
        quarter,
        year,
        startDate: quarterStart.toISOString(),
        endDate: quarterEnd.toISOString(),
      });

      // Load users, projects, and planning tasks for the entire quarter
      const [usersResponse, projectsResponse, planningTasksResponse] = await Promise.all([
        usersAPI.getAll(),
        projectsAPI.getAll(),
        planningTasksAPI.getAll({
          startDate: quarterStart.toISOString(),
          endDate: quarterEnd.toISOString(),
        }),
      ]);

      console.log('[PlanningScreen] Users loaded:', usersResponse.data.length);
      console.log('[PlanningScreen] Users:', usersResponse.data);
      console.log('[PlanningScreen] Projects loaded:', projectsResponse.data.length);
      console.log('[PlanningScreen] Planning tasks loaded:', planningTasksResponse.data.length);

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

        console.log('[PlanningScreen] Loaded task with span:', {
          taskId: task.id,
          blockIndex: task.blockIndex,
          span,
          projectName,
          isStatusEvent,
          taskField: task.task,
        });
      });

      setBlockAssignments(assignments);

      // Load saved user order from AsyncStorage
      try {
        const savedUserOrder = await AsyncStorage.getItem(STORAGE_KEYS.USER_ORDER);
        if (savedUserOrder) {
          const userIds = JSON.parse(savedUserOrder);
          console.log('[PlanningScreen] Loaded saved user order:', userIds);

          // Reorder users based on saved order
          const orderedUsers: any[] = [];
          userIds.forEach((userId: string) => {
            const user = loadedUsers.find((u: any) => u.id === userId);
            if (user) {
              orderedUsers.push(user);
            }
          });

          // Add any new users that weren't in the saved order
          loadedUsers.forEach((user: any) => {
            if (!userIds.includes(user.id)) {
              orderedUsers.push(user);
            }
          });

          loadedUsers = orderedUsers;
        }
      } catch (error) {
        console.error('[PlanningScreen] Error loading saved user order:', error);
      }

      setUsers(loadedUsers);

      // Load saved visible users from AsyncStorage
      try {
        const savedVisibleUsers = await AsyncStorage.getItem(STORAGE_KEYS.VISIBLE_USERS);
        if (savedVisibleUsers) {
          const visibleIds = JSON.parse(savedVisibleUsers);
          console.log('[PlanningScreen] Loaded saved visible users:', visibleIds);
          setVisibleUserIds(visibleIds);
        } else {
          // Initialize all users as visible by default
          setVisibleUserIds(loadedUsers.map((u: any) => u.id));
        }
      } catch (error) {
        console.error('[PlanningScreen] Error loading saved visible users:', error);
        // Initialize all users as visible by default
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
        console.log('[SCROLL DEBUG] Scroll container not found for next week');
        return;
      }

      const nextWeekIndex = visibleWeekIndex + 1;
      const scrollLeft = nextWeekIndex * 7 * DAY_CELL_WIDTH;

      console.log('[SCROLL DEBUG] Next week button clicked:', {
        currentWeekIndex: visibleWeekIndex,
        nextWeekIndex,
        scrollLeft,
      });

      scrollContainer.scrollLeft = scrollLeft;
      setVisibleWeekIndex(nextWeekIndex);
    }
  };

  // Scroll to previous week
  const loadPreviousWeek = () => {
    if (Platform.OS === 'web') {
      const scrollContainer = scrollContainerRef.current || (document.querySelector('[data-planning-scroll]') as HTMLDivElement);
      if (!scrollContainer) {
        console.log('[SCROLL DEBUG] Scroll container not found for previous week');
        return;
      }

      const prevWeekIndex = Math.max(0, visibleWeekIndex - 1);
      const scrollLeft = prevWeekIndex * 7 * DAY_CELL_WIDTH;

      console.log('[SCROLL DEBUG] Previous week button clicked:', {
        currentWeekIndex: visibleWeekIndex,
        prevWeekIndex,
        scrollLeft,
      });

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
          Alert.alert('Notice', 'At least one team member must be visible in the planning view.');
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

    console.log('[DRAG TASK] Started dragging task:', { blockKey, assignment });
  };

  // Handle task drag over cell
  const handleTaskDragOver = (e: any, userId: string, date: string, blockIndex: number) => {
    e.preventDefault();

    if (!draggedTask) {
      console.log('[DRAG OVER] No dragged task');
      return;
    }

    // Check if all cells needed for the span are available
    const span = draggedTask.span;
    let canDrop = true;

    console.log('[DRAG OVER] Checking drop at', { userId, date, blockIndex, span });

    // Check if span would exceed block limit
    if (blockIndex + span > 4) {
      console.log('[DRAG OVER] Would exceed block limit');
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
            console.log('[DRAG OVER] Cell occupied:', checkBlockKey);
            canDrop = false;
            break;
          }
        }
      }
    }

    // Set drag over highlight for all cells in the span (or null if can't drop)
    if (canDrop) {
      const blockKey = `${userId}-${date}-${blockIndex}`;
      console.log('[DRAG OVER] Can drop, setting dragOverCell to:', blockKey);
      setDragOverCell(blockKey);
    } else {
      console.log('[DRAG OVER] Cannot drop');
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
      console.log('[DRAG TASK] Target would exceed block limit');
      Alert.alert('Error', 'Cannot move task here - would exceed available blocks');
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
        console.log('[DRAG TASK] Target cells are not all empty', { blockKey: checkBlockKey });
        Alert.alert('Error', 'Cannot move task here - target cells are not empty');
        setDraggedTask(null);
        setDragOverCell(null);
        return;
      }
    }

    console.log('[DRAG TASK] Dropping task:', { sourceBlockKey, targetBlockKey, span });

    try {
      // Delete the old task
      await planningTasksAPI.delete(draggedTask.id);

      // Create new task at target location
      const response = await planningTasksAPI.create({
        userId: targetUserId,
        projectId: draggedTask.projectId,
        date: targetDate,
        blockIndex: targetBlockIndex,
        task: draggedTask.task,
        span: draggedTask.span,
      });

      // Update state
      setBlockAssignments(prev => {
        const newAssignments = { ...prev };
        // Remove from old location
        delete newAssignments[sourceBlockKey];
        // Add to new location
        newAssignments[targetBlockKey] = {
          id: response.data.id,
          projectId: draggedTask.projectId,
          projectName: draggedTask.projectName,
          task: draggedTask.task,
          span: draggedTask.span,
        };
        return newAssignments;
      });

      console.log('[DRAG TASK] Task moved successfully');
    } catch (error) {
      console.error('[DRAG TASK] Error moving task:', error);
      Alert.alert('Error', 'Failed to move task');
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

  // Handle block click (single or double)
  const handleBlockClick = async (userId: string, date: string, blockIndex: number) => {
    const blockKey = `${userId}-${date}-${blockIndex}`;
    const existing = blockAssignments[blockKey];

    console.log('[CLICK DEBUG] handleBlockClick called', {
      blockKey,
      existing: !!existing,
      existingData: existing,
      allAssignments: Object.keys(blockAssignments),
      clickTimer: !!clickTimer,
      clickedBlock,
      copiedCell: !!copiedCell,
    });

    // Set this cell as selected
    setSelectedCell(blockKey);

    // Use double-click detection for both existing and empty cells
    if (clickTimer && clickedBlock === blockKey) {
      // This is a double-click
      console.log('[CLICK DEBUG] Double-click detected - opening modal');
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
      console.log('[CLICK DEBUG] First click - starting timer');
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
    console.log('[DRAG DEBUG] handleEdgeDragStart called', { userId, date, blockIndex, edge, startY, eventType: e.type, currentSpan });

    // Store the initial span
    dragStartSpanRef.current = currentSpan;

    const blockKey = `${userId}-${date}-${blockIndex}`;
    console.log('[DRAG DEBUG] Setting draggingEdge state', { blockKey, edge, startY });
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
      console.log('[DRAG DEBUG] useEffect skip', { draggingEdge, platform: Platform.OS });
      return;
    }

    console.log('[DRAG DEBUG] useEffect running, setting up listeners', draggingEdge);

    let lastBlocksMoved = 0;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const deltaY = e.clientY - draggingEdge.startY;
      const blocksMoved = Math.round(deltaY / TIME_BLOCK_HEIGHT);

      console.log('[DRAG DEBUG] handleMouseMove', {
        clientY: e.clientY,
        startY: draggingEdge.startY,
        deltaY,
        TIME_BLOCK_HEIGHT,
        blocksMoved,
        edge: draggingEdge.edge
      });

      // Only process if blocksMoved has changed
      if (blocksMoved === lastBlocksMoved) {
        console.log('[DRAG DEBUG] blocksMoved unchanged, skipping');
        return;
      }

      lastBlocksMoved = blocksMoved;

      const { userId, date, blockIndex, edge, initialSpan } = draggingEdge;
      const blockKey = `${userId}-${date}-${blockIndex}`;

      console.log('[DRAG DEBUG] Processing span change', {
        blockKey,
        blocksMoved,
        edge,
        blockIndex,
        initialSpan
      });

      // Get the base assignment from the current block
      const baseAssignment = blockAssignmentsRef.current[blockKey];
      const baseProjectId = baseAssignment?.projectId;
      const baseProjectName = baseAssignment?.projectName;

      if (!baseAssignment) {
        console.log('[DRAG DEBUG] No base assignment found, skipping');
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

      console.log('[DRAG DEBUG] Calculated new span', { newSpan, newBlockIndex, initialSpan, blocksMoved });

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
            console.log('[DRAG DEBUG] Cannot expand - different project/status at block', i);
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

        console.log('[DRAG DEBUG] Updated assignments', { oldKey: blockKey, newKey, newSpan });
        return newAssignments;
      });
    };

    const handleMouseUp = async (e: MouseEvent) => {
      console.log('[DRAG DEBUG] Mouse up - ending drag');
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
                console.log('[DRAG DEBUG] Found assignment at new location', { key, currentBlockIndex });
                break;
              }
            }
          }
        }

        if (currentAssignment?.id) {
          try {
            const newSpan = currentAssignment.span;

            console.log('[DRAG DEBUG] Saving span to database', {
              id: currentAssignment.id,
              blockIndex: currentBlockIndex,
              span: newSpan,
            });

            await planningTasksAPI.update(currentAssignment.id, {
              projectId: currentAssignment.projectId,
              task: currentAssignment.task,
              span: newSpan,
              blockIndex: currentBlockIndex,
            });

            console.log('[DRAG DEBUG] Successfully saved span to database');
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

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
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

      setShowProjectModal(false);
      setProjectSearch('');
      setTaskDescription('');
      setSelectedBlock(null);

      if (Platform.OS === 'web') {
        alert('Planning task deleted successfully');
      } else {
        Alert.alert('Success', 'Planning task deleted successfully');
      }
    } catch (error: any) {
      console.error('Delete planning task error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete planning task');
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
    console.log('=== SAVE BUTTON CLICKED ===');
    console.log('isOutOfOffice:', isOutOfOffice);
    console.log('isTimeOff:', isTimeOff);
    console.log('isUnavailable:', isUnavailable);
    console.log('projectSearch:', projectSearch);
    console.log('selectedBlock:', selectedBlock);

    if (!selectedBlock) {
      console.log('ERROR: No block selected');
      Alert.alert('Error', 'No block selected');
      return;
    }

    // Check if this is a status event (Out of Office, Time Off, or Unavailable)
    const isStatusEvent = isOutOfOffice || isTimeOff || isUnavailable;
    console.log('isStatusEvent:', isStatusEvent);

    // Handle project validation
    let selectedProject = null;

    // Out of Office can have a project, but Time Off and Unavailable cannot
    const requiresProject = !isStatusEvent;
    const allowsProject = !isTimeOff && !isUnavailable;

    if (projectSearch?.trim() && allowsProject) {
      // If there's a project search, try to find the project
      console.log('Project search provided - looking up project');
      selectedProject = filteredProjects.find(
        (p) => p.description?.toLowerCase() === projectSearch.toLowerCase()
      );
      console.log('selectedProject:', selectedProject);

      if (!selectedProject) {
        console.log('ERROR: Project not found');
        Alert.alert('Error', 'Project not found');
        return;
      }
    } else if (requiresProject) {
      // No project provided, but one is required (not a status event)
      console.log('ERROR: No project search and not a status event');
      Alert.alert('Error', 'Please select a project or check a status option');
      return;
    }

    console.log('Validation passed! Proceeding to save...');

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

      // Reload planning tasks to refresh the view
      await loadPlanningTasks();
    } catch (error: any) {
      console.error('Save planning task error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      Alert.alert('Error', error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to save planning task');
    }
  };

  // Save settings to AsyncStorage
  const handleSaveSettings = async () => {
    try {
      // Save user order
      const userIds = users.map((u) => u.id);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ORDER, JSON.stringify(userIds));
      console.log('[PlanningScreen] Saved user order:', userIds);

      // Save visible users
      await AsyncStorage.setItem(STORAGE_KEYS.VISIBLE_USERS, JSON.stringify(visibleUserIds));
      console.log('[PlanningScreen] Saved visible users:', visibleUserIds);

      // Close modal
      setShowManageModal(false);
    } catch (error) {
      console.error('[PlanningScreen] Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  // Generate all weeks in the current quarter
  const quarterWeeks = generateQuarterWeeks();

  // Debug: log the first few weeks to verify they start on Monday
  if (quarterWeeks.length > 0 && Platform.OS === 'web') {
    console.log('[WEEK DEBUG] First 6 weeks of quarter:', quarterWeeks.slice(0, 6).map((week, idx) => ({
      index: idx,
      date: week.toDateString(),
      dayOfWeek: week.getDay(),
      isMonday: week.getDay() === 1
    })));
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
      console.log('[SCROLL DEBUG] Auto-scroll effect triggered', {
        hasScrolled,
        quarterWeeksLength: quarterWeeks.length,
        hasCurrentWeekRef: !!currentWeekRef.current,
      });

      // Try multiple approaches to ensure scroll works
      const attemptScroll = () => {
        // Find the scroll container first
        const scrollContainer = document.querySelector('[data-planning-scroll]') as HTMLDivElement;
        if (!scrollContainer) {
          console.log('[SCROLL DEBUG] Scroll container not found');
          return false;
        }

        // Determine which week to scroll to
        let targetWeekIndex = -1;

        // Approach 1: Try using the ref
        if (currentWeekRef.current) {
          targetWeekIndex = parseInt(currentWeekRef.current.id.replace('week-', ''), 10);
          console.log('[SCROLL DEBUG] Found current week via ref:', {
            elementId: currentWeekRef.current.id,
            weekIndex: targetWeekIndex,
            weekStart: quarterWeeks[targetWeekIndex]?.toDateString(),
          });
        }

        // Approach 2: Try finding by data attribute
        if (targetWeekIndex === -1) {
          const currentWeekElement = document.querySelector('[data-current-week="true"]') as HTMLElement;
          if (currentWeekElement) {
            targetWeekIndex = parseInt(currentWeekElement.id.replace('week-', ''), 10);
            console.log('[SCROLL DEBUG] Found current week via querySelector:', {
              elementId: currentWeekElement.id,
              weekIndex: targetWeekIndex,
            });
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
          console.log('[SCROLL DEBUG] Found current week via manual calculation:', targetWeekIndex);
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

          console.log('[SCROLL DEBUG] Scrolling to position:', {
            targetWeekIndex,
            mondayPosition,
            weekStart: quarterWeeks[targetWeekIndex]?.toDateString(),
            calculation: `${targetWeekIndex} weeks * 7 days * ${DAY_CELL_WIDTH}px = ${mondayPosition}px`,
          });

          // Set scroll position and let CSS scroll-snap handle the alignment
          scrollContainer.scrollLeft = mondayPosition;
          scrollContainerRef.current = scrollContainer;
          setVisibleWeekIndex(targetWeekIndex);
          setHasScrolled(true);
          return true;
        }

        console.log('[SCROLL DEBUG] Could not determine target week index');
        return false;
      };

      // Try immediately
      if (!attemptScroll()) {
        // Try after a delay if immediate attempt fails
        setTimeout(() => {
          console.log('[SCROLL DEBUG] Retry scroll after delay');
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
          console.log('[COPY] Copied cell:', selectedCell, assignment);
        }
      }

      // Check for Cmd+V (Mac) or Ctrl+V (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (selectedCell && copiedCell) {
          e.preventDefault();

          // Check if selected cell is empty
          const existing = blockAssignments[selectedCell];
          if (existing) {
            console.log('[PASTE] Cannot paste - cell is not empty');
            Alert.alert('Error', 'Cannot paste to a non-empty cell');
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

          console.log('[PASTE] Pasting to cell:', selectedCell, { userId, date, blockIndex });

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

            console.log('[PASTE] Paste successful - copied cell remains for reuse');
            // Note: We don't clear copiedCell, allowing multiple pastes
          } catch (error) {
            console.error('[PASTE] Error pasting:', error);
            Alert.alert('Error', 'Failed to paste task');
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={loadPreviousWeek} style={styles.navButton}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={28} color="#000" />
          </TouchableOpacity>
          <Title style={styles.headerTitle}>{weekTitle}</Title>
          <TouchableOpacity onPress={loadNextWeek} style={styles.navButton}>
            <HugeiconsIcon icon={ArrowRight01Icon} size={28} color="#000" />
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
              `}
            </style>
            <table style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              backgroundColor: '#fff',
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
                      borderBottom: '3px solid #333',
                      borderRight: '3px solid #333',
                      backgroundColor: '#d3d3d3',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      textAlign: 'center',
                      position: 'sticky',
                      left: 0,
                      top: 0,
                      zIndex: 20,
                    }}
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
                          borderBottom: '3px solid #333',
                          borderRight: '1px solid #000',
                          backgroundColor: isToday ? '#FFE4B5' : '#d3d3d3',
                          textAlign: 'center',
                          padding: '4px',
                          position: 'sticky',
                          top: 0,
                          boxSizing: 'border-box',
                          zIndex: 18,
                        }}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '11px', color: isToday ? '#000' : '#333' }}>
                          {dayName}
                        </div>
                        <div style={{ fontSize: '10px', color: isToday ? '#000' : '#666' }}>
                          {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </th>
                    );
                  });
                })}
              </tr>
            </thead>
            <tbody>
              {/* User rows - each user gets 4 rows (one per time block) */}
              {users
                .filter((user) => visibleUserIds.includes(user.id))
                .map((user) => {
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
                              borderBottom: '5px solid #333',
                              borderRight: '5px solid #333',
                              backgroundColor: '#fff',
                              verticalAlign: 'top',
                              padding: '12px',
                              fontWeight: '700',
                              fontSize: '13px',
                              position: 'sticky',
                              left: 0,
                              zIndex: 15,
                            }}
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

                                console.log('[DRAG OVER VISUAL] Checking cell:', {
                                  blockKey,
                                  blockIndex,
                                  dragOverBlockIndex,
                                  draggedTaskSpan: draggedTask.span,
                                  userId: user.id,
                                  dragOverUserId,
                                  dateString,
                                  dragOverDate,
                                  isUserMatch: user.id === dragOverUserId,
                                  isDateMatch: dateString === dragOverDate,
                                  isInRange: blockIndex >= dragOverBlockIndex && blockIndex < dragOverBlockIndex + draggedTask.span,
                                });

                                // Check if this cell is the same user, date, and within the span range
                                if (user.id === dragOverUserId && dateString === dragOverDate) {
                                  if (blockIndex >= dragOverBlockIndex && blockIndex < dragOverBlockIndex + draggedTask.span) {
                                    isDragOver = true;
                                    console.log('[DRAG OVER VISUAL] Cell should be highlighted!', blockKey);
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
                                style={{
                                  width: `${DAY_CELL_WIDTH}px`,
                                  minWidth: `${DAY_CELL_WIDTH}px`,
                                  maxWidth: `${DAY_CELL_WIDTH}px`,
                                  height: `${TIME_BLOCK_HEIGHT * span}px`,
                                  borderBottom: isLastBlockForUser ? '3px solid #333' : '1px solid #ddd',
                                  borderRight: '1px solid #000',
                                  padding: '2px',
                                  position: 'relative',
                                  backgroundColor: isWeekend ? '#f0f0f0' : (isToday ? '#FFFACD' : '#fff'),
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
                                    backgroundColor: isDragOver ? '#90EE90' : (isSelected ? '#B3D9FF' : (isOutsideQuarter ? 'transparent' : (assignment ? (() => {
                                      // Determine background color based on status event type
                                      const projectName = assignment.projectName || '';
                                      if (projectName === 'Out of Office' || projectName.includes('(Out of Office)')) {
                                        return '#1a7287'; // Blue for Out of Office
                                      } else if (projectName === 'Time Off') {
                                        return '#e5cf07'; // Yellow for Time Off
                                      } else if (projectName === 'Unavailable') {
                                        return '#E0E0E0'; // Light grey for Unavailable
                                      }
                                      return '#dc5e83'; // Pink for regular projects
                                    })() : 'transparent'))),
                                  }}
                                  onClick={() => handleBlockClick(user.id, dateString, blockIndex)}
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
                                        backgroundColor: isHovered ? 'rgba(98, 0, 238, 0.5)' : 'transparent',
                                        cursor: 'ns-resize',
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        console.log('[DRAG DEBUG] Top edge pressed', { blockIndex, span });
                                        handleEdgeDragStart(user.id, dateString, blockIndex, 'top', e, span);
                                      }}
                                    />
                                  )}
                                  {assignment && (
                                    <>
                                      {/* Drag handle for repositioning - fills center area between edges */}
                                      <div
                                        draggable={true}
                                        onDragStart={(e) => handleTaskDragStart(e, user.id, dateString, blockIndex)}
                                        onDragEnd={handleTaskDragEnd}
                                        style={{
                                          position: 'absolute',
                                          top: showTopEdge ? '10px' : '0',
                                          bottom: showBottomEdge ? '10px' : '0',
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
                                          color: (() => {
                                            const projectName = assignment.projectName || '';
                                            // Yellow cells (Time Off) get black text
                                            if (projectName === 'Time Off') {
                                              return '#000000';
                                            }
                                            // Pink and blue cells get white text
                                            if (projectName === 'Out of Office' || projectName.includes('(Out of Office)')) {
                                              return '#ffffff';
                                            }
                                            // Grey (Unavailable) gets dark grey text
                                            if (projectName === 'Unavailable') {
                                              return '#4a4a4a';
                                            }
                                            // Regular projects (pink) get white text
                                            return '#ffffff';
                                          })(),
                                          fontWeight: 700,
                                          marginBottom: 2,
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
                                            color: (() => {
                                              const projectName = assignment.projectName || '';
                                              // Yellow cells (Time Off) get black text
                                              if (projectName === 'Time Off') {
                                                return '#000000';
                                              }
                                              // Pink and blue cells get white text
                                              if (projectName === 'Out of Office' || projectName.includes('(Out of Office)')) {
                                                return '#ffffff';
                                              }
                                              // Grey (Unavailable) gets dark grey text
                                              if (projectName === 'Unavailable') {
                                                return '#4a4a4a';
                                              }
                                              // Regular projects (pink) get white text
                                              return '#ffffff';
                                            })(),
                                            fontStyle: 'italic',
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
                                        backgroundColor: isHovered ? 'rgba(98, 0, 238, 0.5)' : 'transparent',
                                        cursor: 'ns-resize',
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        console.log('[DRAG DEBUG] Bottom edge pressed', { blockIndex, span });
                                        handleEdgeDragStart(user.id, dateString, blockIndex, 'bottom', e, span);
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

              {/* Add/Remove team members row */}
              <tr>
                <td
                  style={{
                    width: `${USER_COLUMN_WIDTH}px`,
                    height: `${TIME_BLOCK_HEIGHT * 4}px`,
                    borderBottom: '1px solid #000',
                    borderRight: '1px solid #000',
                    backgroundColor: '#f9f9f9',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    cursor: 'pointer',
                    position: 'sticky',
                    left: 0,
                    zIndex: 15,
                  }}
                  onClick={handleManageTeamMembers}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <HugeiconsIcon icon={AddCircleIcon} size={24} color="#6200ee" />
                  </div>
                </td>
                {/* Empty cells for the days */}
                {quarterWeeks.map((weekStart, weekIndex) => {
                  const weekDays = [];
                  for (let i = 0; i < 7; i++) {
                    weekDays.push(i);
                  }
                  return weekDays.map((dayIndex) => (
                    <td
                      key={`${weekIndex}-${dayIndex}-empty`}
                      style={{
                        width: `${DAY_CELL_WIDTH}px`,
                        minWidth: `${DAY_CELL_WIDTH}px`,
                        maxWidth: `${DAY_CELL_WIDTH}px`,
                        height: `${TIME_BLOCK_HEIGHT * 4}px`,
                        borderBottom: '1px solid #000',
                        borderRight: '1px solid #000',
                        backgroundColor: '#f9f9f9',
                      }}
                    />
                  ));
                })}
              </tr>
            </tbody>
          </table>
          </div>
        ) : (
          // Fallback for non-web platforms - use View-based layout
          <View style={styles.mainContent}>
            {/* Fixed left column */}
            <View style={styles.staticColumn}>
              {/* Date label in header */}
              <View style={styles.staticHeaderCell}>
                <Text style={styles.staticHeaderText}>Date</Text>
              </View>

              {/* User names - only show visible users */}
              {users
                .filter((user) => visibleUserIds.includes(user.id))
                .map((user) => (
                  <View key={user.id} style={styles.staticUserCell}>
                    <Text style={styles.staticUserText}>{user.firstName.toUpperCase()}</Text>
                  </View>
                ))}

              {/* Add/Remove team members button */}
              <TouchableOpacity
                style={styles.addTeamMemberButton}
                onPress={handleManageTeamMembers}
                activeOpacity={0.7}
              >
                <HugeiconsIcon icon={AddCircleIcon} size={24} color="#6200ee" />
              </TouchableOpacity>
            </View>

            {/* Mobile view - simplified grid */}
            <Text>Mobile view not yet implemented with new table structure</Text>
          </View>
        )}
      </View>

      {/* Team Members Management Modal */}
      <Modal
        visible={showManageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title style={styles.modalTitle}>Manage Team Members</Title>
            <Text style={styles.modalSubtitle}>
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
                      isBeingDragged && styles.modalListItemDragging,
                      isDragOver && styles.modalListItemDragOver,
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
                      }}
                    >
                      <View
                        style={[styles.dragHandle, Platform.OS === 'web' && { cursor: 'grab' }]}
                      >
                        <HugeiconsIcon icon={DragDropIcon} size={20} color="#999" />
                      </View>

                      {/* Checkbox */}
                      <TouchableOpacity
                        onPress={() => toggleUserVisibility(user.id)}
                        activeOpacity={0.7}
                        style={styles.checkboxContainer}
                      >
                        <Checkbox
                          status={isVisible ? 'checked' : 'unchecked'}
                          onPress={() => toggleUserVisibility(user.id)}
                        />
                      </TouchableOpacity>

                      {/* User name */}
                      <TouchableOpacity
                        onPress={() => toggleUserVisibility(user.id)}
                        activeOpacity={0.7}
                        style={styles.userNameContainer}
                      >
                        <Text style={styles.modalListItemText}>
                          {user.firstName} {user.lastName}
                        </Text>
                      </TouchableOpacity>
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
              >
                Save
              </Button>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title style={styles.modalTitle}>Assign Project</Title>

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
                  />

                  {filteredProjects.length > 0 && projectSearch && (
                    <View style={styles.projectsList}>
                      {filteredProjects.map((project) => (
                        <TouchableOpacity
                          key={project.id}
                          style={styles.projectItem}
                          onPress={() => setProjectSearch(project.description || project.name)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.projectItemText}>
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
            <View style={styles.checkboxGroup}>
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
                <Checkbox
                  status={isOutOfOffice ? 'checked' : 'unchecked'}
                  onPress={() => {
                    setIsOutOfOffice(!isOutOfOffice);
                    if (!isOutOfOffice) {
                      setIsTimeOff(false);
                      setIsUnavailable(false);
                    }
                  }}
                />
                <Text style={styles.checkboxLabel}>Out of Office</Text>
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
                <Checkbox
                  status={isTimeOff ? 'checked' : 'unchecked'}
                  onPress={() => {
                    setIsTimeOff(!isTimeOff);
                    if (!isTimeOff) {
                      setIsOutOfOffice(false);
                      setIsUnavailable(false);
                    }
                  }}
                />
                <Text style={styles.checkboxLabel}>Time Off</Text>
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
                <Checkbox
                  status={isUnavailable ? 'checked' : 'unchecked'}
                  onPress={() => {
                    setIsUnavailable(!isUnavailable);
                    if (!isUnavailable) {
                      setIsOutOfOffice(false);
                      setIsTimeOff(false);
                    }
                  }}
                />
                <Text style={styles.checkboxLabel}>Unavailable</Text>
              </TouchableOpacity>
            </View>

            {/* Repeat Event Section */}
            <View style={styles.repeatSection}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsRepeatEvent(!isRepeatEvent)}
                activeOpacity={0.7}
              >
                <Checkbox
                  status={isRepeatEvent ? 'checked' : 'unchecked'}
                  onPress={() => setIsRepeatEvent(!isRepeatEvent)}
                />
                <Text style={styles.checkboxLabel}>Repeat Event</Text>
              </TouchableOpacity>

              {isRepeatEvent && (
                <View style={styles.repeatOptions}>
                  {/* Repeat Type Selection */}
                  <View style={styles.repeatTypeRow}>
                    <TouchableOpacity
                      style={[styles.repeatTypeButton, repeatType === 'weekly' && styles.repeatTypeButtonActive]}
                      onPress={() => setRepeatType('weekly')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.repeatTypeText, repeatType === 'weekly' && styles.repeatTypeTextActive]}>
                        Weekly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.repeatTypeButton, repeatType === 'monthly' && styles.repeatTypeButtonActive]}
                      onPress={() => setRepeatType('monthly')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.repeatTypeText, repeatType === 'monthly' && styles.repeatTypeTextActive]}>
                        Monthly
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Weekly Options */}
                  {repeatType === 'weekly' && (
                    <View style={styles.weeklyOptions}>
                      <Text style={styles.repeatSubtitle}>Repeat on:</Text>
                      <View style={styles.weekdayButtons}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                          <TouchableOpacity
                            key={day}
                            style={[styles.weekdayButton, repeatWeeklyDays[index] && styles.weekdayButtonActive]}
                            onPress={() => {
                              const newDays = [...repeatWeeklyDays];
                              newDays[index] = !newDays[index];
                              setRepeatWeeklyDays(newDays);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.weekdayText, repeatWeeklyDays[index] && styles.weekdayTextActive]}>
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
                        <Checkbox
                          status={monthlyRepeatType === 'date' ? 'checked' : 'unchecked'}
                          onPress={() => setMonthlyRepeatType('date')}
                        />
                        <Text style={styles.checkboxLabel}>Same date every month</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setMonthlyRepeatType('weekday')}
                        activeOpacity={0.7}
                      >
                        <Checkbox
                          status={monthlyRepeatType === 'weekday' ? 'checked' : 'unchecked'}
                          onPress={() => setMonthlyRepeatType('weekday')}
                        />
                        <Text style={styles.checkboxLabel}>Specific week and day</Text>
                      </TouchableOpacity>

                      {monthlyRepeatType === 'weekday' && (
                        <View style={styles.weekdaySelectors}>
                          <View style={styles.selectorRow}>
                            <Text style={styles.selectorLabel}>Week:</Text>
                            <View style={styles.weekNumbers}>
                              {[1, 2, 3, 4].map((num) => (
                                <TouchableOpacity
                                  key={num}
                                  style={[styles.weekNumberButton, monthlyWeekNumber === num && styles.weekNumberButtonActive]}
                                  onPress={() => setMonthlyWeekNumber(num)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.weekNumberText, monthlyWeekNumber === num && styles.weekNumberTextActive]}>
                                    {num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : '4th'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={styles.selectorRow}>
                            <Text style={styles.selectorLabel}>Day:</Text>
                            <View style={styles.weekdayButtons}>
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                                <TouchableOpacity
                                  key={day}
                                  style={[styles.weekdayButton, monthlyDayOfWeek === (index + 1) && styles.weekdayButtonActive]}
                                  onPress={() => setMonthlyDayOfWeek(index + 1)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.weekdayText, monthlyDayOfWeek === (index + 1) && styles.weekdayTextActive]}>
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
                          borderColor: '#ccc',
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
                  onPress={handleDeletePlanningTask}
                  style={styles.modalButton}
                  textColor="#d32f2f"
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
    </View>
  );
};

const ROW_HEIGHT = 200; // Increased to fit 4 time blocks

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  // Static left column
  staticColumn: {
    width: USER_COLUMN_WIDTH,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  staticHeaderCell: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    backgroundColor: '#d3d3d3',
  },
  staticHeaderText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#000',
  },
  staticUserCell: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    backgroundColor: '#fff',
  },
  staticUserText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  addTeamMemberButton: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    backgroundColor: '#f9f9f9',
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
    borderBottomColor: '#000',
  },
  dayHeaderCell: {
    width: DAY_CELL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000',
    backgroundColor: '#d3d3d3',
    paddingVertical: 4,
  },
  todayHeaderCell: {
    backgroundColor: '#a8d5ff',
  },
  dayHeaderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  todayHeaderName: {
    fontWeight: 'bold',
  },
  dayHeaderDate: {
    fontSize: 10,
    color: '#333',
  },
  todayHeaderDate: {
    fontWeight: 'bold',
    color: '#000',
  },
  gridUserRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  gridDayCell: {
    width: DAY_CELL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#000',
    backgroundColor: '#fff',
  },
  timeBlock: {
    height: TIME_BLOCK_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 4,
    justifyContent: 'center',
    position: 'relative',
  },
  timeBlockFilled: {
    backgroundColor: '#FFE4E1', // Light pink background for filled cells
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
    backgroundColor: 'rgba(98, 0, 238, 0.5)',
  },
  collapseButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(211, 47, 47, 0.8)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  projectName: {
    fontSize: 11,
    color: '#6200ee',
    fontWeight: '700',
    marginBottom: 2,
  },
  taskText: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
  },
  input: {
    marginBottom: 15,
  },
  projectsList: {
    maxHeight: 150,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
  },
  projectItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  projectItemText: {
    fontSize: 14,
    color: '#000',
  },
  gridTodayCell: {
    backgroundColor: '#e3f2fd',
  },
  gridOutsideQuarterCell: {
    backgroundColor: '#f5f5f5',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: Platform.OS === 'web' ? 600 : '95%',
    maxHeight: '95%',
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
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
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalListItemDragging: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  modalListItemDragOver: {
    backgroundColor: '#e3f2fd',
    borderBottomColor: '#2196F3',
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
    color: '#000',
    marginLeft: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    minWidth: 100,
  },
  // Checkbox styles
  checkboxGroup: {
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  // Repeat event styles
  repeatSection: {
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
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
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  repeatTypeButtonActive: {
    borderColor: '#6200ee',
    backgroundColor: '#f3e5f5',
  },
  repeatTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  repeatTypeTextActive: {
    color: '#6200ee',
  },
  repeatSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  weekdayButtonActive: {
    borderColor: '#6200ee',
    backgroundColor: '#6200ee',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  weekdayTextActive: {
    color: '#fff',
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
    color: '#333',
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
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  weekNumberButtonActive: {
    borderColor: '#6200ee',
    backgroundColor: '#6200ee',
  },
  weekNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  weekNumberTextActive: {
    color: '#fff',
  },
  endDateSection: {
    marginTop: 16,
  },
});

export default PlanningScreen;
