import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Title, SegmentedButtons, Card, IconButton, Chip, Paragraph, List } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { eventsAPI, projectsAPI, clientsAPI, usersAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const CreateEventScreen = ({ navigation, route }: any) => {
  const { currentColors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('MEETING');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000)); // 1 hour later
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  // Attendees state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Dynamic styles that depend on theme
  const dynamicStyles = {
    emptyText: {
      color: currentColors.textTertiary,
    },
    userPicker: {
      borderTopColor: currentColors.border,
    },
  };

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setAllUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      setAllUsers([]);
    }
  };

  const handleAddAttendee = (userId: string) => {
    setSelectedAttendees([...selectedAttendees, userId]);
    setShowUserPicker(false);
  };

  const handleRemoveAttendee = (userId: string) => {
    setSelectedAttendees(selectedAttendees.filter(id => id !== userId));
  };

  // Get users that are not already selected as attendees
  const availableUsers = allUsers.filter(
    (user) => !selectedAttendees.includes(user.id)
  );

  // Get selected attendee objects for display
  const selectedAttendeeObjects = allUsers.filter((user) => selectedAttendees.includes(user.id));

  // Get selected date from route params if available
  useEffect(() => {
    if (route.params?.selectedDate) {
      console.log('CreateEvent - received selectedDate:', route.params.selectedDate);
      console.log('CreateEvent - received endTime:', route.params?.endTime);
      // Parse ISO string as local time (not UTC)
      const dateStr = route.params.selectedDate;
      let date: Date;

      // Check if it's a local ISO string (no timezone) or full ISO with timezone
      if (dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        // Local ISO string like "2025-10-30T08:00:00"
        const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
          date = new Date(
            parseInt(parts[1]), // year
            parseInt(parts[2]) - 1, // month (0-indexed)
            parseInt(parts[3]), // day
            parseInt(parts[4]), // hours
            parseInt(parts[5]), // minutes
            parseInt(parts[6])  // seconds
          );
        } else {
          date = new Date(dateStr);
        }
      } else {
        date = new Date(dateStr);
      }

      console.log('CreateEvent - parsed start date:', date, date.toLocaleString());
      setStartDate(date);

      // If endTime is provided (from drag selection), use it
      if (route.params?.endTime) {
        const endStr = route.params.endTime;
        let end: Date;

        // Parse end time the same way
        if (endStr.includes('T') && !endStr.includes('Z') && !endStr.includes('+') && !endStr.includes('-', 10)) {
          const parts = endStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
          if (parts) {
            end = new Date(
              parseInt(parts[1]),
              parseInt(parts[2]) - 1,
              parseInt(parts[3]),
              parseInt(parts[4]),
              parseInt(parts[5]),
              parseInt(parts[6])
            );
          } else {
            end = new Date(endStr);
          }
        } else {
          end = new Date(endStr);
        }

        console.log('CreateEvent - parsed end date:', end, end.toLocaleString());
        setEndDate(end);
      } else {
        // Otherwise default to 1 hour later
        const end = new Date(date);
        end.setHours(end.getHours() + 1);
        console.log('CreateEvent - default end date (1hr later):', end, end.toLocaleString());
        setEndDate(end);
      }
    }
  }, [route.params?.selectedDate, route.params?.endTime]);

  const handleSubmit = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      await eventsAPI.create({
        title,
        description,
        eventType,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        location,
        isAllDay: false,
        attendeeIds: selectedAttendees.length > 0 ? selectedAttendees : undefined,
      });

      Alert.alert('Success', 'Event created successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title>Create New Event</Title>

        <TextInput
          label="Event Title *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <SegmentedButtons
          value={eventType}
          onValueChange={setEventType}
          buttons={[
            { value: 'MEETING', label: 'Meeting' },
            { value: 'APPOINTMENT', label: 'Appointment' },
            { value: 'DEADLINE', label: 'Deadline' },
            { value: 'OTHER', label: 'Other' },
          ]}
          style={styles.input}
        />

        <TextInput
          label="Location"
          value={location}
          onChangeText={setLocation}
          mode="outlined"
          style={styles.input}
        />

        {/* Attendees Section */}
        <Card style={styles.attendeesSection}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Attendees</Title>
              <IconButton
                icon={() => <HugeiconsIcon icon={UserAdd02Icon} size={24} color={currentColors.primary} />}
                size={24}
                onPress={() => setShowUserPicker(!showUserPicker)}
              />
            </View>

            {selectedAttendeeObjects.length === 0 ? (
              <Paragraph style={[styles.emptyText, dynamicStyles.emptyText]}>
                No attendees selected. Tap the + button to add attendees.
              </Paragraph>
            ) : (
              <View style={styles.attendeesList}>
                {selectedAttendeeObjects.map((attendee) => (
                  <Chip
                    key={attendee.id}
                    mode="outlined"
                    style={styles.attendeeChip}
                    onClose={() => handleRemoveAttendee(attendee.id)}
                    closeIcon={() => <HugeiconsIcon icon={Delete02Icon} size={16} color={currentColors.icon} />}
                  >
                    {attendee.firstName} {attendee.lastName}
                  </Chip>
                ))}
              </View>
            )}

            {showUserPicker && availableUsers.length > 0 && (
              <View style={[styles.userPicker, dynamicStyles.userPicker]}>
                <Title style={styles.pickerTitle}>Add Attendee</Title>
                {availableUsers.map((user) => (
                  <List.Item
                    key={user.id}
                    title={`${user.firstName} ${user.lastName}`}
                    description={user.email}
                    onPress={() => handleAddAttendee(user.id)}
                    left={(props) => <List.Icon {...props} icon="account-plus" />}
                  />
                ))}
              </View>
            )}

            {showUserPicker && availableUsers.length === 0 && (
              <Paragraph style={[styles.emptyText, dynamicStyles.emptyText]}>
                All users have been added as attendees.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        <View style={styles.dateSection}>
          <Title style={styles.dateTitle}>Start Time</Title>
          <TextInput
            label="Date & Time"
            value={startDate.toLocaleString()}
            mode="outlined"
            editable={false}
            style={styles.input}
          />
        </View>

        <View style={styles.dateSection}>
          <Title style={styles.dateTitle}>End Time</Title>
          <TextInput
            label="Date & Time"
            value={endDate.toLocaleString()}
            mode="outlined"
            editable={false}
            style={styles.input}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Create Event
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  input: {
    marginBottom: 15,
  },
  dateSection: {
    marginBottom: 15,
  },
  dateTitle: {
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    marginTop: 10,
  },
  attendeesSection: {
    marginTop: 20,
    marginBottom: 20,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
  },
  attendeesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attendeeChip: {
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  userPicker: {
    marginTop: 15,
    borderTopWidth: 1,
    paddingTop: 15,
  },
  pickerTitle: {
    fontSize: 14,
    marginBottom: 10,
  },
});

export default CreateEventScreen;
