import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { planningTasksAPI, deadlineTasksAPI } from '../services/api';
import { logger } from '../utils/logger';

interface QuarterInfo {
  year: number;
  quarter: number;
}

interface BlockAssignment {
  id?: string;
  projectId: string;
  projectName: string;
  task?: string;
  span: number;
}

interface DeadlineTask {
  id: string;
  name: string;
  date: string;
  type: string;
  projectId?: string;
}

interface DraggedTask {
  id: string;
  userId: string;
  date: string;
  blockIndex: number;
  projectId: string;
  projectName: string;
  task?: string;
  span: number;
}

interface DraggingEdge {
  userId: string;
  date: string;
  blockIndex: number;
  edge: 'top' | 'bottom';
  initialSpan: number;
  startY: number;
}

interface UsePlanningDragDropProps {
  blockAssignments: { [key: string]: BlockAssignment };
  setBlockAssignments: (assignments: { [key: string]: BlockAssignment } | ((prev: any) => any)) => void;
  deadlineTasks: DeadlineTask[];
  setDeadlineTasks: (tasks: DeadlineTask[] | ((prev: any) => any)) => void;
  users: any[];
  setUsers: (users: any[]) => void;
  currentQuarter: QuarterInfo;
  hookLoadData: (quarter: QuarterInfo) => Promise<void>;
  setErrorMessage: (message: string) => void;
  setShowErrorDialog: (show: boolean) => void;
  invalidateDashboardQueries: () => void;
}

