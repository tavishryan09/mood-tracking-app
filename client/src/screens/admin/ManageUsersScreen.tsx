import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, TextInput, Text } from 'react-native';
import {
  FAB,
  Chip,
  ActivityIndicator,
  Card,
  Paragraph,
  Button,
} from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { userManagementAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  isActive: boolean;
  defaultHourlyRate?: number;
  createdAt: string;
}

const ManageUsersScreen = ({ navigation }: any) => {
  const { currentColors } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogButtons, setDialogButtons] = useState<any[]>([]);

  // DEBUG: Log to verify new code is loading

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userManagementAPI.getAllUsers();
      setUsers(response.data);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setDialogTitle('Error');
      setDialogMessage('Failed to load users');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const toggleMenu = (userId: string) => {
    setMenuVisible((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '#d32f2f';
      case 'MANAGER':
        return '#1976d2';
      default:
        return '#388e3c';
    }
  };

  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUserId) return;

    try {
      await userManagementAPI.deleteUser(deletingUserId);
      setDeletingUserId(null);
      loadUsers();
    } catch (error: any) {
      console.error('Delete user error:', error);
      setDeletingUserId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingUserId(null);
  };

  const handleToggleActive = async (user: User) => {
    try {
      await userManagementAPI.updateUser(user.id, {
        isActive: !user.isActive,
      });
      setDialogTitle('Success');
      setDialogMessage(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`);
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
      loadUsers();
    } catch (error: any) {
      setDialogTitle('Error');
      setDialogMessage(error.response?.data?.error || 'Failed to update user');
      setDialogButtons([{ text: 'OK', onPress: () => {} }]);
      setDialogVisible(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: currentColors.background.bg700 }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      {/* DEBUG BANNER - REMOVE THIS WHEN CONFIRMED */}
      <View style={{ backgroundColor: '#FF0000', padding: 20, alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>
          ✓ NEW CODE LOADED - TEXT LABELS ACTIVE
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 14, marginTop: 5 }}>
          If you see this banner, the latest code is running
        </Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: currentColors.background.bg300 }]}>
        <HugeiconsIcon icon={Search01Icon} size={20} color={currentColors.icon} />
        <TextInput
          placeholder="Search users..."
          placeholderTextColor={currentColors.textSecondary}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchInput, { color: currentColors.text }]}
        />
      </View>

      <ScrollView style={styles.list}>
        {filteredUsers.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: currentColors.background.bg300 }]}>
            <Card.Content>
              <Paragraph style={[styles.emptyText, { color: currentColors.textSecondary }]}>No users found</Paragraph>
            </Card.Content>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <View
              key={user.id}
              style={[
                styles.userItem,
                { backgroundColor: currentColors.background.bg300 },
                !user.isActive && styles.inactiveUser
              ]}
            >
              <View style={styles.userInfo}>
                <Paragraph style={[styles.userName, { color: currentColors.text }]}>
                  {`${user.firstName} ${user.lastName}`}
                </Paragraph>
                <Paragraph style={[styles.userEmail, { color: currentColors.textSecondary }]}>
                  {user.email}
                </Paragraph>
              </View>
              <View style={styles.rightContent}>
                <Chip
                  mode="outlined"
                  style={[styles.roleChip, { borderColor: getRoleColor(user.role) }]}
                  textStyle={{ color: getRoleColor(user.role), fontSize: 12 }}
                >
                  {user.role}
                </Chip>
                <TouchableOpacity
                  onPress={() => navigation.navigate('EditUser', { userId: user.id })}
                  style={styles.textButton}
                >
                  <Text style={[styles.buttonText, { color: currentColors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteClick(user.id)}
                  style={styles.textButton}
                >
                  <Text style={[styles.buttonText, { color: currentColors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.inviteButton, { backgroundColor: currentColors.secondary }]}
        onPress={() => navigation.navigate('InviteUser')}
      >
        <Text style={styles.inviteButtonText}>Invite User</Text>
      </TouchableOpacity>

      <Modal
        visible={deletingUserId !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background.bg300 }]}>
            <View style={styles.modalHeader}>
              <Paragraph style={[styles.modalTitle, { color: currentColors.text }]}>
                Delete User
              </Paragraph>
              <TouchableOpacity onPress={handleDeleteCancel} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: currentColors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Paragraph style={[styles.modalMessage, { color: currentColors.textSecondary }]}>
              Are you sure you want to delete {deletingUserId ? users.find(u => u.id === deletingUserId)?.firstName : ''} {deletingUserId ? users.find(u => u.id === deletingUserId)?.lastName : ''}?
            </Paragraph>
            <Paragraph style={[styles.modalWarning, { color: currentColors.error }]}>
              This action cannot be undone.
            </Paragraph>
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={handleDeleteCancel}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                buttonColor={currentColors.error}
                onPress={handleDeleteConfirm}
                style={styles.deleteButton}
              >
                Delete
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <CustomDialog
        visible={dialogVisible}
        title={dialogTitle}
        message={dialogMessage}
        buttons={dialogButtons}
        onDismiss={() => setDialogVisible(false)}
      />
    </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    outlineStyle: 'none',
  },
  list: {
    flex: 1,
  },
  userItem: {
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inactiveUser: {
    opacity: 0.6,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  textButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleChip: {
    height: 28,
  },
  inviteButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '300',
  },
  emptyCard: {
    margin: 20,
  },
  emptyText: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 0,
  },
  closeButton: {
    padding: 4,
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  modalWarning: {
    fontSize: 12,
    marginBottom: 20,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
  },
});

export default ManageUsersScreen;
