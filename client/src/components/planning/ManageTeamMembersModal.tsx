import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Platform, Text } from 'react-native';
import { Title, Button, Switch, IconButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface ManageTeamMembersModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  visibleUserIds: string[];
  draggedUserId: string | null;
  dragOverUserId: string | null;
  currentUserRole?: string;
  currentColors: any;
  onToggleUserVisibility: (userId: string) => void;
  onDragStart: (userId: string) => void;
  onDragEnd: () => void;
  onDragOver: (userId: string) => void;
  onDrop: (targetUserId: string) => void;
  onDragLeave: () => void;
  onSaveSettings: () => Promise<void>;
  onSaveAsDefaultForAll: () => Promise<void>;
}

const ManageTeamMembersModal = React.memo(({
  visible,
  onClose,
  users,
  visibleUserIds,
  draggedUserId,
  dragOverUserId,
  currentUserRole,
  currentColors,
  onToggleUserVisibility,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDragLeave,
  onSaveSettings,
  onSaveAsDefaultForAll,
}: ManageTeamMembersModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
        <View style={[styles.modalContent, { backgroundColor: currentColors.background.bg300 }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Title style={[styles.modalTitle, { color: currentColors.text }]}>Manage Team Members</Title>
              <Text style={[styles.modalSubtitle, { color: currentColors.text }]}>
                Select team members to show in the planning view. Drag and drop to reorder.
              </Text>
            </View>
            <IconButton
              icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
              onPress={onClose}
            />
          </View>

          <ScrollView style={styles.modalList}>
            {users.map((user) => {
              const isVisible = visibleUserIds.includes(user.id);
              const isBeingDragged = draggedUserId === user.id;
              const isDragOver = dragOverUserId === user.id;

              return (
                <View
                  key={user.id}
                  style={[
                    styles.modalListItem,
                    { borderBottomColor: currentColors.border },
                    isBeingDragged && [styles.modalListItemDragging, { backgroundColor: currentColors.background.bg300 }],
                    isDragOver && [styles.modalListItemDragOver, { backgroundColor: currentColors.background.bg300, borderBottomColor: currentColors.primary }],
                  ]}
                  onStartShouldSetResponder={() => false}
                  onMoveShouldSetResponder={() => false}
                >
                  {/* Drag handle */}
                  <div
                    draggable={Platform.OS === 'web'}
                    onDragStart={(e: any) => {
                      if (Platform.OS === 'web') {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/html', user.id);
                        onDragStart(user.id);
                      }
                    }}
                    onDragEnd={(e: any) => {
                      if (Platform.OS === 'web') {
                        onDragEnd();
                      }
                    }}
                    onDragOver={(e: any) => {
                      if (Platform.OS === 'web') {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        onDragOver(user.id);
                      }
                    }}
                    onDrop={(e: any) => {
                      if (Platform.OS === 'web') {
                        e.preventDefault();
                        onDrop(user.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (Platform.OS === 'web') {
                        onDragLeave();
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: '100%',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* User name */}
                    <View style={styles.userNameContainer}>
                      <Text style={[styles.modalListItemText, { color: currentColors.text }]}>
                        {user.firstName} {user.lastName}
                      </Text>
                    </View>

                    {/* Visibility Toggle */}
                    <Switch
                      value={isVisible}
                      onValueChange={() => onToggleUserVisibility(user.id)}
                      color={currentColors.primary}
                    />
                  </div>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.modalButtons}>
            <Button
              mode="contained"
              onPress={onSaveSettings}
              style={styles.modalButton}
              buttonColor={currentColors.primary}
            >
              Save
            </Button>
            {currentUserRole === 'ADMIN' && (
              <Button
                mode="outlined"
                onPress={onSaveAsDefaultForAll}
                style={[styles.modalButton, { marginTop: 10 }]}
              >
                Save as Default for All Users
              </Button>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
});

ManageTeamMembersModal.displayName = 'ManageTeamMembersModal';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalList: {
    marginBottom: 20,
  },
  modalListItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalListItemDragging: {
    opacity: 0.5,
  },
  modalListItemDragOver: {
    borderBottomWidth: 2,
  },
  userNameContainer: {
    flex: 1,
  },
  modalListItemText: {
    fontSize: 16,
  },
  modalButtons: {
    gap: 10,
  },
  modalButton: {
    borderRadius: 5,
  },
});

export default ManageTeamMembersModal;
