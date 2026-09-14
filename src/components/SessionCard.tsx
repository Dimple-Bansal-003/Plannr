import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScheduledSession } from '../scheduler/types';

interface SessionCardProps {
  session: ScheduledSession;
  onComplete?: (taskId: string) => void;
  onReschedule?: (session: ScheduledSession) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onComplete,
  onReschedule,
}) => {
  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  const isSplit = session.totalSessions > 1;

  return (
    <View style={[styles.card, session.isOverdue && styles.cardOverdue]}>
      {/* Time column */}
      <View style={styles.timeIndicator}>
        <Text style={[styles.timeStart, session.isOverdue && styles.timeStartOverdue]}>
          {formatTime(startDate)}
        </Text>
        <View style={[styles.timeLine, session.isOverdue && styles.timeLineOverdue]} />
        <Text style={styles.timeEnd}>{formatTime(endDate)}</Text>
      </View>

      <View style={styles.content}>
        {/* Title row */}
        <View style={styles.topRow}>
          <Text style={[styles.title, session.isOverdue && styles.titleOverdue]} numberOfLines={2}>
            {session.taskTitle}
          </Text>
          {session.isManualOverride && (
            <View style={styles.pinnedBadge}>
              <Text style={styles.pinnedText}>📌 Pinned</Text>
            </View>
          )}
          {session.isOverdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>🚨 OVERDUE</Text>
            </View>
          )}
        </View>

        {/* Badges: duration, split part */}
        <View style={styles.metaRow}>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>⏱ {formatDuration(session.durationMinutes)} focus</Text>
          </View>

          {isSplit && (
            <View style={styles.splitBadge}>
              <Text style={styles.splitText}>
                Part {session.sessionIndex} of {session.totalSessions}
              </Text>
            </View>
          )}

          {session.breakAfterMinutes && (
            <View style={styles.breakBadge}>
              <Text style={styles.breakText}>☕ {session.breakAfterMinutes}m break after</Text>
            </View>
          )}
        </View>

        {/* Explainability / Deterministic Reasoning Row */}
        {session.reason && (
          <View style={[styles.reasonBox, session.isOverdue && styles.reasonBoxOverdue]}>
            <Text style={styles.reasonIcon}>💡</Text>
            <Text style={[styles.reasonText, session.isOverdue && styles.reasonTextOverdue]}>
              {session.reason}
            </Text>
          </View>
        )}

        {/* Quick Action Buttons */}
        <View style={styles.actionsRow}>
          {onComplete && (
            <TouchableOpacity
              style={styles.actionBtnComplete}
              onPress={() => onComplete(session.taskId)}
            >
              <Text style={styles.actionBtnCompleteText}>✓ Mark Done</Text>
            </TouchableOpacity>
          )}

          {onReschedule && (
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => onReschedule(session)}
            >
              <Text style={styles.actionBtnSecondaryText}>Reschedule</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardOverdue: {
    borderColor: '#F87171',
    backgroundColor: '#FFF5F5',
  },
  timeIndicator: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    paddingRight: 10,
    marginRight: 12,
  },
  timeStart: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeStartOverdue: {
    color: '#DC2626',
  },
  timeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#C7D2FE',
    marginVertical: 4,
  },
  timeLineOverdue: {
    backgroundColor: '#F87171',
  },
  timeEnd: {
    fontSize: 11,
    color: '#64748B',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  titleOverdue: {
    color: '#991B1B',
  },
  pinnedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  durationBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  splitBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  splitText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '700',
  },
  breakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  breakText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonBoxOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  reasonIcon: {
    fontSize: 11,
    marginRight: 4,
    marginTop: 1,
  },
  reasonText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    lineHeight: 15,
  },
  reasonTextOverdue: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  actionBtnComplete: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnCompleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  actionBtnSecondary: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnSecondaryText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 12,
  },
});
