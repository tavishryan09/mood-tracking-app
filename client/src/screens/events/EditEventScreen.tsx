import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Title, SegmentedButtons, ActivityIndicator, Card, IconButton, Chip, Paragraph, List } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { eventsAPI, usersAPI } from '../../services/api';

const EditEventScreen = ({ navigation, route }: any) => {
  const { eventId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('MEETING');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [location, setLocation] = useState('');

  // Attendees state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const [eventResponse, usersResponse] = await Promise.all([
        eventsAPI.getById(eventId),
        usersAPI.getAll(),
      ]);

      const event = eventResponse.data;
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.eventType);
      setStartDate(new Date(event.startTime));
      setEndDate(new Date(event.endTime));
      setLocation(event.location || '');
      setAttendees(event.attendees || []);
      setAllUsers(usersResponse.data);
    } catch (error) {
      console.error('Error loading event:', error);
      setAllUsers([]);
      setAttendees([]);
      Alert.alert('Error', 'Failed to load event');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      await eventsAPI.update(eventId, {
        title,
        description,
        eventType,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        location,
      });

      Alert.alert('Success', 'Event updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    // Use window.confirm for web, Alert.alert for native
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this event?');
      if (confirmed) {
        try {
          await eventsAPI.delete(eventId);
          alert('Event deleted successfully');
          navigation.goBack();
        } catch (error: any) {
          alert('Failed to delete event. Please try again.');
        }
      }
    } else {
      Alert.alert(
        'Delete Event',
        'Are you sure you want to delete this event?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await eventsAPI.delete(eventId);
                Alert.alert('Success', 'Event deleted');
                navigation.goBack();
              } catch (error: any) {
                Alert.alert('Error', 'Failed to delete event');
              }
            },
          },
        ]
      );
    }
  };

  const handleAddAttendee = async (userId: string) => {
    try {
      await eventsAPI.addAttendee(eventId, { userId });
      setShowUserPicker(false);
      await loadEvent();
      Alert.alert('Success', 'Attendee added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add attendee');
    }
  };

  const handleRemoveAttendee = async (userId: string) => {
    Alert.alert(
      'Remove Attendee',
      'Are you sure you want to remove this attendee from the event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventsAPI.removeAttendee(eventId, userId);
              await loadEvent();
              Alert.alert('Success', 'Attendee removed successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove attendee');
            }
          },
        },
      ]
    );
  };

  // Get users that are not already attendees
  const availableUsers = allUsers.filter(
    (user) => !attendees.some((attendee) => attendee.userId === user.id)
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title>Edit Event</Title>

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

        {/* Attendees Section */}
        <Card style={styles.attendeesSection}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Attendees</Title>
              <IconButton
                icon={() => <HugeiconsIcon icon={UserAdd02Icon} size={24} color="#6200ee" />}
                size={24}
                onPress={() => setShowUserPicker(!showUserPicker)}
              />
            </View>

            {attendees.length === 0 ? (
              <Paragraph style={styles.emptyText}>
                No attendees added yet. Tap the + button to add attendees.
              </Paragraph>
            ) : (
              <View style={styles.attendeesList}>
                {attendees.map((attendee) => (
                  <Chip
                    key={attendee.id}
                    mode="outlined"
                    style={styles.attendeeChip}
                    onClose={() => handleRemoveAttendee(attendee.userId)}
                    closeIcon={() => <HugeiconsIcon icon={Delete02Icon} size={16} color="#666" />}
                  >
                    {attendee.user?.firstName} {attendee.user?.lastName}
                  </Chip>
                ))}
              </View>
            )}

            {showUserPicker && availableUsers.length > 0 && (
              <View style={styles.userPicker}>
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
              <Paragraph style={styles.emptyText}>
                All users are already attendees.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleUpdate}
          loading={saving}
          disabled={saving}
          style={styles.button}
        >
          Update Event
        </Button>

        <Button
          mode="outlined"
          onPress={handleDelete}
          style={styles.button}
          textColor="#d32f2f"
        >
          Delete Event
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
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  userPicker: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  pickerTitle: {
    fontSize: 14,
    marginBottom: 10,
  },
});

export default EditEventScreen;
