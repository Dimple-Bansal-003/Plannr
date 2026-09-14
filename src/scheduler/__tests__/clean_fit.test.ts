import { computeSchedule } from '../engine';
import { Task, RecurringTimeBlock } from '../types';

describe('Clean Fit Test Cases', () => {
  // Monday Oct 5, 2026, 10:00 local
  const now = new Date(2026, 9, 5, 10, 0, 0);

  // Student free-time template: Monday to Friday 18:00 to 22:00 (4 hours / 240m per day)
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-thu', dayOfWeek: 4, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-fri', dayOfWeek: 5, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  ];

  test('schedules tasks cleanly into available free slots before deadlines with no at-risk warnings', () => {
    const tasks: Task[] = [
      {
        id: 'task-dbms',
        title: 'DBMS Lab Report',
        deadline: new Date(2026, 9, 6, 17, 0, 0).toISOString(), // Tuesday 17:00
        effort: '1hr', // 60 mins
        importance: 4,
        completed: false,
        createdAt: now.toISOString(),
      },
      {
        id: 'task-os',
        title: 'Operating Systems Assignment',
        deadline: new Date(2026, 9, 7, 12, 0, 0).toISOString(), // Wednesday 12:00
        effort: '2hr', // 120 mins
        importance: 3,
        completed: false,
        createdAt: now.toISOString(),
      },
    ];

    const result = computeSchedule({
      tasks,
      template,
      now,
    });

    // Both tasks must fit cleanly
    expect(result.atRiskTasks).toHaveLength(0);
    expect(result.beyondHorizonTasks).toHaveLength(0);
    expect(result.sessions).toHaveLength(2);

    // Higher priority (DBMS Lab Report) scheduled first
    const firstSession = result.sessions[0];
    expect(firstSession.taskId).toBe('task-dbms');
    expect(firstSession.durationMinutes).toBe(60);
    expect(firstSession.sessionIndex).toBe(1);
    expect(firstSession.totalSessions).toBe(1);
    // Starts at 18:00 on Monday
    const firstStart = new Date(firstSession.startTime);
    expect(firstStart.getDay()).toBe(1); // Monday
    expect(firstStart.getHours()).toBe(18);
    expect(firstStart.getMinutes()).toBe(0);

    // Second session (Operating Systems) scheduled right after on Monday
    const secondSession = result.sessions[1];
    expect(secondSession.taskId).toBe('task-os');
    expect(secondSession.durationMinutes).toBe(120);
    expect(secondSession.sessionIndex).toBe(1);
    expect(secondSession.totalSessions).toBe(1);
    // Starts at 19:00 on Monday, finishes at 21:00
    const secondStart = new Date(secondSession.startTime);
    expect(secondStart.getHours()).toBe(19);
    const secondEnd = new Date(secondSession.endTime);
    expect(secondEnd.getHours()).toBe(21);
  });
});
