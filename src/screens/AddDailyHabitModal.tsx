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

interface AddDailyHabitModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveTask: (task: Task, recalculate: boolean) => void;
  existingDailyTasks?: Task[];
}

const DURATION_OPTIONS: { key: EffortPreset; label: string; desc: string }[] = [
  { key: '15min', label: '15 min', desc: 'Quick daily streak' },
  { key: '30min', label: '30 min', desc: 'Standard practice' },
  { key: '1hr', label: '1 hour', desc: 'Deep skill development' },
  { key: '2hr', label: '2 hours', desc: 'Intensive daily block' },
];

const QUICK_SUGGESTIONS = [
  { title: 'LeetCode / DSA Practice', duration: '30min' as EffortPreset, slot: 'warmup' as SlotPreference },
  { title: 'Tech Article / Book Reading', duration: '15min' as EffortPreset, slot: 'winddown' as SlotPreference },
  { title: 'Language Learning (Duolingo)', duration: '15min' as EffortPreset, slot: 'warmup' as SlotPreference },
  { title: 'System Design Flashcards', duration: '30min' as EffortPreset, slot: 'peak' as SlotPreference },
  { title: 'Daily Code Review & Revision', duration: '30min' as EffortPreset, slot: 'warmup' as SlotPreference },
];

