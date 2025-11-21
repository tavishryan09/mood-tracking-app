import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Modal, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Button, Title, Card, IconButton, Divider, Paragraph, ActivityIndicator } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserAdd02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { clientsAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomColorTheme } from '../contexts/CustomColorThemeContext';
import { CustomDialog } from './CustomDialog';
import { logger } from '../utils/logger';
import { validateAndSanitize, ValidationPatterns } from '../utils/sanitize';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../utils/apiWithTimeout';

interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  isPrimary?: boolean;
}

interface EditClientModalProps {
  visible: boolean;
  clientId: string | null;
  onClose: () => void;
  onClientUpdated: () => void;
}

const EditClientModal: React.FC<EditClientModalProps> = ({
  visible,
  clientId,
  onClose,
  onClientUpdated,
}) => {
  const { currentColors } = useTheme();
  const { getColorForElement } = useCustomColorTheme();

  // Get clients theme colors
  const clientCardBg = getColorForElement('clients', 'clientCardBackground');

  // Business/Company information
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
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
    if (visible && clientId) {
      loadClient();
    }
  }, [visible, clientId]);

  const loadClient = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const response = await apiWithTimeout(clientsAPI.getById(clientId), TIMEOUT_DURATIONS.QUICK) as any;
      const client = response.data;

      setBusinessName(client.name || '');
      setAddress(client.address || '');
      setWebsite(client.website || '');
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
      logger.error('Error loading client:', error, 'EditClientModal');
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
        website,
        notes,
        primaryContactName,
        primaryContactTitle,
        primaryContactEmail,
        primaryContactPhone,
      },
      {
        businessName: { required: true, minLength: 2, maxLength: 200 },
        address: { maxLength: 500 },
        website: { pattern: ValidationPatterns.url },
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
      logger.warn('Validation failed:', errors, 'EditClientModal');
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
        website: sanitizedData.website || null,
        notes: sanitizedData.notes || null,
        email: sanitizedData.primaryContactEmail || null,
        phone: sanitizedData.primaryContactPhone || null,
        contacts: contacts,
      };

      await apiWithTimeout(clientsAPI.update(clientId!, clientData), TIMEOUT_DURATIONS.STANDARD);

      logger.log('Client updated successfully', { clientName: sanitizedData.businessName }, 'EditClientModal');
      setSuccessMessage('Client updated successfully');
      setShowSuccessDialog(true);
    } catch (error: any) {
      logger.error('Client update error:', error, 'EditClientModal');

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContainer,
                  { backgroundColor: currentColors.background.bg700 }
                ]}
              >
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={{ paddingBottom: 0 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                >
                  <Card style={{ backgroundColor: currentColors.background.bg600, borderRadius: 8, elevation: 0, borderWidth: 0 }}>
                    <Card.Content style={{ paddingBottom: 0 }}>
                      <View style={styles.modalHeader}>
                        <Title style={{ color: currentColors.text, flex: 1 }}>Edit Client</Title>
                        <IconButton
                          icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
                          onPress={onClose}
                        />
                      </View>

                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="large" color={currentColors.primary} />
                        </View>
                      ) : (
                        <>
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
                                label="Website"
                                value={website}
                                onChangeText={setWebsite}
                                mode="outlined"
                                keyboardType="url"
                                autoCapitalize="none"
                                style={styles.input}
                                placeholder="https://www.example.com"
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
                          <View style={styles.buttonContainer}>
                            <Button
                              mode="outlined"
                              onPress={onClose}
                              style={styles.button}
                              disabled={saving}
                            >
                              Cancel
                            </Button>

                            <Button
                              mode="contained"
                              onPress={handleSubmit}
                              loading={saving}
                              disabled={saving || !businessName || !primaryContactName}
                              style={styles.button}
                            >
                              Save
                            </Button>
                          </View>
                        </>
                      )}
                    </Card.Content>
                  </Card>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

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
              // Close modal only on load error
              if (errorMessage === 'Failed to load client details') {
                onClose();
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
              onClientUpdated();
              onClose();
            },
            style: 'default',
          },
        ]}
        onDismiss={() => {
          setShowSuccessDialog(false);
          onClientUpdated();
          onClose();
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Platform.select({
      ios: 40,
      android: 20,
      web: 20,
    }),
    paddingHorizontal: 10,
  },
  modalContainer: {
    width: '100%',
    minWidth: 280,
    maxWidth: 800,
    maxHeight: '85%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
    marginTop: 15,
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
  buttonContainer: {
    marginTop: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    minWidth: 100,
    borderRadius: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
});

export default EditClientModal;
