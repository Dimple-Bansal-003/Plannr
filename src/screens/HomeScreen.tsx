import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { TodayView } from './TodayView';
import { WeeklyView } from './WeeklyView';
import { AddTaskModal } from './AddTaskModal';
import { AddDailyHabitModal } from './AddDailyHabitModal';
import { WeeklyTemplateGrid } from '../components/WeeklyTemplateGrid';
import { UnscheduledBanner } from '../components/UnscheduledBanner';
import { Task } from '../scheduler/types';

type TabKey = 'today' | 'weekly' | 'tasks' | 'template';

export const HomeScreen: React.FC = () => {
  const {
    tasks,
    template,
    schedule,
    hasUnscheduledTasks,
    addTask,
    deleteTask,
    toggleTaskCompleted,
    saveTemplate,
    recalculateSchedule,
    resetAllData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [dailyHabitModalVisible, setDailyHabitModalVisible] = useState<boolean>(false);
  const [addChooserVisible, setAddChooserVisible] = useState<boolean>(false);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const handleRecalculate = async () => {
    setIsCalculating(true);
    try {
      await recalculateSchedule();
    } finally {
      setIsCalculating(false);
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const dailyHabits = incompleteTasks.filter((t) => t.taskType === 'daily_practice');
  const courseworkTasks = incompleteTasks.filter((t) => t.taskType !== 'daily_practice');

  const scheduledTaskIds = new Set(schedule?.sessions.map((s) => s.taskId) || []);
  const atRiskTaskIds = new Set(schedule?.atRiskTasks.map((ar) => ar.taskId) || []);
  const beyondHorizonTaskIds = new Set(schedule?.beyondHorizonTasks.map((bh) => bh.taskId) || []);

  const getTaskStatus = (task: Task) => {
    if (task.completed) return { label: 'Completed', color: '#10B981', bg: '#ECFDF5' };
    if (hasUnscheduledTasks) return { label: 'Pending Plan', color: '#D97706', bg: '#FEF3C7' };
    if (atRiskTaskIds.has(task.id)) return { label: '⚠️ At Risk', color: '#DC2626', bg: '#FEE2E2' };
    if (beyondHorizonTaskIds.has(task.id))
      return { label: '📅 Outside 14d Window', color: '#6366F1', bg: '#EEF2FF' };
    if (scheduledTaskIds.has(task.id)) return { label: '✓ Scheduled', color: '#059669', bg: '#D1FAE5' };
    return { label: 'Not Yet Scheduled', color: '#D97706', bg: '#FEF3C7' };
  };

  const atRiskCount = schedule?.atRiskTasks.length || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>Plannr <Text style={styles.appTitleMvp}>(MVP)</Text></Text>
          <Text style={styles.appSubtitle}>Deterministic Study Planner</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.recalcBtn, isCalculating && styles.recalcBtnDisabled]}
            onPress={handleRecalculate}
            disabled={isCalculating}
          >
            <Text style={styles.recalcBtnText}>
              {isCalculating ? 'Planning...' : '↻ Recalculate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.settingsHeaderIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Navigation Bar (Clean 4-Tab Architecture) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'today' && styles.tabItemActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'weekly' && styles.tabItemActive]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
            Weekly {atRiskCount > 0 && `(⚠️${atRiskCount})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tasks' && styles.tabItemActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
            Tasks & Habits ({incompleteTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'template' && styles.tabItemActive]}
          onPress={() => setActiveTab('template')}
        >
          <Text style={[styles.tabText, activeTab === 'template' && styles.tabTextActive]}>
            Free Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Screen Content */}
      <View style={styles.contentContainer}>
        {/* TAB 1: TODAY VIEW */}
        {activeTab === 'today' && (
          <TodayView
            onOpenAddTask={() => setModalVisible(true)}
            onOpenAddDailyHabit={() => setDailyHabitModalVisible(true)}
            onNavigateWeekly={() => setActiveTab('weekly')}
          />
        )}

        {/* TAB 2: WEEKLY VIEW */}
        {activeTab === 'weekly' && (
          <WeeklyView onOpenAddTask={() => setModalVisible(true)} />
        )}

        {/* TAB 3: TASKS LIST */}
        {activeTab === 'tasks' && (
          <ScrollView style={styles.tasksScroll} contentContainerStyle={styles.tasksScrollContent}>
            {hasUnscheduledTasks && (
              <UnscheduledBanner onRecalculate={handleRecalculate} />
            )}

            {/* Top Quick Actions Bar */}
            <View style={styles.tasksTopActionBar}>
              <TouchableOpacity
                style={styles.actionBtnCoursework}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.actionBtnCourseworkText}>🎓 + Add Coursework</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnDaily}
                onPress={() => setDailyHabitModalVisible(true)}
              >
                <Text style={styles.actionBtnDailyText}>🔁 + Add Everyday Task</Text>
              </TouchableOpacity>
            </View>

            {/* 1. Dedicated Everyday Practice Habits Section */}
            <View style={styles.subSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>
                  🔁 Everyday Practice Habits ({dailyHabits.length})
                </Text>
                <TouchableOpacity
                  style={styles.miniAddHabitBtn}
                  onPress={() => setDailyHabitModalVisible(true)}
                >
                  <Text style={styles.miniAddHabitBtnText}>+ Add Everyday Task</Text>
                </TouchableOpacity>
              </View>

              {dailyHabits.length === 0 ? (
                <View style={styles.emptyHabitCard}>
                  <View style={styles.emptyHabitHeader}>
                    <Text style={styles.emptyHabitIcon}>🔁</Text>
                    <Text style={styles.emptyHabitTitle}>Everyday Practice & Habits</Text>
                  </View>
                  <Text style={styles.emptyHabitDesc}>
                    Have a task you need to do every single day (like 30m LeetCode, language, or reading)? Set it up once and Plannr will automatically assign it to a fixed slot every day across your 14-day horizon. No manual daily entry required.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyHabitBtn}
                    onPress={() => setDailyHabitModalVisible(true)}
                  >
                    <Text style={styles.emptyHabitBtnText}>+ Set Up Everyday Task</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                dailyHabits.map((task) => {
                  const todayKey = new Date().toISOString().split('T')[0];
                  const isDoneToday = task.completedDates?.includes(todayKey);
                  const slotName =
                    task.preferredSlot === 'warmup'
                      ? `🌅 Slot ${task.slotOrder || 1}: Warm-Up Flow`
                      : task.preferredSlot === 'peak'
                      ? `🎯 Slot ${task.slotOrder || 2}: Peak Focus`
                      : task.preferredSlot === 'winddown'
                      ? '🌙 Wind-Down Slot'
                      : `⚡ Slot ${task.slotOrder || 1}`;

                  return (
                    <View key={task.id} style={[styles.taskCard, isDoneToday && styles.taskCardDone]}>
                      <View style={styles.taskCardTop}>
                        <TouchableOpacity
                          style={[styles.taskCheckbox, isDoneToday && styles.taskCheckboxDone]}
                          onPress={() => toggleTaskCompleted(task.id, todayKey)}
                        >
                          <Text style={isDoneToday ? styles.taskCheckboxCompletedText : styles.taskCheckboxText}>
                            {isDoneToday ? '✓' : '○'}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.taskInfo}>
                          <Text style={[styles.taskTitle, isDoneToday && styles.taskTitleDone]}>
                            {task.title}
                          </Text>
                          <Text style={styles.taskDeadline}>
                            {isDoneToday ? '✓ Completed for today' : '• Scheduled daily in your free time'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => deleteTask(task.id)}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.taskBadgesRow}>
                        <View style={styles.badgePillDaily}>
                          <Text style={styles.badgePillDailyText}>⏱ {task.effort} daily</Text>
                        </View>

                        <View style={styles.badgePillSlot}>
                          <Text style={styles.badgePillSlotText}>{slotName}</Text>
                        </View>

                        {isDoneToday && (
                          <View style={styles.badgePillSuccess}>
                            <Text style={styles.badgePillSuccessText}>Done Today</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* 2. Coursework Deadlines Section */}
            <View style={styles.subSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>
                  🎓 Coursework Deadlines ({courseworkTasks.length})
                </Text>
                <TouchableOpacity
                  style={styles.miniAddCourseworkBtn}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.miniAddCourseworkBtnText}>+ Add Coursework</Text>
                </TouchableOpacity>
              </View>

              {courseworkTasks.length === 0 ? (
                <View style={styles.emptyCourseworkCard}>
                  <Text style={styles.emptyCourseworkIcon}>🎓</Text>
                  <Text style={styles.emptyCourseworkTitle}>No Coursework Deadlines</Text>
                  <Text style={styles.emptyCourseworkDesc}>
                    Add assignments, lab reports, or exam prep to get an honest study schedule packed into your free time.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyCourseworkBtn}
                    onPress={() => setModalVisible(true)}
                  >
                    <Text style={styles.emptyCourseworkBtnText}>+ Add Coursework</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                courseworkTasks.map((task) => {
                  const status = getTaskStatus(task);
                  const deadlineDate = new Date(task.deadline);
                  const formattedDate = deadlineDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });
                  const formattedTime = deadlineDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <View key={task.id} style={styles.taskCard}>
                      <View style={styles.taskCardTop}>
                        <TouchableOpacity
                          style={styles.taskCheckbox}
                          onPress={() => toggleTaskCompleted(task.id)}
                        >
                          <Text style={styles.taskCheckboxText}>○</Text>
                        </TouchableOpacity>

                        <View style={styles.taskInfo}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <Text style={styles.taskDeadline}>
                            Due: {formattedDate} at {formattedTime}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => deleteTask(task.id)}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.taskBadgesRow}>
                        <View style={[styles.badgePill, { backgroundColor: status.bg }]}>
                          <Text style={[styles.badgePillText, { color: status.color }]}>
                            {status.label}
                          </Text>
                        </View>

                        <View style={styles.badgePillGray}>
                          <Text style={styles.badgePillTextGray}>⏱ {task.effort}</Text>
                        </View>

                        <View style={styles.badgePillGray}>
                          <Text style={styles.badgePillTextGray}>
                            ★ {task.importance}/5 Weight
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Completed Section */}
            {completedTasks.length > 0 && (
              <View style={styles.completedSection}>
                <Text style={styles.completedHeading}>
                  Completed Coursework ({completedTasks.length})
                </Text>
                {completedTasks.map((task) => (
                  <View key={task.id} style={styles.completedCard}>
                    <TouchableOpacity
                      style={styles.taskCheckbox}
                      onPress={() => toggleTaskCompleted(task.id)}
                    >
                      <Text style={styles.taskCheckboxCompletedText}>✓</Text>
                    </TouchableOpacity>
                    <Text style={styles.completedTitle}>{task.title}</Text>
                    <TouchableOpacity onPress={() => deleteTask(task.id)}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* TAB 4: FREE-TIME TEMPLATE */}
        {activeTab === 'template' && (
          <ScrollView style={styles.tasksScroll} contentContainerStyle={styles.tasksScrollContent}>
            <WeeklyTemplateGrid
              initialTemplate={template}
              onChange={(updated) => saveTemplate(updated)}
            />
            <TouchableOpacity
              style={styles.replanFromTemplateBtn}
              onPress={handleRecalculate}
            >
              <Text style={styles.replanFromTemplateBtnText}>
                Save & Update Proposed Schedule
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Floating Action Button (+ Add) on Today, Weekly, and Tasks */}
      {(activeTab === 'today' || activeTab === 'weekly' || activeTab === 'tasks') && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddChooserVisible(true)}
        >
          <Text style={styles.fabText}>+ Add</Text>
        </TouchableOpacity>
      )}

      {/* Add Item Chooser Modal */}
      <Modal
        visible={addChooserVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddChooserVisible(false)}
      >
        <TouchableOpacity
          style={styles.chooserOverlay}
          activeOpacity={1}
          onPress={() => setAddChooserVisible(false)}
        >
          <View style={styles.chooserCard}>
            <View style={styles.chooserHeader}>
              <Text style={styles.chooserTitle}>What would you like to schedule?</Text>
              <TouchableOpacity
                onPress={() => setAddChooserVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.chooserOptionCard}
              onPress={() => {
                setAddChooserVisible(false);
                setDailyHabitModalVisible(true);
              }}
            >
              <View style={styles.chooserOptionIconBoxDaily}>
                <Text style={styles.chooserOptionIcon}>🔁</Text>
              </View>
              <View style={styles.chooserOptionTextCol}>
                <View style={styles.chooserOptionHeadingRow}>
                  <Text style={styles.chooserOptionTitle}>Everyday Practice / Habit</Text>
                  <View style={styles.badgeNew}>
                    <Text style={styles.badgeNewText}>Everyday</Text>
                  </View>
                </View>
                <Text style={styles.chooserOptionDesc}>
                  Recurring practice (e.g. 30m LeetCode, language, or reading). Automatically reserves a fixed slot every single day across your 14-day horizon without re-entering.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chooserOptionCard}
              onPress={() => {
                setAddChooserVisible(false);
                setModalVisible(true);
              }}
            >
              <View style={styles.chooserOptionIconBoxCoursework}>
                <Text style={styles.chooserOptionIcon}>🎓</Text>
              </View>
              <View style={styles.chooserOptionTextCol}>
                <Text style={styles.chooserOptionTitle}>Coursework Deadline</Text>
                <Text style={styles.chooserOptionDesc}>
                  One-off academic deadlines (assignments, lab reports, essays, exam study) with specific due dates and syllabus weightage.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Coursework Task Modal */}
      <AddTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaveTask={(task, recalculate) => addTask(task, recalculate)}
      />

      {/* Add Everyday Habit Modal */}
      <AddDailyHabitModal
        visible={dailyHabitModalVisible}
        onClose={() => setDailyHabitModalVisible(false)}
        onSaveTask={(task, recalculate) => addTask(task, recalculate)}
        existingDailyTasks={dailyHabits}
      />

      {/* Settings & Trust Modal */}
      <Modal
        visible={settingsVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.settingsModalCard}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>⚙️ Settings & Privacy</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsModalBody}>
              <View style={styles.trustBox}>
                <Text style={styles.trustTitle}>🔒 Zero Permissions & Privacy First</Text>
                <Text style={styles.trustDesc}>
                  Plannr stores all coursework and habits strictly on this device in local storage. No network accounts, no calendar tracking, and zero AI in the scheduling path.
                </Text>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Algorithm Engine</Text>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Engine Mode</Text>
                  <Text style={styles.settingValue}>Deterministic Priority Queue</Text>
                </View>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Horizon</Text>
                  <Text style={styles.settingValue}>14 Rolling Days</Text>
                </View>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Focus Blocks</Text>
                  <Text style={styles.settingValue}>Max 50m + 10m break</Text>
                </View>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Sequencing</Text>
                  <Text style={styles.settingValue}>Warm-Up → Peak → Wind-Down</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={async () => {
                  setSettingsVisible(false);
                  await resetAllData();
                }}
              >
                <Text style={styles.dangerBtnText}>Reset All Data (Clear Everything)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appTitleMvp: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsHeaderBtn: {
    backgroundColor: '#1E293B',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsHeaderIcon: {
    fontSize: 16,
  },
  recalcBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recalcBtnDisabled: {
    opacity: 0.6,
  },
  recalcBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tasksScroll: {
    flex: 1,
  },
  tasksScrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 40,
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
  emptyBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  subSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskCardDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.85,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskCheckboxDone: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  taskCheckboxText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  taskCheckboxCompletedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: 'bold',
  },
  taskTitleDone: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  taskDeadline: {
    fontSize: 12,
    color: '#64748B',
  },
  deleteBtn: {
    padding: 6,
  },
  deleteBtnText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  taskBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgePillGray: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillTextGray: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  badgePillDaily: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgePillDailyText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  badgePillSlot: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  badgePillSlotText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '700',
  },
  badgePillSuccess: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgePillSuccessText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  completedSection: {
    marginTop: 20,
  },
  completedHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  completedTitle: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  replanFromTemplateBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  replanFromTemplateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  settingsContainer: {
    gap: 16,
  },
  trustBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3730A3',
    marginBottom: 4,
  },
  trustText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 6,
  },
  trustDesc: {
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 18,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dangerBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 12,
  },
  dangerBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  settingsModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
  },
  settingsModalBody: {
    padding: 20,
  },
  tasksTopActionBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtnCoursework: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnCourseworkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  actionBtnDaily: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnDailyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniAddHabitBtn: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniAddHabitBtnText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '700',
  },
  miniAddCourseworkBtn: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniAddCourseworkBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyHabitCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 10,
  },
  emptyHabitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyHabitIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  emptyHabitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5B21B6',
  },
  emptyHabitDesc: {
    fontSize: 13,
    color: '#6D28D9',
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyHabitBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  emptyHabitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyCourseworkCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    alignItems: 'center',
  },
  emptyCourseworkIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyCourseworkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyCourseworkDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyCourseworkBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyCourseworkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  chooserOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  chooserCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  chooserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chooserTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  chooserOptionCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  chooserOptionIconBoxDaily: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chooserOptionIconBoxCoursework: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chooserOptionIcon: {
    fontSize: 20,
  },
  chooserOptionTextCol: {
    flex: 1,
  },
  chooserOptionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  chooserOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeNew: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  chooserOptionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
