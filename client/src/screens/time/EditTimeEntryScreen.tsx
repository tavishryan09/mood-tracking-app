import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Modal, TouchableOpacity, Text } from 'react-native';
import { TextInput, Button, Title, ActivityIndicator, List, RadioButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { timeEntriesAPI, eventsAPI, projectsAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const EditTimeEntryScreen = ({ route, navigation }: any) => {
  const { entryId } = route.params;
  const { currentColors } = useTheme();
  const [entry, setEntry] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [entryId]);

  const loadData = async () => {
    try {
      // Load both the time entry and projects list
      const [entryResponse, projectsResponse] = await Promise.all([
        timeEntriesAPI.getById(entryId),
        projectsAPI.getAll(),
      ]);

      const data = entryResponse.data;
      setEntry(data);
      setSelectedProject(data.projectId || '');
      setDescription(data.description || '');
      setStartTime(new Date(data.startTime));
      if (data.endTime) {
        setEndTime(new Date(data.endTime));
      }

      const activeProjects = projectsResponse.data.filter((p: any) => p.status === 'ACTIVE');
      setProjects(activeProjects);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load time entry');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    const diff = endTime.getTime() - startTime.getTime();
    return Math.floor(diff / 1000 / 60); // minutes
  };

  const handleSave = async () => {
    if (!selectedProject) {
      Alert.alert('Error', 'Please select a project');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const durationMinutes = calculateDuration();

      // Update the time entry
      await timeEntriesAPI.update(entryId, {
        projectId: selectedProject,
        description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes,
      });

      // Create or update calendar event for this time entry
      await createCalendarEvent();

      Alert.alert('Success', 'Time entry updated');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update time entry');
    } finally {
      setSaving(false);
    }
  };

  const createCalendarEvent = async () => {
    try {
      // Find the selected project to get its name
      const project = projects.find((p) => p.id === selectedProject);
      const projectName = project?.name || 'Unknown Project';

      // Create a calendar event for the billable hours
      const eventData = {
        title: `Billable hours: ${projectName}`,
        category: 'Billable hours',
        startDate: startTime.toISOString().split('T')[0],
        startTime: startTime.toISOString().split('T')[1].substring(0, 5),
        endTime: endTime.toISOString().split('T')[1].substring(0, 5),
        description: description || `Time tracked for ${projectName}`,
        color: currentColors.success, // Green color for billable hours
      };

      await eventsAPI.create(eventData);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      // Don't fail the whole operation if calendar event creation fails
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setSaving(true);
    try {
      await timeEntriesAPI.delete(entryId);
      Alert.alert('Success', 'Time entry deleted');
      setShowDeleteConfirm(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete time entry');
      setShowDeleteConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: currentColors.background.bg700 }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title style={{ color: currentColors.text }}>Edit Time Entry</Title>

        <Title style={[styles.label, { color: currentColors.text }]}>Project *</Title>
        <Button
          mode="outlined"
          onPress={() => setShowProjectPicker(!showProjectPicker)}
          style={styles.input}
          icon={() => <HugeiconsIcon icon={PencilEdit02Icon} size={18} color={currentColors.primary} />}
        >
          {projects.find((p) => p.id === selectedProject)?.name || 'Select Project'}
        </Button>

        {showProjectPicker && (
          <RadioButton.Group onValueChange={setSelectedProject} value={selectedProject}>
            {projects.map((project) => (
              <List.Item
                key={project.id}
                title={project.name}
                description={project.client?.name}
                left={(props) => (
                  <RadioButton.Android
                    {...props}
                    value={project.id}
                    status={selectedProject === project.id ? 'checked' : 'unchecked'}
                  />
                )}
                onPress={() => {
                  setSelectedProject(project.id);
                  setShowProjectPicker(false);
                }}
              />
            ))}
          </RadioButton.Group>
        )}

        <Title style={[styles.label, { color: currentColors.text }]}>Start Time</Title>
        {Platform.OS === 'web' ? (
          <View style={styles.webDateInput}>
            <input
              type="datetime-local"
              value={startTime.toISOString().slice(0, 16)}
              onChange={(e) => {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) {
                  setStartTime(date);
                }
              }}
              style={{
                width: '100%',
                padding: '16px 12px',
                fontSize: '16px',
                border: '1px solid rgba(0, 0, 0, 0.23)',
                borderRadius: '4px',
                backgroundColor: currentColors.background.bg300,
                color: currentColors.text,
                fontFamily: 'Josefin Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </View>
        ) : (
          <>
            <Button
              mode="outlined"
              onPress={() => setShowStartPicker(true)}
              style={styles.input}
            >
              {startTime.toLocaleString()}
            </Button>
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) setStartTime(date);
                }}
              />
            )}
          </>
        )}

        <Title style={[styles.label, { color: currentColors.text }]}>End Time</Title>
        {Platform.OS === 'web' ? (
          <View style={styles.webDateInput}>
            <input
              type="datetime-local"
              value={endTime.toISOString().slice(0, 16)}
              onChange={(e) => {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) {
                  setEndTime(date);
                }
              }}
              style={{
                width: '100%',
                padding: '16px 12px',
                fontSize: '16px',
                border: '1px solid rgba(0, 0, 0, 0.23)',
                borderRadius: '4px',
                backgroundColor: currentColors.background.bg300,
                color: currentColors.text,
                fontFamily: 'Josefin Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </View>
        ) : (
          <>
            <Button
              mode="outlined"
              onPress={() => setShowEndPicker(true)}
              style={styles.input}
            >
              {endTime.toLocaleString()}
            </Button>
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) setEndTime(date);
                }}
              />
            )}
          </>
        )}

        <Title style={[styles.label, { color: currentColors.text }]}>Duration</Title>
        <TextInput
          value={`${Math.floor(calculateDuration() / 60)}h ${calculateDuration() % 60}m`}
          mode="outlined"
          disabled
          style={styles.input}
        />

        <TextInput
          label="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          placeholder="What did you work on?"
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.button}
        >
          Save Changes
        </Button>

        <Button
          mode="outlined"
          onPress={handleDeleteClick}
          style={[styles.button, styles.deleteButton, { borderColor: currentColors.error }]}
          textColor={currentColors.error}
          disabled={saving}
        >
          Delete Entry
        </Button>

        <Button mode="text" onPress={() => navigation.goBack()} style={styles.button} disabled={saving}>
          Cancel
        </Button>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <View style={styles.confirmationOverlay}>
          <View style={[styles.confirmationBox, { backgroundColor: currentColors.background.bg300 }]}>
            <Title style={[styles.confirmationTitle, { color: currentColors.text }]}>Delete Time Entry</Title>
            <Text style={[styles.confirmationMessage, { color: currentColors.text }]}>
              Are you sure you want to delete this time entry?
            </Text>
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
          </View>
        </View>
      </Modal>
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
  label: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    marginBottom: 10,
  },
  webDateInput: {
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
  deleteButton: {
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmationBox: {
    borderRadius: 12,
    padding: 24,
    minWidth: '80%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  confirmationMessage: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmationButton: {
    flex: 1,
    minWidth: 100,
  },
  deleteConfirmButton: {
    marginLeft: 8,
  },
});

export default EditTimeEntryScreen;
