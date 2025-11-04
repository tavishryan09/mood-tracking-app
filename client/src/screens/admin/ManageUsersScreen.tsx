import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import {
  List,
  FAB,
  Chip,
  ActivityIndicator,
  Searchbar,
  Menu,
  IconButton,
  Card,
  Paragraph,
  Button,
} from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { userManagementAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

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
      Alert.alert('Error', 'Failed to load users');
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
      Alert.alert('Success', `User ${!user.isActive ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update user');
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
      <Searchbar
        placeholder="Search users..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <ScrollView style={styles.list}>
        {filteredUsers.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: currentColors.background.bg300 }]}>
            <Card.Content>
              <Paragraph style={[styles.emptyText, { color: currentColors.textSecondary }]}>No users found</Paragraph>
            </Card.Content>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <List.Item
              key={user.id}
              title={`${user.firstName} ${user.lastName}`}
              description={user.email}
              right={(props) => (
                <View style={styles.rightContent}>
                  <Chip
                    mode="outlined"
                    style={[styles.roleChip, { borderColor: getRoleColor(user.role) }]}
                    textStyle={{ color: getRoleColor(user.role), fontSize: 12 }}
                  >
                    {user.role}
                  </Chip>
                  <IconButton
                    icon={() => <HugeiconsIcon icon={PencilEdit02Icon} size={24} color={currentColors.icon} />}
                    onPress={() => navigation.navigate('EditUser', { userId: user.id })}
                  />
                  <IconButton
                    icon="delete"
                    iconColor={currentColors.error}
                    onPress={() => handleDeleteClick(user.id)}
                  />
                </View>
              )}
              style={[
                styles.userItem,
                { backgroundColor: currentColors.background.bg300 },
                !user.isActive && styles.inactiveUser
              ]}
            />
          ))
        )}
      </ScrollView>

      <FAB
        icon="account-plus"
        style={[styles.fab, { backgroundColor: currentColors.secondary }]}
        onPress={() => navigation.navigate('InviteUser')}
        label="Invite User"
      />

      <Modal
        visible={deletingUserId !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background.bg300 }]}>
            <Paragraph style={[styles.modalTitle, { color: currentColors.text }]}>
              Delete User
            </Paragraph>
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
  searchbar: {
    margin: 10,
    elevation: 2,
  },
  list: {
    flex: 1,
  },
  userItem: {
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 1,
  },
  inactiveUser: {
    opacity: 0.6,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleChip: {
    height: 28,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
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
