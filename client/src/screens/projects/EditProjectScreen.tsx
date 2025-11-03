import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Title, List, RadioButton, SegmentedButtons, ActivityIndicator, Card, IconButton, Chip, Paragraph, Switch } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { projectsAPI, clientsAPI, usersAPI } from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const EditProjectScreen = ({ route, navigation }: any) => {
  const { projectId } = route.params;
  const [clients, setClients] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Billing rate state
  const [useStandardRate, setUseStandardRate] = useState(true);
  const [standardHourlyRate, setStandardHourlyRate] = useState('');

  // Due date state
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Team members state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Add timeout to prevent infinite loading
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const apiCalls = Promise.all([
        projectsAPI.getById(projectId),
        clientsAPI.getAll(),
        usersAPI.getAll(),
      ]);

      const [projectResponse, clientsResponse, usersResponse] = await Promise.race([apiCalls, timeout]) as any;

      const project = projectResponse.data;
      setName(project.name);
      setDescription(project.description || '');
      setSelectedClient(project.clientId);
      setStatus(project.status);
      setUseStandardRate(project.useStandardRate !== false);
      setStandardHourlyRate(project.standardHourlyRate?.toString() || '');
      setDueDate(project.dueDate ? new Date(project.dueDate) : null);
      setTeamMembers(project.members || []);
      setClients(clientsResponse.data);
      setAllUsers(usersResponse.data);
    } catch (error) {
      console.error('Error loading project:', error);
      // Set empty data so UI still loads
      setClients([]);
      setAllUsers([]);
      setTeamMembers([]);
      Alert.alert('Error', 'Failed to load project. You may be offline.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    setSaving(true);
    try {
      await projectsAPI.update(projectId, {
        name,
        description,
        clientId: selectedClient,
        status,
        useStandardRate,
        standardHourlyRate: standardHourlyRate ? parseFloat(standardHourlyRate) : null,
        dueDate: dueDate ? dueDate.toISOString() : null,
      });

      Alert.alert('Success', 'Project updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await projectsAPI.addMember(projectId, { userId });
      setShowUserPicker(false);
      await loadData(); // Reload to get updated members list
      Alert.alert('Success', 'Team member added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add team member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    Alert.alert(
      'Remove Team Member',
      'Are you sure you want to remove this team member from the project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsAPI.removeMember(projectId, memberId);
              await loadData(); // Reload to get updated members list
              Alert.alert('Success', 'Team member removed successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove team member');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await projectsAPI.delete(projectId);
              Alert.alert('Success', 'Project deleted successfully');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete project');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // Get users that are not already team members
  const availableUsers = allUsers.filter(
    (user) => !teamMembers.some((member) => member.userId === user.id)
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
        <Title>Edit Project</Title>

        <TextInput
          label="Project Name *"
          value={name}
          onChangeText={setName}
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

        <Title style={styles.sectionTitle}>Project Status</Title>
        <SegmentedButtons
          value={status}
          onValueChange={setStatus}
          buttons={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'ON_HOLD', label: 'On Hold' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
          style={styles.input}
        />

        <Title style={styles.sectionTitle}>Select Client *</Title>
        {clients.length === 0 ? (
          <View>
            <List.Item
              title="No clients found"
              description="Create a client first"
              left={(props) => <List.Icon {...props} icon="alert-circle" />}
            />
          </View>
        ) : (
          <RadioButton.Group onValueChange={setSelectedClient} value={selectedClient}>
            {clients.map((client) => (
              <List.Item
                key={client.id}
                title={client.name}
                description={client.company}
                left={(props) => (
                  <RadioButton.Android
                    {...props}
                    value={client.id}
                    status={selectedClient === client.id ? 'checked' : 'unchecked'}
                  />
                )}
                onPress={() => setSelectedClient(client.id)}
              />
            ))}
          </RadioButton.Group>
        )}

        {/* Billing Rate Section */}
        <Card style={styles.billingSection}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Billing Rate</Title>

            <View style={styles.switchRow}>
              <Paragraph>Use standard hourly rate for all team members</Paragraph>
              <Switch value={useStandardRate} onValueChange={setUseStandardRate} />
            </View>

            {useStandardRate && (
              <TextInput
                label="Standard Hourly Rate ($)"
                value={standardHourlyRate}
                onChangeText={setStandardHourlyRate}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="e.g., 150.00"
              />
            )}

            {!useStandardRate && (
              <Paragraph style={styles.helpText}>
                Custom rates can be set per team member when adding them to the project.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Due Date Section */}
        <Card style={styles.dueDateSection}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Project Due Date</Title>

            <View style={styles.dueDateRow}>
              {dueDate ? (
                <>
                  <Paragraph style={styles.dueDateText}>
                    Due: {dueDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Paragraph>
                  <Button
                    mode="outlined"
                    onPress={() => setShowDueDatePicker(true)}
                    style={styles.dateButton}
                  >
                    Change Date
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => setDueDate(null)}
                    style={styles.dateButton}
                  >
                    Clear
                  </Button>
                </>
              ) : (
                <Button
                  mode="outlined"
                  onPress={() => setShowDueDatePicker(true)}
                  style={styles.dateButton}
                >
                  Set Due Date
                </Button>
              )}
            </View>

            {showDueDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDueDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setDueDate(selectedDate);
                  }
                }}
              />
            )}

            {dueDate && (
              <Paragraph style={styles.helpText}>
                A deadline event will be automatically added to your calendar.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Team Members Section */}
        <Card style={styles.teamSection}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Team Members</Title>
              <IconButton
                icon={() => <HugeiconsIcon icon={UserAdd02Icon} size={24} color="#6200ee" />}
                size={24}
                onPress={() => setShowUserPicker(!showUserPicker)}
              />
            </View>

            {teamMembers.length === 0 ? (
              <Paragraph style={styles.emptyText}>
                No team members added yet. Tap the + button to add team members.
              </Paragraph>
            ) : (
              <View style={styles.membersList}>
                {teamMembers.map((member) => (
                  <Chip
                    key={member.id}
                    mode="outlined"
                    style={styles.memberChip}
                    onClose={() => handleRemoveMember(member.id)}
                    closeIcon={() => <HugeiconsIcon icon={Delete02Icon} size={16} color="#666" />}
                  >
                    {member.user?.firstName} {member.user?.lastName}
                  </Chip>
                ))}
              </View>
            )}

            {showUserPicker && availableUsers.length > 0 && (
              <View style={styles.userPicker}>
                <Title style={styles.pickerTitle}>Add Team Member</Title>
                {availableUsers.map((user) => (
                  <List.Item
                    key={user.id}
                    title={`${user.firstName} ${user.lastName}`}
                    description={user.email}
                    onPress={() => handleAddMember(user.id)}
                    left={(props) => <List.Icon {...props} icon="account-plus" />}
                  />
                ))}
              </View>
            )}

            {showUserPicker && availableUsers.length === 0 && (
              <Paragraph style={styles.emptyText}>
                All users are already team members.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleUpdate}
          loading={saving}
          disabled={saving || !name || !selectedClient}
          style={styles.button}
        >
          Update Project
        </Button>

        <Button
          mode="contained"
          onPress={handleDelete}
          loading={saving}
          disabled={saving}
          style={[styles.button, styles.deleteButton]}
          buttonColor="#FF3B30"
        >
          Delete Project
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
          disabled={saving}
        >
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
  sectionTitle: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
  deleteButton: {
    marginTop: 20,
  },
  billingSection: {
    marginTop: 20,
    marginBottom: 15,
    elevation: 2,
  },
  dueDateSection: {
    marginTop: 15,
    marginBottom: 15,
    elevation: 2,
  },
  teamSection: {
    marginTop: 15,
    marginBottom: 20,
    elevation: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  dueDateRow: {
    marginBottom: 10,
  },
  dueDateText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  dateButton: {
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
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

export default EditProjectScreen;
