import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { Button, Title, Menu } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlanningColors } from '../../contexts/PlanningColorsContext';
import { colorPalettes } from '../../theme/colorPalettes';
import { CustomDialog } from '../../components/CustomDialog';

const PlanningColorsScreen = ({ navigation }: any) => {
  const { currentColors, selectedPalette } = useTheme();
  const { user } = useAuth();
  const { planningColors, savePlanningColors } = usePlanningColors();

  // Planning page color customization state
  const [calendarHeaderBg, setCalendarHeaderBg] = useState<string>('');
  const [calendarHeaderFont, setCalendarHeaderFont] = useState<string>('');
  const [prevNextIconColor, setPrevNextIconColor] = useState<string>('');
  const [teamMemberColBg, setTeamMemberColBg] = useState<string>('');
  const [teamMemberColText, setTeamMemberColText] = useState<string>('');
  const [weekdayHeaderBg, setWeekdayHeaderBg] = useState<string>('');
  const [weekdayHeaderFont, setWeekdayHeaderFont] = useState<string>('');
  const [weekendHeaderBg, setWeekendHeaderBg] = useState<string>('');
  const [weekendHeaderFont, setWeekendHeaderFont] = useState<string>('');
  const [weekendCellBg, setWeekendCellBg] = useState<string>('');
  const [currentDayBg, setCurrentDayBg] = useState<string>('');
  const [projectTaskBg, setProjectTaskBg] = useState<string>('');
  const [projectTaskFont, setProjectTaskFont] = useState<string>('');
  const [adminTaskBg, setAdminTaskBg] = useState<string>('');
  const [adminTaskFont, setAdminTaskFont] = useState<string>('');
  const [marketingTaskBg, setMarketingTaskBg] = useState<string>('');
  const [marketingTaskFont, setMarketingTaskFont] = useState<string>('');
  const [outOfOfficeBg, setOutOfOfficeBg] = useState<string>('');
  const [outOfOfficeFont, setOutOfOfficeFont] = useState<string>('');
  const [unavailableBg, setUnavailableBg] = useState<string>('');
  const [unavailableFont, setUnavailableFont] = useState<string>('');
  const [timeOffBg, setTimeOffBg] = useState<string>('');
  const [timeOffFont, setTimeOffFont] = useState<string>('');
  const [deadlineRowBg, setDeadlineRowBg] = useState<string>('');
  const [deadlineBg, setDeadlineBg] = useState<string>('');
  const [deadlineFont, setDeadlineFont] = useState<string>('');
  const [internalDeadlineBg, setInternalDeadlineBg] = useState<string>('');
  const [internalDeadlineFont, setInternalDeadlineFont] = useState<string>('');
  const [milestoneBg, setMilestoneBg] = useState<string>('');
  const [milestoneFont, setMilestoneFont] = useState<string>('');
  const [openColorMenu, setOpenColorMenu] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load saved colors from context on mount
  useEffect(() => {
    setCalendarHeaderBg(planningColors.calendarHeaderBg);
    setCalendarHeaderFont(planningColors.calendarHeaderFont);
    setPrevNextIconColor(planningColors.prevNextIconColor);
    setTeamMemberColBg(planningColors.teamMemberColBg);
    setTeamMemberColText(planningColors.teamMemberColText);
    setWeekdayHeaderBg(planningColors.weekdayHeaderBg);
    setWeekdayHeaderFont(planningColors.weekdayHeaderFont);
    setWeekendHeaderBg(planningColors.weekendHeaderBg);
    setWeekendHeaderFont(planningColors.weekendHeaderFont);
    setWeekendCellBg(planningColors.weekendCellBg);
    setCurrentDayBg(planningColors.currentDayBg);
    setProjectTaskBg(planningColors.projectTaskBg);
    setProjectTaskFont(planningColors.projectTaskFont);
    setAdminTaskBg(planningColors.adminTaskBg);
    setAdminTaskFont(planningColors.adminTaskFont);
    setMarketingTaskBg(planningColors.marketingTaskBg);
    setMarketingTaskFont(planningColors.marketingTaskFont);
    setOutOfOfficeBg(planningColors.outOfOfficeBg);
    setOutOfOfficeFont(planningColors.outOfOfficeFont);
    setUnavailableBg(planningColors.unavailableBg);
    setUnavailableFont(planningColors.unavailableFont);
    setTimeOffBg(planningColors.timeOffBg);
    setTimeOffFont(planningColors.timeOffFont);
    setDeadlineRowBg(planningColors.deadlineRowBg);
    setDeadlineBg(planningColors.deadlineBg);
    setDeadlineFont(planningColors.deadlineFont);
    setInternalDeadlineBg(planningColors.internalDeadlineBg);
    setInternalDeadlineFont(planningColors.internalDeadlineFont);
    setMilestoneBg(planningColors.milestoneBg);
    setMilestoneFont(planningColors.milestoneFont);
  }, [planningColors]);

  // Generate color options from current palette's iOS colors only
  const colorOptions: Array<{ label: string; value: string }> = React.useMemo(() => {
    const palette = colorPalettes[selectedPalette];
    if (!palette.ios) return [];

    return Object.entries(palette.ios).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
      value: value,
    }));
  }, [selectedPalette]);

  // Helper function to render a color picker
  const renderColorPicker = (label: string, value: string, onSelect: (color: string) => void, defaultColor: string, menuKey: string) => {
    const displayColor = value || defaultColor;
    const displayLabel = value ? colorOptions.find(c => c.value === value)?.label || 'Custom' : 'Select Color';

    return (
      <View style={styles.colorPickerRow}>
        <Text style={[styles.colorLabel, { color: currentColors.textSecondary }]}>{label}:</Text>
        <Menu
          visible={openColorMenu === menuKey}
          onDismiss={() => setOpenColorMenu(null)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setOpenColorMenu(menuKey)}
              style={styles.colorButton}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              <View style={[styles.colorPreview, { backgroundColor: displayColor, borderColor: currentColors.border }]} />
              <Text style={{ color: currentColors.text }}>{displayLabel}</Text>
            </Button>
          }
        >
          {colorOptions.map((color) => (
            <Menu.Item
              key={color.value}
              onPress={() => {
                onSelect(color.value);
                setOpenColorMenu(null);
              }}
              title={color.label}
              leadingIcon={() => <View style={[styles.colorPreview, { backgroundColor: color.value, borderColor: currentColors.border }]} />}
            />
          ))}
        </Menu>
      </View>
    );
  };

  const handleSaveColors = async () => {
    setSaving(true);
    try {
      const colors = {
        calendarHeaderBg,
        calendarHeaderFont,
        prevNextIconColor,
        teamMemberColBg,
        teamMemberColText,
        weekdayHeaderBg,
        weekdayHeaderFont,
        weekendHeaderBg,
        weekendHeaderFont,
        weekendCellBg,
        currentDayBg,
        projectTaskBg,
        projectTaskFont,
        adminTaskBg,
        adminTaskFont,
        marketingTaskBg,
        marketingTaskFont,
        outOfOfficeBg,
        outOfOfficeFont,
        unavailableBg,
        unavailableFont,
        timeOffBg,
        timeOffFont,
        deadlineRowBg,
        deadlineBg,
        deadlineFont,
        internalDeadlineBg,
        internalDeadlineFont,
        milestoneBg,
        milestoneFont,
      };

      await savePlanningColors(colors, false);

      setSuccessMessage('Your planning page colors have been saved and will appear on the planning page.');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error saving colors:', error);
      setErrorMessage('Failed to save colors. Please try again.');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsDefault = async () => {
    setSaving(true);
    try {
      const colors = {
        calendarHeaderBg,
        calendarHeaderFont,
        prevNextIconColor,
        teamMemberColBg,
        teamMemberColText,
        weekdayHeaderBg,
        weekdayHeaderFont,
        weekendHeaderBg,
        weekendHeaderFont,
        weekendCellBg,
        currentDayBg,
        projectTaskBg,
        projectTaskFont,
        adminTaskBg,
        adminTaskFont,
        marketingTaskBg,
        marketingTaskFont,
        outOfOfficeBg,
        outOfOfficeFont,
        unavailableBg,
        unavailableFont,
        timeOffBg,
        timeOffFont,
        deadlineRowBg,
        deadlineBg,
        deadlineFont,
        internalDeadlineBg,
        internalDeadlineFont,
        milestoneBg,
        milestoneFont,
      };

      await savePlanningColors(colors, true);
      setSuccessMessage('Default planning page colors have been saved for all users who haven\'t customized their own colors.');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error saving default colors:', error);
      setErrorMessage('Failed to save default colors. Please try again.');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background.bg700 }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: currentColors.text }]}>Planning Page Colors</Title>

        {/* Calendar Header */}
        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Calendar Header</Text>
        {renderColorPicker('Background', calendarHeaderBg, setCalendarHeaderBg, currentColors.background.bg500, 'calendarHeaderBg')}
        {renderColorPicker('Font Color', calendarHeaderFont, setCalendarHeaderFont, currentColors.text, 'calendarHeaderFont')}
        {renderColorPicker('Prev/Next Icons', prevNextIconColor, setPrevNextIconColor, currentColors.icon, 'prevNextIconColor')}

        {/* Team Member Column */}
        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Team Member Column</Text>
        {renderColorPicker('Background', teamMemberColBg, setTeamMemberColBg, currentColors.background.bg300, 'teamMemberColBg')}
        {renderColorPicker('Text Color', teamMemberColText, setTeamMemberColText, currentColors.text, 'teamMemberColText')}

        {/* Weekday Headers */}
        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Weekday Headers</Text>
        {renderColorPicker('Background', weekdayHeaderBg, setWeekdayHeaderBg, currentColors.background.bg500, 'weekdayHeaderBg')}
        {renderColorPicker('Font Color', weekdayHeaderFont, setWeekdayHeaderFont, currentColors.text, 'weekdayHeaderFont')}

        {/* Weekend Headers */}
        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Weekend Headers</Text>
        {renderColorPicker('Background', weekendHeaderBg, setWeekendHeaderBg, currentColors.background.bg700, 'weekendHeaderBg')}
        {renderColorPicker('Font Color', weekendHeaderFont, setWeekendHeaderFont, currentColors.textSecondary, 'weekendHeaderFont')}

        {/* Weekend Cells */}
        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Weekend Cells</Text>
        {renderColorPicker('Background', weekendCellBg, setWeekendCellBg, currentColors.background.bg300, 'weekendCellBg')}

        {/* Current Day */}
        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Current Day</Text>
        {renderColorPicker('Background', currentDayBg, setCurrentDayBg, currentColors.primary, 'currentDayBg')}

        {/* Task Type Colors */}
        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Task Colors</Text>

        {/* Project Tasks */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Project Tasks</Text>
        {renderColorPicker('Background', projectTaskBg, setProjectTaskBg, currentColors.primary, 'projectTaskBg')}
        {renderColorPicker('Font Color', projectTaskFont, setProjectTaskFont, currentColors.white, 'projectTaskFont')}

        {/* Admin Tasks */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Admin Tasks</Text>
        {renderColorPicker('Background', adminTaskBg, setAdminTaskBg, currentColors.secondary, 'adminTaskBg')}
        {renderColorPicker('Font Color', adminTaskFont, setAdminTaskFont, currentColors.white, 'adminTaskFont')}

        {/* Marketing Tasks */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Marketing Tasks</Text>
        {renderColorPicker('Background', marketingTaskBg, setMarketingTaskBg, currentColors.planning.marketingTaskBg, 'marketingTaskBg')}
        {renderColorPicker('Font Color', marketingTaskFont, setMarketingTaskFont, currentColors.white, 'marketingTaskFont')}

        {/* Out of Office */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Out of Office</Text>
        {renderColorPicker('Background', outOfOfficeBg, setOutOfOfficeBg, currentColors.planning.outOfOfficeBg, 'outOfOfficeBg')}
        {renderColorPicker('Font Color', outOfOfficeFont, setOutOfOfficeFont, currentColors.planning.outOfOfficeFont, 'outOfOfficeFont')}

        {/* Unavailable */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Unavailable</Text>
        {renderColorPicker('Background', unavailableBg, setUnavailableBg, currentColors.planning.unavailableBg, 'unavailableBg')}
        {renderColorPicker('Font Color', unavailableFont, setUnavailableFont, currentColors.white, 'unavailableFont')}

        {/* Time Off */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Time Off</Text>
        {renderColorPicker('Background', timeOffBg, setTimeOffBg, currentColors.planning.timeOffBg, 'timeOffBg')}
        {renderColorPicker('Font Color', timeOffFont, setTimeOffFont, currentColors.white, 'timeOffFont')}

        {/* Deadline Row & Tasks */}
        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 20 }]}>Deadlines & Milestones</Text>
        {renderColorPicker('Row Background', deadlineRowBg, setDeadlineRowBg, currentColors.background.bg500, 'deadlineRowBg')}

        {/* Deadline */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Deadline</Text>
        {renderColorPicker('Background', deadlineBg, setDeadlineBg, currentColors.planning.deadlineBg, 'deadlineBg')}
        {renderColorPicker('Font Color', deadlineFont, setDeadlineFont, currentColors.white, 'deadlineFont')}

        {/* Internal Deadline */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Internal Deadline</Text>
        {renderColorPicker('Background', internalDeadlineBg, setInternalDeadlineBg, currentColors.planning.internalDeadlineBg, 'internalDeadlineBg')}
        {renderColorPicker('Font Color', internalDeadlineFont, setInternalDeadlineFont, currentColors.white, 'internalDeadlineFont')}

        {/* Milestone */}
        <Text style={[styles.subtitle, { color: currentColors.textSecondary, marginTop: 10 }]}>Milestone</Text>
        {renderColorPicker('Background', milestoneBg, setMilestoneBg, currentColors.planning.milestoneBg, 'milestoneBg')}
        {renderColorPicker('Font Color', milestoneFont, setMilestoneFont, currentColors.white, 'milestoneFont')}

        {user?.role === 'ADMIN' && (
          <Button
            mode="contained"
            onPress={handleSaveAsDefault}
            style={[styles.saveButton, { marginTop: 30 }]}
            buttonColor={currentColors.secondary}
            loading={saving}
            disabled={saving}
          >
            Save as Default for All Users
          </Button>
        )}

        <Button
          mode="contained"
          onPress={handleSaveColors}
          style={[styles.saveButton, { marginTop: user?.role === 'ADMIN' ? 15 : 30 }]}
          loading={saving}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Colors'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>

      <CustomDialog
        visible={showSuccessDialog}
        title="Success"
        message={successMessage}
        buttons={[
          {
            text: 'OK',
            onPress: () => setShowSuccessDialog(false),
            style: 'default',
          },
        ]}
      />

      <CustomDialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
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
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  colorLabel: {
    fontSize: 14,
    minWidth: 120,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    // borderColor applied via inline style in component
  },
  saveButton: {
    paddingVertical: 5,
  },
  cancelButton: {
    marginTop: 10,
  },
});

export default PlanningColorsScreen;
