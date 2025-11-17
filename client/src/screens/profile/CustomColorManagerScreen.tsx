import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Button, Title, IconButton, Checkbox } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkCircle01Icon, Cancel01Icon, ArrowUp01Icon, ArrowDown01Icon, ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomColor, CustomColorPalette } from '../../types/customColors';
import { CustomDialog } from '../../components/CustomDialog';
import { settingsAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const CUSTOM_COLOR_PALETTES_KEY = 'custom_color_palettes';

const CustomColorManagerScreen = ({ navigation, route }: any) => {
  const { currentColors } = useTheme();
  const params = route?.params || {};
  const isEditing = !!params.paletteId;

  const [paletteName, setPaletteName] = useState<string>('');
  const [colors, setColors] = useState<CustomColor[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [colorToDelete, setColorToDelete] = useState<string | null>(null);
  const [savedPaletteId, setSavedPaletteId] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadPalette(params.paletteId);
      setSavedPaletteId(params.paletteId);
    } else {
      // Initialize with one default color
      addNewColor();
    }
  }, []);

  const loadPalette = async (paletteId: string) => {
    try {
      const response = await settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY);
      if (response?.data?.value) {
        const palettes: Record<string, CustomColorPalette> = response.data.value;
        const palette = palettes[paletteId];
        if (palette) {
          setPaletteName(palette.name);
          setColors(palette.colors);
        }
      }
    } catch (error) {
      console.error('Error loading palette:', error);
      setErrorMessage('Failed to load palette');
      setShowErrorDialog(true);
    }
  };

  const addNewColor = () => {
    const newColor: CustomColor = {
      id: `color_${Date.now()}`,
      name: '',
      hexCode: '#000000',
      isPrimary: colors.length === 0, // First color is primary by default
      isSecondary: false,
    };
    setColors([...colors, newColor]);
  };

  const updateColor = (id: string, field: keyof CustomColor, value: any) => {
    setColors(colors.map(color => {
      if (color.id === id) {
        // Update the field for this color
        return { ...color, [field]: value };
      } else {
        // If setting as primary/secondary on another color, unset it from this one
        if (field === 'isPrimary' && value === true) {
          return { ...color, isPrimary: false };
        }
        if (field === 'isSecondary' && value === true) {
          return { ...color, isSecondary: false };
        }
        return color;
      }
    }));
  };

  const confirmDeleteColor = (id: string) => {
    if (colors.length === 1) {
      setErrorMessage('You must have at least one color in your palette');
      setShowErrorDialog(true);
      return;
    }
    setColorToDelete(id);
    setShowDeleteDialog(true);
  };

  const deleteColor = () => {
    if (colorToDelete) {
      const colorBeingDeleted = colors.find(c => c.id === colorToDelete);
      const newColors = colors.filter(c => c.id !== colorToDelete);

      // If deleted color was primary/secondary, reassign to first color
      if (colorBeingDeleted?.isPrimary && newColors.length > 0) {
        newColors[0].isPrimary = true;
      }
      if (colorBeingDeleted?.isSecondary && newColors.length > 0 && !newColors[0].isPrimary) {
        newColors[0].isSecondary = true;
      }

      setColors(newColors);
    }
    setShowDeleteDialog(false);
    setColorToDelete(null);
  };

  const moveColorUp = (index: number) => {
    if (index === 0) return;
    const newColors = [...colors];
    [newColors[index - 1], newColors[index]] = [newColors[index], newColors[index - 1]];
    setColors(newColors);
  };

  const moveColorDown = (index: number) => {
    if (index === colors.length - 1) return;
    const newColors = [...colors];
    [newColors[index], newColors[index + 1]] = [newColors[index + 1], newColors[index]];
    setColors(newColors);
  };

  const validatePalette = (): boolean => {
    if (!paletteName.trim()) {
      setErrorMessage('Please enter a palette name');
      setShowErrorDialog(true);
      return false;
    }

    if (colors.length === 0) {
      setErrorMessage('Please add at least one color');
      setShowErrorDialog(true);
      return false;
    }

    // Check if all colors have names
    const unnamedColors = colors.filter(c => !c.name.trim());
    if (unnamedColors.length > 0) {
      setErrorMessage('All colors must have a name');
      setShowErrorDialog(true);
      return false;
    }

    // Check if all hex codes are valid
    const invalidHex = colors.filter(c => !/^#[0-9A-Fa-f]{6}$/.test(c.hexCode));
    if (invalidHex.length > 0) {
      setErrorMessage('All colors must have a valid hex code (e.g., #FF0000)');
      setShowErrorDialog(true);
      return false;
    }

    // Check for duplicate color names
    const colorNames = colors.map(c => c.name.trim().toLowerCase());
    const hasDuplicates = colorNames.length !== new Set(colorNames).size;
    if (hasDuplicates) {
      setErrorMessage('Color names must be unique');
      setShowErrorDialog(true);
      return false;
    }

    return true;
  };

  const savePalette = async () => {
    if (!validatePalette()) return;

    setSaving(true);
    try {
      const response = await settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY);
      const palettes: Record<string, CustomColorPalette> = response?.data?.value || {};

      const paletteId = isEditing ? params.paletteId : `palette_${Date.now()}`;
      const palette: CustomColorPalette = {
        id: paletteId,
        name: paletteName,
        colors: colors,
        createdAt: palettes[paletteId]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      palettes[paletteId] = palette;
      await settingsAPI.user.set(CUSTOM_COLOR_PALETTES_KEY, palettes);

      setSavedPaletteId(paletteId);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error saving palette:', error);
      setErrorMessage('Failed to save palette');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessOk = () => {
    setShowSuccessDialog(false);
    // Navigate to element mapper with the saved palette ID
    if (savedPaletteId) {
      navigation.navigate('ElementColorMapper', { paletteId: savedPaletteId });
    }
  };

  const renderColorCard = (color: CustomColor, index: number) => {
    return (
      <View key={color.id} style={[styles.colorCard, { backgroundColor: '#FFFFFF', borderColor: currentColors.borderLight }]}>
        <View style={styles.colorCardHeader}>
          <View style={styles.reorderButtons}>
            <TouchableOpacity
              onPress={() => moveColorUp(index)}
              disabled={index === 0}
              style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
            >
              <HugeiconsIcon
                icon={ArrowUp01Icon}
                size={20}
                color={index === 0 ? currentColors.textTertiary : currentColors.icon}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => moveColorDown(index)}
              disabled={index === colors.length - 1}
              style={[styles.reorderButton, index === colors.length - 1 && styles.reorderButtonDisabled]}
            >
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={20}
                color={index === colors.length - 1 ? currentColors.textTertiary : currentColors.icon}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.colorCardTitle, { color: currentColors.text }]}>Color {index + 1}</Text>
          <TouchableOpacity
            onPress={() => confirmDeleteColor(color.id)}
            style={{ padding: 8 }}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={20}
              color={currentColors.error}
            />
          </TouchableOpacity>
        </View>

        {/* Inline Form Row */}
        <View style={styles.inlineFormRow}>
          {/* Color Preview */}
          <View style={[styles.colorPreview, { backgroundColor: color.hexCode, borderColor: currentColors.border }]} />

          {/* Color Name Input */}
          <View style={styles.inlineInputContainer}>
            <Text style={[styles.inlineLabel, { color: currentColors.textSecondary }]}>Color Name</Text>
            <TextInput
              style={[styles.inlineInput, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: currentColors.background.bg700 }]}
              value={color.name}
              onChangeText={(text) => updateColor(color.id, 'name', text)}
              placeholder="e.g., Mood Pink"
              placeholderTextColor={currentColors.textTertiary}
            />
          </View>

          {/* Hex Code Input */}
          <View style={styles.inlineInputContainer}>
            <Text style={[styles.inlineLabel, { color: currentColors.textSecondary }]}>Hex Code</Text>
            <TextInput
              style={[styles.inlineInput, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: currentColors.background.bg700 }]}
              value={color.hexCode}
              onChangeText={(text) => {
                // Ensure it starts with #
                let formatted = text.trim();
                if (!formatted.startsWith('#')) {
                  formatted = '#' + formatted;
                }
                updateColor(color.id, 'hexCode', formatted);
              }}
              placeholder="#dd3e7f"
              placeholderTextColor={currentColors.textTertiary}
              maxLength={7}
              autoCapitalize="characters"
            />
          </View>

          {/* Primary Checkbox */}
          <TouchableOpacity
            style={styles.inlineCheckbox}
            onPress={() => updateColor(color.id, 'isPrimary', !color.isPrimary)}
          >
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={20}
              color={color.isPrimary ? currentColors.primary : currentColors.textTertiary}
            />
            <Text style={[styles.inlineCheckboxLabel, { color: currentColors.text }]}>Set as Primary Color</Text>
          </TouchableOpacity>

          {/* Secondary Checkbox */}
          <TouchableOpacity
            style={styles.inlineCheckbox}
            onPress={() => updateColor(color.id, 'isSecondary', !color.isSecondary)}
          >
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={20}
              color={color.isSecondary ? currentColors.secondary : currentColors.textTertiary}
            />
            <Text style={[styles.inlineCheckboxLabel, { color: currentColors.text }]}>Set as Secondary Color</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Text style={[styles.description, { color: currentColors.textSecondary }]}>
          Build your custom color palette by adding colors with custom names and hex codes.
          Select one color as primary and another as secondary.
        </Text>

        {/* Palette Name */}
        <View style={styles.paletteNameContainer}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Palette Name</Text>
          <TextInput
            style={[styles.paletteNameInput, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: '#FFFFFF' }]}
            value={paletteName}
            onChangeText={setPaletteName}
            placeholder="e.g., My Custom Theme"
            placeholderTextColor={currentColors.textTertiary}
          />
        </View>

        {/* Colors Section */}
        <View style={styles.colorsSection}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Your Colors</Text>

          {colors.map((color, index) => renderColorCard(color, index))}

          <Button
            mode="outlined"
            onPress={addNewColor}
            style={styles.addColorButton}
            icon="plus"
          >
            Add Another Color
          </Button>
        </View>

        {/* Action Buttons */}
        <Button
          mode="contained"
          onPress={savePalette}
          style={styles.saveButton}
          loading={saving}
          disabled={saving}
        >
          {isEditing ? 'Update Palette' : 'Save & Continue to Element Mapping'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={`Your color palette "${paletteName}" has been ${isEditing ? 'updated' : 'created'}! Now you can assign these colors to specific elements in your app.`}
        onDismiss={handleSuccessOk}
        buttons={[
          {
            text: 'Continue to Element Mapping',
            onPress: handleSuccessOk,
            style: 'default',
          },
        ]}
      />

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

      {/* Delete Confirmation Dialog */}
      <CustomDialog
        visible={showDeleteDialog}
        title="Delete Color"
        message="Are you sure you want to delete this color? This action cannot be undone."
        onDismiss={() => setShowDeleteDialog(false)}
        buttons={[
          {
            text: 'Cancel',
            onPress: () => setShowDeleteDialog(false),
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: deleteColor,
            style: 'destructive',
          },
        ]}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  paletteNameContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  paletteNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  colorsSection: {
    marginBottom: 20,
  },
  colorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    marginBottom: 15,
  },
  colorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  colorCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  reorderButtons: {
    flexDirection: 'column',
    gap: 4,
    marginRight: 12,
  },
  reorderButton: {
    padding: 4,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  hexInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  checkboxContainer: {
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  inlineFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  inlineInputContainer: {
    flex: 1,
    minWidth: 150,
  },
  inlineLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  inlineInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
  },
  inlineCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineCheckboxLabel: {
    fontSize: 13,
  },
  addColorButton: {
    marginTop: 10,
    paddingVertical: 5,
  },
  saveButton: {
    paddingVertical: 5,
    marginTop: 30,
  },
  cancelButton: {
    marginTop: 10,
    marginBottom: 20,
  },
});

export default CustomColorManagerScreen;
