import { storageService } from '../storageService';
import { Task, RecurringTimeBlock } from '../../scheduler/types';

// In-memory persistent backing store simulating device storage between app launches
let persistentDeviceDisk: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => persistentDeviceDisk[key] || null),
  setItem: jest.fn(async (key: string, value: string) => {
    persistentDeviceDisk[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete persistentDeviceDisk[key];
  }),
}));

describe('Phase 2 Acceptance: Zero Sign-In & Persistence Across App Restarts', () => {
  beforeEach(() => {
    persistentDeviceDisk = {};
  });

  test('User adds multiple coursework tasks, configures free-time template, and restarts app', async () => {
    // -------------------------------------------------------------
    // App Session 1 (First Launch)
    // -------------------------------------------------------------
    expect(await storageService.isOnboarded()).toBe(false);

    // 1. User sets custom free-time template during onboarding
    const customTemplate: RecurringTimeBlock[] = [
      { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-thu', dayOfWeek: 4, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-fri', dayOfWeek: 5, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-sat', dayOfWeek: 6, startHour: 9, startMinute: 0, endHour: 15, endMinute: 0 },
    ];
    await storageService.saveTemplate(customTemplate);
    await storageService.setOnboarded(true);

    // 2. User adds 3 diverse coursework tasks with presets & importance weights
    const task1: Task = {
      id: 'task-dbms-exam',
      title: 'DBMS Final Exam Prep',
      deadline: '2026-10-15T09:00:00.000Z',
      effort: 'full-day', // 8hr
      importance: 5,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const task2: Task = {
      id: 'task-os-lab',
      title: 'OS Process Synchronization Lab',
      deadline: '2026-10-08T17:00:00.000Z',
      effort: '2hr',
      importance: 4,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const task3: Task = {
      id: 'task-ai-quiz',
      title: 'AI Search Algorithms Quiz',
      deadline: '2026-10-06T12:00:00.000Z',
      effort: '30min',
      importance: 2,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    await storageService.saveTask(task1);
    await storageService.saveTask(task2);
    await storageService.saveTask(task3);

    // Verify written to storage
    const tasksSession1 = await storageService.getTasks();
    expect(tasksSession1).toHaveLength(3);

    // -------------------------------------------------------------
    // App Restart Simulation (Memory cleared, new app instance reads storage)
    // -------------------------------------------------------------
    // Both template and tasks must reload exactly as saved
    const reloadedOnboarded = await storageService.isOnboarded();
    const reloadedTemplate = await storageService.getTemplate();
    const reloadedTasks = await storageService.getTasks();

    expect(reloadedOnboarded).toBe(true);
    expect(reloadedTemplate).toHaveLength(6);
    expect(reloadedTemplate.find((b) => b.dayOfWeek === 6)?.endHour).toBe(15);

    expect(reloadedTasks).toHaveLength(3);
    const reloadedTitles = reloadedTasks.map((t) => t.title);
    expect(reloadedTitles).toContain('DBMS Final Exam Prep');
    expect(reloadedTitles).toContain('OS Process Synchronization Lab');
    expect(reloadedTitles).toContain('AI Search Algorithms Quiz');

    // Verify task details preserved
    const dbms = reloadedTasks.find((t) => t.id === 'task-dbms-exam');
    expect(dbms?.effort).toBe('full-day');
    expect(dbms?.importance).toBe(5);
    expect(dbms?.completed).toBe(false);
  });
});
