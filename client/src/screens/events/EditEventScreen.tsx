import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Title, SegmentedButtons, ActivityIndicator, Card, IconButton, Chip, Paragraph, List } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { eventsAPI, usersAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';
import { EditEventScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import { validateAndSanitize } from '../../utils/sanitize';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../../utils/apiWithTimeout';

const EditEventScreen = React.memo(({ navigation, route }: EditEventScreenProps) => {
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

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const apiCalls = Promise.all([
        eventsAPI.getById(eventId),
        usersAPI.getAll(),
      ]);

      const [eventResponse, usersResponse] = await apiWithTimeout(apiCalls, TIMEOUT_DURATIONS.QUICK) as any;

      const event = eventResponse.data;
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.eventType);
      setStartDate(new Date(event.startTime));
      setEndDate(new Date(event.endTime));
      setLocation(event.location || '');
      setAttendees(event.attendees || []);
      setAllUsers(usersResponse.data);
      logger.log('Event loaded successfully', { eventId }, 'EditEventScreen');
    } catch (error: any) {
      logger.error('Error loading event:', error, 'EditEventScreen');
      setAllUsers([]);
      setAttendees([]);
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : 'Failed to load event';
      setErrorMessage(message);
      setShowErrorDialog(true);
      setSuccessCallback(() => () => navigation.goBack());
    } finally {
      setLoading(false);
    }
  }, [eventId, navigation]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleUpdate = useCallback(async () => {
    // Validate and sanitize inputs
    const { isValid, errors, sanitizedData } = validateAndSanitize(
      { title, description, location },
      {
        title: { required: true, minLength: 2, maxLength: 200 },
        description: { maxLength: 1000 },
        location: { maxLength: 200 },
      }
    );

    if (!isValid) {
      const errorMsg = Object.values(errors)[0] || 'Please check your input';
      setValidationMessage(errorMsg);
      setShowValidationDialog(true);
      logger.warn('Event update validation failed:', errors, 'EditEventScreen');
      return;
    }

    if (endDate <= startDate) {
      setValidationMessage('End time must be after start time');
      setShowValidationDialog(true);
      logger.warn('Invalid date range: end time before start time', {}, 'EditEventScreen');
      return;
    }

    setSaving(true);
    try {
      await apiWithTimeout(eventsAPI.update(eventId, {
        title: sanitizedData.title,
        description: sanitizedData.description,
        eventType,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        location: sanitizedData.location,
      }), TIMEOUT_DURATIONS.STANDARD);

      logger.log('Event updated successfully', { eventId }, 'EditEventScreen');
      setSuccessMessage('Event updated successfully');
      setShowSuccessDialog(true);
      setSuccessCallback(() => () => navigation.goBack());
    } catch (error: any) {
      logger.error('Error updating event:', error, 'EditEventScreen');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : error.response?.data?.error || 'Failed to update event';
      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  }, [title, description, location, eventType, startDate, endDate, eventId, navigation]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    setSaving(true);
    try {
      await apiWithTimeout(eventsAPI.delete(eventId), TIMEOUT_DURATIONS.STANDARD);
      logger.log('Event deleted successfully', { eventId }, 'EditEventScreen');
      setSuccessMessage('Event deleted successfully');
      setShowSuccessDialog(true);
      setSuccessCallback(() => () => navigation.goBack());
    } catch (error: any) {
      logger.error('Error deleting event:', error, 'EditEventScreen');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : error.response?.data?.error || 'Failed to delete event';
      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  }, [eventId, navigation]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleAddAttendee = useCallback(async (userId: string) => {
    try {
      await apiWithTimeout(eventsAPI.addAttendee(eventId, { userId }), TIMEOUT_DURATIONS.STANDARD);
      logger.log('Attendee added successfully', { eventId, userId }, 'EditEventScreen');
      setShowUserPicker(false);
      await loadEvent();
      setSuccessMessage('Attendee added successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      logger.error('Error adding attendee:', error, 'EditEventScreen');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : error.response?.data?.error || 'Failed to add attendee';
      setErrorMessage(message);
      setShowErrorDialog(true);
    }
  }, [eventId, loadEvent]);

  const handleRemoveAttendee = useCallback((userId: string) => {
    setRemoveAttendeeUserId(userId);
    setShowRemoveAttendeeDialog(true);
  }, []);

  const performRemoveAttendee = useCallback(async () => {
    if (!removeAttendeeUserId) return;
    setShowRemoveAttendeeDialog(false);
    try {
      await apiWithTimeout(eventsAPI.removeAttendee(eventId, removeAttendeeUserId), TIMEOUT_DURATIONS.STANDARD);
      logger.log('Attendee removed successfully', { eventId, userId: removeAttendeeUserId }, 'EditEventScreen');
      await loadEvent();
      setSuccessMessage('Attendee removed successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      logger.error('Error removing attendee:', error, 'EditEventScreen');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : error.response?.data?.error || 'Failed to remove attendee';
      setErrorMessage(message);
      setShowErrorDialog(true);
    }
    setRemoveAttendeeUserId(null);
  }, [removeAttendeeUserId, eventId, loadEvent]);

  // Get users that are not already attendees - memoized to prevent recalculation
  const availableUsers = useMemo(() =>
    allUsers.filter((user) => !attendees.some((attendee) => attendee.userId === user.id)),
    [allUsers, attendees]
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
});

EditEventScreen.displayName = 'EditEventScreen';

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
