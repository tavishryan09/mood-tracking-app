import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Platform, Text, TouchableOpacity } from 'react-native';
import { Title, Button, TextInput, IconButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkCircle02Icon, CircleIcon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface SelectedBlock {
  userId: string;
  date: string;
  blockIndex: number;
}

interface BlockAssignment {
  id: string;
  projectId?: string;
  projectName?: string;
  task?: string;
  span: number;
}

interface ProjectAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  currentColors: any;
  selectedBlock: SelectedBlock | null;
  blockAssignments: { [key: string]: BlockAssignment };
  projectSearch: string;
  setProjectSearch: (value: string) => void;
  taskDescription: string;
  setTaskDescription: (value: string) => void;
  filteredProjects: Project[];
  isOutOfOffice: boolean;
  setIsOutOfOffice: (value: boolean) => void;
  isTimeOff: boolean;
  setIsTimeOff: (value: boolean) => void;
  isUnavailable: boolean;
  setIsUnavailable: (value: boolean) => void;
  isRepeatEvent: boolean;
  setIsRepeatEvent: (value: boolean) => void;
  repeatType: 'weekly' | 'monthly';
  setRepeatType: (value: 'weekly' | 'monthly') => void;
  repeatWeeklyDays: boolean[];
  setRepeatWeeklyDays: (value: boolean[]) => void;
  monthlyRepeatType: 'date' | 'weekday';
  setMonthlyRepeatType: (value: 'date' | 'weekday') => void;
  monthlyWeekNumber: number;
  setMonthlyWeekNumber: (value: number) => void;
  monthlyDayOfWeek: number;
  setMonthlyDayOfWeek: (value: number) => void;
  repeatEndDate: Date | null;
  setRepeatEndDate: (value: Date | null) => void;
  showDatePicker: boolean;
  setShowDatePicker: (value: boolean) => void;
  setSelectedBlock: (value: SelectedBlock | null) => void;
  setShowDeletePlanningDialog: (value: boolean) => void;
  onSaveProjectAssignment: () => Promise<void>;
}

