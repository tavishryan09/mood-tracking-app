import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Title, Card, IconButton, Divider, Paragraph } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon } from '@hugeicons/core-free-icons';
import { clientsAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

const CreateClientScreen = ({ navigation }: any) => {
  const { currentColors } = useTheme();
  // Business/Company information
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Primary contact information
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactTitle, setPrimaryContactTitle] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');

  // Additional contacts
  const [additionalContacts, setAdditionalContacts] = useState<Contact[]>([]);

  const [loading, setLoading] = useState(false);

  const addContact = () => {
    const newContact: Contact = {
      id: Date.now().toString(),
      name: '',
      title: '',
      email: '',
      phone: '',
    };
    setAdditionalContacts([...additionalContacts, newContact]);
  };

  const removeContact = (id: string) => {
    setAdditionalContacts(additionalContacts.filter(contact => contact.id !== id));
  };

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setAdditionalContacts(
      additionalContacts.map(contact =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    );
  };

  const handleSubmit = async () => {
    if (!businessName) {
      Alert.alert('Error', 'Please enter a business name');
      return;
    }

    if (!primaryContactName) {
      Alert.alert('Error', 'Please enter a primary contact name');
      return;
    }

    setLoading(true);
    try {
      // Prepare contacts array
      const contacts = [
        {
          name: primaryContactName,
          title: primaryContactTitle || undefined,
          email: primaryContactEmail || undefined,
          phone: primaryContactPhone || undefined,
          isPrimary: true,
        },
        ...additionalContacts
          .filter(contact => contact.name.trim()) // Only include contacts with names
          .map(contact => ({
            name: contact.name,
            title: contact.title || undefined,
            email: contact.email || undefined,
            phone: contact.phone || undefined,
            isPrimary: false,
          })),
      ];

      const clientData = {
        name: businessName, // Business name as the client name
        company: businessName, // Keep company field for backwards compatibility
        address: address || undefined,
        notes: notes || undefined,
        // Primary contact info at top level for backwards compatibility
        email: primaryContactEmail || undefined,
        phone: primaryContactPhone || undefined,
        // All contacts in a structured format
        contacts: contacts,
        primaryContactName: primaryContactName,
        primaryContactTitle: primaryContactTitle || undefined,
      };

      // Add timeout to API call
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 2000)
      );

      await Promise.race([clientsAPI.create(clientData), timeout]);

      Alert.alert('Success', 'Client created successfully');
      navigation.goBack();
    } catch (error: any) {
      console.error('Client creation error:', error);

      // Show detailed error message
      const errorMessage = error.message === 'Request timeout'
        ? 'Unable to connect to server. Please check your connection and try again.'
        : error.response?.data?.error || 'Failed to create client';

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title style={[styles.mainTitle, { color: currentColors.text }]}>Create New Client</Title>

        {/* Business Information Section */}
        <Card style={styles.section}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: currentColors.primary }]}>Business Information</Title>

            <TextInput
              label="Business Name *"
              value={businessName}
              onChangeText={setBusinessName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Address"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            <TextInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Any additional information about the business..."
            />
          </Card.Content>
        </Card>

        {/* Primary Contact Section */}
        <Card style={styles.section}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: currentColors.primary }]}>Primary Contact</Title>

            <TextInput
              label="Name *"
              value={primaryContactName}
              onChangeText={setPrimaryContactName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Title"
              value={primaryContactTitle}
              onChangeText={setPrimaryContactTitle}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., CEO, Project Manager, etc."
            />

            <TextInput
              label="Email"
              value={primaryContactEmail}
              onChangeText={setPrimaryContactEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              label="Phone"
              value={primaryContactPhone}
              onChangeText={setPrimaryContactPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Additional Contacts Section */}
        <Card style={styles.section}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={[styles.sectionTitle, { color: currentColors.primary }]}>Additional Contacts</Title>
              <IconButton
                icon={() => <HugeiconsIcon icon={UserAdd02Icon} size={24} color={currentColors.primary} />}
                size={24}
                onPress={addContact}
              />
            </View>

            {additionalContacts.length === 0 ? (
              <Paragraph style={[styles.emptyText, { color: currentColors.textTertiary }]}>
                No additional contacts added yet. Tap the + button to add a contact.
              </Paragraph>
            ) : (
              additionalContacts.map((contact, index) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <Paragraph style={[styles.contactNumber, { color: currentColors.textSecondary }]}>Contact {index + 2}</Paragraph>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => removeContact(contact.id)}
                      iconColor={currentColors.error}
                    />
                  </View>

                  <TextInput
                    label="Name"
                    value={contact.name}
                    onChangeText={(value) => updateContact(contact.id, 'name', value)}
                    mode="outlined"
                    style={styles.input}
                  />

                  <TextInput
                    label="Title"
                    value={contact.title}
                    onChangeText={(value) => updateContact(contact.id, 'title', value)}
                    mode="outlined"
                    style={styles.input}
                  />

                  <TextInput
                    label="Email"
                    value={contact.email}
                    onChangeText={(value) => updateContact(contact.id, 'email', value)}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />

                  <TextInput
                    label="Phone"
                    value={contact.phone}
                    onChangeText={(value) => updateContact(contact.id, 'phone', value)}
                    mode="outlined"
                    keyboardType="phone-pad"
                    style={styles.input}
                  />

                  {index < additionalContacts.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !businessName || !primaryContactName}
          style={styles.button}
          buttonColor={currentColors.secondary}
        >
          Create Client
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
        </Button>

        <View style={styles.bottomSpacer} />
      </View>
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
  mainTitle: {
    fontSize: 24,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
  contactCard: {
    marginBottom: 15,
    paddingVertical: 10,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 15,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  bottomSpacer: {
    height: 50,
  },
});

export default CreateClientScreen;
