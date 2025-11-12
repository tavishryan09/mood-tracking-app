import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Button, Title, Card, IconButton, Chip } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCustomColorTheme } from '../../contexts/CustomColorThemeContext';
import { CustomColorPalette } from '../../types/customColors';
import { CustomDialog } from '../../components/CustomDialog';
import { settingsAPI } from '../../services/api';

const CUSTOM_COLOR_PALETTES_KEY = 'custom_color_palettes';

const ManageCustomThemesScreen = ({ navigation }: any) => {
  const { currentColors } = useTheme();
  const { user } = useAuth();
  const {
    customColorPalettes,
    activeCustomTheme,
    isUsingCustomTheme,
    setActiveCustomTheme,
    disableCustomTheme,
    loadCustomColorPalettes,
    reloadCustomTheme,
  } = useCustomColorTheme();

  const [palettes, setPalettes] = useState<Record<string, CustomColorPalette>>({});
  const [sharedPalettes, setSharedPalettes] = useState<Record<string, CustomColorPalette>>({});
  const [activating, setActivating] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [defaultThemeId, setDefaultThemeId] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<boolean>(false);
  const [sharingTheme, setSharingTheme] = useState<string | null>(null);

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [paletteToDelete, setPaletteToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadPalettes();
    loadDefaultTheme();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPalettes();
      loadDefaultTheme();
      reloadCustomTheme();
    });
    return unsubscribe;
  }, [navigation]);

  const loadPalettes = async () => {
    try {
      if (!user) return;

      // Load user's personal palettes
      try {
        const response = await settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY);
        if (response?.data?.value) {
          const loadedPalettes: Record<string, CustomColorPalette> = response.data.value;
          setPalettes(loadedPalettes);
        } else {
          setPalettes({});
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          console.error('Error loading user palettes:', error);
        }
        setPalettes({});
      }

      // Load shared palettes from app settings (available to all users)
      try {
        const sharedResponse = await settingsAPI.app.get('shared_custom_themes');
        if (sharedResponse?.data?.value) {
          const loadedSharedPalettes: Record<string, CustomColorPalette> = sharedResponse.data.value;
          setSharedPalettes(loadedSharedPalettes);
        } else {
          setSharedPalettes({});
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          console.error('Error loading shared palettes:', error);
        }
        setSharedPalettes({});
      }
    } catch (error: any) {
      console.error('Error in loadPalettes:', error);
    }
  };

  const loadDefaultTheme = async () => {
    try {
      const response = await settingsAPI.app.get('default_custom_theme');
      if (response.data?.value) {
        setDefaultThemeId(response.data.value);
      } else {
        setDefaultThemeId(null);
      }
    } catch (error: any) {
      // 404 means no default theme is set
      if (error.response?.status === 404) {
        setDefaultThemeId(null);
      } else {
        console.error('Error loading default theme:', error);
      }
    }
  };

  const handleSetAsDefault = async (paletteId: string) => {
    if (user?.role !== 'ADMIN') {
      setErrorMessage('Only administrators can set the default theme for all users');
      setShowErrorDialog(true);
      return;
    }

    setSettingDefault(true);
    try {
      // Get the palette and its element mapping
      const palette = palettes[paletteId];
      if (!palette) {
        throw new Error('Palette not found');
      }

      // Get element mapping
      const mappingsResponse = await settingsAPI.user.get('element_color_mapping');
      if (!mappingsResponse?.data?.value?.[paletteId]) {
        throw new Error('Element mapping not found for this palette. Please map elements first.');
      }
      const mapping = mappingsResponse.data.value[paletteId];

      // Convert custom theme to base ColorPalette structure
      // This creates actual color values that users without custom themes will see
      const getColorByIdFromPalette = (colorId: string): string => {
        const color = palette.colors.find(c => c.id === colorId);
        return color?.hexCode || '#000000';
      };

      const defaultColorPalette = {
        id: 'default',
        name: 'Default',
        // Global colors
        primary: getColorByIdFromPalette(mapping.global.primaryButton),
        secondary: getColorByIdFromPalette(mapping.global.secondaryButton),
        text: getColorByIdFromPalette(mapping.global.textPrimary),
        textSecondary: getColorByIdFromPalette(mapping.global.textSecondary),
        textTertiary: getColorByIdFromPalette(mapping.global.textTertiary),
        border: getColorByIdFromPalette(mapping.global.borderColor),
        borderLight: getColorByIdFromPalette(mapping.global.borderColor), // Reuse border color
        icon: getColorByIdFromPalette(mapping.global.iconDefault),
        iconInactive: getColorByIdFromPalette(mapping.global.iconInactive),
        white: getColorByIdFromPalette(mapping.global.cardBackground),
        error: getColorByIdFromPalette(mapping.global.errorColor),
        success: getColorByIdFromPalette(mapping.global.successColor),
        warning: getColorByIdFromPalette(mapping.global.warningColor),
        // Background colors
        background: {
          bg700: getColorByIdFromPalette(mapping.global.background),
          bg500: getColorByIdFromPalette(mapping.planningGrid?.dateCellBackground || mapping.global.background),
          bg300: getColorByIdFromPalette(mapping.planningGrid?.teamMemberCellBackground || mapping.global.background),
        },
        // Status colors (use project colors if available, otherwise fallback)
        status: {
          active: getColorByIdFromPalette(mapping.projects?.statusActiveColor || mapping.global.successColor),
          onHold: getColorByIdFromPalette(mapping.projects?.statusOnHoldColor || mapping.global.warningColor),
          completed: getColorByIdFromPalette(mapping.projects?.statusCompletedColor || mapping.global.primaryButton),
          archived: getColorByIdFromPalette(mapping.projects?.statusArchivedColor || mapping.global.iconInactive),
        },
        // Planning colors
        planning: {
          marketingTask: getColorByIdFromPalette(mapping.planningTasks.marketingTaskBackground),
          outOfOffice: getColorByIdFromPalette(mapping.planningTasks.outOfOfficeBackground),
          outOfOfficeFont: getColorByIdFromPalette(mapping.planningTasks.outOfOfficeText),
          unavailable: getColorByIdFromPalette(mapping.planningTasks?.unavailableBackground || mapping.global.iconInactive),
          timeOff: getColorByIdFromPalette(mapping.planningTasks?.timeOffBackground || mapping.global.successColor),
          deadline: getColorByIdFromPalette(mapping.planningTasks?.deadlineBackground || mapping.global.errorColor),
          internalDeadline: getColorByIdFromPalette(mapping.planningTasks?.internalDeadlineBackground || mapping.global.warningColor),
          milestone: getColorByIdFromPalette(mapping.planningTasks?.milestoneBackground || mapping.global.primaryButton),
        },
      };

      // Save this as the actual default color palette that will be used by non-custom-theme users
      await settingsAPI.app.set('default_color_palette', defaultColorPalette);

      // Also keep the theme ID for reference (so we can show which theme is default in UI)
      await settingsAPI.app.set('default_custom_theme', paletteId);

      setDefaultThemeId(paletteId);
      setSuccessMessage('This theme\'s colors are now applied as the default for all users who haven\'t selected their own theme. They will see these exact colors.');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Error setting default theme:', error);
      setErrorMessage(error.message || 'Failed to set default theme');
      setShowErrorDialog(true);
    } finally {
      setSettingDefault(false);
    }
  };

  const handleClearDefault = async () => {
    if (user?.role !== 'ADMIN') {
      setErrorMessage('Only administrators can clear the default theme');
      setShowErrorDialog(true);
      return;
    }

    setSettingDefault(true);
    try {
      // Clear both the theme ID and the actual default color palette
      await settingsAPI.app.delete('default_custom_theme');
      await settingsAPI.app.delete('default_color_palette');

      setDefaultThemeId(null);
      setSuccessMessage('Default theme cleared. Users will now use the hardcoded default theme');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error clearing default theme:', error);
      setErrorMessage('Failed to clear default theme');
      setShowErrorDialog(true);
    } finally {
      setSettingDefault(false);
    }
  };

  const handleShareWithAllUsers = async (paletteId: string) => {
    if (user?.role !== 'ADMIN') {
      setErrorMessage('Only administrators can share themes with all users');
      setShowErrorDialog(true);
      return;
    }

    setSharingTheme(paletteId);
    try {
      // Get the palette and mapping from user settings
      const palette = palettes[paletteId];
      if (!palette) {
        throw new Error('Palette not found');
      }

      // Get element mapping
      const mappingsResponse = await settingsAPI.user.get('element_color_mapping');
      if (!mappingsResponse?.data?.value?.[paletteId]) {
        throw new Error('Element mapping not found for this palette. Please map elements first.');
      }

      // Load existing shared themes
      let sharedThemes: Record<string, CustomColorPalette> = {};
      let sharedMappings: any = {};
      try {
        const sharedResponse = await settingsAPI.app.get('shared_custom_themes');
        if (sharedResponse?.data?.value) {
          sharedThemes = sharedResponse.data.value;
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) throw error;
      }

      try {
        const mappingResponse = await settingsAPI.app.get('shared_element_mappings');
        if (mappingResponse?.data?.value) {
          sharedMappings = mappingResponse.data.value;
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) throw error;
      }

      // Add this theme to shared themes
      sharedThemes[paletteId] = palette;
      sharedMappings[paletteId] = mappingsResponse.data.value[paletteId];

      // Save to app settings
      await settingsAPI.app.set('shared_custom_themes', sharedThemes);
      await settingsAPI.app.set('shared_element_mappings', sharedMappings);

      // Reload palettes to show the updated shared status
      await loadPalettes();

      setSuccessMessage(`"${palette.name}" is now shared with all users and will appear in their theme selection.`);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Error sharing theme:', error);
      setErrorMessage(error.message || 'Failed to share theme with all users');
      setShowErrorDialog(true);
    } finally {
      setSharingTheme(null);
    }
  };

  const handleUnshareFromAllUsers = async (paletteId: string) => {
    if (user?.role !== 'ADMIN') {
      setErrorMessage('Only administrators can unshare themes');
      setShowErrorDialog(true);
      return;
    }

    setSharingTheme(paletteId);
    try {
      // Get the palette name before removing
      const palette = sharedPalettes[paletteId];
      if (!palette) {
        throw new Error('Shared palette not found');
      }

      // Load existing shared themes and remove this one
      let sharedThemes: Record<string, CustomColorPalette> = {};
      let sharedMappings: any = {};

      try {
        const sharedResponse = await settingsAPI.app.get('shared_custom_themes');
        if (sharedResponse?.data?.value) {
          sharedThemes = sharedResponse.data.value;
          delete sharedThemes[paletteId]; // Remove this theme
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) throw error;
      }

      try {
        const mappingResponse = await settingsAPI.app.get('shared_element_mappings');
        if (mappingResponse?.data?.value) {
          sharedMappings = mappingResponse.data.value;
          delete sharedMappings[paletteId]; // Remove this mapping
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) throw error;
      }

      // Save updated shared themes (without the removed theme)
      await settingsAPI.app.set('shared_custom_themes', sharedThemes);
      await settingsAPI.app.set('shared_element_mappings', sharedMappings);

      // Reload palettes to show the updated shared status
      await loadPalettes();

      setSuccessMessage(`"${palette.name}" is no longer shared. Users will not see it in their theme selection.`);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Error unsharing theme:', error);
      setErrorMessage(error.message || 'Failed to unshare theme');
      setShowErrorDialog(true);
    } finally {
      setSharingTheme(null);
    }
  };

  const handleActivateTheme = async (paletteId: string, isShared: boolean = false) => {
    setActivating(true);
    try {
      // Pass explicit source to avoid loading wrong theme when IDs collide
      const source = isShared ? 'shared' : 'user';
      await setActiveCustomTheme(paletteId, true, source);
      await reloadCustomTheme(); // Reload to update the active theme state
      setSuccessMessage('Custom theme activated successfully! Your colors are now applied throughout the app.');
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Error activating theme:', error);
      setErrorMessage(error.message || 'Failed to activate theme. Make sure you have mapped colors to elements for this palette.');
      setShowErrorDialog(true);
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivateTheme = async () => {
    setActivating(true);
    try {
      await disableCustomTheme();
      setSuccessMessage('Custom theme deactivated. Using default theme.');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error deactivating theme:', error);
      setErrorMessage('Failed to deactivate theme');
      setShowErrorDialog(true);
    } finally {
      setActivating(false);
    }
  };

  const confirmDelete = (paletteId: string) => {
    setPaletteToDelete(paletteId);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!paletteToDelete || !user) return;

    setDeleting(paletteToDelete);
    try {
      const response = await settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY);
      if (response?.data?.value) {
        const loadedPalettes: Record<string, CustomColorPalette> = response.data.value;
        delete loadedPalettes[paletteToDelete];
        await settingsAPI.user.set(CUSTOM_COLOR_PALETTES_KEY, loadedPalettes);
        setPalettes(loadedPalettes);

        // If this was the active theme, deactivate it
        if (activeCustomTheme?.paletteId === paletteToDelete) {
          await disableCustomTheme();
        }

        setSuccessMessage('Color palette deleted successfully');
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error('Error deleting palette:', error);
      setErrorMessage('Failed to delete palette');
      setShowErrorDialog(true);
    } finally {
      setDeleting(null);
      setPaletteToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const renderPaletteCard = (paletteId: string, palette: CustomColorPalette, isShared: boolean = false) => {
    // Check if this theme is active by matching both paletteId AND source
    const expectedSource = isShared ? 'shared' : 'user';
    const isActive = activeCustomTheme?.paletteId === paletteId &&
                     activeCustomTheme?.source === expectedSource &&
                     isUsingCustomTheme;
    const isDefault = defaultThemeId === paletteId;
    const primaryColor = palette.colors.find(c => c.isPrimary);
    const secondaryColor = palette.colors.find(c => c.isSecondary);

    return (
      <Card
        key={paletteId}
        style={[
          styles.paletteCard,
          {
            backgroundColor: '#FFFFFF',
            borderColor: isActive ? currentColors.primary : currentColors.borderLight,
            borderWidth: isActive ? 2 : 1,
          },
        ]}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.paletteName, { color: currentColors.text }]}>{palette.name}</Text>
              <View style={styles.badgeContainer}>
                {isActive && (
                  <Chip mode="flat" compact style={{ backgroundColor: currentColors.primary, marginRight: 4 }}>
                    <Text style={{ color: currentColors.white }}>Active</Text>
                  </Chip>
                )}
                {isDefault && (
                  <Chip mode="flat" compact style={{ backgroundColor: currentColors.secondary, marginRight: 4 }}>
                    <Text style={{ color: currentColors.white }}>Default</Text>
                  </Chip>
                )}
                {isShared && (
                  <Chip mode="flat" compact style={{ backgroundColor: '#4CAF50' }}>
                    <Text style={{ color: currentColors.white }}>Shared</Text>
                  </Chip>
                )}
              </View>
            </View>
            {!isShared && (
              <IconButton
                icon="delete"
                size={20}
                onPress={() => confirmDelete(paletteId)}
                iconColor={currentColors.error}
                disabled={deleting === paletteId || isDefault}
              />
            )}
          </View>

          <View style={styles.colorsPreview}>
            {palette.colors.slice(0, 5).map((color) => (
              <View key={color.id} style={styles.colorPreviewContainer}>
                <View
                  style={[
                    styles.colorPreview,
                    {
                      backgroundColor: color.hexCode,
                      borderColor: currentColors.border,
                    },
                  ]}
                />
                {color.isPrimary && <Text style={[styles.colorBadge, { color: currentColors.primary }]}>P</Text>}
                {color.isSecondary && <Text style={[styles.colorBadge, { color: currentColors.secondary }]}>S</Text>}
              </View>
            ))}
            {palette.colors.length > 5 && (
              <Text style={[styles.moreColors, { color: currentColors.textSecondary }]}>
                +{palette.colors.length - 5} more
              </Text>
            )}
          </View>

          <View style={styles.cardActions}>
            {!isActive && (
              <Button
                mode="contained"
                onPress={() => handleActivateTheme(paletteId, isShared)}
                style={styles.actionButton}
                loading={activating}
                disabled={activating}
              >
                Activate
              </Button>
            )}
            {isActive && (
              <Button
                mode="outlined"
                onPress={handleDeactivateTheme}
                style={styles.actionButton}
                loading={activating}
                disabled={activating}
              >
                Deactivate
              </Button>
            )}
            {/* Only show edit buttons for user's own themes, not shared ones */}
            {!isShared && (
              <>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('CustomColorManager', { paletteId })}
                  style={styles.actionButton}
                >
                  Edit Colors
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('ElementColorMapper', { paletteId })}
                  style={styles.actionButton}
                >
                  Map Elements
                </Button>
              </>
            )}
            {/* Admin buttons */}
            {user?.role === 'ADMIN' && !isShared && !isDefault && (
              <Button
                mode="outlined"
                onPress={() => handleSetAsDefault(paletteId)}
                style={[styles.actionButton, { borderColor: currentColors.secondary }]}
                loading={settingDefault}
                disabled={settingDefault}
                textColor={currentColors.secondary}
              >
                Set as Default
              </Button>
            )}
            {user?.role === 'ADMIN' && isDefault && (
              <Button
                mode="outlined"
                onPress={handleClearDefault}
                style={[styles.actionButton, { borderColor: currentColors.error }]}
                loading={settingDefault}
                disabled={settingDefault}
                textColor={currentColors.error}
              >
                Clear Default
              </Button>
            )}
            {user?.role === 'ADMIN' && !isShared && (
              <Button
                mode="outlined"
                onPress={() => handleShareWithAllUsers(paletteId)}
                style={[styles.actionButton, { borderColor: '#4CAF50' }]}
                loading={sharingTheme === paletteId}
                disabled={sharingTheme === paletteId}
                textColor="#4CAF50"
                icon="share-variant"
              >
                Share with All Users
              </Button>
            )}
            {user?.role === 'ADMIN' && isShared && (
              <Button
                mode="outlined"
                onPress={() => handleUnshareFromAllUsers(paletteId)}
                style={[styles.actionButton, { borderColor: currentColors.error }]}
                loading={sharingTheme === paletteId}
                disabled={sharingTheme === paletteId}
                textColor={currentColors.error}
                icon="share-off"
              >
                Unshare
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            iconColor={currentColors.text}
            style={styles.backButton}
          />
          <Title style={[styles.title, { color: currentColors.text }]}>Manage Custom Themes</Title>
          <View style={styles.placeholder} />
        </View>

        <Text style={[styles.description, { color: currentColors.textSecondary }]}>
          Activate a custom color theme to apply your personalized colors throughout the app.
        </Text>

        {Object.keys(palettes).length === 0 && Object.keys(sharedPalettes).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
              You haven't created any custom color palettes yet.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CustomColorManager')}
              style={styles.createButton}
              icon="plus"
            >
              Create Your First Palette
            </Button>
          </View>
        ) : (
          <>
            {/* User's own themes */}
            {Object.keys(palettes).length > 0 && (
              <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 16 }]}>
                Your Themes
              </Text>
            )}
            {Object.entries(palettes).map(([paletteId, palette]) => renderPaletteCard(paletteId, palette, false))}

            {/* Shared themes */}
            {Object.keys(sharedPalettes).length > 0 && (
              <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 24 }]}>
                Shared Themes
              </Text>
            )}
            {Object.entries(sharedPalettes).map(([paletteId, palette]) => renderPaletteCard(paletteId, palette, true))}

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('CustomColorManager')}
              style={styles.createNewButton}
              icon="plus"
            >
              Create New Palette
            </Button>
          </>
        )}
      </View>

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        onDismiss={() => setShowSuccessDialog(false)}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowSuccessDialog(false),
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
        title="Delete Color Palette"
        message="Are you sure you want to delete this color palette? This action cannot be undone."
        onDismiss={() => setShowDeleteDialog(false)}
        buttons={[
          {
            text: 'Cancel',
            onPress: () => setShowDeleteDialog(false),
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: handleDelete,
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    margin: 0,
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 24,
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    paddingVertical: 5,
  },
  paletteCard: {
    borderRadius: 12,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paletteName: {
    fontSize: 18,
    fontWeight: '600',
  },
  colorsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  colorPreviewContainer: {
    alignItems: 'center',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  colorBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  moreColors: {
    fontSize: 12,
    marginLeft: 5,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 2,
  },
  createNewButton: {
    paddingVertical: 5,
    marginTop: 20,
    marginBottom: 20,
  },
});

export default ManageCustomThemesScreen;
