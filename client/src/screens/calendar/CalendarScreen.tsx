import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import { Card, Title, Paragraph, FAB, ActivityIndicator, SegmentedButtons, IconButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventsAPI } from '../../services/api';
import DayViewScreen from './DayViewScreen';

const CalendarScreen = () => {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  // Updated: clicking any day navigates to Day View
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [showWeekends, setShowWeekends] = useState(false); // Will be loaded from user preference

  useEffect(() => {
    loadUserPreferences();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [])
  );

  const loadUserPreferences = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('calendar_show_weekends_default');
      if (savedPreference !== null) {
        setShowWeekends(savedPreference === 'true');
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      // Add timeout to prevent infinite loading
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const response = await Promise.race([eventsAPI.getAll(), timeout]) as any;
      setEvents(response.data);

      // Mark dates with events (using local timezone)
      const marks: any = {};
      response.data.forEach((event: any) => {
        const eventDate = new Date(event.startTime);
        const date = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        marks[date] = { marked: true, dotColor: '#007AFF' };
      });
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#007AFF' };
      setMarkedDates(marks);
    } catch (error) {
      console.error('Error loading events:', error);
      // Set empty events so UI still loads
      setEvents([]);
      setMarkedDates({ [selectedDate]: { selected: true, selectedColor: '#007AFF' } });
    } finally {
      setLoading(false);
    }
  };

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    const marks = { ...markedDates };
    Object.keys(marks).forEach((key) => {
      marks[key].selected = false;
    });
    marks[day.dateString] = { ...marks[day.dateString], selected: true, selectedColor: '#007AFF' };
    setMarkedDates(marks);

    // Switch to Day View mode when any day is clicked
    setViewMode('day');
  };

  const onMonthChange = (month: any) => {
    // Update selectedDate when month changes via arrow navigation
    setSelectedDate(month.dateString);
  };

  const handleViewModeChange = (mode: string) => {
    // If clicking week view while already in week view, toggle weekends
    if (mode === 'week' && viewMode === 'week') {
      setShowWeekends(!showWeekends);
    } else {
      setViewMode(mode);
    }
  };

  const getDayEvents = () => {
    return events.filter((event) => event.startTime.startsWith(selectedDate));
  };

  const getMonthEvents = () => {
    // Parse selectedDate in local timezone
    const [year, month, day] = selectedDate.split('-').map(Number);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const getWeekEvents = () => {
    // Parse selectedDate in local timezone
    const [year, month, day] = selectedDate.split('-').map(Number);
    const selected = new Date(year, month - 1, day);

    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - selected.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(0, 0, 0, 0);

    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= startOfWeek && eventDate < endOfWeek;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const handleEventPress = (eventId: string) => {
    console.log('CalendarScreen - Event pressed, navigating to EditEvent with eventId:', eventId);
    (navigation as any).navigate('EditEvent', { eventId });
  };


  const getWeekDays = () => {
    // Parse selectedDate in local timezone
    const [year, month, day] = selectedDate.split('-').map(Number);
    const selected = new Date(year, month - 1, day);
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - selected.getDay()); // Sunday

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const goToPreviousWeek = () => {
    // Parse selectedDate in local timezone
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() - 7);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    // Parse selectedDate in local timezone
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() + 7);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
  };

  const goToPreviousDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() - 1);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() + 1);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
  };

  const renderWeekView = () => {
    const allWeekDays = getWeekDays();
    // Filter out weekends (Sunday=0, Saturday=6) if showWeekends is false
    const weekDays = showWeekends
      ? allWeekDays
      : allWeekDays.filter(day => day.getDay() !== 0 && day.getDay() !== 6);

    const dayNames = showWeekends
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const weekStart = allWeekDays[0];
    const weekEnd = allWeekDays[6];
    const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return (
      <View>
        <View style={styles.weekNavigation}>
          <IconButton
            icon={() => <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#007AFF" />}
            size={24}
            onPress={goToPreviousWeek}
          />
          <Title style={styles.weekLabel}>{weekLabel}</Title>
          <IconButton
            icon={() => <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#007AFF" />}
            size={24}
            onPress={goToNextWeek}
          />
        </View>

        <View style={styles.viewSwitcher}>
          <SegmentedButtons
            value={viewMode}
            onValueChange={handleViewModeChange}
            buttons={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
              { value: 'day', label: 'Day' },
            ]}
          />
        </View>

        <View style={styles.weekContainer}>
        <View style={styles.weekHeader}>
          {dayNames.map((name, index) => (
            <View key={index} style={styles.weekDayName}>
              <Paragraph style={styles.weekDayNameText}>{name}</Paragraph>
            </View>
          ))}
        </View>
        <View style={styles.weekDays}>
          {weekDays.map((day, index) => {
            const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
            const isSelected = dateString === selectedDate;
            const today = new Date();
            const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const isToday = dateString === todayString;
            const hasEvents = markedDates[dateString]?.marked;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekDay,
                  isSelected && styles.weekDaySelected,
                  isToday && !isSelected && styles.weekDayToday,
                ]}
                onPress={() => onDayPress({ dateString })}
              >
                <Paragraph style={[
                  styles.weekDayNumber,
                  isSelected && styles.weekDayNumberSelected,
                  isToday && !isSelected && styles.weekDayNumberToday,
                ]}>
                  {day.getDate()}
                </Paragraph>
                {hasEvents && (
                  <View style={styles.weekDayDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        </View>
      </View>
    );
  };

  const goToPreviousMonth = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, 1);
    current.setMonth(current.getMonth() - 1);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`;
    setSelectedDate(newDate);
  };

  const goToNextMonth = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, 1);
    current.setMonth(current.getMonth() + 1);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`;
    setSelectedDate(newDate);
  };

  const renderCalendarView = () => {
    if (viewMode === 'week') {
      return renderWeekView();
    }

    if (viewMode === 'day') {
      // Day view with consistent navigation
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dayDate = new Date(year, month - 1, day);
      const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      return (
        <View>
          <View style={styles.weekNavigation}>
            <IconButton
              icon={() => <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#007AFF" />}
              size={24}
              onPress={goToPreviousDay}
            />
            <Title style={styles.weekLabel}>{dayLabel}</Title>
            <IconButton
              icon={() => <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#007AFF" />}
              size={24}
              onPress={goToNextDay}
            />
          </View>

          <View style={styles.viewSwitcher}>
            <SegmentedButtons
              value={viewMode}
              onValueChange={handleViewModeChange}
              buttons={[
                { value: 'month', label: 'Month' },
                { value: 'week', label: 'Week' },
                { value: 'day', label: 'Day' },
              ]}
            />
          </View>
        </View>
      );
    }

    // Month view with consistent navigation
    const [year, month, day] = selectedDate.split('-').map(Number);
    const monthDate = new Date(year, month - 1, day);
    const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <View>
        <View style={styles.weekNavigation}>
          <IconButton
            icon={() => <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#007AFF" />}
            size={24}
            onPress={goToPreviousMonth}
          />
          <Title style={styles.weekLabel}>{monthLabel}</Title>
          <IconButton
            icon={() => <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#007AFF" />}
            size={24}
            onPress={goToNextMonth}
          />
        </View>

        <View style={styles.viewSwitcher}>
          <SegmentedButtons
            value={viewMode}
            onValueChange={handleViewModeChange}
            buttons={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
              { value: 'day', label: 'Day' },
            ]}
          />
        </View>

        <Calendar
          key={selectedDate}
          current={selectedDate}
          onDayPress={onDayPress}
          markedDates={markedDates}
          hideArrows={true}
          disableMonthChange={true}
          hideExtraDays={true}
          theme={{
            selectedDayBackgroundColor: 'transparent',
            selectedDayTextColor: '#007AFF',
            todayBackgroundColor: '#E3F2FD',
            todayTextColor: '#007AFF',
            dayTextColor: '#333',
            textDayFontSize: 16,
            textMonthFontSize: 0,
            textDayHeaderFontSize: 12,
          }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If in day view mode, render the DayViewScreen component
  if (viewMode === 'day') {
    return (
      <View style={styles.container}>
        {renderCalendarView()}
        <DayViewScreen
          route={{ params: { selectedDate } }}
          navigation={navigation}
          onPreviousDay={goToPreviousDay}
          onNextDay={goToNextDay}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        {renderCalendarView()}

        <View style={styles.eventsSection}>
          <View style={styles.eventsHeader}>
            <Title style={styles.eventsTitle}>
              {viewMode === 'month'
                ? (() => {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return `Events in ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                  })()
                : viewMode === 'week'
                ? 'This Week\'s Events'
                : (() => {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return `Events on ${date.toLocaleDateString()}`;
                  })()}
            </Title>
          </View>

          {(() => {
            const displayEvents = viewMode === 'month'
              ? getMonthEvents()
              : viewMode === 'week'
              ? getWeekEvents()
              : getDayEvents();

            return displayEvents.length === 0 ? (
              <Paragraph style={styles.noEvents}>No events scheduled</Paragraph>
            ) : (
              displayEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => handleEventPress(event.id)}
                activeOpacity={0.7}
              >
                <Card style={styles.eventCard}>
                  <Card.Content>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventHeaderLeft}>
                        <Title>{event.title}</Title>
                        {(viewMode === 'week' || viewMode === 'month') && (
                          <Paragraph style={styles.eventDate}>
                            {new Date(event.startTime).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Paragraph>
                        )}
                      </View>
                      <Paragraph style={styles.eventType}>{event.eventType}</Paragraph>
                    </View>
                    <Paragraph style={styles.eventTime}>
                      {new Date(event.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(event.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Paragraph>
                    {event.description && (
                      <Paragraph numberOfLines={2}>{event.description}</Paragraph>
                    )}
                    {event.location && (
                      <View style={styles.locationContainer}>
                        <IconButton icon="map-marker" size={16} style={styles.locationIcon} />
                        <Paragraph style={styles.location}>{event.location}</Paragraph>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
            );
          })()}

        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Event"
        onPress={() => {
          (navigation as any).navigate('CreateEvent', { selectedDate });
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewSwitcher: {
    padding: 10,
    backgroundColor: 'white',
  },
  eventsSection: {
    padding: 15,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventsTitle: {
    flex: 1,
  },
  noEvents: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  eventCard: {
    marginBottom: 10,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  eventHeaderLeft: {
    flex: 1,
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  eventType: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  eventTime: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    color: '#666',
    fontSize: 12,
    flex: 1,
  },
  locationIcon: {
    margin: 0,
    padding: 0,
  },
  viewDetailsButton: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 80,
  },
  viewDetailsText: {
    color: '#6200ee',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
  bottomSpacer: {
    height: 100,
  },
  weekContainer: {
    backgroundColor: 'white',
    padding: 15,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  weekLabel: {
    fontSize: 18,
    color: '#333',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayName: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayNameText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  weekDaySelected: {
    backgroundColor: 'transparent',
  },
  weekDayToday: {
    backgroundColor: '#E3F2FD',
  },
  weekDayNumber: {
    fontSize: 16,
    color: '#333',
  },
  weekDayNumberSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  weekDayNumberToday: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  weekDayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginTop: 4,
  },
});

export default CalendarScreen;
