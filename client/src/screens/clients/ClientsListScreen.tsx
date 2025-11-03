import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Card, Title, Paragraph, FAB, ActivityIndicator, Searchbar, IconButton, Menu, Divider } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { clientsAPI } from '../../services/api';

const ClientsListScreen = () => {
  const navigation = useNavigation();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

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

  const handleDelete = async (clientId: string) => {
    // Use window.confirm for web, Alert.alert for native
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');
      if (confirmed) {
        try {
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 2000)
          );

          await Promise.race([clientsAPI.delete(clientId), timeout]);
          alert('Client deleted successfully');
          loadClients();
        } catch (error: any) {
          console.error('Delete error:', error);
          const errorMessage = error.message === 'Request timeout'
            ? 'Unable to connect to server'
            : error.response?.data?.error || 'Failed to delete client';
          alert(errorMessage);
        }
      }
    } else {
      Alert.alert(
        'Delete Client',
        'Are you sure you want to delete this client? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const timeout = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Request timeout')), 2000)
                );

                await Promise.race([clientsAPI.delete(clientId), timeout]);
                Alert.alert('Success', 'Client deleted successfully');
                loadClients();
              } catch (error: any) {
                console.error('Delete error:', error);
                const errorMessage = error.message === 'Request timeout'
                  ? 'Unable to connect to server'
                  : error.response?.data?.error || 'Failed to delete client';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    }
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
                  <Paragraph style={styles.company}>{item.company}</Paragraph>
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
                  leadingIcon="pencil"
                />
                <Divider />
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(null);
                    handleDelete(item.id);
                  }}
                  title="Delete"
                  leadingIcon="delete"
                />
              </Menu>
            </View>

            {primaryContact && (
              <View style={styles.contactInfo}>
                <Paragraph style={styles.contactLabel}>Primary Contact:</Paragraph>
                <Paragraph>{primaryContact.name}</Paragraph>
                {primaryContact.title && (
                  <Paragraph style={styles.contactDetail}>{primaryContact.title}</Paragraph>
                )}
                {primaryContact.email && (
                  <Paragraph style={styles.contactDetail}>{primaryContact.email}</Paragraph>
                )}
                {primaryContact.phone && (
                  <Paragraph style={styles.contactDetail}>{primaryContact.phone}</Paragraph>
                )}
              </View>
            )}

            {item.contacts && item.contacts.length > 1 && (
              <Paragraph style={styles.additionalContacts}>
                +{item.contacts.length - 1} additional contact{item.contacts.length - 1 !== 1 ? 's' : ''}
              </Paragraph>
            )}

            {item.address && (
              <View style={styles.addressContainer}>
                <Paragraph style={styles.address}>{item.address}</Paragraph>
              </View>
            )}

            <View style={styles.stats}>
              <Paragraph style={styles.stat}>
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
    <View style={styles.container}>
      <Searchbar
        placeholder="Search clients..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Paragraph style={styles.emptyText}>
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
        style={styles.fab}
        icon="plus"
        label="New Client"
        onPress={() => {
          (navigation as any).navigate('CreateClient');
        }}
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
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  contactInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  contactLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contactDetail: {
    color: '#666',
    fontSize: 14,
  },
  additionalContacts: {
    color: '#6200ee',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 5,
  },
  addressContainer: {
    marginTop: 10,
  },
  address: {
    color: '#666',
    fontSize: 14,
  },
  stats: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  stat: {
    color: '#666',
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
    color: '#999',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default ClientsListScreen;