const ProjectAssignmentModal = React.memo(({
  visible,
  onClose,
  currentColors,
  selectedBlock,
  blockAssignments,
  projectSearch,
  setProjectSearch,
  taskDescription,
  setTaskDescription,
  filteredProjects,
  isOutOfOffice,
  setIsOutOfOffice,
  isTimeOff,
  setIsTimeOff,
  isUnavailable,
  setIsUnavailable,
  isRepeatEvent,
  setIsRepeatEvent,
  repeatType,
  setRepeatType,
  repeatWeeklyDays,
  setRepeatWeeklyDays,
  monthlyRepeatType,
  setMonthlyRepeatType,
  monthlyWeekNumber,
  setMonthlyWeekNumber,
  monthlyDayOfWeek,
  setMonthlyDayOfWeek,
  repeatEndDate,
  setRepeatEndDate,
  showDatePicker,
  setShowDatePicker,
  setSelectedBlock,
  setShowDeletePlanningDialog,
  onSaveProjectAssignment,
}: ProjectAssignmentModalProps) => {
  const handleCancel = () => {
    onClose();
    setProjectSearch('');
    setTaskDescription('');
    setIsOutOfOffice(false);
    setIsTimeOff(false);
    setIsUnavailable(false);
    setIsRepeatEvent(false);
    setRepeatType('weekly');
    setRepeatEndDate(null);
    setRepeatWeeklyDays([false, false, false, false, false, false, false]);
    setMonthlyRepeatType('date');
    setMonthlyWeekNumber(1);
    setMonthlyDayOfWeek(1);
    setSelectedBlock(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
        <View style={[styles.modalContent, { backgroundColor: currentColors.background.bg300 }]}>
          <View style={styles.modalHeader}>
            <Title style={[styles.modalTitle, { color: currentColors.text, flex: 1 }]}>Assign Project</Title>
            <IconButton
              icon={() => <HugeiconsIcon icon={Cancel01Icon} size={24} color={currentColors.text} />}
              onPress={handleCancel}
            />
          </View>

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
            {/* Only show project and task fields if Unavailable or Time Off is NOT selected */}
            {/* Out of Office still allows project assignment */}
            {!isUnavailable && !isTimeOff && (
              <>
                <TextInput
                  label="Project (by common name)"
                  value={projectSearch}
                  onChangeText={setProjectSearch}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Search by common name..."
                  left={<TextInput.Icon icon={() => <HugeiconsIcon icon={Search01Icon} size={20} color={currentColors.icon} />} />}
                />

                {filteredProjects.length > 0 && projectSearch && (
                  <View style={[styles.projectsList, { borderColor: currentColors.border }]}>
                    {filteredProjects.map((project) => (
                      <TouchableOpacity
                        key={project.id}
                        style={[styles.projectItem, { borderBottomColor: currentColors.border }]}
                        onPress={() => setProjectSearch(project.description || project.name)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.projectItemText, { color: currentColors.text }]}>
                          {project.description || project.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TextInput
                  label="Task Description (Optional)"
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  placeholder="What will you work on?"
                />
              </>
            )}

            {/* Status Checkboxes */}
            <View style={[styles.checkboxGroup, { borderColor: currentColors.border }]}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setIsOutOfOffice(!isOutOfOffice);
                  if (!isOutOfOffice) {
                    setIsTimeOff(false);
                    setIsUnavailable(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={isOutOfOffice ? CheckmarkCircle02Icon : CircleIcon}
                  size={24}
                  color={currentColors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Out of Office</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setIsTimeOff(!isTimeOff);
                  if (!isTimeOff) {
                    setIsOutOfOffice(false);
                    setIsUnavailable(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={isTimeOff ? CheckmarkCircle02Icon : CircleIcon}
                  size={24}
                  color={currentColors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Time Off</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setIsUnavailable(!isUnavailable);
                  if (!isUnavailable) {
                    setIsOutOfOffice(false);
                    setIsTimeOff(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={isUnavailable ? CheckmarkCircle02Icon : CircleIcon}
                  size={24}
                  color={currentColors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Unavailable</Text>
              </TouchableOpacity>
            </View>

            {/* Repeat Event Section */}
            <View style={[styles.repeatSection, { borderColor: currentColors.border }]}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsRepeatEvent(!isRepeatEvent)}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={isRepeatEvent ? CheckmarkCircle02Icon : CircleIcon}
                  size={24}
                  color={currentColors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Repeat Event</Text>
              </TouchableOpacity>

              {isRepeatEvent && (
                <View style={styles.repeatOptions}>
                  {/* Repeat Type Selection */}
                  <View style={styles.repeatTypeRow}>
                    <TouchableOpacity
                      style={[styles.repeatTypeButton, { borderColor: currentColors.border }, repeatType === 'weekly' && [styles.repeatTypeButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                      onPress={() => setRepeatType('weekly')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.repeatTypeText, { color: currentColors.textSecondary }, repeatType === 'weekly' && [styles.repeatTypeTextActive, { color: currentColors.background.white }]]}>
                        Weekly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.repeatTypeButton, { borderColor: currentColors.border }, repeatType === 'monthly' && [styles.repeatTypeButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                      onPress={() => setRepeatType('monthly')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.repeatTypeText, { color: currentColors.textSecondary }, repeatType === 'monthly' && [styles.repeatTypeTextActive, { color: currentColors.background.white }]]}>
                        Monthly
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Weekly Options */}
                  {repeatType === 'weekly' && (
                    <View style={styles.weeklyOptions}>
                      <Text style={[styles.repeatSubtitle, { color: currentColors.text }]}>Repeat on:</Text>
                      <View style={styles.weekdayButtons}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                          <TouchableOpacity
                            key={day}
                            style={[styles.weekdayButton, { borderColor: currentColors.border }, repeatWeeklyDays[index] && [styles.weekdayButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                            onPress={() => {
                              const newDays = [...repeatWeeklyDays];
                              newDays[index] = !newDays[index];
                              setRepeatWeeklyDays(newDays);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.weekdayText, { color: currentColors.textSecondary }, repeatWeeklyDays[index] && [styles.weekdayTextActive, { color: currentColors.background.white }]]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Monthly Options */}
                  {repeatType === 'monthly' && (
                    <View style={styles.monthlyOptions}>
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setMonthlyRepeatType('date')}
                        activeOpacity={0.7}
                      >
                        <HugeiconsIcon
                          icon={monthlyRepeatType === 'date' ? CheckmarkCircle02Icon : CircleIcon}
                          size={24}
                          color={currentColors.primary}
                        />
                        <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Same date every month</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setMonthlyRepeatType('weekday')}
                        activeOpacity={0.7}
                      >
                        <HugeiconsIcon
                          icon={monthlyRepeatType === 'weekday' ? CheckmarkCircle02Icon : CircleIcon}
                          size={24}
                          color={currentColors.primary}
                        />
                        <Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Specific week and day</Text>
                      </TouchableOpacity>

                      {monthlyRepeatType === 'weekday' && (
                        <View style={styles.weekdaySelectors}>
                          <View style={styles.selectorRow}>
                            <Text style={[styles.selectorLabel, { color: currentColors.text }]}>Week:</Text>
                            <View style={styles.weekNumbers}>
                              {[1, 2, 3, 4].map((num) => (
                                <TouchableOpacity
                                  key={num}
                                  style={[styles.weekNumberButton, { borderColor: currentColors.border }, monthlyWeekNumber === num && [styles.weekNumberButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                                  onPress={() => setMonthlyWeekNumber(num)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.weekNumberText, { color: currentColors.textSecondary }, monthlyWeekNumber === num && [styles.weekNumberTextActive, { color: currentColors.background.white }]]}>
                                    {num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : '4th'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={styles.selectorRow}>
                            <Text style={[styles.selectorLabel, { color: currentColors.text }]}>Day:</Text>
                            <View style={styles.weekdayButtons}>
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                                <TouchableOpacity
                                  key={day}
                                  style={[styles.weekdayButton, { borderColor: currentColors.border }, monthlyDayOfWeek === (index + 1) && [styles.weekdayButtonActive, { backgroundColor: currentColors.primary, borderColor: currentColors.primary }]]}
                                  onPress={() => setMonthlyDayOfWeek(index + 1)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.weekdayText, { color: currentColors.textSecondary }, monthlyDayOfWeek === (index + 1) && [styles.weekdayTextActive, { color: currentColors.background.white }]]}>
                                    {day}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* End Date */}
                  <View style={styles.endDateSection}>
                    <Text style={[styles.repeatSubtitle, { color: currentColors.text }]}>End Date (Optional):</Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={repeatEndDate ? repeatEndDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setRepeatEndDate(new Date(e.target.value));
                          } else {
                            setRepeatEndDate(null);
                          }
                        }}
                        style={{
                          padding: 12,
                          borderWidth: 1,
                          borderColor: currentColors.border,
                          borderRadius: 4,
                          fontSize: 16,
                          fontFamily: 'Josefin Sans',
                        }}
                      />
                    ) : (
                      <Button
                        mode="outlined"
                        onPress={() => setShowDatePicker(true)}
                        style={{ marginTop: 8 }}
                      >
                        {repeatEndDate ? repeatEndDate.toISOString().split('T')[0] : 'Select End Date'}
                      </Button>
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <Button
              mode="text"
              onPress={handleCancel}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            {selectedBlock && blockAssignments[`${selectedBlock.userId}-${selectedBlock.date}-${selectedBlock.blockIndex}`]?.id && (
              <Button
                mode="outlined"
                onPress={() => setShowDeletePlanningDialog(true)}
                style={styles.modalButton}
                textColor={currentColors.secondary}
              >
                Delete
              </Button>
            )}
            <Button
              mode="contained"
              onPress={onSaveProjectAssignment}
              style={styles.modalButton}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
});

ProjectAssignmentModal.displayName = 'ProjectAssignmentModal';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 10,
    padding: 20,
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
  },
  modalScrollView: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  projectsList: {
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
    maxHeight: 200,
  },
  projectItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  projectItemText: {
    fontSize: 14,
  },
  checkboxGroup: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 16,
  },
  repeatSection: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
  },
  repeatOptions: {
    marginTop: 12,
  },
  repeatTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  repeatTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  repeatTypeButtonActive: {},
  repeatTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  repeatTypeTextActive: {},
  weeklyOptions: {
    marginBottom: 12,
  },
  repeatSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  weekdayButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekdayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
    minWidth: 45,
    alignItems: 'center',
  },
  weekdayButtonActive: {},
  weekdayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  weekdayTextActive: {},
  monthlyOptions: {
    marginBottom: 12,
  },
  weekdaySelectors: {
    marginTop: 12,
    marginLeft: 36,
  },
  selectorRow: {
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  weekNumbers: {
    flexDirection: 'row',
    gap: 8,
  },
  weekNumberButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  weekNumberButtonActive: {},
  weekNumberText: {
    fontSize: 13,
    fontWeight: '500',
  },
  weekNumberTextActive: {},
  endDateSection: {
    marginTop: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalButton: {
    borderRadius: 5,
  },
});

export default ProjectAssignmentModal;
