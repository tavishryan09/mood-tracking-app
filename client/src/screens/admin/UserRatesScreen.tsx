import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, TextInput, Button, ActivityIndicator, Card, Title, Paragraph, IconButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Edit02Icon } from '@hugeicons/core-free-icons';
import { usersAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDialog } from '../../components/CustomDialog';
import { UserRatesScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import { validateAndSanitize } from '../../utils/sanitize';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../../utils/apiWithTimeout';

const UserRatesScreen = React.memo(({ navigation }: UserRatesScreenProps) => {
  const { currentColors } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiWithTimeout(usersAPI.getAll(), TIMEOUT_DURATIONS.QUICK) as any;
      setUsers(response.data);
      logger.log('Users loaded successfully', { count: response.data.length }, 'UserRatesScreen');
    } catch (error: any) {
      logger.error('Error loading users:', error, 'UserRatesScreen');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : 'Failed to load users';
      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEditRate = useCallback((userId: string, currentRate: string) => {
    setEditingUserId(userId);
    setEditRate(currentRate || '');
  }, []);

  const handleSaveRate = useCallback(async (userId: string) => {
    try {
      // Validate and sanitize rate input
      const { isValid, errors, sanitizedData } = validateAndSanitize(
        { defaultHourlyRate: editRate },
        {
          defaultHourlyRate: { pattern: /^\d+(\.\d{1,2})?$/ }, // Optional numeric with 2 decimals
        }
      );

      if (editRate && !isValid) {
        const errorMsg = Object.values(errors)[0] || 'Please enter a valid hourly rate';
        setErrorMessage(errorMsg);
        setShowErrorDialog(true);
        logger.warn('Rate validation failed:', errors, 'UserRatesScreen');
        return;
      }

      const rate = sanitizedData.defaultHourlyRate ? parseFloat(sanitizedData.defaultHourlyRate) : null;

      await apiWithTimeout(
        usersAPI.updateRate(userId, { defaultHourlyRate: rate }),
        TIMEOUT_DURATIONS.STANDARD
      );

      // Update local state
      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, defaultHourlyRate: rate }
          : u
      ));

      setEditingUserId(null);
      setEditRate('');
      setSuccessMessage('User rate updated successfully');
      setShowSuccessDialog(true);
      logger.log('User rate updated successfully', { userId, rate }, 'UserRatesScreen');
    } catch (error: any) {
      logger.error('Error updating user rate:', error, 'UserRatesScreen');
      const message = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection.'
        : error.response?.data?.error || 'Failed to update user rate';
      setErrorMessage(message);
      setShowErrorDialog(true);
    }
  }, [editRate, users]);

  const handleCancelEdit = useCallback(() => {
    setEditingUserId(null);
    setEditRate('');
  }, []);

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

      {/* Error Dialog */}
      <CustomDialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
        onDismiss={() => setShowErrorDialog(false)}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowErrorDialog(false),
            style: 'default',
          },
        ]}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        onDismiss={() => setShowSuccessDialog(false)}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowSuccessDialog(false),
            style: 'default',
          },
        ]}
      />
    </ScrollView>
  );
});

UserRatesScreen.displayName = 'UserRatesScreen';

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
