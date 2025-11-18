import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity, FlatList, Text } from 'react-native';
import { TextInput, Button, Title, List, ActivityIndicator, Card, Paragraph, Switch } from 'react-native-paper';
import { projectsAPI, clientsAPI, usersAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';
import { EditProjectScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import { validateAndSanitize } from '../../utils/sanitize';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../../utils/apiWithTimeout';

const EditProjectScreen = React.memo(({ route, navigation }: EditProjectScreenProps) => {
  const { projectId } = route.params;
  const { currentColors } = useTheme();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectValue, setProjectValue] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [clientInput, setClientInput] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDialogTitle, setErrorDialogTitle] = useState('Error');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('Confirm');

  // Billing rate state
  const [useStandardRate, setUseStandardRate] = useState(true);
  const [standardHourlyRate, setStandardHourlyRate] = useState('');

  // Team members state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [originalTeamMembers, setOriginalTeamMembers] = useState<any[]>([]); // Track original state for comparison
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [memberRates, setMemberRates] = useState<{ [key: string]: string }>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const apiCalls = Promise.all([
        projectsAPI.getById(projectId),
        clientsAPI.getAll(),
        usersAPI.getAll(),
      ]);

      const [projectResponse, clientsResponse, usersResponse] = await apiWithTimeout(apiCalls, TIMEOUT_DURATIONS.QUICK) as any;

      const project = projectResponse.data;
      setName(project.name);
      setDescription(project.description || '');
      setProjectValue(project.projectValue?.toString() || '');
      setSelectedClient(project.clientId);

      // Set client input to the current client's name
      const currentClient = clientsResponse.data.find((c: any) => c.id === project.clientId);
      setClientInput(currentClient?.name || '');

      setStatus(project.status);
      setUseStandardRate(project.useStandardRate !== false);
      setStandardHourlyRate(project.standardHourlyRate?.toString() || '');
      setTeamMembers(project.members || []);
      setOriginalTeamMembers(project.members || []); // Store original for comparison on save

      // Load existing member rates
      const rates: { [key: string]: string } = {};
      (project.members || []).forEach((member: any) => {
        if (member.customHourlyRate) {
          rates[member.userId] = member.customHourlyRate.toString();
        }
      });
      setMemberRates(rates);

      setClients(clientsResponse.data);
      setAllUsers(usersResponse.data);
    } catch (error) {
      logger.error('Error loading project:', error, 'EditProjectScreen');
      // Set empty data so UI still loads
      setClients([]);
      setAllUsers([]);
      setTeamMembers([]);
      setErrorDialogTitle('Error');
      setErrorMessage('Failed to load project. You may be offline.');
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoize filtered clients calculation
  const handleClientInputChange = useCallback((text: string) => {
    setClientInput(text);

    // Filter clients based on input
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredClients(filtered);
    setShowClientSuggestions(true);
  }, [clients]);

  const handleSelectClient = useCallback((client: any) => {
    setSelectedClient(client.id);
    setClientInput(client.name);
    setShowClientSuggestions(false);
  }, []);

  const handleCreateClient = useCallback(async (clientName: string) => {
    try {
      const response = await apiWithTimeout(clientsAPI.create({ name: clientName }), TIMEOUT_DURATIONS.STANDARD) as any;
      const newClient = response.data;

      setSelectedClient(newClient.id);
      setClientInput(newClient.name);
      setShowClientSuggestions(false);

      // Reload clients
      const clientsResponse = await apiWithTimeout(clientsAPI.getAll(), TIMEOUT_DURATIONS.QUICK) as any;
      setClients(clientsResponse.data);
    } catch (error) {
      logger.error('Error creating client:', error, 'EditProjectScreen');
      setErrorDialogTitle('Error');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : 'Failed to create client. Please try again.';
      setErrorMessage(message);
      setShowErrorDialog(true);
    }
  }, []);

  const handleUpdate = useCallback(async () => {
    // Validate and sanitize form data
    const { isValid, errors, sanitizedData } = validateAndSanitize(
      { name, description, projectValue, standardHourlyRate },
      {
        name: { required: true, minLength: 2, maxLength: 200 },
        description: { maxLength: 1000 },
        projectValue: { pattern: /^\d+(\.\d{1,2})?$/ },
        standardHourlyRate: { pattern: /^\d+(\.\d{1,2})?$/ },
      }
    );

    if (!isValid) {
      const errorMsg = Object.values(errors)[0] || 'Please check your input';
      setErrorDialogTitle('Validation Error');
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
      logger.warn('Validation failed:', errors, 'EditProjectScreen');
      return;
    }

    if (!selectedClient) {
      setErrorDialogTitle('Error');
      setErrorMessage('Please select a client');
      setShowErrorDialog(true);
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
        setErrorDialogTitle('Missing Hourly Rates');
        setErrorMessage(`Please enter hourly rates for the following team members:\n${missingNames}`);
        setShowErrorDialog(true);
        return;
      }
    }

    setSaving(true);
    try {
      await apiWithTimeout(projectsAPI.update(projectId, {
        name: sanitizedData.name,
        description: sanitizedData.description,
        projectValue: sanitizedData.projectValue ? parseFloat(sanitizedData.projectValue) : null,
        clientId: selectedClient,
        status,
        useStandardRate,
        standardHourlyRate: sanitizedData.standardHourlyRate ? parseFloat(sanitizedData.standardHourlyRate) : null,
      }), TIMEOUT_DURATIONS.STANDARD);

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

      // Remove members
      for (const userId of membersToRemove) {
        await projectsAPI.removeMember(projectId, userId);
      }

      // Update member rates if not using standard rate
      if (!useStandardRate) {
        const memberUpdateCalls = Promise.all(
          teamMembers.map(async (member) => {
            const rate = memberRates[member.userId];
            if (rate) {
              await projectsAPI.updateMember(projectId, member.userId, {
                customHourlyRate: parseFloat(rate),
              });
            }
          })
        );
        await apiWithTimeout(memberUpdateCalls, TIMEOUT_DURATIONS.LONG);
      }

      logger.log('Project updated successfully', { projectId, projectName: sanitizedData.name }, 'EditProjectScreen');
      setSuccessMessage('Project updated successfully');
      setShowSuccessDialog(true);
      setTimeout(() => navigation.goBack(), 500);
    } catch (error: any) {
      logger.error('Failed to update project', error, 'EditProjectScreen');
      setErrorDialogTitle('Error');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection and try again.'
        : error.response?.data?.error || 'Failed to update project';
      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  }, [name, description, projectValue, standardHourlyRate, selectedClient, status, useStandardRate, teamMembers, memberRates, originalTeamMembers, projectId, navigation]);

  const handleAddMember = useCallback((userId: string) => {
    // Find the user to add
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    // Check if user is already in team
    if (teamMembers.some(m => m.userId === userId)) {
      setErrorDialogTitle('Error');
      setErrorMessage('This user is already a team member');
      setShowErrorDialog(true);
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
  }, [allUsers, teamMembers, useStandardRate]);

  const handleRemoveMember = (memberId: string) => {
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
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setSaving(true);
    try {
      await projectsAPI.delete(projectId);
      setShowDeleteConfirm(false);
      navigation.goBack();
    } catch (error: any) {
      logger.error('Delete project error:', error, 'EditProjectScreen');
      setSaving(false);
      setShowDeleteConfirm(false);
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
        <Title style={{ color: currentColors.text }}>Edit Project</Title>

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

        <TextInput
          label="Project Value ($)"
          value={projectValue}
          onChangeText={setProjectValue}
          mode="outlined"
          keyboardType="decimal-pad"
          placeholder="Enter project value"
          style={styles.input}
        />

        <Title style={[styles.sectionTitle, { color: currentColors.text }]}>Select Client *</Title>
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
            <View style={[styles.suggestionsContainer, { backgroundColor: currentColors.background.bg300, borderColor: currentColors.primary }]}>
              <FlatList
                data={filteredClients}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.suggestionItem, { backgroundColor: currentColors.background.bg300, borderBottomColor: currentColors.border }]}
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
                      style={[styles.suggestionItem, { backgroundColor: currentColors.background.bg300, borderBottomColor: currentColors.border }]}
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
        <Card style={[styles.billingSection, { backgroundColor: currentColors.background.bg300 }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: currentColors.text }]}>Billing Rate</Title>

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
        <Card style={[styles.teamSection, { backgroundColor: currentColors.background.bg300 }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: currentColors.text }]}>Team Members</Title>

            {allUsers.length === 0 ? (
              <Paragraph style={[styles.emptyText, { color: currentColors.textTertiary }]}>
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
                          { backgroundColor: currentColors.background.bg300 },
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

        <Button
          mode="contained"
          onPress={handleUpdate}
          loading={saving}
          disabled={saving || !name || !selectedClient || showDeleteConfirm}
          style={styles.button}
        >
          Update Project
        </Button>

        {!showDeleteConfirm && (
          <Button
            mode="contained"
            onPress={handleDeleteClick}
            loading={saving}
            disabled={saving}
            style={[styles.button, styles.deleteButton]}
            buttonColor={currentColors.error}
          >
            Delete Project
          </Button>
        )}

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
          disabled={saving || showDeleteConfirm}
        >
          Cancel
        </Button>

        {/* Error Dialog */}
        <CustomDialog
          visible={showErrorDialog}
          title={errorDialogTitle}
          message={errorMessage}
          buttons={[
            {
              text: 'OK',
              label: 'OK',
              onPress: () => setShowErrorDialog(false),
              style: 'default',
            },
          ]}
          onDismiss={() => setShowErrorDialog(false)}
        />

        {/* Success Dialog */}
        <CustomDialog
          visible={showSuccessDialog}
          title="Success"
          message={successMessage}
          buttons={[
            {
              text: 'OK',
              label: 'OK',
              onPress: () => setShowSuccessDialog(false),
              style: 'default',
            },
          ]}
          onDismiss={() => setShowSuccessDialog(false)}
        />

        {/* Confirmation Dialog */}
        <CustomDialog
          visible={showConfirmationDialog}
          title={confirmationTitle}
          message={confirmationMessage}
          buttons={[
            {
              text: 'Cancel',
              label: 'Cancel',
              onPress: () => setShowConfirmationDialog(false),
              style: 'cancel',
            },
            {
              text: 'Remove',
              label: 'Remove',
              onPress: () => {
                setShowConfirmationDialog(false);
                if (confirmationAction) {
                  confirmationAction();
                }
              },
              style: 'destructive',
            },
          ]}
          onDismiss={() => setShowConfirmationDialog(false)}
        />
      </View>
    </ScrollView>
  );
});

EditProjectScreen.displayName = 'EditProjectScreen';

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
    borderRadius: 10,
  },
  teamSection: {
    marginTop: 15,
    marginBottom: 20,
    elevation: 2,
    borderRadius: 10,
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

export default EditProjectScreen;
