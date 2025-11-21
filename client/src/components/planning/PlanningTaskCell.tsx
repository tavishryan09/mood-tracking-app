import React, { useCallback } from 'react';
import { Platform } from 'react-native';

interface BlockAssignment {
  id?: string;
  projectId: string;
  projectName: string;
  task?: string;
  span: number;
}

interface QuarterInfo {
  year: number;
  quarter: number;
}

interface PlanningTaskCellProps {
  // Core identifiers
  userId: string;
  date: Date;
  dateString: string;
  blockIndex: number;

  // Data
  assignment: BlockAssignment | undefined;
  blockAssignments: { [key: string]: BlockAssignment };

  // State
  hoveredBlock: string | null;
  selectedCell: string | null;
  copiedCell: any;
  dragOverCell: string | null;
  draggedTask: any;

  // Context
  currentQuarter: QuarterInfo;
  isLastUser: boolean;
  weekIndex: number;
  dayIndex: number;

  // Handlers
  handleTaskDragOver: (e: any, userId: string, date: string, blockIndex: number) => void;
  handleTaskDrop: (e: any, userId: string, date: string, blockIndex: number) => void;
  handleCellHover: (userId: string, date: string, blockIndex: number, isHovering: boolean) => void;
  handleBlockClick: (userId: string, date: string, blockIndex: number) => void;
  handleTaskDragStart: (e: any, userId: string, date: string, blockIndex: number) => void;
  handleTaskDragEnd: () => void;
  handleEdgeDragStart: (userId: string, date: string, blockIndex: number, edge: 'top' | 'bottom', e: any, span: number) => void;
  handleMobileLongPressStart: (userId: string, date: string, blockIndex: number, e: any) => void;
  handleMobileLongPressEnd: () => void;
  handleMobileCellTap: (userId: string, date: string, blockIndex: number, e: any) => void;

  // Helpers
  getQuarterFromDate: (date: Date) => number;

  // Colors
  currentColors: any;
  cellBorderColor: string;
  teamMemberBorderColor: string;
  cellHoverBg: string;
  weekdayCellBg: string;
  weekendCellBg: string;
  todayCellBg: string;
  projectTaskBg: string;
  projectTaskFont: string;
  adminTaskBg: string;
  adminTaskFont: string;
  marketingTaskBg: string;
  marketingTaskFont: string;
  outOfOfficeBg: string;
  outOfOfficeFont: string;
  unavailableBg: string;
  unavailableFont: string;
  timeOffBg: string;
  timeOffFont: string;
}

// Helper function to determine task background color
const getTaskBackgroundColor = (
  assignment: BlockAssignment,
  projectTaskBg: string,
  adminTaskBg: string,
  marketingTaskBg: string,
  outOfOfficeBg: string,
  unavailableBg: string,
  timeOffBg: string
): string => {
  const projectName = assignment.projectName || '';
  const projectNameLower = projectName.toLowerCase();

  // Status events
  if (projectName === 'Time Off') return timeOffBg;
  if (projectName === 'Out of Office' || projectName.includes('(Out of Office)')) return outOfOfficeBg;
  if (projectName === 'Unavailable') return unavailableBg;

  // Task types based on project name
  if (projectNameLower.includes('admin')) return adminTaskBg;
  else if (projectNameLower.includes('marketing')) return marketingTaskBg;

  return projectTaskBg;
};

// Helper function to determine task font color
const getTaskFontColor = (
  assignment: BlockAssignment,
  projectTaskFont: string,
  adminTaskFont: string,
  marketingTaskFont: string,
  outOfOfficeFont: string,
  unavailableFont: string,
  timeOffFont: string
): string => {
  const projectName = assignment.projectName || '';
  const projectNameLower = projectName.toLowerCase();

  // Status events
  if (projectName === 'Time Off') return timeOffFont;
  if (projectName === 'Out of Office' || projectName.includes('(Out of Office)')) return outOfOfficeFont;
  if (projectName === 'Unavailable') return unavailableFont;

  // Task types based on project name
  if (projectNameLower.includes('admin')) return adminTaskFont;
  else if (projectNameLower.includes('marketing')) return marketingTaskFont;

  return projectTaskFont;
};

const TIME_BLOCK_HEIGHT = 50;

