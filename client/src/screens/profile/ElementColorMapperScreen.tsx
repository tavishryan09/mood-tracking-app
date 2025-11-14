import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Button, Title, Menu, Divider, Chip, IconButton } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomColor, CustomColorPalette, ElementColorMapping, ElementLabels } from '../../types/customColors';
import { CustomDialog } from '../../components/CustomDialog';
import { settingsAPI } from '../../services/api';

const CUSTOM_COLOR_PALETTES_KEY = 'custom_color_palettes';
const ELEMENT_COLOR_MAPPING_KEY = 'element_color_mapping';

const ElementColorMapperScreen = ({ navigation, route }: any) => {
  const { currentColors } = useTheme();
  const { paletteId } = route.params;

  const [palette, setPalette] = useState<CustomColorPalette | null>(null);
  const [elementMapping, setElementMapping] = useState<ElementColorMapping | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadPalette();
  }, [paletteId]);

  useEffect(() => {
    if (palette) {
      loadElementMapping();
    }
  }, [palette]);

  const loadPalette = async () => {
    try {
      const response = await settingsAPI.user.get(CUSTOM_COLOR_PALETTES_KEY);
      if (response?.data?.value) {
        const palettes: Record<string, CustomColorPalette> = response.data.value;
        const loadedPalette = palettes[paletteId];
        if (loadedPalette) {
          setPalette(loadedPalette);
        } else {
          setErrorMessage('Palette not found');
          setShowErrorDialog(true);
        }
      }
    } catch (error) {
      console.error('Error loading palette:', error);
      setErrorMessage('Failed to load palette');
      setShowErrorDialog(true);
    }
  };

  const loadElementMapping = async () => {
    try {
      const response = await settingsAPI.user.get(ELEMENT_COLOR_MAPPING_KEY);
      if (response?.data?.value) {
        const mappings = response.data.value;
        if (mappings[paletteId]) {
          const loadedMapping = mappings[paletteId];

          // Check if desktopNavigation exists, if not add defaults
          if (!loadedMapping.desktopNavigation && palette) {
            const primaryColor = palette.colors.find(c => c.isPrimary) || palette.colors[0];
            const textColor = palette.colors.find(c => c.name.toLowerCase().includes('black') || c.name.toLowerCase().includes('dark')) || palette.colors[0];
            const bgColor = palette.colors.find(c => c.name.toLowerCase().includes('white') || c.name.toLowerCase().includes('light')) || palette.colors[0];

            loadedMapping.desktopNavigation = {
              drawerBackground: bgColor.id,
              drawerActiveItemBackground: primaryColor.id,
              drawerInactiveItemBackground: bgColor.id,
              drawerActiveItemText: bgColor.id,
              drawerInactiveItemText: textColor.id,
              drawerActiveItemIcon: bgColor.id,
              drawerInactiveItemIcon: textColor.id,
              drawerDividerColor: textColor.id,
              drawerHeaderBackground: primaryColor.id,
              drawerHeaderText: bgColor.id,
            };

            // Save the updated mapping
            mappings[paletteId] = loadedMapping;
            await settingsAPI.user.set(ELEMENT_COLOR_MAPPING_KEY, mappings);
          }

          // Check if planningGrid exists, if not add defaults
          if (!loadedMapping.planningGrid && palette) {
            const primaryColor = palette.colors.find(c => c.isPrimary) || palette.colors[0];
            const textColor = palette.colors.find(c => c.name.toLowerCase().includes('black') || c.name.toLowerCase().includes('dark')) || palette.colors[0];
            const bgColor = palette.colors.find(c => c.name.toLowerCase().includes('white') || c.name.toLowerCase().includes('light')) || palette.colors[0];

            loadedMapping.planningGrid = {
              headerBackground: bgColor.id,
              headerText: textColor.id,
              headerIcon: primaryColor.id,
              settingsIconColor: bgColor.id,
              dateCellBackground: bgColor.id,
              dateCellText: textColor.id,
              deadlinesRowBackground: bgColor.id,
              deadlinesRowText: textColor.id,
              teamMemberCellBackground: bgColor.id,
              teamMemberCellText: textColor.id,
              weekdayHeaderBackground: bgColor.id,
              weekdayHeaderText: textColor.id,
              weekendHeaderBackground: primaryColor.id,
              weekendHeaderText: bgColor.id,
              weekdayCellBackground: bgColor.id,
              weekendCellBackground: bgColor.id,
              headerBorderColor: textColor.id,
              cellBorderColor: textColor.id,
            };

            // Save the updated mapping
            mappings[paletteId] = loadedMapping;
            await settingsAPI.user.set(ELEMENT_COLOR_MAPPING_KEY, mappings);
          }

          // Add missing header fields to existing planningGrid mappings
          if (loadedMapping.planningGrid && palette && (!loadedMapping.planningGrid.headerBackground || !loadedMapping.planningGrid.settingsIconColor)) {
            const primaryColor = palette.colors.find(c => c.isPrimary) || palette.colors[0];
            const textColor = palette.colors.find(c => c.name.toLowerCase().includes('black') || c.name.toLowerCase().includes('dark')) || palette.colors[0];
            const bgColor = palette.colors.find(c => c.name.toLowerCase().includes('white') || c.name.toLowerCase().includes('light')) || palette.colors[0];

            loadedMapping.planningGrid = {
              headerBackground: loadedMapping.planningGrid.headerBackground || bgColor.id,
              headerText: loadedMapping.planningGrid.headerText || textColor.id,
              headerIcon: loadedMapping.planningGrid.headerIcon || primaryColor.id,
              settingsIconColor: loadedMapping.planningGrid.settingsIconColor || bgColor.id,
              ...loadedMapping.planningGrid,
            };

            // Save the updated mapping
            mappings[paletteId] = loadedMapping;
            await settingsAPI.user.set(ELEMENT_COLOR_MAPPING_KEY, mappings);
          }

          setElementMapping(loadedMapping);
          return;
        }
      }
      // Create default mapping using first color or primary/secondary
      initializeDefaultMapping();
    } catch (error) {
      console.error('Error loading element mapping:', error);
      initializeDefaultMapping();
    }
  };

  const initializeDefaultMapping = () => {
    if (!palette) return;

    const primaryColor = palette.colors.find(c => c.isPrimary) || palette.colors[0];
    const secondaryColor = palette.colors.find(c => c.isSecondary) || palette.colors[1] || palette.colors[0];
    const textColor = palette.colors.find(c => c.name.toLowerCase().includes('black') || c.name.toLowerCase().includes('dark')) || palette.colors[0];
    const bgColor = palette.colors.find(c => c.name.toLowerCase().includes('white') || c.name.toLowerCase().includes('light')) || palette.colors[0];

    const defaultMapping: ElementColorMapping = {
      navigation: {
        tabBarBackground: bgColor.id,
        tabBarActiveIcon: primaryColor.id,
        tabBarInactiveIcon: textColor.id,
      },
      desktopNavigation: {
        drawerBackground: bgColor.id,
        drawerActiveItemBackground: primaryColor.id,
        drawerInactiveItemBackground: bgColor.id,
        drawerActiveItemText: bgColor.id,
        drawerInactiveItemText: textColor.id,
        drawerActiveItemIcon: bgColor.id,
        drawerInactiveItemIcon: textColor.id,
        drawerDividerColor: textColor.id,
        drawerHeaderBackground: primaryColor.id,
        drawerHeaderText: bgColor.id,
      },
      global: {
        primaryButton: primaryColor.id,
        primaryButtonText: bgColor.id,
        secondaryButton: secondaryColor.id,
        secondaryButtonText: bgColor.id,
        textPrimary: textColor.id,
        textSecondary: textColor.id,
        textTertiary: textColor.id,
        background: bgColor.id,
        cardBackground: bgColor.id,
        borderColor: textColor.id,
        iconDefault: textColor.id,
        iconInactive: textColor.id,
        errorColor: secondaryColor.id,
        successColor: primaryColor.id,
        warningColor: secondaryColor.id,
      },
      dashboard: {
        background: bgColor.id,
        cardBackground: bgColor.id,
        cardText: textColor.id,
        headerBackground: primaryColor.id,
        headerText: bgColor.id,
        // Task type backgrounds
        projectTaskBackground: primaryColor.id,
        adminTaskBackground: secondaryColor.id,
        marketingTaskBackground: primaryColor.id,
        outOfOfficeBackground: secondaryColor.id,
        unavailableBackground: textColor.id,
        timeOffBackground: primaryColor.id,
        // Deadline type backgrounds
        deadlineBackground: secondaryColor.id,
        internalDeadlineBackground: secondaryColor.id,
        milestoneBackground: primaryColor.id,
        // Section card backgrounds
        upcomingDeadlinesCardBackground: bgColor.id,
        todaysTasksCardBackground: bgColor.id,
        thisWeeksTasksCardBackground: bgColor.id,
      },
      projects: {
        background: bgColor.id,
        projectCardBackground: bgColor.id,
        projectCardText: textColor.id,
        projectCardBorder: textColor.id,
        statusActiveColor: primaryColor.id,
        statusOnHoldColor: secondaryColor.id,
        statusCompletedColor: primaryColor.id,
        statusArchivedColor: textColor.id,
        addButtonBackground: primaryColor.id,
        addButtonIcon: bgColor.id,
        tableHeaderBackground: primaryColor.id,
        tableHeaderText: bgColor.id,
      },
      timeTracking: {
        background: bgColor.id,
        timerCardBackground: bgColor.id,
        timerText: textColor.id,
        startButtonBackground: primaryColor.id,
        startButtonText: bgColor.id,
        stopButtonBackground: secondaryColor.id,
        stopButtonText: bgColor.id,
        entryCardBackground: bgColor.id,
        entryText: textColor.id,
        billableColor: primaryColor.id,
        nonBillableColor: secondaryColor.id,
      },
      calendar: {
        background: bgColor.id,
        headerBackground: bgColor.id,
        headerText: textColor.id,
        headerIcons: textColor.id,
        weekdayHeaderBackground: bgColor.id,
        weekdayHeaderText: textColor.id,
        weekendHeaderBackground: bgColor.id,
        weekendHeaderText: textColor.id,
        weekendCellBackground: bgColor.id,
        currentDayBackground: primaryColor.id,
        teamMemberColumnBackground: bgColor.id,
        teamMemberColumnText: textColor.id,
        eventBackground: primaryColor.id,
        eventText: bgColor.id,
      },
      planningTasks: {
        projectTaskBackground: primaryColor.id,
        projectTaskText: bgColor.id,
        adminTaskBackground: secondaryColor.id,
        adminTaskText: bgColor.id,
        marketingTaskBackground: primaryColor.id,
        marketingTaskText: bgColor.id,
        outOfOfficeBackground: secondaryColor.id,
        outOfOfficeText: textColor.id,
        unavailableBackground: textColor.id,
        unavailableText: bgColor.id,
        timeOffBackground: primaryColor.id,
        timeOffText: bgColor.id,
        deadlineRowBackground: bgColor.id,
        deadlineBackground: secondaryColor.id,
        deadlineText: bgColor.id,
        internalDeadlineBackground: secondaryColor.id,
        internalDeadlineText: bgColor.id,
        milestoneBackground: primaryColor.id,
        milestoneText: bgColor.id,
      },
      clients: {
        background: bgColor.id,
        clientCardBackground: bgColor.id,
        clientCardText: textColor.id,
        clientCardBorder: textColor.id,
        addButtonBackground: primaryColor.id,
        addButtonIcon: bgColor.id,
      },
      events: {
        background: bgColor.id,
        eventCardBackground: bgColor.id,
        eventCardText: textColor.id,
        eventCardBorder: textColor.id,
        attendeeChipBackground: primaryColor.id,
        attendeeChipText: bgColor.id,
      },
      profile: {
        background: bgColor.id,
        cardBackground: bgColor.id,
        cardText: textColor.id,
        menuItemBackground: bgColor.id,
        menuItemText: textColor.id,
        menuItemIcon: textColor.id,
        logoutButtonBackground: secondaryColor.id,
        logoutButtonText: bgColor.id,
      },
      admin: {
        background: bgColor.id,
        cardBackground: bgColor.id,
        cardText: textColor.id,
        tableHeaderBackground: bgColor.id,
        tableHeaderText: textColor.id,
        tableRowBackground: bgColor.id,
        tableRowText: textColor.id,
        tableRowAlternateBackground: bgColor.id,
        actionButtonBackground: primaryColor.id,
        actionButtonText: bgColor.id,
        deleteButtonBackground: secondaryColor.id,
        deleteButtonText: bgColor.id,
      },
    };

    setElementMapping(defaultMapping);
  };

  const updateMapping = (section: string, element: string, colorId: string) => {
    if (!elementMapping) return;

    setElementMapping({
      ...elementMapping,
      [section]: {
        ...elementMapping[section as keyof ElementColorMapping],
        [element]: colorId,
      },
    } as ElementColorMapping);
  };

  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter(s => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  const getColorById = (colorId: string): CustomColor | undefined => {
    return palette?.colors.find(c => c.id === colorId);
  };

  const saveMapping = async () => {
    if (!elementMapping || !palette) return;

    setSaving(true);
    try {
      const response = await settingsAPI.user.get(ELEMENT_COLOR_MAPPING_KEY);
      const mappings = response?.data?.value || {};
      mappings[paletteId] = elementMapping;

      await settingsAPI.user.set(ELEMENT_COLOR_MAPPING_KEY, mappings);
      console.log('[ElementColorMapper] Saved element mapping to database:', paletteId);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error saving element mapping:', error);
      setErrorMessage('Failed to save element mapping');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const renderColorPicker = (section: string, elementKey: string, elementLabel: string) => {
    if (!palette || !elementMapping) return null;

    const menuKey = `${section}.${elementKey}`;
    const currentColorId = (elementMapping[section as keyof ElementColorMapping] as any)[elementKey];
    const currentColor = getColorById(currentColorId);

    return (
      <View key={menuKey} style={styles.elementRow}>
        <Text style={[styles.elementLabel, { color: currentColors.textSecondary }]}>{elementLabel}</Text>
        <Menu
          visible={openMenu === menuKey}
          onDismiss={() => setOpenMenu(null)}
          anchor={
            <TouchableOpacity
              style={[styles.colorPickerButton, { borderColor: currentColors.border }]}
              onPress={() => setOpenMenu(menuKey)}
            >
              <View style={[styles.colorPreview, { backgroundColor: currentColor?.hexCode || '#000000', borderColor: currentColors.border }]} />
              <Text style={[styles.colorName, { color: currentColors.text }]}>
                {currentColor?.name || 'Select Color'}
              </Text>
            </TouchableOpacity>
          }
        >
          {palette.colors.map((color) => (
            <Menu.Item
              key={color.id}
              onPress={() => {
                updateMapping(section, elementKey, color.id);
                setOpenMenu(null);
              }}
              title={
                <View style={styles.menuItemContent}>
                  <View style={[styles.menuColorPreview, { backgroundColor: color.hexCode }]} />
                  <Text>{color.name}</Text>
                  {color.isPrimary && <Chip mode="flat" compact style={styles.chip}>Primary</Chip>}
                  {color.isSecondary && <Chip mode="flat" compact style={styles.chip}>Secondary</Chip>}
                </View>
              }
            />
          ))}
        </Menu>
      </View>
    );
  };

  const renderSection = (sectionKey: string) => {
    const section = ElementLabels[sectionKey as keyof typeof ElementLabels];
    const isExpanded = expandedSections.includes(sectionKey);

    return (
      <View key={sectionKey} style={[styles.section, { backgroundColor: '#FFFFFF', borderColor: currentColors.borderLight }]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>{section.title}</Text>
          <Text style={[styles.expandIcon, { color: currentColors.text }]}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {Object.entries(section.elements).map(([elementKey, elementLabel]) =>
              renderColorPicker(sectionKey, elementKey, elementLabel)
            )}
          </View>
        )}
      </View>
    );
  };

  if (!palette) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: currentColors.text }]}>Loading palette...</Text>
        </View>
      </View>
    );
  }

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
          <Title style={[styles.title, { color: currentColors.text }]}>Map Colors to Elements</Title>
          <View style={styles.placeholder} />
        </View>

        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
          Assign your custom colors to each element of your app
        </Text>

        {/* Show palette colors */}
        <View style={[styles.palettePreview, { backgroundColor: '#FFFFFF', borderColor: currentColors.borderLight }]}>
          <Text style={[styles.paletteTitle, { color: currentColors.text }]}>{palette.name}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsScroll}>
            {palette.colors.map((color) => (
              <View key={color.id} style={styles.colorChip}>
                <View style={[styles.colorChipPreview, { backgroundColor: color.hexCode, borderColor: currentColors.border }]} />
                <Text style={[styles.colorChipName, { color: currentColors.text }]}>{color.name}</Text>
                {color.isPrimary && <Text style={[styles.badge, { color: currentColors.primary }]}>●</Text>}
                {color.isSecondary && <Text style={[styles.badge, { color: currentColors.secondary }]}>●</Text>}
              </View>
            ))}
          </ScrollView>
        </View>

        <Divider style={{ marginVertical: 20 }} />

        {/* Sections */}
        {Object.keys(ElementLabels).map(sectionKey => renderSection(sectionKey))}

        {/* Action Buttons */}
        <Button
          mode="contained"
          onPress={saveMapping}
          style={styles.saveButton}
          loading={saving}
          disabled={saving}
        >
          Save Element Mapping
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.navigate('CustomColorManager', { paletteId })}
          style={styles.editColorsButton}
        >
          Edit Colors
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
        message="Your element color mapping has been saved! Your custom colors will now be applied to the app."
        onDismiss={() => {
          setShowSuccessDialog(false);
          navigation.navigate('Profile');
        }}
        buttons={[
          {
            text: 'Done',
            onPress: () => {
              setShowSuccessDialog(false);
              navigation.navigate('Profile');
            },
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
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
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  palettePreview: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
  },
  paletteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  colorsScroll: {
    flexDirection: 'row',
  },
  colorChip: {
    alignItems: 'center',
    marginRight: 15,
  },
  colorChipPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 5,
  },
  colorChipName: {
    fontSize: 12,
    textAlign: 'center',
  },
  badge: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 14,
  },
  sectionContent: {
    padding: 15,
    paddingTop: 0,
  },
  elementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  elementLabel: {
    fontSize: 14,
    flex: 1,
  },
  colorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minWidth: 150,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
  },
  colorName: {
    fontSize: 14,
    flex: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuColorPreview: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  chip: {
    height: 20,
    marginLeft: 5,
  },
  saveButton: {
    paddingVertical: 5,
    marginTop: 30,
  },
  editColorsButton: {
    paddingVertical: 5,
    marginTop: 15,
  },
  cancelButton: {
    marginTop: 10,
    marginBottom: 20,
  },
});

export default ElementColorMapperScreen;
