import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, TouchableOpacity, Modal, Platform } from 'react-native';
import { Button, Title, Menu, IconButton } from 'react-native-paper';
import { ColorPicker } from 'react-native-color-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { colorPalettes, ColorPaletteName, ColorPalette } from '../../theme/colorPalettes';
import { CustomDialog } from '../../components/CustomDialog';
import { settingsAPI } from '../../services/api';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { DragDropList02Icon, ArrowUp01Icon, ArrowDown01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { ColorPaletteEditorScreenProps } from '../../types/navigation';
import { logger } from '../../utils/logger';
import { apiWithTimeout, TIMEOUT_DURATIONS } from '../../utils/apiWithTimeout';

const CUSTOM_PALETTES_KEY = 'custom_palettes';

const ColorPaletteEditorScreen = React.memo(({ navigation, route }: ColorPaletteEditorScreenProps) => {
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
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [activeColorField, setActiveColorField] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState<string>('#000000');
  const [currentColorOnChange, setCurrentColorOnChange] = useState<((color: string) => void) | null>(null);

  // Dialog state variables
  const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [successCallback, setSuccessCallback] = useState<(() => void) | null>(null);

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

  const loadCustomPalettes = useCallback(async () => {
    try {
      if (!user) return;

      const response = await apiWithTimeout(settingsAPI.user.get(CUSTOM_PALETTES_KEY), TIMEOUT_DURATIONS.QUICK) as any;
      if (response?.data?.value) {
        const palettes: Record<string, ColorPalette> = response.data.value;
        setCustomPalettes(palettes);
        logger.log('Custom palettes loaded successfully', { count: Object.keys(palettes).length }, 'ColorPaletteEditorScreen');
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        logger.error('Error loading custom palettes:', error, 'ColorPaletteEditorScreen');
      }
    }
  }, [user]);

  const saveCustomPalettes = useCallback(async (palettes: Record<string, ColorPalette>) => {
    try {
      if (!user) throw new Error('User not logged in');

      await apiWithTimeout(settingsAPI.user.set(CUSTOM_PALETTES_KEY, palettes), TIMEOUT_DURATIONS.STANDARD);
      setCustomPalettes(palettes);
      // Reload custom palettes in ThemeContext
      await reloadThemeCustomPalettes();
      logger.log('Custom palettes saved successfully', { count: Object.keys(palettes).length }, 'ColorPaletteEditorScreen');

    } catch (error: any) {
      logger.error('Error saving custom palettes:', error, 'ColorPaletteEditorScreen');
      throw error;
    }
  }, [user, reloadThemeCustomPalettes]);

  const handleSavePalette = useCallback(async () => {
    if (!editedColors) return;

    setSaving(true);
    try {
      if (editMode === 'create') {
        if (!newPaletteName.trim()) {
          setErrorMessage('Please enter a palette name');
          setShowErrorDialog(true);
          setSaving(false);
          logger.warn('Palette save failed: Empty palette name', {}, 'ColorPaletteEditorScreen');
          return;
        }
        const customId = `custom_${Date.now()}`;
        const newPalette = { ...editedColors, id: customId as ColorPaletteName, name: newPaletteName };
        const updatedPalettes = { ...customPalettes, [customId]: newPalette };
        await saveCustomPalettes(updatedPalettes);
        setEditingPalette(customId);
        await setSelectedPalette(customId as ColorPaletteName);
        setSuccessMessage('Custom palette created successfully!');
        setSuccessCallback(() => () => navigation.goBack());
        setShowSuccessDialog(true);
        logger.log('Custom palette created successfully', { paletteName: newPaletteName }, 'ColorPaletteEditorScreen');
      } else {
        const isPredefined = colorPalettes[editingPalette as ColorPaletteName];

        // Non-admins cannot edit predefined palettes
        if (isPredefined && !isAdmin) {
          setErrorMessage('Cannot modify predefined palettes. Please duplicate the palette to create a custom version you can edit.');
          setShowErrorDialog(true);
          setSaving(false);
          logger.warn('Non-admin attempted to edit predefined palette', { palette: editingPalette }, 'ColorPaletteEditorScreen');
          return;
        }

        // Admins can edit predefined palettes - save as custom override
        if (isPredefined && isAdmin) {
          const updatedPalettes = { ...customPalettes, [editingPalette]: editedColors };
          await saveCustomPalettes(updatedPalettes);
          setSuccessMessage('Predefined palette override saved successfully!');
          setSuccessCallback(() => () => navigation.goBack());
          setShowSuccessDialog(true);
          logger.log('Admin override saved for predefined palette', { palette: editingPalette }, 'ColorPaletteEditorScreen');
        } else {
          // Editing an existing custom palette
          const updatedPalettes = { ...customPalettes, [editingPalette]: editedColors };
          await saveCustomPalettes(updatedPalettes);
          setSuccessMessage('Palette updated successfully!');
          setSuccessCallback(() => () => navigation.goBack());
          setShowSuccessDialog(true);
          logger.log('Custom palette updated successfully', { palette: editingPalette }, 'ColorPaletteEditorScreen');
        }
      }
    } catch (error: any) {
      logger.error('Error saving palette:', error, 'ColorPaletteEditorScreen');
      setErrorMessage('Failed to save palette');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  }, [editedColors, editMode, newPaletteName, customPalettes, saveCustomPalettes, editingPalette, isAdmin, setSelectedPalette, navigation]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
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
      logger.log('Palette deleted successfully', { palette: paletteToDelete }, 'ColorPaletteEditorScreen');
    } catch (error: any) {
      logger.error('Delete palette error:', error, 'ColorPaletteEditorScreen');
      setShowDeleteConfirm(false);
    }
  }, [editingPalette, customPalettes, saveCustomPalettes, selectedPalette, setSelectedPalette]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleCreateNew = useCallback(() => {
    setNewPaletteName('');
    setEditMode('create');
  }, []);

  const handleDuplicatePalette = useCallback(() => {
    if (!editedColors) return;

    const paletteBeingEdited = customPalettes[editingPalette] || colorPalettes[editingPalette as ColorPaletteName];
    if (!paletteBeingEdited) return;

    setNewPaletteName(`${paletteBeingEdited.name} (Copy)`);
    setEditedColors(JSON.parse(JSON.stringify(paletteBeingEdited)));
    setEditMode('create');
    logger.log('Palette duplicated for editing', { palette: editingPalette }, 'ColorPaletteEditorScreen');
  }, [editedColors, customPalettes, editingPalette]);

  const openColorPickerForField = (fieldName: string, currentValue: string, onChange: (color: string) => void) => {
    setActiveColorField(fieldName);
    setTempColor(currentValue);
    setCurrentColorOnChange(() => onChange);
    setShowColorPicker(true);
  };

  const handleColorPickerSave = () => {
    if (activeColorField && currentColorOnChange) {
      currentColorOnChange(tempColor);
    }
    setShowColorPicker(false);
    setActiveColorField(null);
    setCurrentColorOnChange(null);
  };

  const handleColorPickerCancel = () => {
    setShowColorPicker(false);
    setActiveColorField(null);
    setCurrentColorOnChange(null);
  };

  const renderColorInput = (label: string, value: string, onChange: (color: string) => void) => {
    return (
      <View style={styles.colorInputRow}>
        <Text style={[styles.colorLabel, { color: currentColors.textSecondary }]}>{label}:</Text>
        <View style={styles.colorInputContainer}>
          <TouchableOpacity
            style={[styles.colorPreview, { backgroundColor: value, borderColor: currentColors.border }]}
            onPress={() => openColorPickerForField(label, value, onChange)}
          />
          <TextInput
            style={[styles.colorInput, { color: currentColors.text, borderColor: currentColors.border }]}
            value={value}
            onChangeText={onChange}
            placeholder="#000000"
            placeholderTextColor={currentColors.textTertiary}
            maxLength={7}
          />
          <Button
            mode="outlined"
            onPress={() => openColorPickerForField(label, value, onChange)}
            style={styles.colorPickerButton}
            compact
          >
            Pick
          </Button>
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

      <Modal
        visible={showColorPicker}
        transparent
        animationType="fade"
        onRequestClose={handleColorPickerCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background.bg700 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentColors.text, flex: 1 }]}>
                Select Color for {activeColorField}
              </Text>
              <IconButton
                icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
                onPress={handleColorPickerCancel}
              />
            </View>

            <View style={styles.colorPickerContainer}>
              <ColorPicker
                color={tempColor}
                onColorChange={(color) => setTempColor(color)}
                style={styles.colorPicker}
                hideSliders={false}
              />
            </View>

            <View style={styles.selectedColorContainer}>
              <Text style={[styles.selectedColorLabel, { color: currentColors.textSecondary }]}>
                Selected Color:
              </Text>
              <View style={styles.selectedColorRow}>
                <View style={[styles.selectedColorPreview, { backgroundColor: tempColor, borderColor: currentColors.border }]} />
                <Text style={[styles.selectedColorText, { color: currentColors.text }]}>
                  {tempColor.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={handleColorPickerCancel}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleColorPickerSave}
                style={styles.modalButton}
              >
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>

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

      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        onDismiss={() => {
          setShowSuccessDialog(false);
          if (successCallback) successCallback();
        }}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setShowSuccessDialog(false);
              if (successCallback) successCallback();
            },
            style: 'default',
          },
        ]}
      />
    </ScrollView>
  );
});

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
  colorPickerButton: {
    minWidth: 60,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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

ColorPaletteEditorScreen.displayName = 'ColorPaletteEditorScreen';

export default ColorPaletteEditorScreen;
