import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { ScheduledSession } from '../scheduler/types';

interface RescheduleModalProps {
  visible: boolean;
  session: ScheduledSession | null;
  onClose: () => void;
  onSaveOverride: (override: ScheduledSession) => void;
  onRemoveOverride: (sessionId: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  visible,
  session,
  onClose,
  onSaveOverride,
  onRemoveOverride,
}) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedHour, setSelectedHour] = useState<number>(18);
  const [isPinned, setIsPinned] = useState<boolean>(true);

  useEffect(() => {
    if (session) {
      const sessionDate = new Date(session.startTime);
      const now = new Date();
      const diffTime = sessionDate.getTime() - now.getTime();
      const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      setSelectedDayOffset(diffDays);
      setSelectedHour(sessionDate.getHours());
      setIsPinned(session.isManualOverride ?? true);
    }
  }, [session]);

  if (!session) return null;

  const handleSave = () => {
    const newStart = new Date();
    newStart.setDate(newStart.getDate() + selectedDayOffset);
    newStart.setHours(selectedHour, 0, 0, 0);

    const newEnd = new Date(newStart.getTime() + session.durationMinutes * 60 * 1000);

    const updatedSession: ScheduledSession = {
      ...session,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      isManualOverride: isPinned,
    };

    onSaveOverride(updatedSession);
    onClose();
  };

  const handleRemovePin = () => {
    onRemoveOverride(session.id);
    onClose();
  };

  const previewDate = new Date();
  previewDate.setDate(previewDate.getDate() + selectedDayOffset);
  previewDate.setHours(selectedHour, 0, 0, 0);
  const previewEnd = new Date(previewDate.getTime() + session.durationMinutes * 60 * 1000);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Manual Reschedule</Text>
                <Text style={styles.taskName}>{session.taskTitle}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Current Duration */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                Session duration: {session.durationMinutes}m ({Math.round((session.durationMinutes / 60) * 10) / 10}h)
              </Text>
            </View>

            {/* Target Day Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Move to Day</Text>
              <View style={styles.daysRow}>
                {[
                  { label: 'Today', offset: 0 },
                  { label: 'Tomorrow', offset: 1 },
                  { label: 'In 2d', offset: 2 },
                  { label: 'In 3d', offset: 3 },
                  { label: 'In 4d', offset: 4 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.offset}
                    style={[
                      styles.dayChip,
                      selectedDayOffset === item.offset && styles.dayChipSelected,
                    ]}
                    onPress={() => setSelectedDayOffset(item.offset)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDayOffset === item.offset && styles.dayChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Start Hour */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Start Time</Text>
              <View style={styles.hourGrid}>
                {[9, 11, 14, 16, 18, 19, 20, 21].map((hour) => {
                  const isSelected = selectedHour === hour;
                  const display = hour >= 12 ? (hour === 12 ? '12 PM' : `${hour - 12} PM`) : `${hour} AM`;
                  return (
                    <TouchableOpacity
                      key={hour}
                      style={[styles.hourChip, isSelected && styles.hourChipSelected]}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text style={[styles.hourChipText, isSelected && styles.hourChipTextSelected]}>
                        {display}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Pinned Manual Override Switch */}
            <TouchableOpacity
              style={styles.pinRow}
              onPress={() => setIsPinned(!isPinned)}
            >
              <View style={[styles.checkbox, isPinned && styles.checkboxActive]}>
                {isPinned && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.pinTextCol}>
                <Text style={styles.pinTitle}>Lock as Manual Override (📌 Pinned)</Text>
                <Text style={styles.pinDesc}>
                  Subsequent re-plans will preserve this exact time slot and will not overwrite it.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Preview */}
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>New Scheduled Slot:</Text>
              <Text style={styles.previewText}>
                {previewDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(previewDate)} – {formatTime(previewEnd)}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              {session.isManualOverride && (
                <TouchableOpacity style={styles.unpinBtn} onPress={handleRemovePin}>
                  <Text style={styles.unpinBtnText}>Unpin</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  taskName: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
  },
  infoBanner: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  dayChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  dayChipTextSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hourChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hourChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  hourChipText: {
    fontSize: 12,
    color: '#475569',
  },
  hourChipTextSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#D97706',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pinTextCol: {
    flex: 1,
  },
  pinTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  pinDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  unpinBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  unpinBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
