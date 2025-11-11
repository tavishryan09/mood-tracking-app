import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Title, SegmentedButtons, Menu, Divider, Card, IconButton, Chip, Paragraph, List } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { projectsAPI, clientsAPI, usersAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';

const CreateProjectScreen = ({ navigation }: any) => {
  const { currentColors } = useTheme();
  const [clients, setClients] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectValue, setProjectValue] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Team members state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const apiCalls = Promise.all([
        clientsAPI.getAll(),
        usersAPI.getAll(),
      ]);

      const [clientsResponse, usersResponse] = await Promise.race([apiCalls, timeout]) as any;
      setClients(clientsResponse.data);
      setAllUsers(usersResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty data so UI still loads
      setClients([]);
      setAllUsers([]);
    }
  };

  const handleAddMember = (userId: string) => {
    setSelectedMembers([...selectedMembers, userId]);
    setShowUserPicker(false);
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(id => id !== userId));
  };

  // Get users that are not already selected as members
  const availableUsers = allUsers.filter(
    (user) => !selectedMembers.includes(user.id)
  );

  // Get selected member objects for display
  const selectedMemberObjects = allUsers.filter((user) => selectedMembers.includes(user.id));

  const handleSubmit = async () => {
    if (!name) {
      setErrorMessage('Please enter a project name');
      setShowErrorDialog(true);
      return;
    }

    if (!selectedClient) {
      setErrorMessage('Please select a client');
      setShowErrorDialog(true);
      return;
    }

    setLoading(true);
    try {
      const projectData = {
        name,
        description,
        projectValue: projectValue ? parseFloat(projectValue) : undefined,
        clientId: selectedClient,
        status,
        memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
      };

      // Add timeout to API call
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 2000)
      );

      await Promise.race([projectsAPI.create(projectData), timeout]);

      setSuccessMessage('Project created successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Project creation error:', error);

      // Show detailed error message
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection and try again.'
        : error.response?.data?.error || 'Failed to create project';

      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title style={{ color: currentColors.text }}>Create New Project</Title>

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

        {/* Team Members Section */}
        <Card style={[styles.teamSection, { backgroundColor: currentColors.background.bg300 }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={[styles.sectionTitle, { color: currentColors.text }]}>Team Members</Title>
              <IconButton
                icon={() => <HugeiconsIcon icon={UserAdd02Icon} size={24} color={currentColors.primary} />}
                size={24}
                onPress={() => setShowUserPicker(!showUserPicker)}
              />
            </View>

            {selectedMemberObjects.length === 0 ? (
              <Paragraph style={[styles.emptyText, { color: currentColors.textTertiary }]}>
                No team members selected. Tap the + button to add team members.
              </Paragraph>
            ) : (
              <View style={styles.membersList}>
                {selectedMemberObjects.map((member) => (
                  <Chip
                    key={member.id}
                    mode="outlined"
                    style={styles.memberChip}
                    onClose={() => handleRemoveMember(member.id)}
                    closeIcon={() => <HugeiconsIcon icon={Delete02Icon} size={16} color={currentColors.icon} />}
                  >
                    {member.firstName} {member.lastName}
                  </Chip>
                ))}
              </View>
            )}

            {showUserPicker && availableUsers.length > 0 && (
              <View style={[styles.userPicker, { borderTopColor: currentColors.border }]}>
                <Title style={[styles.pickerTitle, { color: currentColors.text }]}>Add Team Member</Title>
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
              <Paragraph style={[styles.emptyText, { color: currentColors.textTertiary }]}>
                All users have been added as team members.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        <Title style={[styles.sectionTitle, { color: currentColors.text }]}>Select Client *</Title>
        {clients.length === 0 ? (
          <View>
            <Button
              mode="outlined"
              icon="alert-circle"
              onPress={() => navigation.navigate('CreateClient')}
              style={styles.input}
            >
              No clients - Create one first
            </Button>
          </View>
        ) : (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setMenuVisible(true)}
                icon="chevron-down"
                contentStyle={styles.dropdownButton}
                style={styles.input}
              >
                {selectedClient
                  ? clients.find(c => c.id === selectedClient)?.name || 'Select a client'
                  : 'Select a client'}
              </Button>
            }
            contentStyle={[styles.menuContent, { backgroundColor: currentColors.white }]}
          >
            {clients.map((client, index) => (
              <View key={client.id}>
                <Menu.Item
                  onPress={() => {
                    setSelectedClient(client.id);
                    setMenuVisible(false);
                  }}
                  title={client.name}
                  leadingIcon={selectedClient === client.id ? 'check' : undefined}
                />
                {index < clients.length - 1 && <Divider />}
              </View>
            ))}
          </Menu>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !name || !selectedClient}
          style={styles.button}
        >
          Create Project
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
        </Button>
      </View>

      <CustomDialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
        buttons={[
          {
            label: 'OK',
            onPress: () => setShowErrorDialog(false),
            style: 'default',
          },
        ]}
        onDismiss={() => setShowErrorDialog(false)}
      />

      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        buttons={[
          {
            label: 'OK',
            onPress: () => {
              setShowSuccessDialog(false);
              navigation.goBack();
            },
            style: 'default',
          },
        ]}
        onDismiss={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
      />
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
  sectionTitle: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
  dropdownButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  menuContent: {
    maxHeight: 300,
    backgroundColor: 'white',
  },
  teamSection: {
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

export default CreateProjectScreen;
