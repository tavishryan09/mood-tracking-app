import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity, FlatList, Text, Modal, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Button, Title, List, ActivityIndicator, Card, Paragraph, Switch, IconButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { projectsAPI, clientsAPI, usersAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { CustomDialog } from './CustomDialog';

interface EditProjectModalProps {
  visible: boolean;
  projectId: string | null;
  onDismiss: () => void;
  onSuccess: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  visible,
  projectId,
  onDismiss,
  onSuccess,
}) => {
  const { currentColors } = useTheme();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectValue, setProjectValue] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [clientInput, setClientInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Billing rate state
  const [useStandardRate, setUseStandardRate] = useState(true);
  const [standardHourlyRate, setStandardHourlyRate] = useState('');

  // Team members state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [originalTeamMembers, setOriginalTeamMembers] = useState<any[]>([]); // Track original state for comparison
  const [memberRates, setMemberRates] = useState<{ [key: string]: string }>({});

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogButtons, setDialogButtons] = useState<any[]>([]);

  useEffect(() => {
    if (visible && projectId) {
      loadData();
    }
  }, [visible, projectId]);

  // Auto-populate member rates when switching to individual rates
  useEffect(() => {
    if (!useStandardRate && teamMembers.length > 0 && allUsers.length > 0) {
      const newRates: { [key: string]: string } = { ...memberRates };
      let hasChanges = false;

      teamMembers.forEach((member) => {
        // Only autofill if the member doesn't already have a rate
        if (!newRates[member.userId] || newRates[member.userId].trim() === '') {
          const user = allUsers.find(u => u.id === member.userId);
          if (user?.defaultHourlyRate) {
            newRates[member.userId] = user.defaultHourlyRate.toString();
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setMemberRates(newRates);
      }
    }
  }, [useStandardRate, teamMembers, allUsers]);

  const loadData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);

      const [projectResponse, clientsResponse, usersResponse] = await Promise.all([
        projectsAPI.getById(projectId),
        clientsAPI.getAll(),
        usersAPI.getAll(),
      ]);

      const project = projectResponse.data;
      setName(project.name);
      setDescription(project.description || '');
      setProjectValue(project.projectValue?.toString() || '');
      setSelectedClient(project.clientId);

      // Set client input to the current client's name
      const currentClient = clientsResponse.data.find((c: any) => c.id === project.clientId);
      setClientInput(currentClient?.name || '');

      setUseStandardRate(project.useStandardRate !== false);
      setStandardHourlyRate(project.standardHourlyRate?.toString() || '');
      setTeamMembers(project.members || []);
      setOriginalTeamMembers(project.members || []); // Store original for comparison on save

      // Load existing member rates
      const rates: { [key: string]: string } = {};
      (project.members || []).forEach((member: any) => {
        if (member.customHourlyRate) {
          rates[member.userId] = member.customHourlyRate.toString();
        } else if (!project.useStandardRate && member.user?.defaultHourlyRate) {
          // Auto-populate with user's default rate if project uses individual rates
          rates[member.userId] = member.user.defaultHourlyRate.toString();
        }
      });
      setMemberRates(rates);

      setClients(clientsResponse.data);
      setAllUsers(usersResponse.data);
    } catch (error) {
      console.error('Error loading project:', error);
      setClients([]);
      setAllUsers([]);
      setTeamMembers([]);
      setDialogTitle('Error');
      setDialogMessage('Failed to load project. You may be offline.');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClientInputChange = (text: string) => {
    setClientInput(text);

    // Filter clients based on input
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredClients(filtered);
    setShowClientSuggestions(true);
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client.id);
    setClientInput(client.name);
    setShowClientSuggestions(false);
  };

  const handleCreateClient = async (clientName: string) => {
    try {
      const response = await clientsAPI.create({ name: clientName });
      const newClient = response.data;

      setSelectedClient(newClient.id);
      setClientInput(newClient.name);
      setShowClientSuggestions(false);

      // Reload clients
      const clientsResponse = await clientsAPI.getAll();
      setClients(clientsResponse.data);
    } catch (error) {
      console.error('Error creating client:', error);
      setDialogTitle('Error');
      setDialogMessage('Failed to create client. Please try again.');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
    }
  };

  const handleUpdate = async () => {
    if (!projectId) return;

    if (!name) {
      setDialogTitle('Error');
      setDialogMessage('Please enter a project name');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
      return;
    }

    if (!selectedClient) {
      setDialogTitle('Error');
      setDialogMessage('Please select a client');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
      return;
    }

    // Validate that all team members have rates when not using standard rate
    if (!useStandardRate && teamMembers.length > 0) {
      const membersWithoutRates = teamMembers.filter(
        (member) => !memberRates[member.userId] || memberRates[member.userId].trim() === ''
      );

      if (membersWithoutRates.length > 0) {
        const missingNames = membersWithoutRates
          .map((member) => `${member.user.firstName} ${member.user.lastName}`)
          .join(', ');
        setDialogTitle('Missing Hourly Rates');
        setDialogMessage(`Please enter hourly rates for the following team members:\n${missingNames}`);
        setDialogButtons([{ text: 'OK', onPress: () => {} }]);
        setDialogVisible(true);
        return;
      }
    }

    setSaving(true);
    try {
      await projectsAPI.update(projectId, {
        name,
        description,
        projectValue: projectValue ? parseFloat(projectValue) : null,
        clientId: selectedClient,
        useStandardRate,
        standardHourlyRate: standardHourlyRate ? parseFloat(standardHourlyRate) : null,
      });

      // Sync team member changes (additions and removals)
      const originalMemberIds = originalTeamMembers.map(m => m.userId);
      const currentMemberIds = teamMembers.map(m => m.userId);

      // Find members to add (in current but not in original)
      const membersToAdd = currentMemberIds.filter(id => !originalMemberIds.includes(id));

      // Find members to remove (in original but not in current)
      const membersToRemove = originalMemberIds.filter(id => !currentMemberIds.includes(id));

      // Add new members
      for (const userId of membersToAdd) {
        await projectsAPI.addMember(projectId, { userId });
      }

      // Remove members (with error handling for members that don't exist)
      for (const userId of membersToRemove) {
        try {
          // Find the ProjectMember ID (not the userId) from the original members
          const memberToRemove = originalTeamMembers.find(m => m.userId === userId);
          if (memberToRemove?.id) {
            await projectsAPI.removeMember(projectId, memberToRemove.id);
          }
        } catch (error: any) {
          // Ignore 404 errors (member already removed or doesn't exist)
          if (error.response?.status !== 404) {
            throw error; // Re-throw other errors
          }
        }
      }

      // Update member rates if not using standard rate
      // Only update rates for members who are NOT newly added (to avoid race conditions)
      if (!useStandardRate) {
        // Filter to only update existing members (not newly added ones)
        const existingMemberIds = teamMembers
          .map(m => m.userId)
          .filter(id => !membersToAdd.includes(id));

        await Promise.all(
          existingMemberIds.map(async (userId) => {
            const rate = memberRates[userId];
            if (rate) {
              await projectsAPI.updateMember(projectId, userId, {
                customHourlyRate: parseFloat(rate),
              });
            }
          })
        );
      }

      setDialogTitle('Success');
      setDialogMessage('Project updated successfully');
      setDialogButtons([{ text: 'OK', onPress: () => {
        onSuccess();
        onDismiss();
      } }]);
      setDialogVisible(true);
    } catch (error: any) {
      setDialogTitle('Error');
      setDialogMessage(error.response?.data?.error || 'Failed to update project');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = (userId: string) => {
    if (!projectId) return;

    // Find the user to add
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    // Check if user is already in team
    if (teamMembers.some(m => m.userId === userId)) {
      setDialogTitle('Error');
      setDialogMessage('This user is already a team member');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
      return;
    }

    // Add to local team members state (will be saved when user clicks Save button)
    setTeamMembers(prev => [
      ...prev,
      {
        userId: userId,
        user: user,
        customHourlyRate: null
      }
    ]);

    // If using individual rates, auto-populate the user's default hourly rate
    if (!useStandardRate && user.defaultHourlyRate) {
      setMemberRates(prev => ({
        ...prev,
        [userId]: user.defaultHourlyRate.toString()
      }));
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!projectId) return;

    // Remove from local team members state (will be saved when user clicks Save button)
    setTeamMembers(prev => prev.filter(m => m.userId !== memberId));

    // Also remove from member rates
    setMemberRates(prev => {
      const updated = { ...prev };
      delete updated[memberId];
      return updated;
    });
  };

  const handleDeleteClick = () => {
    if (!projectId) return;
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectId) return;

    setSaving(true);
    try {
      await projectsAPI.delete(projectId);
      setShowDeleteConfirm(false);
      setDialogTitle('Success');
      setDialogMessage('Project deleted successfully');
      setDialogButtons([{
        text: 'OK',
        onPress: () => {
          onSuccess();
          onDismiss();
        }
      }]);
      setDialogVisible(true);
    } catch (error: any) {
      console.error('Delete project error:', error);
      setSaving(false);
      setShowDeleteConfirm(false);
      setDialogTitle('Error');
      setDialogMessage(error.response?.data?.error || 'Failed to delete project. Please try again.');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContainer,
                  { backgroundColor: currentColors.background.bg700 }
                ]}
              >
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={{ paddingBottom: 0 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                >
                  <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 10, elevation: 0, borderWidth: 0 }}>
                    <Card.Content style={{ paddingBottom: 0 }}>
                <View style={styles.modalHeader}>
                  <Title style={{ color: currentColors.text, flex: 1 }}>Edit Project</Title>
                  <IconButton
                    icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
                    onPress={onDismiss}
                  />
                </View>

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                  </View>
                ) : (
                  <>
                    <TextInput
                      label="Project Name *"
                      value={name}
                      onChangeText={setName}
                      mode="outlined"
                      style={styles.input}
                    />

                    <TextInput
                      label="Common Name"
                      value={description}
                      onChangeText={setDescription}
                      mode="outlined"
                      style={styles.input}
                    />

                    <TextInput
                      label="Project Value ($)"
                      value={projectValue}
                      onChangeText={setProjectValue}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      placeholder="Enter project value"
                      style={styles.input}
                    />

                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Select Client *</Text>
                    <View style={styles.clientInputContainer}>
                      <TextInput
                        label="Client"
                        value={clientInput}
                        onChangeText={handleClientInputChange}
                        mode="outlined"
                        style={styles.input}
                        onFocus={() => {
                          setFilteredClients(clients);
                          setShowClientSuggestions(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowClientSuggestions(false), 200);
                        }}
                      />
                      {showClientSuggestions && (
                        <View style={[styles.suggestionsContainer, { backgroundColor: currentColors.background.bg500, borderColor: currentColors.border }]}>
                          <FlatList
                            data={filteredClients}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={[styles.suggestionItem, { backgroundColor: currentColors.background.bg500, borderBottomColor: currentColors.border }]}
                                onPress={() => handleSelectClient(item)}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.suggestionText, { color: currentColors.text }]}>{item.name}</Text>
                                {item.company && (
                                  <Text style={[styles.suggestionSubtext, { color: currentColors.textSecondary }]}>{item.company}</Text>
                                )}
                              </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                              clientInput.trim() ? (
                                <TouchableOpacity
                                  style={[styles.suggestionItem, { backgroundColor: currentColors.background.bg500, borderBottomColor: currentColors.border }]}
                                  onPress={() => {
                                    if (clientInput.trim()) {
                                      handleCreateClient(clientInput.trim());
                                    }
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.createClientText, { color: currentColors.primary }]}>
                                    + Create "{clientInput.trim()}"
                                  </Text>
                                </TouchableOpacity>
                              ) : null
                            }
                          />
                        </View>
                      )}
                    </View>

                    {/* Billing Rate Section */}
                    <Card style={[styles.billingSection, { backgroundColor: currentColors.background.bg500, borderRadius: 10 }]}>
                      <Card.Content>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Billing Rate</Text>

                        <View style={styles.switchRow}>
                          <Paragraph style={{ color: currentColors.text }}>Use standard hourly rate for all team members</Paragraph>
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
                          <Paragraph style={[styles.helpText, { color: currentColors.textSecondary }]}>
                            Custom rates can be set per team member when adding them to the project.
                          </Paragraph>
                        )}
                      </Card.Content>
                    </Card>

                    {/* Team Members Section */}
                    <Card style={[styles.teamSection, { backgroundColor: currentColors.background.bg500, borderRadius: 10 }]}>
                      <Card.Content>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Team Members</Text>

                        {allUsers.length === 0 ? (
                          <Paragraph style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                            No team members added yet. Tap the + button to add team members.
                          </Paragraph>
                        ) : (
                          <View>
                            {allUsers.map((user) => {
                              const isMember = teamMembers.some((member) => member.userId === user.id);
                              const hasRate = memberRates[user.id] && memberRates[user.id].trim() !== '';
                              const needsRate = isMember && !useStandardRate;

                              return (
                                <View key={user.id}>
                                  <List.Item
                                    title={`${user.firstName} ${user.lastName}`}
                                    description={user.email}
                                    right={() => (
                                      <Switch
                                        value={isMember}
                                        onValueChange={(value) => {
                                          if (value) {
                                            handleAddMember(user.id);
                                          } else {
                                            handleRemoveMember(user.id);
                                          }
                                        }}
                                      />
                                    )}
                                    style={[
                                      styles.userItem,
                                      { backgroundColor: currentColors.background.bg500 },
                                      needsRate && !hasRate && { borderLeftWidth: 3, borderLeftColor: currentColors.error }
                                    ]}
                                  />
                                  {isMember && !useStandardRate && (
                                    <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                                      <TextInput
                                        label={`Hourly Rate for ${user.firstName} ($)`}
                                        value={memberRates[user.id] || ''}
                                        onChangeText={(text) => {
                                          setMemberRates({
                                            ...memberRates,
                                            [user.id]: text,
                                          });
                                        }}
                                        mode="outlined"
                                        keyboardType="decimal-pad"
                                        placeholder="Enter hourly rate"
                                        error={!hasRate}
                                        style={[styles.input, { marginBottom: 5 }]}
                                      />
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </Card.Content>
                    </Card>

                    {/* Delete Confirmation */}
                    {showDeleteConfirm && (
                      <View style={[styles.confirmContainer, { backgroundColor: currentColors.background.bg500, borderColor: currentColors.secondary }]}>
                        <Text style={[styles.confirmText, { color: currentColors.text }]}>
                          Are you sure you want to delete this project? This action cannot be undone.
                        </Text>
                        <View style={styles.confirmButtons}>
                          <Button
                            mode="outlined"
                            onPress={handleDeleteCancel}
                            disabled={saving}
                            style={styles.confirmButton}
                          >
                            Cancel
                          </Button>
                          <Button
                            mode="contained"
                            onPress={handleDeleteConfirm}
                            loading={saving}
                            disabled={saving}
                            style={styles.confirmButton}
                            buttonColor={currentColors.secondary}
                          >
                            Delete
                          </Button>
                        </View>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                      {!showDeleteConfirm && (
                        <Button
                          mode="outlined"
                          onPress={handleDeleteClick}
                          disabled={saving}
                          style={styles.deleteButton}
                          textColor={currentColors.secondary}
                        >
                          Delete
                        </Button>
                      )}

                      <View style={styles.rightButtonGroup}>
                        <Button
                          mode="outlined"
                          onPress={onDismiss}
                          style={styles.button}
                          disabled={saving || showDeleteConfirm}
                        >
                          Cancel
                        </Button>

                        <Button
                          mode="contained"
                          onPress={handleUpdate}
                          loading={saving}
                          disabled={saving || showDeleteConfirm || !name || !selectedClient}
                          style={styles.button}
                        >
                          Save
                        </Button>
                      </View>
                    </View>
                  </>
                )}
                    </Card.Content>
                  </Card>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <CustomDialog
        visible={dialogVisible}
        title={dialogTitle}
        message={dialogMessage}
        buttons={dialogButtons}
        onDismiss={() => setDialogVisible(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Platform.select({
      ios: 40,
      android: 20,
      web: 20,
    }),
    paddingHorizontal: 10,
  },
  modalContainer: {
    width: '100%',
    minWidth: 280,
    maxWidth: 800,
    maxHeight: '85%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  input: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
  },
  billingSection: {
    marginTop: 15,
    marginBottom: 15,
    elevation: 2,
  },
  teamSection: {
    marginTop: 15,
    marginBottom: 15,
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
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  userItem: {
    marginBottom: 5,
    borderRadius: 8,
  },
  clientInputContainer: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 15,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 4,
    maxHeight: 200,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  createClientText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    minWidth: 100,
  },
  rightButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    minWidth: 100,
  },
  confirmContainer: {
    padding: 16,
    marginVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  confirmText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  confirmButton: {
    minWidth: 100,
  },
});

export default EditProjectModal;
