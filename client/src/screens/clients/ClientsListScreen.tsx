import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, Text, useWindowDimensions } from 'react-native';
import { Card, Title, Paragraph, FAB, ActivityIndicator, Searchbar, IconButton, Menu, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon, AddCircleIcon, PencilEdit02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { clientsAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomColorTheme } from '../../contexts/CustomColorThemeContext';
import { ClientsListScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../../utils/apiWithTimeout';
import EditClientModal from '../../components/EditClientModal';
import CreateClientModal from '../../components/CreateClientModal';

const ClientsListScreen = React.memo(({ navigation, route }: ClientsListScreenProps) => {
  const { currentColors } = useTheme();
  const { getColorForElement } = useCustomColorTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Memoize clients theme colors to prevent recalculation on every render
  const themeColors = useMemo(() => ({
    clientsBg: getColorForElement('clients', 'background'),
    clientCardBg: getColorForElement('clients', 'clientCardBackground'),
    clientCardText: getColorForElement('clients', 'clientCardText'),
    clientCardBorder: getColorForElement('clients', 'clientCardBorder'),
    addButtonBg: getColorForElement('clients', 'addButtonBackground'),
    addButtonIcon: getColorForElement('clients', 'addButtonIcon'),
    searchIconColor: getColorForElement('clients', 'searchIconColor'),
    searchTextColor: getColorForElement('clients', 'searchTextColor'),
    searchBarBg: getColorForElement('clients', 'searchBarBackground'),
    searchSectionBg: getColorForElement('clients', 'searchSectionBackground'),
  }), [getColorForElement]);

  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  // Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Memoize sortClients function to prevent recreation on every render
  const sortClients = useCallback((clientsList: any[]) => {
    return [...clientsList].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();

      const isInternalA = nameA === 'internal';
      const isInternalB = nameB === 'internal';
      const isNAA = nameA === 'na';
      const isNAB = nameB === 'na';

      // Internal and NA clients go to the end
      if (isInternalA && !isInternalB && !isNAB) return 1;
      if (isInternalB && !isInternalA && !isNAA) return -1;
      if (isNAA && !isNAB && !isInternalB) return 1;
      if (isNAB && !isNAA && !isInternalA) return -1;

      // Both are Internal or NA, sort between them
      if ((isInternalA || isNAA) && (isInternalB || isNAB)) {
        return nameA.localeCompare(nameB);
      }

      // Normal alphabetical sort for all other clients
      return nameA.localeCompare(nameB);
    });
  }, []);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiWithTimeout(clientsAPI.getAll(), TIMEOUT_DURATIONS.QUICK) as any;
      const sortedClients = sortClients(response.data);
      setClients(sortedClients);
      setFilteredClients(sortedClients);
    } catch (error) {
      logger.error('Error loading clients:', error, 'ClientsListScreen');
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoading(false);
    }
  }, [sortClients]);

  const filterClients = useCallback(() => {
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
    const sortedFiltered = sortClients(filtered);
    setFilteredClients(sortedFiltered);
  }, [searchQuery, clients, sortClients]);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  React.useEffect(() => {
    filterClients();
  }, [filterClients]);

  const handleDeleteClick = useCallback((clientId: string) => {
    setDeletingClientId(clientId);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingClientId) return;

    try {
      await apiWithTimeout(clientsAPI.delete(deletingClientId), TIMEOUT_DURATIONS.VERY_LONG);
      setDeletingClientId(null);
      loadClients();
    } catch (error: any) {
      logger.error('Delete error:', error, 'ClientsListScreen');
      setDeletingClientId(null);
      const errorMessage = error.message === 'Request timeout'
        ? 'Unable to connect to server'
        : error.response?.data?.error || 'Failed to delete client';
      // Error handling can be extended here if needed
    }
  }, [deletingClientId, loadClients]);

  const handleDeleteCancel = useCallback(() => {
    setDeletingClientId(null);
  }, []);

  const handleEditClick = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    setEditModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setEditModalVisible(false);
    setSelectedClientId(null);
  }, []);

  const handleClientUpdated = useCallback(() => {
    loadClients();
  }, [loadClients]);

  const renderClient = useCallback(({ item }: any) => {
    const primaryContact = item.contacts?.find((c: any) => c.isPrimary);
    const secondaryContacts = item.contacts?.filter((c: any) => !c.isPrimary) || [];

    // Check if primary contact has any data
    const hasPrimaryContact = primaryContact && (
      primaryContact.name || primaryContact.title || primaryContact.email || primaryContact.phone
    );

    // Check if there are any secondary contacts with data
    const hasSecondaryContacts = secondaryContacts.length > 0;

    // Check if business info has any data (excluding name since it's in the header)
    const hasBusinessInfo = item.company || item.address || item.website || item.notes || (item._count?.projects || 0) > 0;

    // Count how many columns we're showing
    const columnsToShow = [hasBusinessInfo, hasPrimaryContact, hasSecondaryContacts].filter(Boolean).length;

    return (
      <TouchableOpacity
        onPress={() => handleEditClick(item.id)}
        activeOpacity={0.7}
      >
        <Card style={[styles.card, { backgroundColor: themeColors.clientCardBg, borderColor: themeColors.clientCardBorder, borderWidth: 1 }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Title style={{ color: themeColors.clientCardText }}>{item.name}</Title>
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
                    handleEditClick(item.id);
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

            {columnsToShow > 0 && (
              <View style={[styles.threeColumnLayout, isMobile && styles.mobileColumnLayout]}>
                {/* Column 1: Business Information */}
                {hasBusinessInfo && (
                  <View style={styles.column}>
                    <Paragraph style={[styles.columnLabel, { color: themeColors.clientCardText }]}>Business Information</Paragraph>
                    {item.company && item.company !== item.name && (
                      <View style={styles.infoRow}>
                        <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Company:</Paragraph>
                        <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{item.company}</Paragraph>
                      </View>
                    )}
                    {item.address && (
                      <View style={styles.infoRow}>
                        <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Address:</Paragraph>
                        <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{item.address}</Paragraph>
                      </View>
                    )}
                    {item.website && (
                      <View style={styles.infoRow}>
                        <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Website:</Paragraph>
                        <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{item.website}</Paragraph>
                      </View>
                    )}
                    <View style={styles.infoRow}>
                      <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Projects:</Paragraph>
                      <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{item._count?.projects || 0}</Paragraph>
                    </View>
                    {item.notes && (
                      <View style={styles.infoRow}>
                        <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Notes:</Paragraph>
                        <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{item.notes}</Paragraph>
                      </View>
                    )}
                  </View>
                )}

                {/* Column 2: Primary Contact */}
                {hasPrimaryContact && (
                  <View style={styles.column}>
                    <Paragraph style={[styles.columnLabel, { color: themeColors.clientCardText }]}>Primary Contact</Paragraph>
                    {primaryContact.name && (
                      <View style={styles.infoRow}>
                        <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Name:</Paragraph>
                        <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{primaryContact.name}</Paragraph>
                      </View>
                    )}
                    {primaryContact.title && (
                      <View style={styles.infoRow}>
                        <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Title:</Paragraph>
                        <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{primaryContact.title}</Paragraph>
                      </View>
                    )}
                    {primaryContact.email && (
                      <View style={styles.infoRow}>
                        <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Email:</Paragraph>
                        <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{primaryContact.email}</Paragraph>
                      </View>
                    )}
                    {primaryContact.phone && (
                      <View style={styles.infoRow}>
                        <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Phone:</Paragraph>
                        <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{primaryContact.phone}</Paragraph>
                      </View>
                    )}
                  </View>
                )}

                {/* Column 3: Secondary Contacts */}
                {hasSecondaryContacts && (
                  <View style={styles.column}>
                    <Paragraph style={[styles.columnLabel, { color: themeColors.clientCardText }]}>Secondary Contacts</Paragraph>
                    {secondaryContacts.map((contact: any, index: number) => (
                      <View key={contact.id || index} style={styles.secondaryContactBlock}>
                        {index > 0 && <View style={[styles.contactDivider, { borderBottomColor: currentColors.border }]} />}
                        {contact.name && (
                          <View style={styles.infoRow}>
                            <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Name:</Paragraph>
                            <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{contact.name}</Paragraph>
                          </View>
                        )}
                        {contact.title && (
                          <View style={styles.infoRow}>
                            <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Title:</Paragraph>
                            <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{contact.title}</Paragraph>
                          </View>
                        )}
                        {contact.email && (
                          <View style={styles.infoRow}>
                            <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Email:</Paragraph>
                            <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{contact.email}</Paragraph>
                          </View>
                        )}
                        {contact.phone && (
                          <View style={styles.infoRow}>
                            <Paragraph style={[styles.infoLabel, { color: currentColors.textSecondary }]}>Phone:</Paragraph>
                            <Paragraph style={[styles.infoValue, { color: themeColors.clientCardText }]}>{contact.phone}</Paragraph>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  }, [themeColors, currentColors, menuVisible, handleDeleteClick, handleEditClick]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.clientsBg }]}>
      <View style={{ backgroundColor: themeColors.searchSectionBg }}>
        <Searchbar
          placeholder="Search clients..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: themeColors.searchBarBg }]}
          inputStyle={{ color: themeColors.searchTextColor }}
          placeholderTextColor={currentColors.textTertiary}
          icon={() => <HugeiconsIcon icon={Search01Icon} size={24} color={themeColors.searchIconColor} />}
        />
      </View>

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
        style={[styles.fab, { backgroundColor: themeColors.addButtonBg }]}
        icon={() => <HugeiconsIcon icon={AddCircleIcon} size={24} color={themeColors.addButtonIcon} />}
        label="New Client"
        color={themeColors.addButtonIcon}
        onPress={() => setCreateModalVisible(true)}
      />

      {/* Create Client Modal */}
      <CreateClientModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onClientCreated={handleClientUpdated}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        visible={editModalVisible}
        clientId={selectedClientId}
        onClose={handleModalClose}
        onClientUpdated={handleClientUpdated}
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
});

ClientsListScreen.displayName = 'ClientsListScreen';

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
    borderRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  titleContainer: {
    flex: 1,
  },
  threeColumnLayout: {
    flexDirection: 'row',
    gap: 15,
  },
  mobileColumnLayout: {
    flexDirection: 'column',
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  noData: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  secondaryContactBlock: {
    marginBottom: 12,
  },
  contactDivider: {
    borderBottomWidth: 1,
    marginVertical: 10,
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
