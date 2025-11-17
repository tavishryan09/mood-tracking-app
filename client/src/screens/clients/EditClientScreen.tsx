import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { TextInput, Button, Title, Card, IconButton, Divider, Paragraph, ActivityIndicator } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon, ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { clientsAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomColorTheme } from '../../contexts/CustomColorThemeContext';
import { CustomDialog } from '../../components/CustomDialog';
import { EditClientScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import { validateAndSanitize, ValidationPatterns } from '../../utils/sanitize';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../../utils/apiWithTimeout';

interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  isPrimary?: boolean;
}

const EditClientScreen = React.memo(({ route, navigation }: EditClientScreenProps) => {
  const { currentColors } = useTheme();
  const { getColorForElement } = useCustomColorTheme();
  const { clientId } = route.params;

  // Get clients theme colors
  const clientsBg = getColorForElement('clients', 'background');
  const clientCardBg = getColorForElement('clients', 'clientCardBackground');

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await apiWithTimeout(clientsAPI.getById(clientId), TIMEOUT_DURATIONS.QUICK) as any;
      const client = response.data;

      setBusinessName(client.name || '');
      setAddress(client.address || '');
      setNotes(client.notes || '');

      // Load contacts
      if (client.contacts && client.contacts.length > 0) {
        const primary = client.contacts.find((c: any) => c.isPrimary);
        if (primary) {
          setPrimaryContactName(primary.name || '');
          setPrimaryContactTitle(primary.title || '');
          setPrimaryContactEmail(primary.email || '');
          setPrimaryContactPhone(primary.phone || '');
        }

        const additional = client.contacts
          .filter((c: any) => !c.isPrimary)
          .map((c: any) => ({
            id: c.id || Date.now().toString() + Math.random(),
            name: c.name || '',
            title: c.title || '',
            email: c.email || '',
            phone: c.phone || '',
          }));
        setAdditionalContacts(additional);
      }
    } catch (error) {
      logger.error('Error loading client:', error, 'EditClientScreen');
      setErrorMessage('Failed to load client details');
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

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
    // Validate and sanitize primary contact data
    const { isValid, errors, sanitizedData } = validateAndSanitize(
      {
        businessName,
        address,
        notes,
        primaryContactName,
        primaryContactTitle,
        primaryContactEmail,
        primaryContactPhone,
      },
      {
        businessName: { required: true, minLength: 2, maxLength: 200 },
        address: { maxLength: 500 },
        notes: { maxLength: 1000 },
        primaryContactName: { required: true, minLength: 2, maxLength: 100 },
        primaryContactTitle: { maxLength: 100 },
        primaryContactEmail: { pattern: ValidationPatterns.email },
        primaryContactPhone: { pattern: ValidationPatterns.phone },
      }
    );

    if (!isValid) {
      const errorMsg = Object.values(errors)[0] || 'Please check your input';
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
      logger.warn('Validation failed:', errors, 'EditClientScreen');
      return;
    }

    setSaving(true);
    try {
      // Sanitize additional contacts
      const sanitizedAdditionalContacts = additionalContacts
        .filter(contact => contact.name.trim()) // Only include contacts with names
        .map(contact => {
          const { sanitizedData: contactData } = validateAndSanitize(
            contact,
            {
              name: { required: true, maxLength: 100 },
              title: { maxLength: 100 },
              email: { pattern: ValidationPatterns.email },
              phone: { pattern: ValidationPatterns.phone },
            }
          );
          return {
            name: contactData.name,
            title: contactData.title || null,
            email: contactData.email || null,
            phone: contactData.phone || null,
            isPrimary: false,
          };
        });

      // Prepare contacts array
      const contacts = [
        {
          name: sanitizedData.primaryContactName,
          title: sanitizedData.primaryContactTitle || null,
          email: sanitizedData.primaryContactEmail || null,
          phone: sanitizedData.primaryContactPhone || null,
          isPrimary: true,
        },
        ...sanitizedAdditionalContacts,
      ];

      const clientData = {
        name: sanitizedData.businessName,
        company: sanitizedData.businessName,
        address: sanitizedData.address || null,
        notes: sanitizedData.notes || null,
        email: sanitizedData.primaryContactEmail || null,
        phone: sanitizedData.primaryContactPhone || null,
        contacts: contacts,
      };

      await apiWithTimeout(clientsAPI.update(clientId, clientData), TIMEOUT_DURATIONS.STANDARD);

      logger.log('Client updated successfully', { clientName: sanitizedData.businessName }, 'EditClientScreen');
      setSuccessMessage('Client updated successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      logger.error('Client update error:', error, 'EditClientScreen');

      let message = 'Failed to update client';

      if (error.message === 'Request timeout') {
        message = 'Unable to connect to server. Please check your connection and try again.';
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Express-validator errors
        message = error.response.data.errors.map((err: any) => err.msg).join('\n');
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      }

      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
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
    <ScrollView style={[styles.container, { backgroundColor: clientsBg }]}>
      <View style={styles.content}>
        {/* Custom Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <HugeiconsIcon icon={ArrowLeft02Icon} size={28} color={currentColors.text} />
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: currentColors.text }]}>Edit Client</Text>
        </View>

        {/* Business Information Section */}
        <Card style={[styles.section, { backgroundColor: clientCardBg }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: currentColors.text }]}>Business Information</Title>

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
        <Card style={[styles.section, { backgroundColor: clientCardBg }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: currentColors.text }]}>Primary Contact</Title>

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
        <Card style={[styles.section, { backgroundColor: clientCardBg }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={[styles.sectionTitle, { color: currentColors.text }]}>Additional Contacts</Title>
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
          loading={saving}
          disabled={saving || !businessName || !primaryContactName}
          style={styles.button}
          buttonColor={currentColors.secondary}
        >
          Save Changes
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
        </Button>

        <View style={styles.bottomSpacer} />
      </View>

      {/* Error Dialog */}
      <CustomDialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setShowErrorDialog(false);
              // Navigate back only on load error
              if (errorMessage === 'Failed to load client details') {
                navigation.goBack();
              }
            },
            style: 'default',
          },
        ]}
        onDismiss={() => setShowErrorDialog(false)}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setShowSuccessDialog(false);
              navigation.goBack();
            },
            style: 'default',
          },
        ]}
        onDismiss={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
      />
    </ScrollView>
  );
});

EditClientScreen.displayName = 'EditClientScreen';

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
    elevation: 2,
    borderRadius: 10,
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

export default EditClientScreen;
