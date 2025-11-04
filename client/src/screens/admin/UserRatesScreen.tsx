import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, TextInput, Button, ActivityIndicator, Card, Title, Paragraph, IconButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Edit02Icon } from '@hugeicons/core-free-icons';
import { usersAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const UserRatesScreen = ({ navigation }: any) => {
  const { currentColors } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRate = (userId: string, currentRate: string) => {
    setEditingUserId(userId);
    setEditRate(currentRate || '');
  };

  const handleSaveRate = async (userId: string) => {
    try {
      const rate = editRate ? parseFloat(editRate) : null;

      if (editRate && isNaN(rate as number)) {
        Alert.alert('Error', 'Please enter a valid number');
        return;
      }

      await usersAPI.updateRate(userId, { defaultHourlyRate: rate });

      // Update local state
      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, defaultHourlyRate: rate }
          : u
      ));

      setEditingUserId(null);
      setEditRate('');
      Alert.alert('Success', 'User rate updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update user rate');
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditRate('');
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
        <Card style={[styles.infoCard, { backgroundColor: currentColors.background.bg300 }]}>
          <Card.Content>
            <Title style={{ color: currentColors.text }}>Manage User Rates</Title>
            <Paragraph style={[styles.infoText, { color: currentColors.textSecondary }]}>
              Set default hourly billable rates for each user. These rates will be used as defaults when creating projects.
            </Paragraph>
          </Card.Content>
        </Card>

        {users.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: currentColors.background.bg300 }]}>
            <Card.Content>
              <Paragraph style={[styles.emptyText, { color: currentColors.textTertiary }]}>No users found</Paragraph>
            </Card.Content>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id} style={[styles.userCard, { backgroundColor: currentColors.background.bg300 }]}>
              <Card.Content>
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <Title style={[styles.userName, { color: currentColors.text }]}>
                      {user.firstName} {user.lastName}
                    </Title>
                    <Paragraph style={[styles.userEmail, { color: currentColors.textSecondary }]}>{user.email}</Paragraph>
                  </View>
                  {editingUserId !== user.id && (
                    <IconButton
                      icon={() => <HugeiconsIcon icon={Edit02Icon} size={20} color={currentColors.primary} />}
                      size={20}
                      onPress={() => handleEditRate(user.id, user.defaultHourlyRate?.toString())}
                    />
                  )}
                </View>

                {editingUserId === user.id ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      label="Default Hourly Rate ($)"
                      value={editRate}
                      onChangeText={setEditRate}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.rateInput}
                      placeholder="e.g., 150.00"
                    />
                    <View style={styles.editButtons}>
                      <Button
                        mode="contained"
                        onPress={() => handleSaveRate(user.id)}
                        style={styles.saveButton}
                      >
                        Save
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={handleCancelEdit}
                        style={styles.cancelButton}
                      >
                        Cancel
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View style={styles.rateDisplay}>
                    <Paragraph style={[styles.rateLabel, { color: currentColors.textSecondary }]}>Current Rate:</Paragraph>
                    <Paragraph style={[styles.rateValue, { color: currentColors.primary }]}>
                      {user.defaultHourlyRate
                        ? `$${parseFloat(user.defaultHourlyRate).toFixed(2)}/hr`
                        : 'Not set'}
                    </Paragraph>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </View>
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
  infoCard: {
    marginBottom: 20,
    elevation: 2,
  },
  infoText: {
    marginTop: 10,
  },
  emptyCard: {
    marginTop: 20,
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  userCard: {
    marginBottom: 15,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
  },
  rateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  rateLabel: {
    fontSize: 14,
    marginRight: 10,
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  editContainer: {
    marginTop: 10,
  },
  rateInput: {
    marginBottom: 10,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
});

export default UserRatesScreen;