const PlanningTaskCell: React.FC<PlanningTaskCellProps> = ({
  userId,
  date,
  dateString,
  blockIndex,
  assignment,
  blockAssignments,
  hoveredBlock,
  selectedCell,
  copiedCell,
  dragOverCell,
  draggedTask,
  currentQuarter,
  isLastUser,
  weekIndex,
  dayIndex,
  handleTaskDragOver,
  handleTaskDrop,
  handleCellHover,
  handleBlockClick,
  handleTaskDragStart,
  handleTaskDragEnd,
  handleEdgeDragStart,
  handleMobileLongPressStart,
  handleMobileLongPressEnd,
  handleMobileCellTap,
  getQuarterFromDate,
  currentColors,
  cellBorderColor,
  teamMemberBorderColor,
  cellHoverBg,
  weekdayCellBg,
  weekendCellBg,
  todayCellBg,
  projectTaskBg,
  projectTaskFont,
  adminTaskBg,
  adminTaskFont,
  marketingTaskBg,
  marketingTaskFont,
  outOfOfficeBg,
  outOfOfficeFont,
  unavailableBg,
  unavailableFont,
  timeOffBg,
  timeOffFont,
}) => {
  // Calculate block key
  const blockKey = `${userId}-${dateString}-${blockIndex}`;

  // Check if this cell is spanned by a previous block
  let isSpanned = false;
  for (let prevBlock = blockIndex - 1; prevBlock >= 0; prevBlock--) {
    const prevKey = `${userId}-${dateString}-${prevBlock}`;
    const prevAssignment = blockAssignments[prevKey];
    if (prevAssignment && prevAssignment.span > (blockIndex - prevBlock)) {
      isSpanned = true;
      break;
    }
  }

  // If spanned by previous block, don't render
  if (isSpanned) {
    return null;
  }

  // Calculate span and state flags
  const span = assignment?.span || 1;
  const isHovered = hoveredBlock === blockKey;
  const isSelected = selectedCell === blockKey;
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = dateString === todayString;

  // Weekend check (removed isOutsideQuarter check since we now support multiple loaded quarters)
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Edge expansion logic
  const blockAbove = blockIndex - 1;
  const hasEmptyCellAbove = blockAbove >= 0 && !blockAssignments[`${userId}-${dateString}-${blockAbove}`];

  const blockBelow = blockIndex + span;
  const hasEmptyCellBelow = blockBelow <= 3 && !blockAssignments[`${userId}-${dateString}-${blockBelow}`];

  const showTopEdge = hasEmptyCellAbove || span > 1;
  const showBottomEdge = hasEmptyCellBelow || span > 1;

  // Last block check
  const isLastBlockForUser = (blockIndex + span - 1) === 3;

  // Drag over detection
  let isDragOver = false;
  let isFirstInDragRange = false;
  let isLastInDragRange = false;
  if (dragOverCell && draggedTask) {
    const match = dragOverCell.match(/(\d{4}-\d{2}-\d{2})-(\d+)$/);
    if (match) {
      const dragOverDate = match[1];
      const dragOverBlockIndex = parseInt(match[2], 10);
      const dragOverUserId = dragOverCell.substring(0, dragOverCell.length - match[0].length - 1);

      if (userId === dragOverUserId && dateString === dragOverDate) {
        if (blockIndex >= dragOverBlockIndex && blockIndex < dragOverBlockIndex + draggedTask.span) {
          isDragOver = true;
          isFirstInDragRange = blockIndex === dragOverBlockIndex;
          isLastInDragRange = blockIndex === dragOverBlockIndex + draggedTask.span - 1;
        }
      }
    }
  }

  // Determine cell background color
  const cellBgColor = isToday
    ? todayCellBg
    : isWeekend
      ? weekendCellBg
      : weekdayCellBg;

  // Debug: Log the border color being used (only for first cell to avoid spam)
  if (blockIndex === 0 && dayIndex === 0 && weekIndex === 0) {
    console.log('[PlanningTaskCell] cellBorderColor:', cellBorderColor);
    console.log('[PlanningTaskCell] teamMemberBorderColor:', teamMemberBorderColor);
  }

  return (
    <td
      key={`${weekIndex}-${dayIndex}`}
      className="planning-cell"
      rowSpan={span}
      onDragOver={(e) => handleTaskDragOver(e, userId, dateString, blockIndex)}
      onDrop={(e) => handleTaskDrop(e, userId, dateString, blockIndex)}
      onClick={() => {
        // Desktop: no click-to-paste functionality
        // Use keyboard shortcuts (Cmd+C, Cmd+V) only
        // Mobile uses tap/long-press handlers instead
      }}
      style={{
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px',
        height: '100%',
        padding: 0,
        margin: 0,
        borderTop: `1px solid ${cellBorderColor}`,
        borderLeft: `1px solid ${cellBorderColor}`,
        borderRight: `1px solid ${cellBorderColor}`,
        borderBottom: (isLastBlockForUser && isLastUser) ? 'none' : (isLastBlockForUser && !isLastUser) ? `5px solid ${teamMemberBorderColor}` : `1px solid ${cellBorderColor}`,
        backgroundColor: isHovered ? cellHoverBg : cellBgColor,
        position: 'relative',
        overflow: 'visible',
        verticalAlign: 'top',
      }}
      onMouseEnter={() => handleCellHover(userId, dateString, blockIndex, true)}
      onMouseLeave={() => handleCellHover(userId, dateString, blockIndex, false)}
    >
      {/* Inner content */}
      <div
        data-task-cell="true"
        onClick={() => handleBlockClick(userId, dateString, blockIndex)}
        onTouchStart={(e) => handleMobileLongPressStart(userId, dateString, blockIndex, e)}
        onTouchEnd={handleMobileLongPressEnd}
        onTouchMove={handleMobileLongPressEnd}
        style={{
          width: '100%',
          height: `${TIME_BLOCK_HEIGHT * span}px`,
          maxWidth: '-webkit-fill-available',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          cursor: assignment ? 'pointer' : 'default',
          touchAction: 'none',
          backgroundColor: assignment
            ? (isHovered && assignment.projectName === 'Unavailable')
              ? cellHoverBg
              : getTaskBackgroundColor(
                  assignment,
                  projectTaskBg,
                  adminTaskBg,
                  marketingTaskBg,
                  outOfOfficeBg,
                  unavailableBg,
                  timeOffBg
                )
            : 'transparent',
          margin: assignment && assignment.projectName !== 'Unavailable' ? '3px' : '0',
          padding: assignment?.projectName === 'Unavailable' ? 0 : '4px',
          borderRadius: assignment && assignment.projectName !== 'Unavailable' ? '5px' : '0',
          // For drag-over merged outline: show borders only on outer edges
          ...(isDragOver ? {
            borderTop: isFirstInDragRange ? `2px solid ${currentColors.primary}` : 'none',
            borderBottom: isLastInDragRange ? `2px solid ${currentColors.primary}` : 'none',
            borderLeft: `2px solid ${currentColors.primary}`,
            borderRight: `2px solid ${currentColors.primary}`,
          } : {}),
          // For other states use boxShadow (but not for hover)
          boxShadow: !isDragOver && !isHovered && (isSelected
              ? `0 0 0 2px ${currentColors.selected}`
              : copiedCell && copiedCell.userId === userId && copiedCell.date === dateString && copiedCell.blockIndex === blockIndex
                ? `0 0 0 2px ${currentColors.copied}`
                : 'none'),
        }}
      >
        {/* Top edge resize handle */}
        {assignment && showTopEdge && (
          <div
            onMouseDown={(e: any) => handleEdgeDragStart(userId, dateString, blockIndex, 'top', e, span)}
            onTouchStart={(e: any) => {
              e.stopPropagation();
              e.preventDefault();
              handleEdgeDragStart(userId, dateString, blockIndex, 'top', e.touches[0], span);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '10px',
              cursor: 'ns-resize',
              zIndex: 10,
              backgroundColor: 'transparent',
              touchAction: 'none',
            }}
          />
        )}

        {/* Task content */}
        {assignment && (
          <div
            draggable={Platform.OS === 'web'}
            onDragStart={(e) => handleTaskDragStart(e, userId, dateString, blockIndex)}
            onDragEnd={handleTaskDragEnd}
            style={{
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '2px',
              overflow: 'hidden',
              pointerEvents: 'none',
              userSelect: 'none',
              textAlign: 'center',
            }}
          >
            {/* Project name */}
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: '1.2',
                color: getTaskFontColor(
                  assignment,
                  projectTaskFont,
                  adminTaskFont,
                  marketingTaskFont,
                  outOfOfficeFont,
                  unavailableFont,
                  timeOffFont
                ),
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: span === 1 ? 2 : span === 2 ? 3 : 4,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {assignment.projectName}
            </div>

            {/* Task description (if exists) */}
            {assignment.task && (
              <div
                style={{
                  fontSize: '11px',
                  lineHeight: '1.2',
                  color: getTaskFontColor(
                    assignment,
                    projectTaskFont,
                    adminTaskFont,
                    marketingTaskFont,
                    outOfOfficeFont,
                    unavailableFont,
                    timeOffFont
                  ),
                  opacity: 0.9,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: span === 1 ? 1 : span === 2 ? 2 : 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {assignment.task}
              </div>
            )}
          </div>
        )}

        {/* Bottom edge resize handle */}
        {assignment && showBottomEdge && (
          <div
            onMouseDown={(e: any) => handleEdgeDragStart(userId, dateString, blockIndex, 'bottom', e, span)}
            onTouchStart={(e: any) => {
              e.stopPropagation();
              e.preventDefault();
              handleEdgeDragStart(userId, dateString, blockIndex, 'bottom', e.touches[0], span);
            }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '10px',
              cursor: 'ns-resize',
              zIndex: 10,
              backgroundColor: 'transparent',
              touchAction: 'none',
            }}
          />
        )}
      </div>
    </td>
  );
};

export default React.memo(PlanningTaskCell);
