import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DayOfWeek, RecurringTimeBlock } from '../scheduler/types';

interface WeeklyTemplateGridProps {
  initialTemplate: RecurringTimeBlock[];
  onSave?: (template: RecurringTimeBlock[]) => void;
  onChange?: (template: RecurringTimeBlock[]) => void;
}

const DAYS: { key: DayOfWeek; name: string; short: string }[] = [
  { key: 1, name: 'Monday', short: 'Mon' },
  { key: 2, name: 'Tuesday', short: 'Tue' },
  { key: 3, name: 'Wednesday', short: 'Wed' },
  { key: 4, name: 'Thursday', short: 'Thu' },
  { key: 5, name: 'Friday', short: 'Fri' },
  { key: 6, name: 'Saturday', short: 'Sat' },
  { key: 0, name: 'Sunday', short: 'Sun' },
];

export const WeeklyTemplateGrid: React.FC<WeeklyTemplateGridProps> = ({
  initialTemplate,
  onChange,
}) => {
  const [template, setTemplate] = useState<RecurringTimeBlock[]>(initialTemplate);

  const updateBlocks = (newTemplate: RecurringTimeBlock[]) => {
    setTemplate(newTemplate);
    if (onChange) {
      onChange(newTemplate);
    }
  };

  const isDayActive = (day: DayOfWeek) => {
    return template.some((b) => b.dayOfWeek === day);
  };

  const getDayBlock = (day: DayOfWeek) => {
    return template.find((b) => b.dayOfWeek === day);
  };

  const toggleDay = (day: DayOfWeek) => {
    if (isDayActive(day)) {
      updateBlocks(template.filter((b) => b.dayOfWeek !== day));
    } else {
      const isWeekend = day === 0 || day === 6;
      const newBlock: RecurringTimeBlock = {
        id: `block-${day}-${Date.now()}`,
        dayOfWeek: day,
        startHour: isWeekend ? 10 : 18,
        startMinute: 0,
        endHour: isWeekend ? 18 : 22,
        endMinute: 0,
      };
      updateBlocks([...template, newBlock]);
    }
  };

  const adjustHour = (day: DayOfWeek, field: 'startHour' | 'endHour', delta: number) => {
    const block = getDayBlock(day);
    if (!block) return;

    let newHour = block[field] + delta;
    if (newHour < 0) newHour = 0;
    if (newHour > 24) newHour = 24;

    // Ensure startHour < endHour
    if (field === 'startHour' && newHour >= block.endHour) return;
    if (field === 'endHour' && newHour <= block.startHour) return;

    const updated = template.map((b) =>
      b.dayOfWeek === day ? { ...b, [field]: newHour } : b
    );
    updateBlocks(updated);
  };

  // Compute total weekly hours
  const totalWeeklyHours = template.reduce((acc, b) => {
    const duration = b.endHour + b.endMinute / 60 - (b.startHour + b.startMinute / 60);
    return acc + Math.max(0, duration);
  }, 0);

  // Quick preset handlers
  const applyPreset = (type: 'evenings' | 'intensive' | 'weekend') => {
    if (type === 'evenings') {
      const newTemplate: RecurringTimeBlock[] = [1, 2, 3, 4, 5].map((d) => ({
        id: `block-${d}`,
        dayOfWeek: d as DayOfWeek,
        startHour: 18,
        startMinute: 0,
        endHour: 22,
        endMinute: 0,
      }));
      updateBlocks(newTemplate);
    } else if (type === 'intensive') {
      const weekdays: RecurringTimeBlock[] = [1, 2, 3, 4, 5].map((d) => ({
        id: `block-${d}`,
        dayOfWeek: d as DayOfWeek,
        startHour: 18,
        startMinute: 0,
        endHour: 22,
        endMinute: 0,
      }));
      const weekends: RecurringTimeBlock[] = [6, 0].map((d) => ({
        id: `block-${d}`,
        dayOfWeek: d as DayOfWeek,
        startHour: 10,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
      }));
      updateBlocks([...weekdays, ...weekends]);
    } else if (type === 'weekend') {
      const weekends: RecurringTimeBlock[] = [6, 0].map((d) => ({
        id: `block-${d}`,
        dayOfWeek: d as DayOfWeek,
        startHour: 9,
        startMinute: 0,
        endHour: 21,
        endMinute: 0,
      }));
      updateBlocks(weekends);
    }
  };

  const formatTime = (h: number, m: number) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(h)}:${pad(m)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Weekly Study Availability</Text>
        <Text style={styles.hoursBadge}>{Math.round(totalWeeklyHours)} hrs / week</Text>
      </View>
      <Text style={styles.subtext}>
        Plannr allocates coursework strictly into these slots.
      </Text>

      {/* Quick Presets */}
      <View style={styles.presetsRow}>
        <TouchableOpacity
          style={styles.presetButton}
          onPress={() => applyPreset('evenings')}
        >
          <Text style={styles.presetText}>Weekdays 6-10pm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.presetButton}
          onPress={() => applyPreset('intensive')}
        >
          <Text style={styles.presetText}>Weekdays + Weekends</Text>
        </TouchableOpacity>
      </View>

      {/* Days List */}
      <ScrollView style={styles.daysList} nestedScrollEnabled>
        {DAYS.map(({ key, name, short }) => {
          const active = isDayActive(key);
          const block = getDayBlock(key);

          return (
            <View key={key} style={[styles.dayCard, active && styles.dayCardActive]}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => toggleDay(key)}
              >
                <View style={[styles.checkbox, active && styles.checkboxActive]}>
                  {active && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.dayName, active && styles.dayNameActive]}>
                  {name}
                </Text>
                {!active && <Text style={styles.offLabel}>Day Off</Text>}
              </TouchableOpacity>

              {active && block && (
                <View style={styles.timeControlsRow}>
                  {/* Start time */}
                  <View style={styles.timeControlGroup}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => adjustHour(key, 'startHour', -1)}
                      >
                        <Text style={styles.stepBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeValue}>
                        {formatTime(block.startHour, block.startMinute)}
                      </Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => adjustHour(key, 'startHour', 1)}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.timeDivider}>→</Text>

                  {/* End time */}
                  <View style={styles.timeControlGroup}>
                    <Text style={styles.timeLabel}>End</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => adjustHour(key, 'endHour', -1)}
                      >
                        <Text style={styles.stepBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeValue}>
                        {formatTime(block.endHour, block.endMinute)}
                      </Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => adjustHour(key, 'endHour', 1)}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  hoursBadge: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
  },
  subtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  daysList: {
    maxHeight: 320,
  },
  dayCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C7D2FE',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  dayNameActive: {
    color: '#0F172A',
  },
  offLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  timeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timeControlGroup: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  timeDivider: {
    fontSize: 16,
    color: '#94A3B8',
    paddingHorizontal: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  timeValue: {
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});
