import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { EffortPreset, SlotPreference, Task } from '../scheduler/types';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveTask: (task: Task, recalculate: boolean) => void;
}

const EFFORT_OPTIONS: { key: EffortPreset; label: string; desc: string }[] = [
  { key: '15min', label: '15 min', desc: 'Quick check/quiz' },
  { key: '30min', label: '30 min', desc: 'Problem set' },
  { key: '1hr', label: '1 hour', desc: 'Standard reading/lab' },
  { key: '2hr', label: '2 hours', desc: 'Assignment/report' },
  { key: 'half-day', label: 'Half-day (4h)', desc: '50m focus blocks + breaks' },
  { key: 'full-day', label: 'Full-day (8h)', desc: 'Multi-block prep + breaks' },
];

const IMPORTANCE_LEVELS: { level: 1 | 2 | 3 | 4 | 5; label: string; weightHint: string }[] = [
  { level: 1, label: '★ 1 - Minor', weightHint: '5% of grade' },
  { level: 2, label: '★ 2 - Low', weightHint: '10% of grade' },
  { level: 3, label: '★ 3 - Medium', weightHint: '15% of grade' },
  { level: 4, label: '★ 4 - High', weightHint: '25% of grade' },
  { level: 5, label: '★ 5 - Critical', weightHint: '30%+ / Final' },
];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  onSaveTask,
}) => {
  const [taskType, setTaskType] = useState<'coursework' | 'daily_practice'>('coursework');
  const [preferredSlot, setPreferredSlot] = useState<SlotPreference>('warmup');
  const [title, setTitle] = useState('');
  const [effort, setEffort] = useState<EffortPreset>('1hr');
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [daysOffset, setDaysOffset] = useState<number>(1); // Default due tomorrow
  const [dueHour, setDueHour] = useState<number>(23); // Default 11:59 PM
  const [dueMinute, setDueMinute] = useState<number>(59);
  const [errorMsg, setErrorMsg] = useState('');

  const calculateDeadlineDate = (days: number, hour: number, minute: number): Date => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(hour, minute, 0, 0);
    return target;
  };

  const handleSave = (recalculate: boolean) => {
    if (!title.trim()) {
      setErrorMsg('Please enter a task title');
      return;
    }
    setErrorMsg('');

    let newTask: Task;
    if (taskType === 'daily_practice') {
      newTask = {
        id: `task-dp-${Date.now()}`,
        title: title.trim(),
        deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        effort,
        importance: 3,
        completed: false,
        createdAt: new Date().toISOString(),
        taskType: 'daily_practice',
        preferredSlot,
        completedDates: [],
      };
    } else {
      const deadline = calculateDeadlineDate(daysOffset, dueHour, dueMinute);
      newTask = {
        id: `task-${Date.now()}`,
        title: title.trim(),
        deadline: deadline.toISOString(),
        effort,
        importance,
        completed: false,
        createdAt: new Date().toISOString(),
        taskType: 'coursework',
      };
    }

    onSaveTask(newTask, recalculate);
    // Reset
    setTitle('');
    setEffort('1hr');
    setImportance(3);
    setDaysOffset(1);
    setDueHour(23);
    setDueMinute(59);
    setTaskType('coursework');
    setPreferredSlot('warmup');
    onClose();
  };

  const currentDeadline = calculateDeadlineDate(daysOffset, dueHour, dueMinute);
  const isOverdue = currentDeadline.getTime() < Date.now();
  const formattedDeadline = `${currentDeadline.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} at ${currentDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Coursework Task</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Task Type Switcher */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typeBtn, taskType === 'coursework' && styles.typeBtnActive]}
                onPress={() => setTaskType('coursework')}
              >
                <Text style={[styles.typeBtnText, taskType === 'coursework' && styles.typeBtnTextActive]}>
                  🎓 Coursework Deadline
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, taskType === 'daily_practice' && styles.typeBtnActive]}
                onPress={() => {
                  setTaskType('daily_practice');
                  if (effort === 'half-day' || effort === 'full-day') {
                    setEffort('30min');
                  }
                }}
              >
                <Text style={[styles.typeBtnText, taskType === 'daily_practice' && styles.typeBtnTextActive]}>
                  🔁 Daily Practice Habit
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {taskType === 'daily_practice' ? 'Daily Habit / Practice Name' : 'Task Title'}
              </Text>
              <TextInput
                style={[styles.textInput, errorMsg ? styles.textInputError : null]}
                placeholder={
                  taskType === 'daily_practice'
                    ? 'e.g., LeetCode / DSA Practice, French Vocabulary, Reading'
                    : 'e.g., DBMS Assignment 3, Calculus Midterm'
                }
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errorMsg) setErrorMsg('');
                }}
                autoFocus
              />
              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            </View>

            {/* If Daily Practice: Slot & Sequence Suggestion */}
            {taskType === 'daily_practice' && (
              <View style={styles.inputGroup}>
                <View style={styles.labelWithHint}>
                  <Text style={styles.label}>Suggested Daily Slot</Text>
                  <Text style={styles.hint}>Where in your study time to place it</Text>
                </View>
                <View style={styles.slotOptionList}>
                  {[
                    {
                      key: 'warmup',
                      label: '🌅 Warm-Up First (Recommended)',
                      desc: 'Start your study session with a quick win to overcome procrastination and build momentum.',
                    },
                    {
                      key: 'peak',
                      label: '🎯 Peak Focus (Deep Work)',
                      desc: 'Tackle during peak mental stamina hours.',
                    },
                    {
                      key: 'winddown',
                      label: '🌙 Wind-Down Slot',
                      desc: 'Wrap up your evening with lower cognitive demand practice.',
                    },
                  ].map((slot) => {
                    const selected = preferredSlot === slot.key;
                    return (
                      <TouchableOpacity
                        key={slot.key}
                        style={[styles.slotCard, selected && styles.slotCardSelected]}
                        onPress={() => setPreferredSlot(slot.key as SlotPreference)}
                      >
                        <Text style={[styles.slotTitle, selected && styles.slotTitleSelected]}>
                          {slot.label}
                        </Text>
                        <Text style={[styles.slotDesc, selected && styles.slotDescSelected]}>
                          {slot.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Deadline Selector (Coursework only) */}
            {taskType === 'coursework' && (
              <View style={styles.inputGroup}>
                <View style={styles.deadlineHeaderRow}>
                  <Text style={styles.label}>Deadline</Text>
                  <Text style={[styles.deadlinePreviewText, isOverdue && styles.deadlineOverdueText]}>
                    {isOverdue ? `🚨 OVERDUE: ${formattedDeadline}` : formattedDeadline}
                  </Text>
                </View>

              {/* Quick Presets (including 11:59 PM, 25 days, and overdue test) */}
              <View style={styles.quickDeadlineRow}>
                {[
                  { label: 'Tonight 11:59 PM', days: 0, hour: 23, minute: 59 },
                  { label: 'Tomorrow 11:59 PM', days: 1, hour: 23, minute: 59 },
                  { label: 'In 3 Days 11:59 PM', days: 3, hour: 23, minute: 59 },
                  { label: 'In 5 Days 11:59 PM', days: 5, hour: 23, minute: 59 },
                  { label: 'In 25 Days (Later)', days: 25, hour: 23, minute: 59 },
                  { label: '🚨 Overdue (Yesterday)', days: -1, hour: 17, minute: 0 },
                ].map((item, idx) => {
                  const selected =
                    daysOffset === item.days &&
                    dueHour === item.hour &&
                    dueMinute === item.minute;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => {
                        setDaysOffset(item.days);
                        setDueHour(item.hour);
                        setDueMinute(item.minute);
                      }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Day offset & Real Time Picker */}
              <View style={styles.stepperRow}>
                {/* Day Offset */}
                <View style={styles.stepperCol}>
                  <Text style={styles.stepperSublabel}>
                    Days: {daysOffset < 0 ? `${daysOffset}d (past)` : `+${daysOffset}d`}
                  </Text>
                  <View style={styles.stepperButtons}>
                    <TouchableOpacity
                      style={styles.stepSmallBtn}
                      onPress={() => setDaysOffset(daysOffset - 1)}
                    >
                      <Text style={styles.stepSmallBtnText}>-1d</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepSmallBtn}
                      onPress={() => setDaysOffset(daysOffset + 1)}
                    >
                      <Text style={styles.stepSmallBtnText}>+1d</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Time Picker Controls */}
                <View style={styles.stepperCol}>
                  <Text style={styles.stepperSublabel}>
                    Time: {dueHour.toString().padStart(2, '0')}:{dueMinute.toString().padStart(2, '0')}
                  </Text>
                  <View style={styles.stepperButtons}>
                    <TouchableOpacity
                      style={[styles.timePresetBtn, dueHour === 23 && dueMinute === 59 && styles.timePresetBtnActive]}
                      onPress={() => {
                        setDueHour(23);
                        setDueMinute(59);
                      }}
                    >
                      <Text style={[styles.timePresetBtnText, dueHour === 23 && dueMinute === 59 && styles.timePresetBtnTextActive]}>
                        11:59 PM
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.timePresetBtn, dueHour === 17 && dueMinute === 0 && styles.timePresetBtnActive]}
                      onPress={() => {
                        setDueHour(17);
                        setDueMinute(0);
                      }}
                    >
                      <Text style={[styles.timePresetBtnText, dueHour === 17 && dueMinute === 0 && styles.timePresetBtnTextActive]}>
                        5:00 PM
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.timePresetBtn, dueHour === 9 && dueMinute === 0 && styles.timePresetBtnActive]}
                      onPress={() => {
                        setDueHour(9);
                        setDueMinute(0);
                      }}
                    >
                      <Text style={[styles.timePresetBtnText, dueHour === 9 && dueMinute === 0 && styles.timePresetBtnTextActive]}>
                        9:00 AM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            )}

            {/* Effort Preset Selector */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithHint}>
                <Text style={styles.label}>
                  {taskType === 'daily_practice' ? 'Daily Practice Duration' : 'Estimated Effort'}
                </Text>
                <Text style={styles.hint}>
                  {taskType === 'daily_practice' ? 'Reserved daily in your free time' : 'Large blocks split with breaks'}
                </Text>
              </View>

              <View style={styles.grid2Col}>
                {(taskType === 'daily_practice'
                  ? EFFORT_OPTIONS.filter((o) => o.key !== 'half-day' && o.key !== 'full-day')
                  : EFFORT_OPTIONS
                ).map((opt) => {
                  const selected = effort === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.effortCard, selected && styles.effortCardSelected]}
                      onPress={() => setEffort(opt.key)}
                    >
                      <Text style={[styles.effortLabel, selected && styles.effortLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.effortDesc, selected && styles.effortDescSelected]}>
                        {opt.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Importance (Coursework only: 1-5 Syllabus Weightage) */}
            {taskType === 'coursework' && (
              <View style={styles.inputGroup}>
                <View style={styles.labelWithHint}>
                  <Text style={styles.label}>Syllabus Weightage / Importance</Text>
                  <Text style={styles.hint}>Higher = scheduled sooner</Text>
                </View>

                <View style={styles.importanceList}>
                  {IMPORTANCE_LEVELS.map((imp) => {
                    const selected = importance === imp.level;
                    return (
                      <TouchableOpacity
                        key={imp.level}
                        style={[styles.importanceRow, selected && styles.importanceRowSelected]}
                        onPress={() => setImportance(imp.level)}
                      >
                        <Text
                          style={[
                            styles.importanceLabel,
                            selected && styles.importanceLabelSelected,
                          ]}
                        >
                          {imp.label}
                        </Text>
                        <Text
                          style={[
                            styles.importanceHint,
                            selected && styles.importanceHintSelected,
                          ]}
                        >
                          {imp.weightHint}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => handleSave(false)}
            >
              <Text style={styles.secondaryBtnText}>Save to Backlog</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => handleSave(true)}
            >
              <Text style={styles.primaryBtnText}>Save & Propose Schedule</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  slotOptionList: {
    gap: 8,
  },
  slotCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  slotTitleSelected: {
    color: '#4F46E5',
  },
  slotDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  slotDescSelected: {
    color: '#4338CA',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  deadlineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deadlinePreviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  deadlineOverdueText: {
    color: '#DC2626',
  },
  quickDeadlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  stepperCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperSublabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 6,
  },
  stepperButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  stepSmallBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  stepSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  timePresetBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  timePresetBtnActive: {
    backgroundColor: '#4F46E5',
  },
  timePresetBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  timePresetBtnTextActive: {
    color: '#FFFFFF',
  },
  grid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  effortCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  effortCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  effortLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  effortLabelSelected: {
    color: '#4F46E5',
  },
  effortDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  effortDescSelected: {
    color: '#4338CA',
  },
  importanceList: {
    gap: 6,
  },
  importanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  importanceRowSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  importanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  importanceLabelSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  importanceHint: {
    fontSize: 12,
    color: '#64748B',
  },
  importanceHintSelected: {
    color: '#4338CA',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  primaryBtn: {
    flex: 1.5,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
