import { computeSchedule } from '../scheduler/engine';
import { Task, RecurringTimeBlock, ScheduledSession } from '../scheduler/types';
import { storageService } from '../storage/storageService';

let simulatedDisk: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => simulatedDisk[key] || null),
  setItem: jest.fn(async (key: string, value: string) => {
    simulatedDisk[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete simulatedDisk[key];
  }),
}));

describe('Phase 4 Acceptance: Manual Overrides, Schedule Integrity & Explicit Re-Planning', () => {
  beforeEach(() => {
    simulatedDisk = {};
  });

  test('Manually edited and pinned sessions are NOT silently reverted by subsequent re-plans', async () => {
    const now = new Date(2026, 9, 5, 10, 0, 0); // Monday Oct 5

    // Mon-Tue 18:00 - 22:00 (4 hours each day)
    const template: RecurringTimeBlock[] = [
      { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    ];
    await storageService.saveTemplate(template);

    const task1: Task = {
      id: 'task-essay',
      title: 'Literature Research Essay',
      deadline: new Date(2026, 9, 7, 12, 0, 0).toISOString(),
      effort: '2hr', // 120m
      importance: 3,
      completed: false,
      createdAt: now.toISOString(),
    };

    const task2: Task = {
      id: 'task-math',
      title: 'Calculus III Problem Set',
      deadline: new Date(2026, 9, 7, 12, 0, 0).toISOString(),
      effort: '2hr', // 120m
      importance: 5, // Higher importance!
      completed: false,
      createdAt: now.toISOString(),
    };

    await storageService.saveTask(task1);
    await storageService.saveTask(task2);

    // Initial compute without overrides: Calculus III gets scheduled first at Mon 18:00
    const initialSchedule = computeSchedule({
      tasks: [task1, task2],
      template,
      now,
    });
    expect(initialSchedule.sessions[0].taskId).toBe('task-math');

    // -------------------------------------------------------------
    // User Action: Manual Override
    // User explicitly reschedules task-essay to Mon 18:00 - 20:00 and pins it!
    // -------------------------------------------------------------
    const userPinnedSession: ScheduledSession = {
      id: 'pinned-essay-1',
      taskId: 'task-essay',
      taskTitle: 'Literature Research Essay',
      startTime: new Date(2026, 9, 5, 18, 0, 0).toISOString(),
      endTime: new Date(2026, 9, 5, 20, 0, 0).toISOString(),
      durationMinutes: 120,
      sessionIndex: 1,
      totalSessions: 1,
      isManualOverride: true,
    };

    await storageService.saveManualOverrides([userPinnedSession]);
    const storedOverrides = await storageService.getManualOverrides();
    expect(storedOverrides).toHaveLength(1);

    // -------------------------------------------------------------
    // Explicit Re-Plan Trigger
    // Re-plan must NOT silently revert the user's manual override!
    // -------------------------------------------------------------
    const replannedSchedule = computeSchedule({
      tasks: [task1, task2],
      template,
      now,
      manualOverrides: storedOverrides,
    });

    // Pinned session remains at Mon 18:00 - 20:00
    const essaySession = replannedSchedule.sessions.find((s) => s.taskId === 'task-essay');
    expect(essaySession).toBeDefined();
    expect(essaySession?.startTime).toBe(new Date(2026, 9, 5, 18, 0, 0).toISOString());
    expect(essaySession?.isManualOverride).toBe(true);

    // Calculus III (higher importance) was moved by the scheduler to the next available slot: Mon 20:00 - 22:00!
    const mathSession = replannedSchedule.sessions.find((s) => s.taskId === 'task-math');
    expect(mathSession).toBeDefined();
    expect(mathSession?.startTime).toBe(new Date(2026, 9, 5, 20, 0, 0).toISOString());
    expect(mathSession?.endTime).toBe(new Date(2026, 9, 5, 22, 0, 0).toISOString());

    // -------------------------------------------------------------
    // Subsequent Re-Plan when a new task is added
    // User adds a 3rd task and triggers re-plan: manual override STILL preserved!
    // -------------------------------------------------------------
    const task3: Task = {
      id: 'task-urgent',
      title: 'Urgent Micro-Quiz',
      deadline: new Date(2026, 9, 6, 12, 0, 0).toISOString(),
      effort: '30min',
      importance: 5,
      completed: false,
      createdAt: now.toISOString(),
    };

    const thirdSchedule = computeSchedule({
      tasks: [task1, task2, task3],
      template,
      now,
      manualOverrides: storedOverrides,
    });

    // Pinned session remains completely untouched
    const essayStillPinned = thirdSchedule.sessions.find((s) => s.id === 'pinned-essay-1');
    expect(essayStillPinned).toBeDefined();
    expect(essayStillPinned?.startTime).toBe(new Date(2026, 9, 5, 18, 0, 0).toISOString());
    expect(essayStillPinned?.isManualOverride).toBe(true);

    // -------------------------------------------------------------
    // Mark Complete & Remove Pin
    // When user marks task-essay complete, it frees up and is not re-scheduled
    // -------------------------------------------------------------
    const completedEssay: Task = { ...task1, completed: true };
    const scheduleAfterComplete = computeSchedule({
      tasks: [completedEssay, task2, task3],
      template,
      now,
      manualOverrides: [], // pin cleared
    });

    const activeEssaySessions = scheduleAfterComplete.sessions.filter((s) => s.taskId === 'task-essay');
    expect(activeEssaySessions).toHaveLength(0);
  });
});
