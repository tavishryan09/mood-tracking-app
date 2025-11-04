import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, ViewStyle, TouchableOpacity, PanResponder, GestureResponderEvent } from 'react-native';
import { Title, Paragraph, Card, FAB, ActivityIndicator, Chip, IconButton, SegmentedButtons, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { eventsAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const DayViewScreen = ({ route, navigation, onPreviousDay, onNextDay }: any) => {
  const { currentColors } = useTheme();
  const { selectedDate } = route.params;
  // Added previous/next day navigation arrows
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const timeSlotRefs = useRef<{ [key: string]: View | null }>({});
  const timeSlotPositions = useRef<{ [key: string]: { y: number; height: number } }>({});
  const hasLoadedOnce = useRef(false);

  // Track if we're currently in a drag (needed for PanResponder closure)
  const isDraggingRef = useRef(false);

  // Event drag/resize state
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [resizeMode, setResizeMode] = useState<'none' | 'top' | 'bottom' | 'move'>('none');
  const [draggedEventPosition, setDraggedEventPosition] = useState<{ top: number; height: number } | null>(null);
  const dragStartY = useRef<number>(0);
  const originalEventBounds = useRef<{ top: number; height: number }>({ top: 0, height: 0 });

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Web-specific: Add global mouse event listeners for dragging
  useEffect(() => {
    if (Platform.OS !== 'web' || resizeMode === 'none') return;

    const handleMouseMove = (e: MouseEvent) => {
      handleEventDragMove(e);
    };

    const handleMouseUp = () => {
      handleEventDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeMode, editingEvent]);

  // Create PanResponder for mobile drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Don't capture on start
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Start capturing if we've moved at least 2 pixels and dragging is active
        return Platform.OS !== 'web' && isDraggingRef.current && Math.abs(gestureState.dy) > 2;
      },
      onPanResponderMove: (event, gestureState) => {
        if (Platform.OS !== 'web' && isDraggingRef.current) {
          const y = gestureState.moveY;
          console.log('PanResponder move at y:', y);
          const timeSlot = findTimeSlotAtPosition(y);
          console.log('Found time slot:', timeSlot);
          if (timeSlot) {
            setDragEnd(timeSlot);
          }
        }
      },
      onPanResponderRelease: () => {
        if (Platform.OS !== 'web' && isDraggingRef.current) {
          console.log('PanResponder released');
          handleMouseUp();
        }
      },
    })
  ).current;

  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [selectedDate])
  );

  // Pre-cache time slot positions after events load
  useEffect(() => {
    if (!loading && events.length >= 0) {
      // Give time for layout to complete
      setTimeout(() => {
        cacheTimeSlotPositions();
      }, 500);
    }
  }, [loading, events]);

  const loadEvents = async () => {
    try {
      // Only show loading spinner on first load, not on subsequent focus events
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }

      // Add timeout to prevent infinite loading
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const response = await Promise.race([eventsAPI.getAll(), timeout]) as any;
      // Parse selectedDate in local timezone
      const [year, month, day] = selectedDate.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);

      const dayEvents = response.data.filter((event: any) => {
        const eventDate = new Date(event.startTime);
        return (
          eventDate.getFullYear() === targetDate.getFullYear() &&
          eventDate.getMonth() === targetDate.getMonth() &&
          eventDate.getDate() === targetDate.getDate()
        );
      });
      setEvents(dayEvents);
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('Error loading events:', error);
      // Set empty events so UI still loads
      setEvents([]);
      hasLoadedOnce.current = true;
    } finally {
      setLoading(false);
    }
  };

  // Generate 15-minute time slots from 6 AM to 10 PM
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 6;
    const endHour = 22;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  // Convert 24-hour time to 12-hour AM/PM format
  const formatTimeAMPM = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Calculate the display end time (add 15 minutes to the given time)
  const calculateDisplayEndTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 15;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const getEventsForTimeSlot = (time: string) => {
    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const [hours, minutes] = time.split(':').map(Number);

      // Parse selectedDate in local timezone
      const [year, month, day] = selectedDate.split('-').map(Number);
      const slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

      return eventStart <= slotDate && eventEnd > slotDate;
    });
  };

  // Check if this is the first slot for an event (to render the event block)
  const isFirstSlotForEvent = (time: string, event: any) => {
    const eventStart = new Date(event.startTime);
    const [hours, minutes] = time.split(':').map(Number);

    return eventStart.getHours() === hours &&
           Math.floor(eventStart.getMinutes() / 15) * 15 === minutes;
  };

  // Calculate event block height based on duration
  const getEventBlockHeight = (event: any) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    // Get start and end times rounded to 15-minute slots
    const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
    const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();

    // Calculate exact slot positions
    const startSlot = Math.floor(startMinutes / 15);
    const endSlot = Math.ceil(endMinutes / 15);

    // Number of slots this event occupies
    const slots = endSlot - startSlot;

    // Each slot is 50px min-height + 1px border = 51px total
    const height = slots * 51;

    console.log(`Event ${event.title}: Start ${eventStart.toLocaleTimeString()}, End ${eventEnd.toLocaleTimeString()}, ${slots} slots, ${height}px height`);
    return height;
  };

  // Format event duration for display
  const formatEventDuration = (event: any) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const startTime = `${eventStart.getHours().toString().padStart(2, '0')}:${eventStart.getMinutes().toString().padStart(2, '0')}`;
    const endTime = `${eventEnd.getHours().toString().padStart(2, '0')}:${eventEnd.getMinutes().toString().padStart(2, '0')}`;
    return `${formatTimeAMPM(startTime)} - ${formatTimeAMPM(endTime)}`;
  };

  const cacheTimeSlotPositions = () => {
    const slots = generateTimeSlots();
    // Add a small delay to ensure layout is complete
    setTimeout(() => {
      slots.forEach((time) => {
        const ref = timeSlotRefs.current[time];
        if (ref) {
          ref.measureInWindow((x, y, width, height) => {
            timeSlotPositions.current[time] = { y, height };
            console.log(`Cached ${time}: y=${y}, height=${height}`);
          });
        }
      });
    }, 50);
  };

  const handleSlotPress = (time: string) => {
    console.log('handleSlotPress called with:', time, 'isDragging:', isDragging, 'dragStart:', dragStart);
    // If already in selection mode, extend selection
    if (isDragging && dragStart) {
      console.log('Extending selection to:', time);
      setDragEnd(time);
    }
    // Otherwise, on web with no drag, open create event
    else if (Platform.OS === 'web' && !isDragging) {
      handleTimeSlotClick(time);
    }
  };

  const handleSlotLongPress = (time: string) => {
    console.log('Long press - starting selection at:', time);
    // Long press starts selection mode
    setDragStart(time);
    setDragEnd(time);
    setIsDragging(true);
  };

  const handleConfirmSelection = () => {
    if (isDragging && dragStart && dragEnd) {
      handleMouseUp();
    }
  };

  const handleCancelSelection = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleSlotMouseDown = (time: string, e: any) => {
    if (Platform.OS === 'web') {
      // Only prevent default if it's a left click (button 0)
      // This allows scrolling while still enabling drag selection
      if (e.button === 0) {
        setDragStart(time);
        setDragEnd(time);
        setIsDragging(true);
      }
    }
  };

  const handleSlotMouseEnter = (time: string) => {
    console.log('handleSlotMouseEnter called with:', time, 'isDragging:', isDragging);
    if (Platform.OS === 'web' && isDragging && dragStart) {
      console.log('Setting dragEnd to:', time);
      setDragEnd(time);
    }
  };

  const handleSlotTouch = (time: string) => {
    if (Platform.OS !== 'web' && isDragging && dragStart) {
      setDragEnd(time);
    }
  };

  const findTimeSlotAtPosition = (y: number): string | null => {
    const slots = generateTimeSlots();
    for (const time of slots) {
      const pos = timeSlotPositions.current[time];
      if (pos && y >= pos.y && y <= pos.y + pos.height) {
        return time;
      }
    }
    return null;
  };

  const handleTouchMove = (event: any) => {
    if (Platform.OS !== 'web' && isDragging && dragStart) {
      const touch = event.nativeEvent.touches[0];
      if (touch) {
        const y = touch.pageY;
        console.log('Touch move at y:', y);
        const timeSlot = findTimeSlotAtPosition(y);
        console.log('Found time slot:', timeSlot);
        if (timeSlot) {
          setDragEnd(timeSlot);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (Platform.OS !== 'web') {
      handleMouseUp();
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      console.log('handleMouseUp - dragStart:', dragStart, 'dragEnd:', dragEnd);
      const slots = generateTimeSlots();
      const startIndex = slots.indexOf(dragStart);
      const endIndex = slots.indexOf(dragEnd);
      console.log('Indices - start:', startIndex, 'end:', endIndex);

      if (startIndex !== -1 && endIndex !== -1) {
        const actualStart = Math.min(startIndex, endIndex);
        const actualEnd = Math.max(startIndex, endIndex);

        const startTime = slots[actualStart];
        // End time should be 15 minutes after the last selected slot
        // If the last slot is at index N, we need the time from slot N+1
        // If N+1 doesn't exist (end of day), add 15 minutes manually
        let endTime: string;
        if (actualEnd + 1 < slots.length) {
          endTime = slots[actualEnd + 1];
        } else {
          // Manually add 15 minutes to the last slot
          const [hours, minutes] = slots[actualEnd].split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + 15;
          const endHours = Math.floor(totalMinutes / 60);
          const endMinutes = totalMinutes % 60;
          endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        }

        console.log('Final times - start:', startTime, 'end:', endTime);
        handleCreateEventFromDrag(startTime, endTime);
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleCreateEventFromDrag = (startTime: string, endTime: string) => {
    console.log('handleCreateEventFromDrag - startTime:', startTime, 'endTime:', endTime);

    // Parse selectedDate in local timezone
    const [year, month, day] = selectedDate.split('-').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');

    // Build ISO strings directly from the time strings without any Date manipulation
    const startISO = `${year}-${pad(month)}-${pad(day)}T${startTime}:00`;
    const endISO = `${year}-${pad(month)}-${pad(day)}T${endTime}:00`;

    console.log('ISO strings - start:', startISO, 'end:', endISO);

    (navigation as any).navigate('CreateEvent', {
      selectedDate: startISO,
      endTime: endISO,
    });
  };

  const handleTimeSlotClick = (time: string) => {
    if (!isDragging) {
      const [hours, minutes] = time.split(':').map(Number);

      // Parse selectedDate in local timezone
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

      (navigation as any).navigate('CreateEvent', {
        selectedDate: startDateTime.toISOString(),
      });
    }
  };

  const handleEventPress = (eventId: string) => {
    console.log('Event pressed, navigating to EditEvent with eventId:', eventId);
    (navigation as any).navigate('EditEvent', { eventId });
  };

  // Convert pixel position to time slot
  const pixelToTime = (pixels: number): string => {
    const pixelsPerMinute = 51 / 15; // 51px per 15-minute slot
    const minutesFromStart = pixels / pixelsPerMinute;
    const totalMinutes = 6 * 60 + minutesFromStart; // Start at 6 AM

    // Round to nearest 15 minutes
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Handle event drag/resize
  const handleEventDragStart = (event: any, mode: 'top' | 'bottom' | 'move', startY: number) => {
    setEditingEvent(event);
    setResizeMode(mode);
    dragStartY.current = startY;

    const topPosition = getEventPosition(event);
    const blockHeight = getEventBlockHeight(event);
    originalEventBounds.current = { top: topPosition, height: blockHeight };
    setDraggedEventPosition({ top: topPosition, height: blockHeight });
  };

  const handleEventDragMove = (event: GestureResponderEvent | MouseEvent) => {
    if (resizeMode === 'none' || !editingEvent) return;

    // Handle both React Native events and web MouseEvents
    const pageY = 'nativeEvent' in event ? event.nativeEvent.pageY : (event as MouseEvent).pageY;
    const deltaY = pageY - dragStartY.current;
    const pixelsPerSlot = 51; // 51px per 15-minute slot

    // Snap to 15-minute increments
    const snappedDelta = Math.round(deltaY / pixelsPerSlot) * pixelsPerSlot;

    if (resizeMode === 'top') {
      // Resize from top (change start time)
      const newTop = Math.max(0, originalEventBounds.current.top + snappedDelta);
      const newHeight = originalEventBounds.current.height + (originalEventBounds.current.top - newTop);

      if (newHeight >= pixelsPerSlot) { // Minimum 15 minutes
        setDraggedEventPosition({ top: newTop, height: newHeight });
      }
    } else if (resizeMode === 'bottom') {
      // Resize from bottom (change end time)
      const newHeight = Math.max(pixelsPerSlot, originalEventBounds.current.height + snappedDelta);
      setDraggedEventPosition({ top: originalEventBounds.current.top, height: newHeight });
    } else if (resizeMode === 'move') {
      // Move entire event
      const newTop = Math.max(0, originalEventBounds.current.top + snappedDelta);
      setDraggedEventPosition({ top: newTop, height: originalEventBounds.current.height });
    }
  };

  const handleEventDragEnd = async () => {
    if (resizeMode === 'none' || !editingEvent || !draggedEventPosition) {
      setResizeMode('none');
      setEditingEvent(null);
      setDraggedEventPosition(null);
      return;
    }

    try {
      // Convert pixel positions back to times
      const startTime = pixelToTime(draggedEventPosition.top);
      const endTime = pixelToTime(draggedEventPosition.top + draggedEventPosition.height);

      // Parse selectedDate in local timezone
      const [year, month, day] = selectedDate.split('-').map(Number);
      const pad = (n: number) => String(n).padStart(2, '0');

      // Build ISO strings for the new times
      const startISO = `${year}-${pad(month)}-${pad(day)}T${startTime}:00`;
      const endISO = `${year}-${pad(month)}-${pad(day)}T${endTime}:00`;

      console.log('Updating event times:', { startISO, endISO });

      // Update the event via API
      await eventsAPI.update(editingEvent.id, {
        ...editingEvent,
        startTime: startISO,
        endTime: endISO,
      });

      // Reload events to show the update
      await loadEvents();

      Alert.alert('Success', 'Event time updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event time');
    } finally {
      setResizeMode('none');
      setEditingEvent(null);
      setDraggedEventPosition(null);
    }
  };

  const isSlotInDragRange = (time: string) => {
    if (!isDragging || !dragStart || !dragEnd) return false;

    const slots = generateTimeSlots();
    const slotIndex = slots.indexOf(time);
    const startIndex = slots.indexOf(dragStart);
    const endIndex = slots.indexOf(dragEnd);

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    return slotIndex >= minIndex && slotIndex <= maxIndex;
  };

  const timeSlots = generateTimeSlots();

  const goToPreviousDay = () => {
    // If callback provided (embedded mode), use it; otherwise use navigation params
    if (onPreviousDay) {
      onPreviousDay();
    } else {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const current = new Date(year, month - 1, day);
      current.setDate(current.getDate() - 1);
      const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      navigation.setParams({ selectedDate: newDate });
    }
  };

  const goToNextDay = () => {
    // If callback provided (embedded mode), use it; otherwise use navigation params
    if (onNextDay) {
      onNextDay();
    } else {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const current = new Date(year, month - 1, day);
      current.setDate(current.getDate() + 1);
      const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      navigation.setParams({ selectedDate: newDate });
    }
  };

  const handleViewModeChange = (mode: string) => {
    if (mode === 'month' || mode === 'week') {
      // Navigate back to Calendar screen with the selected view mode
      navigation.goBack();
    }
    // If 'day' is selected, we're already in day view so do nothing
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Calculate event position based on start time
  const getEventPosition = (event: any) => {
    const eventStart = new Date(event.startTime);
    const hours = eventStart.getHours();
    const minutes = eventStart.getMinutes();

    // Calculate minutes from start of day (6 AM)
    const startHour = 6;
    const minutesFromStart = (hours - startHour) * 60 + minutes;

    // Each 15-minute slot is 51px (50px min-height + 1px border)
    const pixelsPerMinute = 51 / 15;
    const topPosition = minutesFromStart * pixelsPerMinute;

    return topPosition;
  };

  // Render events overlay
  const renderEventsOverlay = () => {
    // Get all unique events for the day
    const uniqueEvents = events.filter((event, index, self) =>
      index === self.findIndex((e) => e.id === event.id)
    );

    return (
      <View style={styles.eventsOverlay} pointerEvents="box-none">
        {uniqueEvents.map((event) => {
          const isBeingEdited = editingEvent?.id === event.id;
          const topPosition = isBeingEdited && draggedEventPosition
            ? draggedEventPosition.top
            : getEventPosition(event);
          const blockHeight = isBeingEdited && draggedEventPosition
            ? draggedEventPosition.height
            : getEventBlockHeight(event);

          return (
            <View
              key={event.id}
              style={[
                styles.eventBlockOverlay,
                {
                  top: topPosition,
                  height: blockHeight,
                  backgroundColor: currentColors.primary
                },
                isBeingEdited && {
                  borderWidth: 2,
                  borderColor: currentColors.success,
                  borderStyle: 'dashed',
                }
              ]}
              pointerEvents="box-none"
            >
              {/* Top resize handle */}
              <View
                style={styles.resizeHandleTop}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => handleEventDragStart(event, 'top', e.nativeEvent.pageY)}
                onResponderMove={handleEventDragMove}
                onResponderRelease={handleEventDragEnd}
                // @ts-ignore - web only
                {...Platform.OS === 'web' && {
                  style: { cursor: 'ns-resize' },
                  onMouseDown: (e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEventDragStart(event, 'top', e.pageY);
                  }
                }}
              />

              {/* Event content - draggable to move */}
              <TouchableOpacity
                onPress={() => {
                  if (!isBeingEdited) {
                    console.log('TouchableOpacity onPress fired for event:', event.id);
                    handleEventPress(event.id);
                  }
                }}
                onLongPress={(e) => {
                  handleEventDragStart(event, 'move', e.nativeEvent.pageY);
                }}
                onPressOut={() => {
                  if (resizeMode === 'move') {
                    handleEventDragEnd();
                  }
                }}
                style={[
                  styles.eventBlockContent,
                  // @ts-ignore - web only
                  Platform.OS === 'web' && { cursor: 'move' }
                ]}
                activeOpacity={0.8}
                delayLongPress={200}
                // @ts-ignore - web only
                {...Platform.OS === 'web' && {
                  onMouseDown: (e: any) => {
                    // Only start drag if clicking on the content area (not on the edit icon)
                    if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                      handleEventDragStart(event, 'move', e.pageY);
                    }
                  }
                }}
              >
                {/* Edit icon in top right */}
                <IconButton
                  icon="pencil"
                  size={16}
                  style={[styles.eventEditIcon, { backgroundColor: currentColors.white }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEventPress(event.id);
                  }}
                  // @ts-ignore - web only
                  {...Platform.OS === 'web' && { style: { cursor: 'pointer' } }}
                />

                <Paragraph style={[styles.eventTitle, { color: currentColors.white }]}>{event.title}</Paragraph>
                <Paragraph style={styles.eventTime}>{formatEventDuration(event)}</Paragraph>
                {event.location && (
                  <Paragraph style={styles.eventLocation} numberOfLines={1}>
                    📍 {event.location}
                  </Paragraph>
                )}
                {event.description && (
                  <Paragraph style={styles.eventDescription} numberOfLines={2}>
                    {event.description}
                  </Paragraph>
                )}
              </TouchableOpacity>

              {/* Bottom resize handle */}
              <View
                style={styles.resizeHandleBottom}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => handleEventDragStart(event, 'bottom', e.nativeEvent.pageY)}
                onResponderMove={handleEventDragMove}
                onResponderRelease={handleEventDragEnd}
                // @ts-ignore - web only
                {...Platform.OS === 'web' && {
                  style: { cursor: 'ns-resize' },
                  onMouseDown: (e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEventDragStart(event, 'bottom', e.pageY);
                  }
                }}
              />
            </View>
          );
        })}
      </View>
    );
  };

  const renderTimeSlots = () => (
    <>
      {timeSlots.map((time, index) => {
          const slotEvents = getEventsForTimeSlot(time);
          const isHourMark = time.endsWith(':00');
          const isInDragRange = isSlotInDragRange(time);

          // Check if any events overlap this slot
          const hasEvents = slotEvents.length > 0;

          return (
            <View key={time}>
              <TouchableOpacity
                ref={(ref) => (timeSlotRefs.current[time] = ref)}
                style={[styles.timeSlotContainer, { borderBottomColor: currentColors.border }]}
                onMouseDown={Platform.OS === 'web' ? (e: any) => handleSlotMouseDown(time, e) : undefined}
                onMouseEnter={Platform.OS === 'web' ? () => handleSlotMouseEnter(time) : undefined}
                onClick={Platform.OS === 'web' ? () => !isDragging && handleTimeSlotClick(time) : undefined}
                onPress={() => handleSlotPress(time)}
                onLongPress={() => handleSlotLongPress(time)}
                delayLongPress={500}
                activeOpacity={0.7}
              >
                <View style={[styles.timeLabel, { backgroundColor: currentColors.background.bg500 }]}>
                  <Paragraph style={[styles.timeText, isHourMark && styles.hourText, { color: currentColors.text }]}>
                    {time}
                  </Paragraph>
                </View>

                <View
                  style={[
                    styles.timeSlot,
                    { backgroundColor: currentColors.white },
                    hasEvents && [styles.timeSlotOccupied, { backgroundColor: currentColors.background.bg300 }],
                    isHourMark && [styles.hourSlot, { borderTopColor: currentColors.border }],
                    isInDragRange && [styles.timeSlotDragging, { backgroundColor: currentColors.background.bg300, borderLeftColor: currentColors.primary }],
                    // @ts-ignore - web only styles
                    Platform.OS === 'web' && { cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }
                  ]}
                >
                  {!hasEvents && !isInDragRange && (
                    <Paragraph style={[styles.emptySlot, { color: currentColors.textSecondary }]}>Tap to schedule</Paragraph>
                  )}
                  {isInDragRange && (
                    <Paragraph style={[styles.selectedSlot, { color: currentColors.primary }]}>Selected</Paragraph>
                  )}
                </View>
              </TouchableOpacity>
              {isHourMark && index !== timeSlots.length - 1 && (
                <View style={[styles.hourDivider, { backgroundColor: currentColors.border }]} />
              )}
            </View>
          );
        })}
      <View style={styles.bottomSpacer} />
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={[styles.header, { backgroundColor: currentColors.background.bg300 }]}>
        <View style={styles.headerNav}>
          <IconButton
            icon="chevron-left"
            size={24}
            onPress={goToPreviousDay}
            iconColor={currentColors.primary}
          />
          <Title style={[styles.headerTitle, { color: currentColors.text }]}>
            {(() => {
              const [year, month, day] = selectedDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            })()}
          </Title>
          <IconButton
            icon="chevron-right"
            size={24}
            onPress={goToNextDay}
            iconColor={currentColors.primary}
          />
        </View>
        <Paragraph style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>
          {isDragging ? 'Drag to select time range' : 'Click and drag to schedule'}
        </Paragraph>
      </View>

      <View
        style={[styles.scrollView, { backgroundColor: currentColors.background.bg700 }]}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          {...(Platform.OS === 'web' && {
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseUp,
          })}
        >
          <View style={{ position: 'relative' }}>
            {renderTimeSlots()}
            {renderEventsOverlay()}
          </View>
        </ScrollView>
      </View>

      {isDragging && dragStart && dragEnd && Platform.OS !== 'web' && (
        <View style={[styles.selectionControls, { backgroundColor: currentColors.background.bg300, borderTopColor: currentColors.border }]}>
          <Paragraph style={[styles.selectionText, { color: currentColors.primary }]}>
            Selected: {dragStart} ({formatTimeAMPM(dragStart)}) - {dragEnd} ({formatTimeAMPM(dragEnd)})
          </Paragraph>
          <View style={styles.selectionButtons}>
            <Button
              mode="outlined"
              onPress={handleCancelSelection}
              style={styles.selectionButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmSelection}
              style={styles.selectionButton}
            >
              Create Event
            </Button>
          </View>
        </View>
      )}

      {isDragging && dragStart && dragEnd && Platform.OS === 'web' && (
        <View style={[styles.dragInfo, { backgroundColor: currentColors.primary }]}>
          <Paragraph style={[styles.dragInfoText, { color: currentColors.white }]}>
            {dragStart} - {calculateDisplayEndTime(dragEnd)}
          </Paragraph>
        </View>
      )}

      {!isDragging && (
        <FAB
          style={[styles.fab, { backgroundColor: currentColors.secondary }]}
          icon="plus"
          label="Add Event"
          onPress={() => {
            (navigation as any).navigate('CreateEvent', { selectedDate });
          }}
        />
      )}
    </View>
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
  viewSwitcher: {
    padding: 10,
  },
  header: {
    padding: 15,
    zIndex: 10,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  timeLabel: {
    width: 70,
    padding: 10,
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
  },
  hourText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeSlot: {
    flex: 1,
    minHeight: 50,
    padding: 8,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  hourSlot: {
    borderTopWidth: 2,
  },
  timeSlotOccupied: {
  },
  timeSlotDragging: {
    borderLeftWidth: 3,
  },
  emptySlot: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  selectedSlot: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  eventsOverlay: {
    position: 'absolute',
    top: 0,
    left: 78, // Width of time label (70px) + padding (8px)
    right: 8,
    bottom: 0,
    zIndex: 100,
  },
  eventBlockOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    padding: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  eventBlockContent: {
    flex: 1,
    position: 'relative',
  },
  eventBeingEdited: {
    borderWidth: 2,
    borderColor: '#00E676',
    borderStyle: 'dashed',
  },
  eventEditIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    margin: 0,
    zIndex: 1000,
  },
  resizeHandleTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: 'transparent',
    zIndex: 999,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  resizeHandleBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: 'transparent',
    zIndex: 999,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingRight: 24, // Make room for edit icon
  },
  eventTime: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginBottom: 4,
  },
  eventLocation: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginBottom: 2,
  },
  eventDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 4,
  },
  eventChip: {
    marginBottom: 4,
  },
  chip: {
    height: 32,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
  },
  hourDivider: {
    height: 2,
  },
  bottomSpacer: {
    height: 100,
  },
  dragInfo: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 1000,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dragInfoText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  selectionControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  selectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  selectionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default DayViewScreen;
