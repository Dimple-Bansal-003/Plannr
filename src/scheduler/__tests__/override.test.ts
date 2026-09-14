import { computeSchedule } from '../engine';
import { Task, RecurringTimeBlock, ScheduledSession } from '../types';

describe('Manual Override & Schedule Integrity', () => {
  // Monday Oct 5, 2026, 10:00 local
  const now = new Date(2026, 9, 5, 10, 0, 0);

  // Single 3-hour window on Monday: 18:00 to 21:00
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 21, endMinute: 0 },
  ];

  test('preserves user manual override session and prevents re-planner from double-booking', () => {
    const taskA: Task = {
      id: 'task-a',
      title: 'History Essay',
      deadline: new Date(2026, 9, 6, 12, 0, 0).toISOString(),
      effort: '2hr', // 120 mins
      importance: 3,
      completed: false,
      createdAt: now.toISOString(),
    };

    const taskB: Task = {
      id: 'task-b',
      title: 'Urgent Math Quiz',
      deadline: new Date(2026, 9, 6, 12, 0, 0).toISOString(),
      effort: '1hr', // 60 mins
      importance: 5, // Higher importance than taskA
      completed: false,
      createdAt: now.toISOString(),
    };

    // User explicitly pinned a 60-minute session for task-a at 19:00-20:00 local time
    const manualSessionStart = new Date(2026, 9, 5, 19, 0, 0);
    const manualSessionEnd = new Date(2026, 9, 5, 20, 0, 0);

    const manualOverride: ScheduledSession = {
      id: 'manual-session-1',
      taskId: 'task-a',
      taskTitle: 'History Essay',
      startTime: manualSessionStart.toISOString(),
      endTime: manualSessionEnd.toISOString(),
      durationMinutes: 60,
      sessionIndex: 1,
      totalSessions: 1,
      isManualOverride: true,
    };

    const result = computeSchedule({
      tasks: [taskA, taskB],
      template,
      now,
      manualOverrides: [manualOverride],
    });

    // The manual session for task-a must be preserved exactly
    const preservedOverride = result.sessions.find((s) => s.id === 'manual-session-1');
    expect(preservedOverride).toBeDefined();
    expect(preservedOverride?.isManualOverride).toBe(true);
    expect(preservedOverride?.startTime).toBe(manualSessionStart.toISOString());

    // Urgent Math Quiz (task-b) should take the first available slot: 18:00 - 19:00
    const taskBSessions = result.sessions.filter((s) => s.taskId === 'task-b');
    expect(taskBSessions).toHaveLength(1);
    expect(taskBSessions[0].startTime).toBe(new Date(2026, 9, 5, 18, 0, 0).toISOString());
    expect(taskBSessions[0].endTime).toBe(new Date(2026, 9, 5, 19, 0, 0).toISOString());

    // Remaining 60 minutes for task-a takes 20:00 - 21:00
    const allTaskASessions = result.sessions.filter((s) => s.taskId === 'task-a');
    expect(allTaskASessions).toHaveLength(2);
    const secondTaskASession = allTaskASessions.find((s) => s.id !== 'manual-session-1');
    expect(secondTaskASession?.startTime).toBe(new Date(2026, 9, 5, 20, 0, 0).toISOString());
    expect(secondTaskASession?.endTime).toBe(new Date(2026, 9, 5, 21, 0, 0).toISOString());

    // No overlapping sessions exist
    for (let i = 0; i < result.sessions.length - 1; i++) {
      const curEnd = new Date(result.sessions[i].endTime).getTime();
      const nextStart = new Date(result.sessions[i + 1].startTime).getTime();
      expect(curEnd).toBeLessThanOrEqual(nextStart);
    }
  });
});
