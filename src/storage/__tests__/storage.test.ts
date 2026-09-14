import { storageService } from '../storageService';
import { Task, RecurringTimeBlock } from '../../scheduler/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage in-memory for testing persistence
const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => store[key] || null),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete store[key];
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => delete store[k]);
  }),
}));

describe('Local Storage Persistence Service', () => {
  beforeEach(async () => {
    await storageService.clearAll();
  });

  test('saves tasks and loads them across app restarts without sign-in', async () => {
    const task: Task = {
      id: 'task-1',
      title: 'Database Systems Assignment',
      deadline: '2026-10-10T17:00:00.000Z',
      effort: '2hr',
      importance: 4,
      completed: false,
      createdAt: '2026-10-01T10:00:00.000Z',
    };

    await storageService.saveTask(task);
    const loaded = await storageService.getTasks();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Database Systems Assignment');
    expect(loaded[0].effort).toBe('2hr');
    expect(loaded[0].importance).toBe(4);
  });

  test('updates task and deletes task cleanly', async () => {
    const task: Task = {
      id: 'task-update',
      title: 'Initial Title',
      deadline: '2026-10-10T17:00:00.000Z',
      effort: '1hr',
      importance: 3,
      completed: false,
      createdAt: '2026-10-01T10:00:00.000Z',
    };

    await storageService.saveTask(task);
    await storageService.saveTask({ ...task, title: 'Updated Title', completed: true });

    let loaded = await storageService.getTasks();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Updated Title');
    expect(loaded[0].completed).toBe(true);

    await storageService.deleteTask('task-update');
    loaded = await storageService.getTasks();
    expect(loaded).toHaveLength(0);
  });

  test('saves and loads customized weekly free-time template', async () => {
    const customTemplate: RecurringTimeBlock[] = [
      { id: 'b-custom', dayOfWeek: 1, startHour: 19, startMinute: 0, endHour: 23, endMinute: 0 },
    ];

    await storageService.saveTemplate(customTemplate);
    const loaded = await storageService.getTemplate();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('b-custom');
    expect(loaded[0].startHour).toBe(19);
    expect(loaded[0].endHour).toBe(23);
  });

  test('tracks onboarding completion flag locally', async () => {
    expect(await storageService.isOnboarded()).toBe(false);
    await storageService.setOnboarded(true);
    expect(await storageService.isOnboarded()).toBe(true);
  });

  test('tracks unscheduled task changes flag', async () => {
    expect(await storageService.getHasUnscheduledChanges()).toBe(false);
    await storageService.setHasUnscheduledChanges(true);
    expect(await storageService.getHasUnscheduledChanges()).toBe(true);
  });
});
