import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Title, SegmentedButtons, ActivityIndicator, Card, IconButton, Chip, Paragraph, List } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { eventsAPI, usersAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';

const EditEventScreen = ({ navigation, route }: any) => {
  const { currentColors } = useTheme();
  const { eventId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('MEETING');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Attendees state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Dialog state variables
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showRemoveAttendeeDialog, setShowRemoveAttendeeDialog] = useState(false);
  const [removeAttendeeUserId, setRemoveAttendeeUserId] = useState<string | null>(null);
  const [successCallback, setSuccessCallback] = useState<(() => void) | null>(null);

  // Dynamic styles that depend on theme
  const dynamicStyles = {
    emptyText: {
      color: currentColors.textTertiary,
    },
    userPicker: {
      borderTopColor: currentColors.border,
    },
    deleteButton: {
      color: currentColors.error,
    },
  };

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
      setErrorMessage('Failed to load event');
      setShowErrorDialog(true);
      setSuccessCallback(() => () => navigation.goBack());
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!title) {
      setValidationMessage('Please enter an event title');
      setShowValidationDialog(true);
      return;
    }

    if (endDate <= startDate) {
      setValidationMessage('End time must be after start time');
      setShowValidationDialog(true);
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

      setSuccessMessage('Event updated successfully');
      setShowSuccessDialog(true);
      setSuccessCallback(() => () => navigation.goBack());
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to update event');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setSaving(true);
    try {
      await eventsAPI.delete(eventId);
      setSuccessMessage('Event deleted successfully');
      setShowSuccessDialog(true);
      setSuccessCallback(() => () => navigation.goBack());
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to delete event');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleAddAttendee = async (userId: string) => {
    try {
      await eventsAPI.addAttendee(eventId, { userId });
      setShowUserPicker(false);
      await loadEvent();
      setSuccessMessage('Attendee added successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to add attendee');
      setShowErrorDialog(true);
    }
  };

  const handleRemoveAttendee = async (userId: string) => {
    setRemoveAttendeeUserId(userId);
    setShowRemoveAttendeeDialog(true);
  };

  const performRemoveAttendee = async () => {
    if (!removeAttendeeUserId) return;
    setShowRemoveAttendeeDialog(false);
    try {
      await eventsAPI.removeAttendee(eventId, removeAttendeeUserId);
      await loadEvent();
      setSuccessMessage('Attendee removed successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to remove attendee');
      setShowErrorDialog(true);
    }
    setRemoveAttendeeUserId(null);
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
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
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
                icon={() => <HugeiconsIcon icon={UserAdd02Icon} size={24} color={currentColors.primary} />}
                size={24}
                onPress={() => setShowUserPicker(!showUserPicker)}
              />
            </View>

            {attendees.length === 0 ? (
              <Paragraph style={[styles.emptyText, dynamicStyles.emptyText]}>
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
                    closeIcon={() => <HugeiconsIcon icon={Delete02Icon} size={16} color={currentColors.icon} />}
                  >
                    {attendee.user?.firstName} {attendee.user?.lastName}
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
                All users are already attendees.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        {showDeleteConfirm && (
          <Card style={[styles.confirmationCard, { backgroundColor: currentColors.background.bg300, borderColor: currentColors.error }]}>
            <Card.Content>
              <Paragraph style={[styles.confirmationText, { color: currentColors.text }]}>
                Are you sure you want to delete this event?
              </Paragraph>
              <View style={styles.confirmationButtons}>
                <Button
                  mode="outlined"
                  onPress={handleDeleteCancel}
                  disabled={saving}
                  style={styles.confirmationButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleDeleteConfirm}
                  loading={saving}
                  disabled={saving}
                  style={[styles.confirmationButton, styles.deleteConfirmButton]}
                  buttonColor={currentColors.error}
                >
                  Delete
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

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
          onPress={handleDeleteClick}
          disabled={saving || showDeleteConfirm}
          style={styles.button}
          textColor={dynamicStyles.deleteButton.color}
        >
          Delete Event
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
        </Button>
      </View>

      {/* Error Dialog */}
      <CustomDialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setShowErrorDialog(false);
              if (successCallback) {
                successCallback();
                setSuccessCallback(null);
              }
            },
            style: 'default',
          },
        ]}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setShowSuccessDialog(false);
              if (successCallback) {
                successCallback();
                setSuccessCallback(null);
              }
            },
            style: 'default',
          },
        ]}
      />

      {/* Validation Dialog */}
      <CustomDialog
        visible={showValidationDialog}
        title="Validation Error"
        message={validationMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowValidationDialog(false),
            style: 'default',
          },
        ]}
      />

      {/* Remove Attendee Confirmation Dialog */}
      <CustomDialog
        visible={showRemoveAttendeeDialog}
        title="Remove Attendee"
        message="Are you sure you want to remove this attendee from the event?"
        buttons={[
          {
            text: 'Cancel',
            onPress: () => {
              setShowRemoveAttendeeDialog(false);
              setRemoveAttendeeUserId(null);
            },
            style: 'cancel',
          },
          {
            text: 'Remove',
            onPress: performRemoveAttendee,
            style: 'destructive',
          },
        ]}
      />
    </ScrollView>
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
  confirmationCard: {
    marginTop: 20,
    marginBottom: 20,
    elevation: 3,
    borderWidth: 1,
  },
  confirmationText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  confirmationButton: {
    flex: 1,
  },
  deleteConfirmButton: {
    marginLeft: 5,
  },
});

export default EditEventScreen;
