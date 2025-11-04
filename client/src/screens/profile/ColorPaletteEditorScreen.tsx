import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import { Button, Title, Menu, IconButton } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { colorPalettes, ColorPaletteName, ColorPalette } from '../../theme/colorPalettes';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_PALETTES_KEY = '@app_custom_palettes';

const ColorPaletteEditorScreen = ({ navigation, route }: any) => {
  const { currentColors, selectedPalette, setSelectedPalette, loadCustomPalettes: reloadThemeCustomPalettes } = useTheme();
  const { user } = useAuth();
  const params = route?.params || {};
  const [editingPalette, setEditingPalette] = useState<ColorPaletteName | string>(params.paletteId || selectedPalette);
  const [customPalettes, setCustomPalettes] = useState<Record<string, ColorPalette>>({});
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'create'>(params.createNew ? 'create' : params.paletteId ? 'edit' : 'view');
  const [editedColors, setEditedColors] = useState<ColorPalette | null>(null);
  const [openColorMenu, setOpenColorMenu] = useState<string | null>(null);
  const [newPaletteName, setNewPaletteName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadCustomPalettes();
  }, []);

  // Listen for focus event to reload palettes when navigating back
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCustomPalettes();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Handle navigation params
    if (params.paletteId) {
      setEditingPalette(params.paletteId);
      setEditMode('edit');
    } else if (params.createNew) {
      setEditMode('create');
      setNewPaletteName('');
    }
  }, [params]);

  useEffect(() => {
    if (editMode === 'edit' || editMode === 'create') {
      const paletteToEdit = editMode === 'create'
        ? createDefaultPalette()
        : (customPalettes[editingPalette] || colorPalettes[editingPalette as ColorPaletteName]);
      setEditedColors(JSON.parse(JSON.stringify(paletteToEdit)));
    }
  }, [editMode, editingPalette, customPalettes]);

  const createDefaultPalette = (): ColorPalette => ({
    id: 'custom' as ColorPaletteName,
    name: newPaletteName || 'Custom Palette',
    primary: '#007AFF',
    secondary: '#FF9500',
    text: '#1F1F21',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    border: '#C7C7CC',
    borderLight: '#D6CEC3',
    icon: '#8E8E93',
    iconInactive: '#BDBEC2',
    white: '#FFFFFF',
    background: {
      bg700: '#FFFFFF',
      bg500: '#F7F7F7',
      bg300: '#F7F7F7',
    },
    ios: {
      red: '#FF1300',
      redOrange: '#FF3A2D',
      pink: '#FF2D55',
      orangeRed: '#FF3B30',
      lightPink: '#FFD3E0',
      purple: '#5856D6',
      blue: '#007AFF',
      lightBlue: '#34AADC',
      skyBlue: '#5AC8FA',
      green: '#4CD964',
      orange: '#FF9500',
      yellow: '#FFCC00',
      darkGray: '#1F1F21',
      mediumGray: '#8E8E93',
      lightGray: '#BDBEC2',
      lighterGray: '#C7C7CC',
      beigeGray: '#D6CEC3',
      offWhite: '#F7F7F7',
    },
  });

  const loadCustomPalettes = async () => {
    try {
      const saved = await AsyncStorage.getItem(CUSTOM_PALETTES_KEY);
      if (saved) {
        setCustomPalettes(JSON.parse(saved));
      }
    } catch (error) {
      console.error('[ColorPaletteEditor] Error loading custom palettes:', error);
    }
  };

  const saveCustomPalettes = async (palettes: Record<string, ColorPalette>) => {
    try {
      await AsyncStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(palettes));
      setCustomPalettes(palettes);
      // Reload custom palettes in ThemeContext
      await reloadThemeCustomPalettes();
    } catch (error) {
      console.error('[ColorPaletteEditor] Error saving custom palettes:', error);
      throw error;
    }
  };

  const handleSavePalette = async () => {
    if (!editedColors) return;

    setSaving(true);
    try {
      if (editMode === 'create') {
        if (!newPaletteName.trim()) {
          Alert.alert('Error', 'Please enter a palette name');
          setSaving(false);
          return;
        }
        const customId = `custom_${Date.now()}`;
        const newPalette = { ...editedColors, id: customId as ColorPaletteName, name: newPaletteName };
        const updatedPalettes = { ...customPalettes, [customId]: newPalette };
        await saveCustomPalettes(updatedPalettes);
        setEditingPalette(customId);
        await setSelectedPalette(customId as ColorPaletteName);
        Alert.alert('Success', 'Custom palette created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const isPredefined = colorPalettes[editingPalette as ColorPaletteName];

        // Non-admins cannot edit predefined palettes
        if (isPredefined && !isAdmin) {
          Alert.alert('Error', 'Cannot modify predefined palettes. Please duplicate the palette to create a custom version you can edit.');
          setSaving(false);
          return;
        }

        // Admins can edit predefined palettes - save as custom override
        if (isPredefined && isAdmin) {
          const updatedPalettes = { ...customPalettes, [editingPalette]: editedColors };
          await saveCustomPalettes(updatedPalettes);
          Alert.alert('Success', 'Predefined palette override saved successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } else {
          // Editing an existing custom palette
          const updatedPalettes = { ...customPalettes, [editingPalette]: editedColors };
          await saveCustomPalettes(updatedPalettes);
          Alert.alert('Success', 'Palette updated successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      }
    } catch (error) {
      console.error('Error saving palette:', error);
      Alert.alert('Error', 'Failed to save palette');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const paletteToDelete = editingPalette;
      setEditingPalette('default');
      setShowDeleteConfirm(false);

      const updatedPalettes = { ...customPalettes };
      delete updatedPalettes[paletteToDelete];
      await saveCustomPalettes(updatedPalettes);

      if (selectedPalette === paletteToDelete) {
        await setSelectedPalette('default');
      }
    } catch (error) {
      console.error('Delete palette error:', error);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleCreateNew = () => {
    setNewPaletteName('');
    setEditMode('create');
  };

  const handleDuplicatePalette = () => {
    if (!editedColors) return;

    const paletteBeingEdited = customPalettes[editingPalette] || colorPalettes[editingPalette as ColorPaletteName];
    if (!paletteBeingEdited) return;

    setNewPaletteName(`${paletteBeingEdited.name} (Copy)`);
    setEditedColors(JSON.parse(JSON.stringify(paletteBeingEdited)));
    setEditMode('create');
  };

  const renderColorInput = (label: string, value: string, onChange: (color: string) => void) => {
    return (
      <View style={styles.colorInputRow}>
        <Text style={[styles.colorLabel, { color: currentColors.textSecondary }]}>{label}:</Text>
        <View style={styles.colorInputContainer}>
          <View style={[styles.colorPreview, { backgroundColor: value, borderColor: currentColors.border }]} />
          <TextInput
            style={[styles.colorInput, { color: currentColors.text, borderColor: currentColors.border }]}
            value={value}
            onChangeText={onChange}
            placeholder="#000000"
            placeholderTextColor={currentColors.textTertiary}
            maxLength={7}
          />
        </View>
      </View>
    );
  };

  const renderPaletteSelector = () => {
    const allPalettes = { ...colorPalettes, ...customPalettes };
    return (
      <View style={styles.paletteSelectorContainer}>
        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Select Palette to Edit</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paletteScrollView}>
          {Object.entries(allPalettes).map(([key, palette]) => {
            const isSelected = editingPalette === key;
            const isCustom = !colorPalettes[key as ColorPaletteName];
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.paletteCard,
                  {
                    backgroundColor: currentColors.white,
                    borderColor: isSelected ? currentColors.primary : currentColors.borderLight,
                  },
                  isSelected && { backgroundColor: `${currentColors.primary}1A` },
                ]}
                onPress={() => setEditingPalette(key)}
              >
                <View style={styles.paletteCardHeader}>
                  <Text style={[styles.paletteName, { color: currentColors.text }]}>{palette.name}</Text>
                  {isCustom && !showDeleteConfirm && (
                    <IconButton
                      icon="delete"
                      size={16}
                      onPress={() => {
                        setEditingPalette(key);
                        handleDeleteClick();
                      }}
                      iconColor={currentColors.error}
                    />
                  )}
                </View>
                <View style={styles.paletteColors}>
                  <View style={[styles.colorSwatch, { backgroundColor: palette.primary, borderColor: currentColors.border }]} />
                  <View style={[styles.colorSwatch, { backgroundColor: palette.secondary, borderColor: currentColors.border }]} />
                  <View style={[styles.colorSwatch, { backgroundColor: palette.background.bg700, borderColor: currentColors.border }]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {showDeleteConfirm && (
          <View style={[styles.deleteConfirmContainer, { backgroundColor: currentColors.background.bg500, borderColor: currentColors.border }]}>
            <Text style={[styles.deleteConfirmMessage, { color: currentColors.text }]}>
              Are you sure you want to delete this color palette?
            </Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.deleteCancel, { borderColor: currentColors.border }]}
                onPress={handleDeleteCancel}
              >
                <Text style={[styles.deleteButtonText, { color: currentColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.deleteConfirm, { backgroundColor: currentColors.error, borderColor: currentColors.error }]}
                onPress={handleDeleteConfirm}
              >
                <Text style={[styles.deleteDestructiveText, { color: currentColors.white }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEditForm = () => {
    if (!editedColors) return null;

    const isPredefined = !!colorPalettes[editingPalette as ColorPaletteName];
    const isCustom = !isPredefined;
    const canEdit = editMode === 'create' || isCustom || (isPredefined && isAdmin);

    if (!canEdit && editMode === 'edit') {
      return (
        <View style={[styles.warningContainer, { backgroundColor: currentColors.warning }]}>
          <Text style={[styles.warningText, { color: currentColors.text }]}>
            Predefined palettes cannot be edited directly. You can duplicate this palette to create a custom version that you can edit.
          </Text>
          <Button mode="contained" onPress={handleDuplicatePalette} style={styles.createButton}>
            Duplicate Palette
          </Button>
          <Button mode="outlined" onPress={handleCreateNew} style={styles.createButton}>
            Create New Palette
          </Button>
        </View>
      );
    }

    return (
      <ScrollView style={styles.editFormContainer}>
        {editMode === 'create' && (
          <View style={styles.nameInputContainer}>
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Palette Name</Text>
            <TextInput
              style={[styles.nameInput, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: currentColors.white }]}
              value={newPaletteName}
              onChangeText={setNewPaletteName}
              placeholder="Enter palette name"
              placeholderTextColor={currentColors.textTertiary}
            />
          </View>
        )}

        {editMode === 'edit' && isPredefined && isAdmin && (
          <View style={[styles.adminNoticeContainer, { backgroundColor: `${currentColors.primary}15`, borderColor: currentColors.primary }]}>
            <Text style={[styles.adminNoticeText, { color: currentColors.text }]}>
              Admin Mode: You are editing a predefined palette. Changes will override the default colors for all users.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Primary Colors</Text>
        {renderColorInput('Primary', editedColors.primary, (color) => setEditedColors({ ...editedColors, primary: color }))}
        {renderColorInput('Secondary', editedColors.secondary, (color) => setEditedColors({ ...editedColors, secondary: color }))}

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Text Colors</Text>
        {renderColorInput('Text', editedColors.text, (color) => setEditedColors({ ...editedColors, text: color }))}
        {renderColorInput('Text Secondary', editedColors.textSecondary, (color) => setEditedColors({ ...editedColors, textSecondary: color }))}
        {renderColorInput('Text Tertiary', editedColors.textTertiary, (color) => setEditedColors({ ...editedColors, textTertiary: color }))}

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Border Colors</Text>
        {renderColorInput('Border', editedColors.border, (color) => setEditedColors({ ...editedColors, border: color }))}
        {renderColorInput('Border Light', editedColors.borderLight, (color) => setEditedColors({ ...editedColors, borderLight: color }))}

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Icon Colors</Text>
        {renderColorInput('Icon', editedColors.icon, (color) => setEditedColors({ ...editedColors, icon: color }))}
        {renderColorInput('Icon Inactive', editedColors.iconInactive, (color) => setEditedColors({ ...editedColors, iconInactive: color }))}

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Background Colors</Text>
        {renderColorInput('BG700 (Main)', editedColors.background.bg700, (color) => setEditedColors({ ...editedColors, background: { ...editedColors.background, bg700: color } }))}
        {renderColorInput('BG500 (Medium)', editedColors.background.bg500, (color) => setEditedColors({ ...editedColors, background: { ...editedColors.background, bg500: color } }))}
        {renderColorInput('BG300 (Light)', editedColors.background.bg300, (color) => setEditedColors({ ...editedColors, background: { ...editedColors.background, bg300: color } }))}

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>White</Text>
        {renderColorInput('White', editedColors.white, (color) => setEditedColors({ ...editedColors, white: color }))}

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Additional Color Options</Text>
        {editedColors.ios && (
          <>
            {Object.entries(editedColors.ios).map(([key, value]) => (
              <View key={key} style={styles.iosColorRow}>
                <View style={styles.iosColorInputs}>
                  <TextInput
                    style={[styles.iosColorName, { color: currentColors.text, borderColor: currentColors.border }]}
                    value={key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                    onChangeText={(newName) => {
                      const camelCaseName = newName.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toLowerCase());
                      const updatedIos = { ...editedColors.ios! };
                      delete updatedIos[key as keyof typeof updatedIos];
                      updatedIos[camelCaseName as keyof typeof updatedIos] = value;
                      setEditedColors({ ...editedColors, ios: updatedIos });
                    }}
                    placeholder="Color name"
                    placeholderTextColor={currentColors.textTertiary}
                  />
                  <View style={[styles.colorPreview, { backgroundColor: value, borderColor: currentColors.border }]} />
                  <TextInput
                    style={[styles.colorInput, { color: currentColors.text, borderColor: currentColors.border }]}
                    value={value}
                    onChangeText={(color) => {
                      const updatedIos = { ...editedColors.ios!, [key]: color };
                      setEditedColors({ ...editedColors, ios: updatedIos });
                    }}
                    placeholder="#000000"
                    placeholderTextColor={currentColors.textTertiary}
                    maxLength={7}
                  />
                </View>
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => {
                    const updatedIos = { ...editedColors.ios! };
                    delete updatedIos[key as keyof typeof updatedIos];
                    setEditedColors({ ...editedColors, ios: updatedIos });
                  }}
                  iconColor={currentColors.error}
                />
              </View>
            ))}
            <Button
              mode="outlined"
              onPress={() => {
                const updatedIos = { ...editedColors.ios!, [`newColor${Object.keys(editedColors.ios!).length + 1}`]: '#000000' };
                setEditedColors({ ...editedColors, ios: updatedIos });
              }}
              style={styles.addColorButton}
              icon="plus"
            >
              Add Color
            </Button>
          </>
        )}
        {!editedColors.ios && (
          <Button
            mode="outlined"
            onPress={() => {
              setEditedColors({ ...editedColors, ios: { newColor1: '#000000' } });
            }}
            style={styles.addColorButton}
            icon="plus"
          >
            Add Additional Colors
          </Button>
        )}

        <Button
          mode="contained"
          onPress={handleSavePalette}
          style={styles.saveButton}
          loading={saving}
          disabled={saving}
        >
          {editMode === 'create' ? 'Create Palette' : 'Save Changes'}
        </Button>

        {editMode === 'edit' && isPredefined && isAdmin && (
          <Button
            mode="outlined"
            onPress={handleDuplicatePalette}
            style={styles.duplicateButton}
          >
            Duplicate as Custom Palette
          </Button>
        )}

        <Button
          mode="text"
          onPress={() => {
            setEditMode('view');
            setEditedColors(null);
          }}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </ScrollView>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: currentColors.text }]}>Color Palette Editor</Title>

        {editMode === 'view' && (
          <>
            {renderPaletteSelector()}

            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={handleCreateNew}
                style={styles.createButton}
                disabled={showDeleteConfirm}
              >
                Create New Palette
              </Button>

              <Button
                mode="outlined"
                onPress={() => setEditMode('edit')}
                style={styles.editButton}
                disabled={showDeleteConfirm}
              >
                Edit Selected Palette
              </Button>
            </View>
          </>
        )}

        {(editMode === 'edit' || editMode === 'create') && renderEditForm()}
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
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  paletteSelectorContainer: {
    marginBottom: 20,
  },
  paletteScrollView: {
    marginVertical: 10,
  },
  paletteCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 140,
  },
  paletteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paletteName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  paletteColors: {
    flexDirection: 'row',
    gap: 4,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
  },
  createButton: {
    paddingVertical: 5,
  },
  editButton: {
    paddingVertical: 5,
  },
  editFormContainer: {
    marginTop: 20,
  },
  nameInputContainer: {
    marginBottom: 10,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  colorLabel: {
    fontSize: 14,
    minWidth: 120,
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
  },
  colorInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    flex: 1,
  },
  saveButton: {
    paddingVertical: 5,
    marginTop: 30,
  },
  duplicateButton: {
    paddingVertical: 5,
    marginTop: 10,
  },
  cancelButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  warningContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  adminNoticeContainer: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  adminNoticeText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  iosColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iosColorInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  iosColorName: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    flex: 1,
    minWidth: 100,
  },
  addColorButton: {
    marginTop: 10,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorPickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  colorPicker: {
    width: 300,
    height: 300,
  },
  selectedColorContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedColorLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  selectedColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedColorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedColorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 5,
  },
  deleteConfirmContainer: {
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteConfirmMessage: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  deleteConfirm: {
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteDestructiveText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ColorPaletteEditorScreen;
