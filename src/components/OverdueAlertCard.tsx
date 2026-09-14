import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OverdueTaskInfo } from '../scheduler/types';

interface OverdueAlertCardProps {
  overdueTasks: OverdueTaskInfo[];
  onCompleteTask?: (taskId: string) => void;
}

export const OverdueAlertCard: React.FC<OverdueAlertCardProps> = ({
  overdueTasks,
  onCompleteTask,
}) => {
  if (overdueTasks.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🚨</Text>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>
            {overdueTasks.length === 1 ? '1 Task is Past Deadline' : `${overdueTasks.length} Tasks are Past Deadline`}
          </Text>
          <Text style={styles.headerSubtitle}>
            Prioritized at the top of your schedule with urgency 2.0.
          </Text>
        </View>
      </View>

      {overdueTasks.map((item) => (
        <View key={item.taskId} style={styles.taskCard}>
          <View style={styles.taskCardHeader}>
            <Text style={styles.taskTitle}>{item.taskTitle}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.hoursOverdue}h Overdue</Text>
            </View>
          </View>
          <Text style={styles.reasonText}>{item.reason}</Text>

          {onCompleteTask && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => onCompleteTask(item.taskId)}
            >
              <Text style={styles.completeBtnText}>✓ Mark as Finished</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#E11D48',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9F1239',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#BE123C',
    marginTop: 1,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#881337',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#E11D48',
    fontSize: 11,
    fontWeight: '800',
  },
  reasonText: {
    fontSize: 12,
    color: '#9F1239',
    lineHeight: 17,
  },
  completeBtn: {
    backgroundColor: '#E11D48',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
