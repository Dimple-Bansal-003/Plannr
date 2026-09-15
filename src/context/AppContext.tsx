import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Task,
  RecurringTimeBlock,
  ScheduleResult,
  ScheduledSession,
} from '../scheduler/types';
import { computeSchedule } from '../scheduler/engine';
import { storageService } from '../storage/storageService';
import { DEFAULT_WEEKLY_TEMPLATE } from '../storage/defaultTemplate';

interface AppContextType {
  tasks: Task[];
  template: RecurringTimeBlock[];
  schedule: ScheduleResult | null;
  manualOverrides: ScheduledSession[];
  isOnboarded: boolean;
  isLoading: boolean;
  hasUnscheduledTasks: boolean;
  addTask: (task: Task, recalculate: boolean) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskCompleted: (taskId: string, targetDateStr?: string) => Promise<void>;
  saveTemplate: (newTemplate: RecurringTimeBlock[]) => Promise<void>;
  recalculateSchedule: () => Promise<ScheduleResult>;
  addManualOverride: (override: ScheduledSession) => Promise<void>;
  removeManualOverride: (sessionId: string) => Promise<void>;
  finishOnboarding: (newTemplate: RecurringTimeBlock[]) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [template, setTemplate] = useState<RecurringTimeBlock[]>(DEFAULT_WEEKLY_TEMPLATE);
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [manualOverrides, setManualOverrides] = useState<ScheduledSession[]>([]);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasUnscheduledTasks, setHasUnscheduledTasks] = useState<boolean>(false);

  // Load initial data from local storage on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedTasks,
          savedTemplate,
          savedOnboarded,
          savedSchedule,
          savedOverrides,
          savedUnscheduled,
        ] = await Promise.all([
          storageService.getTasks(),
          storageService.getTemplate(),
          storageService.isOnboarded(),
          storageService.getCachedSchedule(),
          storageService.getManualOverrides(),
          storageService.getHasUnscheduledChanges(),
        ]);

        setTasks(savedTasks);
        setTemplate(savedTemplate);
        setIsOnboarded(savedOnboarded);
        setSchedule(savedSchedule);
        setManualOverrides(savedOverrides);
        setHasUnscheduledTasks(savedUnscheduled);
      } catch (err) {
        console.error('Failed to bootstrap app data from storage', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const recalculateSchedule = async (): Promise<ScheduleResult> => {
    const currentTasks = await storageService.getTasks();
    const currentTemplate = await storageService.getTemplate();
    const currentOverrides = await storageService.getManualOverrides();

    const newSchedule = computeSchedule({
      tasks: currentTasks,
      template: currentTemplate,
      now: new Date(),
      manualOverrides: currentOverrides,
    });

    setSchedule(newSchedule);
    setHasUnscheduledTasks(false);
    await storageService.saveCachedSchedule(newSchedule);
    await storageService.setHasUnscheduledChanges(false);
    return newSchedule;
  };

  const addTask = async (task: Task, recalculate: boolean) => {
    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    await storageService.saveTask(task);

    if (recalculate) {
      await recalculateSchedule();
    } else {
      setHasUnscheduledTasks(true);
      await storageService.setHasUnscheduledChanges(true);
    }
  };

  const updateTask = async (task: Task) => {
    const updatedTasks = tasks.map((t) => (t.id === task.id ? task : t));
    setTasks(updatedTasks);
    await storageService.saveTask(task);
  };

  const deleteTask = async (taskId: string) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
    await storageService.deleteTask(taskId);
    // Also remove any overrides for this task
    const updatedOverrides = manualOverrides.filter((o) => o.taskId !== taskId);
    setManualOverrides(updatedOverrides);
    await storageService.saveManualOverrides(updatedOverrides);
    await recalculateSchedule();
  };

  const toggleTaskCompleted = async (taskId: string, targetDateStr?: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.taskType === 'daily_practice') {
      const now = new Date();
      const dateKey = targetDateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const completedDates = task.completedDates || [];
      const isCompletedToday = completedDates.includes(dateKey);
      const updatedDates = isCompletedToday
        ? completedDates.filter((d) => d !== dateKey)
        : [...completedDates, dateKey];

      const updatedTask: Task = { ...task, completedDates: updatedDates };
      await updateTask(updatedTask);
      await recalculateSchedule();
      return;
    }

    const updatedTask: Task = { ...task, completed: !task.completed };
    await updateTask(updatedTask);
    // Per algorithm spec: re-run algorithm when user marks task complete/incomplete
    await recalculateSchedule();
  };

  const saveTemplate = async (newTemplate: RecurringTimeBlock[]) => {
    setTemplate(newTemplate);
    await storageService.saveTemplate(newTemplate);
  };

  const addManualOverride = async (override: ScheduledSession) => {
    const updated = [...manualOverrides.filter((o) => o.id !== override.id), override];
    setManualOverrides(updated);
    await storageService.saveManualOverrides(updated);
    await recalculateSchedule();
  };

  const removeManualOverride = async (sessionId: string) => {
    const updated = manualOverrides.filter((o) => o.id !== sessionId);
    setManualOverrides(updated);
    await storageService.saveManualOverrides(updated);
    await recalculateSchedule();
  };

  const finishOnboarding = async (newTemplate: RecurringTimeBlock[]) => {
    await saveTemplate(newTemplate);
    setIsOnboarded(true);
    await storageService.setOnboarded(true);
  };

  const resetAllData = async () => {
    await storageService.clearAll();
    setTasks([]);
    setTemplate(DEFAULT_WEEKLY_TEMPLATE);
    setSchedule(null);
    setManualOverrides([]);
    setIsOnboarded(false);
    setHasUnscheduledTasks(false);
  };

  return (
    <AppContext.Provider
      value={{
        tasks,
        template,
        schedule,
        manualOverrides,
        isOnboarded,
        isLoading,
        hasUnscheduledTasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompleted,
        saveTemplate,
        recalculateSchedule,
        addManualOverride,
        removeManualOverride,
        finishOnboarding,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
