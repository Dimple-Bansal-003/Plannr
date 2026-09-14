import { computeSchedule } from '../scheduler/engine';
import { Task, RecurringTimeBlock } from '../scheduler/types';
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

describe('Phase 3 Acceptance: Today & Weekly Views Wired to Deterministic Scheduler', () => {
  beforeEach(() => {
    simulatedDisk = {};
  });

  test('Realistic coursework dataset produces correct Today/Weekly views with honest At-Risk and Beyond-Horizon flags', async () => {
    // Reference time: Monday Oct 5, 2026, 10:00 AM local
    const now = new Date(2026, 9, 5, 10, 0, 0);

    // Standard student template: Mon-Fri 18:00-22:00 (4 hours/day)
    const template: RecurringTimeBlock[] = [
      { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-thu', dayOfWeek: 4, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
      { id: 'b-fri', dayOfWeek: 5, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    ];
    await storageService.saveTemplate(template);

    // Realistic student tasks:
    // 1. OS Lab (2h, due in 2 days, importance 4)
    const taskOS: Task = {
      id: 'task-os',
      title: 'OS Process Synchronization Lab',
      deadline: new Date(2026, 9, 7, 17, 0, 0).toISOString(), // Wednesday 17:00
      effort: '2hr',
      importance: 4,
      completed: false,
      createdAt: now.toISOString(),
    };

    // 2. DBMS Exam Prep (half-day / 4h, due in 3 days, importance 5 - highest weightage)
    const taskDBMS: Task = {
      id: 'task-dbms',
      title: 'Database Systems Midterm Prep',
      deadline: new Date(2026, 9, 8, 9, 0, 0).toISOString(), // Thursday 09:00
      effort: 'half-day', // 240m
      importance: 5,
      completed: false,
      createdAt: now.toISOString(),
    };

    // 3. Deliberately oversized task: Due tomorrow morning (Tue 09:00), needs full-day (8h = 480m)
    // Only 4h (18:00-22:00) exists on Monday before Tuesday morning, and DBMS/OS compete!
    // -> MUST TRIGGER THE AT-RISK HONEST WARNING!
    const taskOversized: Task = {
      id: 'task-oversized',
      title: 'Compiler Design Massive Project',
      deadline: new Date(2026, 9, 6, 9, 0, 0).toISOString(), // Tomorrow Tue 09:00 AM
      effort: 'full-day', // 480m
      importance: 3,
      completed: false,
      createdAt: now.toISOString(),
    };

    // 4. Distant task: Capstone Presentation due in 25 days
    // -> MUST TRIGGER THE BEYOND-HORIZON / NOT YET SCHEDULED STATE!
    const taskDistant: Task = {
      id: 'task-distant',
      title: 'Semester Capstone Final Defense',
      deadline: new Date(2026, 9, 30, 14, 0, 0).toISOString(), // 25 days away
      effort: '2hr',
      importance: 5,
      completed: false,
      createdAt: now.toISOString(),
    };

    await storageService.saveTask(taskOS);
    await storageService.saveTask(taskDBMS);
    await storageService.saveTask(taskOversized);
    await storageService.saveTask(taskDistant);

    const savedTasks = await storageService.getTasks();
    expect(savedTasks).toHaveLength(4);

    // Compute schedule with Phase 1 engine
    const scheduleResult = computeSchedule({
      tasks: savedTasks,
      template,
      now,
      horizonDays: 14,
    });

    // -------------------------------------------------------------
    // Verify 1: AT-RISK HONEST OVERCOMMIT DETECTION
    // -------------------------------------------------------------
    expect(scheduleResult.atRiskTasks.length).toBeGreaterThanOrEqual(1);
    const atRiskItem = scheduleResult.atRiskTasks.find((ar) => ar.taskId === 'task-oversized');
    expect(atRiskItem).toBeDefined();
    expect(atRiskItem?.taskTitle).toBe('Compiler Design Massive Project');
    expect(atRiskItem?.totalEffortMinutes).toBe(480);
    // On Monday 18:00 - 22:00 (240m available), task requires 480m
    expect(atRiskItem?.missingMinutes).toBeGreaterThan(0);
    expect(atRiskItem?.reason).toContain("Won't fit before deadline");
    // Verify it was NEVER scheduled past its deadline of Tuesday 09:00 AM
    const oversizedSessions = scheduleResult.sessions.filter((s) => s.taskId === 'task-oversized');
    oversizedSessions.forEach((s) => {
      const sessionEnd = new Date(s.endTime);
      expect(sessionEnd.getTime()).toBeLessThanOrEqual(new Date(taskOversized.deadline).getTime());
    });

    // -------------------------------------------------------------
    // Verify 2: BEYOND-HORIZON VISIBILITY (NOT SILENTLY OMITTED)
    // -------------------------------------------------------------
    expect(scheduleResult.beyondHorizonTasks).toHaveLength(1);
    const beyondTask = scheduleResult.beyondHorizonTasks[0];
    expect(beyondTask.taskId).toBe('task-distant');
    expect(beyondTask.taskTitle).toBe('Semester Capstone Final Defense');
    expect(beyondTask.status).toBe('beyond_horizon');
    expect(beyondTask.daysUntilDeadline).toBeCloseTo(25.2, 1);
    expect(beyondTask.entryDate).toBeDefined();

    // -------------------------------------------------------------
    // Verify 3: TODAY VIEW DATA INTEGRITY
    // -------------------------------------------------------------
    // Today is Monday Oct 5
    const todaySessions = scheduleResult.sessions.filter((s) => {
      const d = new Date(s.startTime);
      return d.toDateString() === now.toDateString();
    });

    expect(todaySessions.length).toBeGreaterThan(0);
    // Total today's sessions fit cleanly within the 18:00 - 22:00 block (max 240 mins)
    const todayTotalDuration = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    expect(todayTotalDuration).toBeLessThanOrEqual(240);

    // Verify chronological ordering of today's sessions
    for (let i = 0; i < todaySessions.length - 1; i++) {
      const cur = new Date(todaySessions[i].endTime).getTime();
      const next = new Date(todaySessions[i + 1].startTime).getTime();
      expect(cur).toBeLessThanOrEqual(next);
    }

    // -------------------------------------------------------------
    // Verify 4: WEEKLY SCHEDULE ALLOCATION & SPLIT DETECTION
    // -------------------------------------------------------------
    // Database Systems Midterm Prep needs 4 hours (240 mins).
    // It should be scheduled across available slots before Thursday 09:00
    const dbmsSessions = scheduleResult.sessions.filter((s) => s.taskId === 'task-dbms');
    expect(dbmsSessions.length).toBeGreaterThanOrEqual(1);
    const totalDBMSAllocated = dbmsSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    expect(totalDBMSAllocated).toBe(240);
  });
});
