import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AtRiskTaskInfo } from '../scheduler/types';

interface AtRiskAlertCardProps {
  atRiskTasks: AtRiskTaskInfo[];
}

export const AtRiskAlertCard: React.FC<AtRiskAlertCardProps> = ({ atRiskTasks }) => {
  if (atRiskTasks.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>⚠️</Text>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>
            {atRiskTasks.length === 1 ? '1 Task Won\'t Fit Deadline' : `${atRiskTasks.length} Tasks Won't Fit Deadlines`}
          </Text>
          <Text style={styles.headerSubtitle}>
            Honest Overcommit Warning: insufficient free time exists before deadline.
          </Text>
        </View>
      </View>

      {atRiskTasks.map((item) => (
        <View key={item.taskId} style={styles.taskCard}>
          <View style={styles.taskCardHeader}>
            <Text style={styles.taskTitle}>{item.taskTitle}</Text>
            <View style={styles.missingBadge}>
              <Text style={styles.missingBadgeText}>Missing {item.missingMinutes}m</Text>
            </View>
          </View>
          <Text style={styles.reasonText}>{item.reason}</Text>
          <View style={styles.adviceRow}>
            <Text style={styles.adviceText}>
              💡 Suggestion: Free up more study time on earlier days or adjust syllabus priorities.
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
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
    color: '#991B1B',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 1,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
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
    color: '#7F1D1D',
    flex: 1,
    marginRight: 8,
  },
  missingBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  missingBadgeText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
  },
  adviceRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  adviceText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
