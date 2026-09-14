import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, RecurringTimeBlock, ScheduledSession, ScheduleResult } from '../scheduler/types';
import { STORAGE_KEYS } from './keys';
import { DEFAULT_WEEKLY_TEMPLATE } from './defaultTemplate';

export const storageService = {
  /**
   * Loads all tasks from local-only storage.
   */
  async getTasks(): Promise<Task[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      if (!data) return [];
      return JSON.parse(data) as Task[];
    } catch (e) {
      console.error('Failed to load tasks from local storage', e);
      return [];
    }
  },

  /**
   * Saves or updates a task in local storage.
   */
  async saveTask(task: Task): Promise<void> {
    const tasks = await this.getTasks();
    const existingIndex = tasks.findIndex((t) => t.id === task.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  /**
   * Deletes a task by ID from local storage.
   */
  async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter((t) => t.id !== taskId);
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
  },

  /**
   * Loads the weekly free-time template. Defaults to standard student template if none saved.
   */
  async getTemplate(): Promise<RecurringTimeBlock[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TEMPLATE);
      if (!data) {
        return DEFAULT_WEEKLY_TEMPLATE;
      }
      const parsed = JSON.parse(data);
      return parsed.length > 0 ? parsed : DEFAULT_WEEKLY_TEMPLATE;
    } catch (e) {
      console.error('Failed to load template from local storage', e);
      return DEFAULT_WEEKLY_TEMPLATE;
    }
  },

  /**
   * Persists the user's weekly free-time template.
   */
  async saveTemplate(template: RecurringTimeBlock[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TEMPLATE, JSON.stringify(template));
  },

  /**
   * Checks whether the user has finished the onboarding flow.
   */
  async isOnboarded(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED);
      return val === 'true';
    } catch (e) {
      return false;
    }
  },

  /**
   * Marks onboarding as completed.
   */
  async setOnboarded(completed: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, completed ? 'true' : 'false');
  },

  /**
   * Retrieves manual user overrides (locked/manually adjusted sessions).
   */
  async getManualOverrides(): Promise<ScheduledSession[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MANUAL_OVERRIDES);
      if (!data) return [];
      return JSON.parse(data) as ScheduledSession[];
    } catch (e) {
      return [];
    }
  },

  /**
   * Persists manual overrides.
   */
  async saveManualOverrides(overrides: ScheduledSession[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDES, JSON.stringify(overrides));
  },

  /**
   * Loads the last computed schedule from cache.
   */
  async getCachedSchedule(): Promise<ScheduleResult | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULE_CACHE);
      if (!data) return null;
      return JSON.parse(data) as ScheduleResult;
    } catch (e) {
      return null;
    }
  },

  /**
   * Saves the computed schedule to cache.
   */
  async saveCachedSchedule(schedule: ScheduleResult | null): Promise<void> {
    if (!schedule) {
      await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULE_CACHE);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULE_CACHE, JSON.stringify(schedule));
    }
  },

  /**
   * Tracks whether newly added tasks have not yet been incorporated into a proposed schedule.
   */
  async getHasUnscheduledChanges(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.UNSCHEDULED_FLAG);
      return val === 'true';
    } catch (e) {
      return false;
    }
  },

  async setHasUnscheduledChanges(flag: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.UNSCHEDULED_FLAG, flag ? 'true' : 'false');
  },

  /**
   * Clears all local data (for reset in settings or testing).
   */
  async clearAll(): Promise<void> {
    const keys = [
      STORAGE_KEYS.TASKS,
      STORAGE_KEYS.TEMPLATE,
      STORAGE_KEYS.ONBOARDED,
      STORAGE_KEYS.SCHEDULE_CACHE,
      STORAGE_KEYS.MANUAL_OVERRIDES,
      STORAGE_KEYS.UNSCHEDULED_FLAG,
    ];
    await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
  },
};
