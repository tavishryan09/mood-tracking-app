import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, Text } from 'react-native';
import { Card, Title, Paragraph, FAB, ActivityIndicator, Searchbar, IconButton, Menu, Divider } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon, AddCircleIcon, PencilEdit02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { clientsAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const ClientsListScreen = () => {
  const { currentColors } = useTheme();
  const navigation = useNavigation();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadClients();
    }, [])
  );

  React.useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 800)
      );

      const response = await Promise.race([clientsAPI.getAll(), timeout]) as any;
      setClients(response.data);
      setFilteredClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchQuery) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(
      (client) =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredClients(filtered);
  };

  const handleDeleteClick = (clientId: string) => {
    setDeletingClientId(clientId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClientId) return;

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      await Promise.race([clientsAPI.delete(deletingClientId), timeout]);
      setDeletingClientId(null);
      loadClients();
    } catch (error: any) {
      console.error('Delete error:', error);
      setDeletingClientId(null);
      const errorMessage = error.message === 'Request timeout'
        ? 'Unable to connect to server'
        : error.response?.data?.error || 'Failed to delete client';
      // Error handling can be extended here if needed
    }
  };

  const handleDeleteCancel = () => {
    setDeletingClientId(null);
  };

  const renderClient = ({ item }: any) => {
    const primaryContact = item.contacts?.find((c: any) => c.isPrimary);

    return (
      <TouchableOpacity
        onPress={() => (navigation as any).navigate('EditClient', { clientId: item.id })}
        activeOpacity={0.7}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Title>{item.name}</Title>
                {item.company && item.company !== item.name && (
                  <Paragraph style={[styles.company, { color: currentColors.textSecondary }]}>{item.company}</Paragraph>
                )}
              </View>
              <Menu
                visible={menuVisible === item.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    onPress={() => setMenuVisible(item.id)}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(null);
                    (navigation as any).navigate('EditClient', { clientId: item.id });
                  }}
                  title="Edit"
                  leadingIcon={() => <HugeiconsIcon icon={PencilEdit02Icon} size={20} color={currentColors.icon} />}
                />
                <Divider />
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(null);
                    handleDeleteClick(item.id);
                  }}
                  title="Delete"
                  leadingIcon={() => <HugeiconsIcon icon={Cancel01Icon} size={20} color={currentColors.error} />}
                />
              </Menu>
            </View>

            {primaryContact && (
              <View style={[styles.contactInfo, { borderTopColor: currentColors.border }]}>
                <Paragraph style={styles.contactLabel}>Primary Contact:</Paragraph>
                <Paragraph>{primaryContact.name}</Paragraph>
                {primaryContact.title && (
                  <Paragraph style={[styles.contactDetail, { color: currentColors.textSecondary }]}>{primaryContact.title}</Paragraph>
                )}
                {primaryContact.email && (
                  <Paragraph style={[styles.contactDetail, { color: currentColors.textSecondary }]}>{primaryContact.email}</Paragraph>
                )}
                {primaryContact.phone && (
                  <Paragraph style={[styles.contactDetail, { color: currentColors.textSecondary }]}>{primaryContact.phone}</Paragraph>
                )}
              </View>
            )}

            {item.contacts && item.contacts.length > 1 && (
              <Paragraph style={[styles.additionalContacts, { color: currentColors.primary }]}>
                +{item.contacts.length - 1} additional contact{item.contacts.length - 1 !== 1 ? 's' : ''}
              </Paragraph>
            )}

            {item.address && (
              <View style={styles.addressContainer}>
                <Paragraph style={[styles.address, { color: currentColors.textSecondary }]}>{item.address}</Paragraph>
              </View>
            )}

            <View style={[styles.stats, { borderTopColor: currentColors.border }]}>
              <Paragraph style={[styles.stat, { color: currentColors.textSecondary }]}>
                Projects: {item._count?.projects || 0}
              </Paragraph>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <Searchbar
        placeholder="Search clients..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        icon={() => <HugeiconsIcon icon={Search01Icon} size={24} color={currentColors.icon} />}
      />

      {filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Paragraph style={[styles.emptyText, { color: currentColors.textTertiary }]}>
            {searchQuery ? 'No clients found matching your search' : 'No clients yet. Create your first client!'}
          </Paragraph>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB
        style={[styles.fab, { backgroundColor: currentColors.primary }]}
        icon={() => <HugeiconsIcon icon={AddCircleIcon} size={24} color="#FFFFFF" />}
        label="New Client"
        onPress={() => {
          (navigation as any).navigate('CreateClient');
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingClientId && (
        <Modal
          visible={!!deletingClientId}
          transparent={true}
          animationType="fade"
          onRequestClose={handleDeleteCancel}
        >
          <View style={styles.confirmationOverlay}>
            <View style={[styles.confirmationCard, { backgroundColor: currentColors.background.bg300 }]}>
              <Text style={[styles.confirmationTitle, { color: currentColors.text }]}>
                Delete Client
              </Text>

              {(() => {
                const client = clients.find(c => c.id === deletingClientId);
                return (
                  <Text style={[styles.confirmationMessage, { color: currentColors.text }]}>
                    Are you sure you want to delete "{client?.name || 'this client'}"? This action cannot be undone.
                  </Text>
                );
              })()}

              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={[styles.confirmationButtonCancel, { borderColor: currentColors.primary }]}
                  onPress={handleDeleteCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.confirmationButtonCancelText, { color: currentColors.primary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmationButtonDelete, { backgroundColor: currentColors.error }]}
                  onPress={handleDeleteConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.confirmationButtonDeleteText, { color: currentColors.white }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    margin: 15,
  },
  list: {
    padding: 15,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
  },
  company: {
    fontSize: 14,
    marginTop: 2,
  },
  contactInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  contactLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contactDetail: {
    fontSize: 14,
  },
  additionalContacts: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 5,
  },
  addressContainer: {
    marginTop: 10,
  },
  address: {
    fontSize: 14,
  },
  stats: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  stat: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationCard: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmationButtonCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1.5,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmationButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationButtonDelete: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmationButtonDeleteText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ClientsListScreen;