export const usePlanningDragDrop = ({
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
}: UsePlanningDragDropProps) => {
  // Task drag & drop state
  const [draggedTask, setDraggedTask] = useState<DraggedTask | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Deadline task drag & drop state
  const [draggedDeadlineTask, setDraggedDeadlineTask] = useState<DeadlineTask | null>(null);
  const [dragOverDeadlineCell, setDragOverDeadlineCell] = useState<string | null>(null);

  // Edge resizing state
  const [draggingEdge, setDraggingEdge] = useState<DraggingEdge | null>(null);
  const isDraggingEdgeRef = useRef(false);

  // User reordering drag & drop state
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [dragOverUserId, setDragOverUserId] = useState<string | null>(null);

  // ========================================
  // PLANNING TASK DRAG & DROP
  // ========================================

  const handleTaskDragStart = useCallback((e: any, userId: string, date: string, blockIndex: number) => {
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
  }, [blockAssignments]);

  const handleTaskDragOver = useCallback((e: any, userId: string, date: string, blockIndex: number) => {
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
  }, [draggedTask, blockAssignments]);

  const handleTaskDrop = useCallback(async (e: any, targetUserId: string, targetDate: string, targetBlockIndex: number) => {
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
        projectName = task.task || '';
        taskDescription = undefined;
      } else if (isProjectWithOutOfOffice) {
        projectName = (task.project?.description || task.project?.name || '') + ' (Out of Office)';
        taskDescription = task.task.replace('[OUT_OF_OFFICE]', '') || undefined;
      } else {
        projectName = task.project?.description || task.project?.name || '';
        taskDescription = task.task || undefined;
      }

      // Update state
      setBlockAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[sourceBlockKey];
        newAssignments[targetBlockKey] = {
          id: task.id,
          projectId: task.projectId,
          projectName: projectName,
          task: taskDescription,
          span: task.span,
        };
        return newAssignments;
      });

      invalidateDashboardQueries();
    } catch (error) {
      logger.error('Error moving task:', error, 'usePlanningDragDrop');
      setErrorMessage('Failed to move task');
      setShowErrorDialog(true);
      await hookLoadData(currentQuarter);
    }

    setDraggedTask(null);
    setDragOverCell(null);
  }, [draggedTask, blockAssignments, setBlockAssignments, setErrorMessage, setShowErrorDialog, invalidateDashboardQueries, hookLoadData, currentQuarter]);

  const handleTaskDragEnd = useCallback(() => {
    setDraggedTask(null);
    setDragOverCell(null);
  }, []);

  // ========================================
  // DEADLINE TASK DRAG & DROP
  // ========================================

  const handleDeadlineTaskDragStart = useCallback((e: React.DragEvent, task: DeadlineTask) => {
    e.stopPropagation();
    setDraggedDeadlineTask(task);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }, []);

  const handleDeadlineCellDragOver = useCallback((e: React.DragEvent, date: Date, slotIndex: number) => {
    e.preventDefault();
    if (draggedDeadlineTask) {
      const cellKey = `${date.toISOString().split('T')[0]}-${slotIndex}`;
      setDragOverDeadlineCell(cellKey);
    }
  }, [draggedDeadlineTask]);

  const handleDeadlineTaskDrop = useCallback(async (e: React.DragEvent, targetDate: Date, targetSlotIndex: number) => {
    e.preventDefault();

    if (!draggedDeadlineTask) {
      return;
    }

    try {
      const targetDateString = targetDate.toISOString().split('T')[0];

      // Update the deadline task (both date AND slotIndex)
      await deadlineTasksAPI.update(draggedDeadlineTask.id, {
        date: targetDateString,
        slotIndex: targetSlotIndex,
      });

      // Update state
      setDeadlineTasks(prev => {
        return prev.map(task => {
          if (task.id === draggedDeadlineTask.id) {
            return {
              ...task,
              date: targetDateString,
              slotIndex: targetSlotIndex,
            };
          }
          return task;
        });
      });

      invalidateDashboardQueries();
    } catch (error) {
      logger.error('Error moving deadline task:', error, 'usePlanningDragDrop');
      setErrorMessage('Failed to move deadline task');
      setShowErrorDialog(true);
      await hookLoadData(currentQuarter);
    }

    setDraggedDeadlineTask(null);
    setDragOverDeadlineCell(null);
  }, [draggedDeadlineTask, setDeadlineTasks, setErrorMessage, setShowErrorDialog, invalidateDashboardQueries, hookLoadData, currentQuarter]);

  const handleDeadlineTaskDragEnd = useCallback(() => {
    setDraggedDeadlineTask(null);
    setDragOverDeadlineCell(null);
  }, []);

  // ========================================
  // EDGE RESIZING (SPAN ADJUSTMENT)
  // ========================================

  const handleEdgeDragStart = useCallback((userId: string, date: string, blockIndex: number, edge: 'top' | 'bottom', e: any, currentSpan: number) => {
    if (Platform.OS !== 'web') return;

    e.preventDefault();
    e.stopPropagation();

    isDraggingEdgeRef.current = true;

    setDraggingEdge({
      userId,
      date,
      blockIndex,
      edge,
      initialSpan: currentSpan,
      startY: e.clientY,
    });
  }, []);

  // Edge drag effect (mouse move handler)
  useEffect(() => {
    if (!draggingEdge || Platform.OS !== 'web') {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingEdge) return;

      e.preventDefault();
      const clientY = e.clientY;
      const deltaY = clientY - draggingEdge.startY;
      const blockHeight = 60;
      const deltaBlocks = Math.round(deltaY / blockHeight);

      const { userId, date, blockIndex, edge, initialSpan } = draggingEdge;
      let newSpan = initialSpan;

      if (edge === 'bottom') {
        newSpan = Math.max(1, Math.min(4 - blockIndex, initialSpan + deltaBlocks));
      } else {
        newSpan = Math.max(1, Math.min(4, initialSpan - deltaBlocks));
      }

      // Update local state optimistically
      const blockKey = `${userId}-${date}-${blockIndex}`;
      const assignment = blockAssignments[blockKey];

      if (assignment && newSpan !== assignment.span) {
        setBlockAssignments(prev => ({
          ...prev,
          [blockKey]: {
            ...prev[blockKey],
            span: newSpan,
          },
        }));
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (draggingEdge) {
        const { userId, date, blockIndex, initialSpan } = draggingEdge;
        const blockKey = `${userId}-${date}-${blockIndex}`;
        const assignment = blockAssignments[blockKey];

        if (assignment && assignment.id) {
          const newSpan = assignment.span;

          if (newSpan !== initialSpan) {
            try {
              await planningTasksAPI.update(assignment.id, {
                span: newSpan,
              });

              invalidateDashboardQueries();
            } catch (error) {
              logger.error('Failed to save span:', error, 'usePlanningDragDrop');
              await hookLoadData(currentQuarter);
            }
          }
        }

        isDraggingEdgeRef.current = false;
        setDraggingEdge(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove as EventListener);
    document.addEventListener('mouseup', handleMouseUp as EventListener);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as EventListener);
      document.removeEventListener('mouseup', handleMouseUp as EventListener);
    };
  }, [draggingEdge, blockAssignments, setBlockAssignments, invalidateDashboardQueries, hookLoadData, currentQuarter]);

  // ========================================
  // USER REORDERING DRAG & DROP
  // ========================================

  const handleUserDragStart = useCallback((userId: string) => {
    setDraggedUserId(userId);
  }, []);

  const handleUserDragOver = useCallback((userId: string) => {
    if (draggedUserId && draggedUserId !== userId) {
      setDragOverUserId(userId);
    }
  }, [draggedUserId]);

  const handleUserDrop = useCallback((targetUserId: string) => {
    if (!draggedUserId || draggedUserId === targetUserId) {
      setDraggedUserId(null);
      setDragOverUserId(null);
      return;
    }

    const draggedIndex = users.findIndex(u => u.id === draggedUserId);
    const targetIndex = users.findIndex(u => u.id === targetUserId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedUserId(null);
      setDragOverUserId(null);
      return;
    }

    const newUsers = [...users];
    const [draggedUser] = newUsers.splice(draggedIndex, 1);
    newUsers.splice(targetIndex, 0, draggedUser);

    setUsers(newUsers);
    setDraggedUserId(null);
    setDragOverUserId(null);
  }, [draggedUserId, users, setUsers]);

  const handleUserDragEnd = useCallback(() => {
    setDraggedUserId(null);
    setDragOverUserId(null);
  }, []);

  return {
    // Planning task drag & drop
    draggedTask,
    dragOverCell,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDrop,
    handleTaskDragEnd,

    // Deadline task drag & drop
    draggedDeadlineTask,
    dragOverDeadlineCell,
    handleDeadlineTaskDragStart,
    handleDeadlineCellDragOver,
    handleDeadlineTaskDrop,
    handleDeadlineTaskDragEnd,

    // Edge resizing
    draggingEdge,
    isDraggingEdgeRef,
    handleEdgeDragStart,

    // User reordering
    draggedUserId,
    dragOverUserId,
    handleUserDragStart,
    handleUserDragOver,
    handleUserDrop,
    handleUserDragEnd,
  };
};
