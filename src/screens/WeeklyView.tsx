import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { AtRiskAlertCard } from '../components/AtRiskAlertCard';
import { OverdueAlertCard } from '../components/OverdueAlertCard';
import { SessionCard } from '../components/SessionCard';
import { UnscheduledBanner } from '../components/UnscheduledBanner';
import { RescheduleModal } from '../components/RescheduleModal';
import { ScheduledSession } from '../scheduler/types';

interface WeeklyViewProps {
  onOpenAddTask: () => void;
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({ onOpenAddTask }) => {
  const {
    schedule,
    hasUnscheduledTasks,
    recalculateSchedule,
    toggleTaskCompleted,
    addManualOverride,
    removeManualOverride,
  } = useApp();

  const [rescheduleSession, setRescheduleSession] = React.useState<ScheduledSession | null>(null);

  const sessions = schedule?.sessions || [];
  const atRiskTasks = schedule?.atRiskTasks || [];
  const overdueTasks = schedule?.overdueTasks || [];
  const beyondHorizonTasks = schedule?.beyondHorizonTasks || [];

  // Group sessions by Date string (e.g., "Mon Oct 05 2026")
  const groupedSessions = new Map<string, ScheduledSession[]>();

  sessions.forEach((s) => {
    const dateKey = new Date(s.startTime).toDateString();
    const existing = groupedSessions.get(dateKey) || [];
    existing.push(s);
    groupedSessions.set(dateKey, existing);
  });

  const totalWeeklyMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const formatHeaderDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const isToday = d.toDateString() === new Date().toDateString();
    const dateFormatted = d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return isToday ? `Today (${dateFormatted})` : dateFormatted;
  };

  const formatTotalTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${mins}m`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Unscheduled Banner */}
      {hasUnscheduledTasks && (
        <UnscheduledBanner onRecalculate={recalculateSchedule} />
      )}

      {/* OVERDUE TASKS ALERT */}
      {overdueTasks.length > 0 && (
        <OverdueAlertCard
          overdueTasks={overdueTasks}
          onCompleteTask={(taskId) => toggleTaskCompleted(taskId)}
        />
      )}

      {/* 1. AT-RISK HONEST OVERCOMMIT CARD */}
      {atRiskTasks.length > 0 && (
        <AtRiskAlertCard atRiskTasks={atRiskTasks} />
      )}

      {/* Weekly Header Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryTitle}>Proposed Study Schedule</Text>
            <Text style={styles.summarySubtitle}>Deterministic interval-packed plan</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={recalculateSchedule}>
            <Text style={styles.refreshBtnText}>↻ Re-plan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricVal}>{sessions.length}</Text>
            <Text style={styles.metricLabel}>Sessions</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricVal}>{formatTotalTime(totalWeeklyMinutes)}</Text>
            <Text style={styles.metricLabel}>Study Time</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={[styles.metricVal, atRiskTasks.length > 0 && styles.metricAtRisk]}>
              {atRiskTasks.length}
            </Text>
            <Text style={styles.metricLabel}>At Risk</Text>
          </View>
        </View>
      </View>

      {/* 2. CHRONOLOGICAL SESSIONS GROUPED BY DAY */}
      {groupedSessions.size === 0 && atRiskTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No scheduled sessions yet</Text>
          <Text style={styles.emptyDesc}>
            Add coursework tasks with deadlines to generate a proposed day-by-day plan.
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={onOpenAddTask}>
            <Text style={styles.addBtnText}>+ Add Coursework Task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        Array.from(groupedSessions.entries()).map(([dateStr, daySessions]) => {
          const dayTotalMinutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

          return (
            <View key={dateStr} style={styles.dayGroup}>
              <View style={styles.dayHeaderRow}>
                <Text style={styles.dayHeading}>{formatHeaderDate(dateStr)}</Text>
                <Text style={styles.dayTotalTime}>
                  {daySessions.length} sessions • {formatTotalTime(dayTotalMinutes)}
                </Text>
              </View>

              {daySessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onComplete={(taskId) => toggleTaskCompleted(taskId)}
                  onReschedule={(s) => setRescheduleSession(s)}
                />
              ))}
            </View>
          );
        })
      )}

      {/* 3. UPCOMING (BEYOND-HORIZON) SECTION */}
      {beyondHorizonTasks.length > 0 && (
        <View style={styles.beyondHorizonSection}>
          <View style={styles.beyondHeader}>
            <Text style={styles.beyondIcon}>📅</Text>
            <View>
              <Text style={styles.beyondTitle}>Upcoming Beyond 14-Day Horizon</Text>
              <Text style={styles.beyondSubtitle}>
                Not yet scheduled. Will enter active plan as the date approaches.
              </Text>
            </View>
          </View>

          {beyondHorizonTasks.map((bh) => {
            const due = new Date(bh.deadline);
            const entry = new Date(bh.entryDate);
            return (
              <View key={bh.taskId} style={styles.beyondCard}>
                <View style={styles.beyondCardTop}>
                  <Text style={styles.beyondTaskTitle}>{bh.taskTitle}</Text>
                  <View style={styles.beyondDaysBadge}>
                    <Text style={styles.beyondDaysText}>Due in {bh.daysUntilDeadline}d</Text>
                  </View>
                </View>
                <Text style={styles.beyondDetail}>
                  Deadline: {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Text style={styles.beyondEntryNote}>
                  🗓 Will enter active 14-day schedule on: {entry.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            );
          })}
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  refreshBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metric: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricAtRisk: {
    color: '#DC2626',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  dayGroup: {
    marginBottom: 20,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dayHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  dayTotalTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  addBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  beyondHorizonSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  beyondHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  beyondIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  beyondTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  beyondSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  beyondCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  beyondCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  beyondTaskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  beyondDaysBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  beyondDaysText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  beyondDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  beyondEntryNote: {
    fontSize: 11,
    color: '#6366F1',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