export const AddDailyHabitModal: React.FC<AddDailyHabitModalProps> = ({
  visible,
  onClose,
  onSaveTask,
  existingDailyTasks = [],
}) => {
  const [title, setTitle] = useState('');
  const [effort, setEffort] = useState<EffortPreset>('30min');
  const [selectedSlotMode, setSelectedSlotMode] = useState<'warmup' | 'peak' | 'next' | 'winddown'>('warmup');
  const [errorMsg, setErrorMsg] = useState('');

  const nextSlotNumber = existingDailyTasks.length + 1;

  const handleApplySuggestion = (sug: typeof QUICK_SUGGESTIONS[0]) => {
    setTitle(sug.title);
    setEffort(sug.duration);
    if (sug.slot === 'warmup') setSelectedSlotMode('warmup');
    else if (sug.slot === 'peak') setSelectedSlotMode('peak');
    else if (sug.slot === 'winddown') setSelectedSlotMode('winddown');
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a habit title');
      return;
    }
    setErrorMsg('');

    let preferredSlot: SlotPreference = 'warmup';
    let slotOrder = 1;

    if (selectedSlotMode === 'warmup') {
      preferredSlot = 'warmup';
      slotOrder = 1;
    } else if (selectedSlotMode === 'peak') {
      preferredSlot = 'peak';
      slotOrder = 2;
    } else if (selectedSlotMode === 'next') {
      preferredSlot = 'warmup';
      slotOrder = nextSlotNumber;
    } else if (selectedSlotMode === 'winddown') {
      preferredSlot = 'winddown';
      slotOrder = 99;
    }

    const newTask: Task = {
      id: `task-dp-${Date.now()}`,
      title: title.trim(),
      // Far-future dummy deadline (1 year) for recurring engine
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      effort,
      importance: 3,
      completed: false,
      createdAt: new Date().toISOString(),
      taskType: 'daily_practice',
      preferredSlot,
      slotOrder,
      completedDates: [],
    };

    onSaveTask(newTask, true);
    setTitle('');
    setEffort('30min');
    setSelectedSlotMode('warmup');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>🔁 Add Everyday Task</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn}>
              <Text style={styles.saveHeaderBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Value Proposition Box */}
            <View style={styles.bannerBox}>
              <Text style={styles.bannerTitle}>⚡ Daily Consistency & Auto-Scheduling</Text>
              <Text style={styles.bannerText}>
                Specify this task once. Plannr will automatically reserve this fixed slot every single day in your free time across your 14-day horizon — without you having to re-add it every day!
              </Text>
            </View>

            {/* Quick Suggestions Chips */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Popular Daily Habits (Tap to fill):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {QUICK_SUGGESTIONS.map((sug, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chip}
                    onPress={() => handleApplySuggestion(sug)}
                  >
                    <Text style={styles.chipText}>{sug.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Habit / Task Title *</Text>
              <TextInput
                style={[styles.input, !!errorMsg && styles.inputError]}
                placeholder="e.g. Daily LeetCode Problem, German practice..."
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errorMsg) setErrorMsg('');
                }}
              />
              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            </View>

            {/* Daily Duration */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Daily Duration</Text>
              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = effort === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.durationCard, isSelected && styles.durationCardSelected]}
                      onPress={() => setEffort(opt.key)}
                    >
                      <Text
                        style={[
                          styles.durationCardLabel,
                          isSelected && styles.durationCardLabelSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.durationCardDesc,
                          isSelected && styles.durationCardDescSelected,
                        ]}
                      >
                        {opt.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Fixed Daily Slot Assignment */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Fixed Slot in Your Daily Routine</Text>
              <Text style={styles.slotSubtitle}>
                Choose when this task runs each day. As you add more everyday tasks, each gets its dedicated slot.
              </Text>

              <View style={styles.slotCardsCol}>
                <TouchableOpacity
                  style={[
                    styles.slotCard,
                    selectedSlotMode === 'warmup' && styles.slotCardSelected,
                  ]}
                  onPress={() => setSelectedSlotMode('warmup')}
                >
                  <View style={styles.slotCardHeader}>
                    <Text style={styles.slotCardIcon}>🌅</Text>
                    <Text
                      style={[
                        styles.slotCardTitle,
                        selectedSlotMode === 'warmup' && styles.slotCardTitleSelected,
                      ]}
                    >
                      Slot 1: Warm-Up Routine (First)
                    </Text>
                  </View>
                  <Text style={styles.slotCardDesc}>
                    Scheduled at the very beginning of your study time. Great for an easy win to overcome procrastination and build focus momentum.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.slotCard,
                    selectedSlotMode === 'peak' && styles.slotCardSelected,
                  ]}
                  onPress={() => setSelectedSlotMode('peak')}
                >
                  <View style={styles.slotCardHeader}>
                    <Text style={styles.slotCardIcon}>🎯</Text>
                    <Text
                      style={[
                        styles.slotCardTitle,
                        selectedSlotMode === 'peak' && styles.slotCardTitleSelected,
                      ]}
                    >
                      Slot 2: Peak Focus Practice
                    </Text>
                  </View>
                  <Text style={styles.slotCardDesc}>
                    Scheduled right after warm-up during your highest mental stamina window for complex problem-solving.
                  </Text>
                </TouchableOpacity>

                {existingDailyTasks.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.slotCard,
                      selectedSlotMode === 'next' && styles.slotCardSelected,
                    ]}
                    onPress={() => setSelectedSlotMode('next')}
                  >
                    <View style={styles.slotCardHeader}>
                      <Text style={styles.slotCardIcon}>⚡</Text>
                      <Text
                        style={[
                          styles.slotCardTitle,
                          selectedSlotMode === 'next' && styles.slotCardTitleSelected,
                        ]}
                      >
                        Auto-Assigned Slot {nextSlotNumber}
                      </Text>
                    </View>
                    <Text style={styles.slotCardDesc}>
                      Automatically sequenced consecutive to your existing {existingDailyTasks.length} daily habit{existingDailyTasks.length > 1 ? 's' : ''}.
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.slotCard,
                    selectedSlotMode === 'winddown' && styles.slotCardSelected,
                  ]}
                  onPress={() => setSelectedSlotMode('winddown')}
                >
                  <View style={styles.slotCardHeader}>
                    <Text style={styles.slotCardIcon}>🌙</Text>
                    <Text
                      style={[
                        styles.slotCardTitle,
                        selectedSlotMode === 'winddown' && styles.slotCardTitleSelected,
                      ]}
                    >
                      Wind-Down Slot (End of Day)
                    </Text>
                  </View>
                  <Text style={styles.slotCardDesc}>
                    Scheduled at the tail-end of your evening study block. Best for light reading, flashcards, or relaxing revision before bed.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Daily Routine Summary Box */}
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>✨ Your Everyday Routine Preview</Text>
              {existingDailyTasks.length > 0 && (
                <View style={styles.previewExistingList}>
                  {existingDailyTasks.map((t, idx) => (
                    <Text key={t.id} style={styles.previewExistingItem}>
                      • Slot {idx + 1}: {t.title} ({t.effort} daily)
                    </Text>
                  ))}
                </View>
              )}
              <Text style={styles.previewNewItem}>
                👉 + New: "{title.trim() || 'Your Everyday Task'}" ({effort} daily) will be scheduled automatically in{' '}
                {selectedSlotMode === 'warmup'
                  ? '🌅 Slot 1 (Warm-Up)'
                  : selectedSlotMode === 'peak'
                  ? '🎯 Slot 2 (Peak Focus)'
                  : selectedSlotMode === 'winddown'
                  ? '🌙 Wind-Down Slot'
                  : `⚡ Slot ${nextSlotNumber}`}!
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.mainSaveBtn} onPress={handleSave}>
              <Text style={styles.mainSaveBtnText}>Schedule Everyday in My Routine</Text>
            </TouchableOpacity>
          </ScrollView>
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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  cancelBtn: {
    padding: 6,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  saveHeaderBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  bannerBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  durationCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
    borderWidth: 2,
  },
  durationCardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  durationCardLabelSelected: {
    color: '#4F46E5',
  },
  durationCardDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  durationCardDescSelected: {
    color: '#4338CA',
  },
  slotSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  slotCardsCol: {
    gap: 8,
  },
  slotCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  slotCardSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
    borderWidth: 2,
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  slotCardIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  slotCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  slotCardTitleSelected: {
    color: '#7C3AED',
  },
  slotCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  previewBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 6,
  },
  previewExistingList: {
    marginBottom: 6,
  },
  previewExistingItem: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 2,
  },
  previewNewItem: {
    fontSize: 13,
    color: '#14532D',
    fontWeight: '700',
    lineHeight: 18,
  },
  mainSaveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mainSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
