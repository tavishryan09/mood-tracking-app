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

    // Create custom drag image that shows the full multi-cell task
    if (e.dataTransfer && Platform.OS === 'web') {
      try {
        // Get the inner content div (the one with data-task-cell attribute)
        const dragElement = e.target.closest('[data-task-cell]');

        if (dragElement) {
          // Clone the element to create a drag preview
          const clone = dragElement.cloneNode(true) as HTMLElement;

          // Position off-screen but visible for rendering
          clone.style.position = 'fixed';
          clone.style.top = '-1000px';
          clone.style.left = '-1000px';
          clone.style.width = dragElement.offsetWidth + 'px';
          clone.style.height = dragElement.offsetHeight + 'px';
          clone.style.pointerEvents = 'none';
          clone.style.opacity = '0.8';
          clone.style.zIndex = '9999';

          document.body.appendChild(clone);

          // Calculate offset - use center of element for better visual
          const rect = dragElement.getBoundingClientRect();
          const offsetX = rect.width / 2;
          const offsetY = rect.height / 2;

          // Set the custom drag image
          e.dataTransfer.setDragImage(clone, offsetX, offsetY);

          // Clean up after a delay to ensure browser has captured the image
          setTimeout(() => {
            if (document.body.contains(clone)) {
              document.body.removeChild(clone);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error creating drag preview:', error);
      }
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
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    isDraggingEdgeRef.current = true;

    // Support both mouse events and touch events
    // For touch events, we receive e.touches[0] which has clientY
    // For mouse events, we receive the event which has clientY
    const clientY = e.clientY;

    console.log('[Edge Drag Start] clientY:', clientY, 'edge:', edge, 'span:', currentSpan);

    setDraggingEdge({
      userId,
      date,
      blockIndex,
      edge,
      initialSpan: currentSpan,
      startY: clientY,
    });
  }, []);

  // Edge drag effect (mouse and touch move handler)
  useEffect(() => {
    if (!draggingEdge) {
      return;
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingEdge) return;

      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - draggingEdge.startY;
      const blockHeight = 50;
      const deltaBlocks = Math.round(deltaY / blockHeight);

      console.log('[Edge Move] clientY:', clientY, 'startY:', draggingEdge.startY, 'deltaY:', deltaY, 'deltaBlocks:', deltaBlocks);

      const { userId, date, blockIndex, edge, initialSpan } = draggingEdge;
      let newSpan = initialSpan;
      let newBlockIndex = blockIndex;

      if (edge === 'bottom') {
        // Dragging bottom edge: adjust span downward
        newSpan = Math.max(1, Math.min(4 - blockIndex, initialSpan + deltaBlocks));
      } else {
        // Dragging top edge: adjust blockIndex AND span
        // Negative deltaBlocks means dragging up (extending upward)
        const blockShift = -deltaBlocks; // How many blocks to shift up
        newBlockIndex = Math.max(0, blockIndex - blockShift); // Can't go below block 0

        // Calculate new span to maintain bottom edge position
        const bottomBlock = blockIndex + initialSpan - 1;
        newSpan = bottomBlock - newBlockIndex + 1;

        // Ensure span stays within valid range (1-4 total blocks)
        newSpan = Math.max(1, Math.min(4, newSpan));

        // Recalculate blockIndex based on constrained span
        newBlockIndex = bottomBlock - newSpan + 1;
      }

      // Update local state optimistically
      const oldBlockKey = `${userId}-${date}-${blockIndex}`;
      const newBlockKey = `${userId}-${date}-${newBlockIndex}`;
      const assignment = blockAssignments[oldBlockKey];

      if (assignment) {
        // If blockIndex changed (top edge drag), need to move the assignment
        if (newBlockIndex !== blockIndex || newSpan !== assignment.span) {
          setBlockAssignments(prev => {
            const updated = { ...prev };

            // Remove from old position if blockIndex changed
            if (newBlockIndex !== blockIndex) {
              delete updated[oldBlockKey];
            }

            // Add to new position with new span
            updated[newBlockKey] = {
              ...assignment,
              span: newSpan,
            };

            return updated;
          });
        }
      }
    };

    const handleEnd = async (e: MouseEvent | TouchEvent) => {
      if (!draggingEdge) return;

      // IMMEDIATELY stop drag state to prevent further mouse movements from affecting the task
      // Capture the data we need BEFORE clearing the state
      const { userId, date, blockIndex, edge, initialSpan } = draggingEdge;

      // Clear drag state immediately - this prevents handleMouseMove from running
      isDraggingEdgeRef.current = false;
      setDraggingEdge(null);

      // For top edge drag, the task may have moved to a different blockIndex
      // Find the assignment by looking through all blockIndices
      let assignment = null;
      let finalBlockIndex = blockIndex;

      // Search for the assignment (it may have moved if top edge was dragged)
      for (let i = 0; i < 4; i++) {
        const testKey = `${userId}-${date}-${i}`;
        if (blockAssignments[testKey]?.id) {
          // Check if this assignment was originally at blockIndex
          const testAssignment = blockAssignments[testKey];
          // If we're dragging the top edge and this block contains an assignment with an ID,
          // and there's no assignment at the original blockIndex, this is likely our moved task
          if (edge === 'top') {
            const originalKey = `${userId}-${date}-${blockIndex}`;
            if (!blockAssignments[originalKey]) {
              assignment = testAssignment;
              finalBlockIndex = i;
              break;
            }
          }
        }
      }

      // Fallback: check original position
      if (!assignment) {
        const originalKey = `${userId}-${date}-${blockIndex}`;
        assignment = blockAssignments[originalKey];
        finalBlockIndex = blockIndex;
      }

      if (assignment && assignment.id) {
        const newSpan = assignment.span;
        const blockIndexChanged = finalBlockIndex !== blockIndex;

        if (newSpan !== initialSpan || blockIndexChanged) {
          try {
            const updateData: any = { span: newSpan };

            // If blockIndex changed (top edge drag), also update blockIndex
            if (blockIndexChanged) {
              updateData.blockIndex = finalBlockIndex;
            }

            await planningTasksAPI.update(assignment.id, updateData);

            invalidateDashboardQueries();
          } catch (error) {
            logger.error('Failed to save span/blockIndex:', error, 'usePlanningDragDrop');
            await hookLoadData(currentQuarter);
          }
        }
      }
    };

    document.addEventListener('mousemove', handleMove as EventListener);
    document.addEventListener('mouseup', handleEnd as EventListener);
    document.addEventListener('touchmove', handleMove as EventListener, { passive: false });
    document.addEventListener('touchend', handleEnd as EventListener);

    return () => {
      document.removeEventListener('mousemove', handleMove as EventListener);
      document.removeEventListener('mouseup', handleEnd as EventListener);
      document.removeEventListener('touchmove', handleMove as EventListener);
      document.removeEventListener('touchend', handleEnd as EventListener);
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
