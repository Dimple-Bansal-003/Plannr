import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { SessionCard } from '../components/SessionCard';
import { UnscheduledBanner } from '../components/UnscheduledBanner';
import { OverdueAlertCard } from '../components/OverdueAlertCard';
import { RescheduleModal } from '../components/RescheduleModal';
import { ScheduledSession } from '../scheduler/types';

interface TodayViewProps {
  onOpenAddTask: () => void;
  onOpenAddDailyHabit?: () => void;
  onNavigateWeekly: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  onOpenAddTask,
  onOpenAddDailyHabit,
  onNavigateWeekly,
}) => {
  const {
    schedule,
    hasUnscheduledTasks,
    recalculateSchedule,
    toggleTaskCompleted,
    addManualOverride,
    removeManualOverride,
  } = useApp();

  const [rescheduleSession, setRescheduleSession] = React.useState<ScheduledSession | null>(null);

  const now = new Date();
  const todayDateStr = now.toDateString();

  // Filter sessions that occur today
  const todaySessions = (schedule?.sessions || []).filter((s) => {
    const sessionDate = new Date(s.startTime).toDateString();
    return sessionDate === todayDateStr;
  });

  const totalTodayMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const formatTotalTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${mins}m`;
  };

  const atRiskCount = schedule?.atRiskTasks.length || 0;
  const overdueTasks = schedule?.overdueTasks || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner if unscheduled tasks exist */}
      {hasUnscheduledTasks && (
        <UnscheduledBanner onRecalculate={recalculateSchedule} />
      )}

      {/* Overdue Alert Card */}
      {overdueTasks.length > 0 && (
        <OverdueAlertCard
          overdueTasks={overdueTasks}
          onCompleteTask={(taskId) => toggleTaskCompleted(taskId)}
        />
      )}

      {/* Warning banner if At-Risk tasks exist */}
      {atRiskCount > 0 && (
        <TouchableOpacity style={styles.atRiskCallout} onPress={onNavigateWeekly}>
          <Text style={styles.atRiskIcon}>⚠️</Text>
          <View style={styles.atRiskTextCol}>
            <Text style={styles.atRiskTitle}>
              {atRiskCount === 1 ? '1 Task is At Risk' : `${atRiskCount} Tasks are At Risk`}
            </Text>
            <Text style={styles.atRiskDesc}>
              Won't fit before deadline given your free time. View in Weekly Schedule →
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Date & Planned Time Header */}
      <View style={styles.todayHeader}>
        <View>
          <Text style={styles.dateSubtitle}>
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={styles.headingTitle}>Today's Plan</Text>
        </View>
        {todaySessions.length > 0 && (
          <View style={styles.plannedBadge}>
            <Text style={styles.plannedBadgeText}>
              ⏱ {formatTotalTime(totalTodayMinutes)} total
            </Text>
          </View>
        )}
      </View>

      {/* Quick Add Row */}
      <View style={styles.todayQuickRow}>
        <TouchableOpacity style={styles.todayQuickBtnCoursework} onPress={onOpenAddTask}>
          <Text style={styles.todayQuickBtnCourseworkText}>+ Coursework</Text>
        </TouchableOpacity>
        {onOpenAddDailyHabit && (
          <TouchableOpacity style={styles.todayQuickBtnDaily} onPress={onOpenAddDailyHabit}>
            <Text style={styles.todayQuickBtnDailyText}>🔁 + Everyday Habit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sessions List */}
      {todaySessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>All Clear for Today!</Text>
          <Text style={styles.emptyDesc}>
            No study sessions are scheduled for today. Either today is your day off, or all upcoming deadlines have already been handled.
          </Text>
          <View style={styles.emptyButtonRow}>
            <TouchableOpacity style={styles.emptyBtn} onPress={onOpenAddTask}>
              <Text style={styles.emptyBtnText}>+ Coursework</Text>
            </TouchableOpacity>
            {onOpenAddDailyHabit && (
              <TouchableOpacity style={styles.emptyBtnHabit} onPress={onOpenAddDailyHabit}>
                <Text style={styles.emptyBtnHabitText}>🔁 + Everyday Task</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.emptyBtnSecondary} onPress={onNavigateWeekly}>
              <Text style={styles.emptyBtnSecondaryText}>View Week →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.sessionsList}>
          {todaySessions.map((session: ScheduledSession) => (
            <SessionCard
              key={session.id}
              session={session}
              onComplete={(taskId) => toggleTaskCompleted(taskId)}
              onReschedule={(s) => setRescheduleSession(s)}
            />
          ))}
        </View>
      )}

      <RescheduleModal
        visible={rescheduleSession !== null}
        session={rescheduleSession}
        onClose={() => setRescheduleSession(null)}
        onSaveOverride={(override) => addManualOverride(override)}
        onRemoveOverride={(sessionId) => removeManualOverride(sessionId)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  atRiskCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  atRiskIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  atRiskTextCol: {
    flex: 1,
  },
  atRiskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  atRiskDesc: {
    fontSize: 12,
    color: '#B91C1C',
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  dateSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  plannedBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  plannedBadgeText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 12,
  },
  sessionsList: {
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyBtnSecondary: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emptyBtnSecondaryText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyBtnHabit: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  emptyBtnHabitText: {
    color: '#4338CA',
    fontWeight: '700',
    fontSize: 13,
  },
  todayQuickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  todayQuickBtnCoursework: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  todayQuickBtnCourseworkText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  todayQuickBtnDaily: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  todayQuickBtnDailyText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '700',
  },
});
