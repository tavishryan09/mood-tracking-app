import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
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
} from 'react-native-paper';
import { userManagementAPI } from '../../services/api';

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
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});

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

  const handleDeleteUser = (user: User) => {
    Alert.alert('Delete User', `Are you sure you want to delete ${user.firstName} ${user.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await userManagementAPI.deleteUser(user.id);
            Alert.alert('Success', 'User deleted successfully');
            loadUsers();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to delete user');
          }
        },
      },
    ]);
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search users..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <ScrollView style={styles.list}>
        {filteredUsers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Paragraph style={styles.emptyText}>No users found</Paragraph>
            </Card.Content>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <List.Item
              key={user.id}
              title={`${user.firstName} ${user.lastName}`}
              description={user.email}
              left={(props) => (
                <List.Icon {...props} icon={user.isActive ? 'account' : 'account-off'} />
              )}
              right={(props) => (
                <View style={styles.rightContent}>
                  <Chip
                    mode="outlined"
                    style={[styles.roleChip, { borderColor: getRoleColor(user.role) }]}
                    textStyle={{ color: getRoleColor(user.role), fontSize: 12 }}
                  >
                    {user.role}
                  </Chip>
                  <Menu
                    visible={menuVisible[user.id] || false}
                    onDismiss={() => toggleMenu(user.id)}
                    anchor={
                      <IconButton
                        {...props}
                        icon="dots-vertical"
                        onPress={() => toggleMenu(user.id)}
                      />
                    }
                  >
                    <Menu.Item
                      onPress={() => {
                        toggleMenu(user.id);
                        navigation.navigate('EditUser', { userId: user.id });
                      }}
                      title="Edit"
                      leadingIcon="pencil"
                    />
                    <Menu.Item
                      onPress={() => {
                        toggleMenu(user.id);
                        handleToggleActive(user);
                      }}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                      leadingIcon={user.isActive ? 'account-off' : 'account-check'}
                    />
                    <Menu.Item
                      onPress={() => {
                        toggleMenu(user.id);
                        handleDeleteUser(user);
                      }}
                      title="Delete"
                      leadingIcon="delete"
                    />
                  </Menu>
                </View>
              )}
              style={[styles.userItem, !user.isActive && styles.inactiveUser]}
            />
          ))
        )}
      </ScrollView>

      <FAB
        icon="account-plus"
        style={styles.fab}
        onPress={() => navigation.navigate('InviteUser')}
        label="Invite User"
      />
    </View>
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
  searchbar: {
    margin: 10,
    elevation: 2,
  },
  list: {
    flex: 1,
  },
  userItem: {
    backgroundColor: 'white',
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
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default ManageUsersScreen;
