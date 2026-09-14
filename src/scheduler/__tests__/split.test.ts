import { computeSchedule } from '../engine';
import { Task, RecurringTimeBlock } from '../types';

describe('Task Splitting & Focus Block Partitioning Across Sessions', () => {
  // Monday Oct 5, 2026, 10:00 local (DayOfWeek: 1)
  const now = new Date(2026, 9, 5, 10, 0, 0);

  // Daily study window of 1 hour (60 mins) each evening
  const oneHourTemplate: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 19, endMinute: 0 },
    { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 19, endMinute: 0 },
  ];

  test('correctly splits a 2-hour task across two separate 1-hour daily slots', () => {
    const tasks: Task[] = [
      {
        id: 'task-lab',
        title: 'Physics Lab Report',
        deadline: new Date(2026, 9, 7, 12, 0, 0).toISOString(), // Wednesday 12:00
        effort: '2hr', // 120 mins
        importance: 4,
        completed: false,
        createdAt: now.toISOString(),
      },
    ];

    const result = computeSchedule({
      tasks,
      template: oneHourTemplate,
      now,
    });

    expect(result.atRiskTasks).toHaveLength(0);
    expect(result.sessions).toHaveLength(2);

    const [part1, part2] = result.sessions;

    // Part 1 on Monday
    expect(part1.taskId).toBe('task-lab');
    expect(part1.durationMinutes).toBe(60);
    expect(part1.sessionIndex).toBe(1);
    expect(part1.totalSessions).toBe(2);
    const p1Start = new Date(part1.startTime);
    expect(p1Start.getDay()).toBe(1); // Monday
    expect(p1Start.getHours()).toBe(18);

    // Part 2 on Tuesday
    expect(part2.taskId).toBe('task-lab');
    expect(part2.durationMinutes).toBe(60);
    expect(part2.sessionIndex).toBe(2);
    expect(part2.totalSessions).toBe(2);
    const p2Start = new Date(part2.startTime);
    expect(p2Start.getDay()).toBe(2); // Tuesday
    expect(p2Start.getHours()).toBe(18);

    expect(part1.durationMinutes + part2.durationMinutes).toBe(120);
  });

  test('breaks large effort (half-day = 240m) into 50-min focus blocks with 10-min suggested breaks', () => {
    // 2 hours each evening on Mon, Tue, Wed
    const template: RecurringTimeBlock[] = [
      { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
      { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
      { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    ];

    const tasks: Task[] = [
      {
        id: 'task-paper',
        title: 'Semester Term Paper Draft',
        deadline: new Date(2026, 9, 8, 12, 0, 0).toISOString(), // Thursday 12:00
        effort: 'half-day', // 240 mins (4 hours)
        importance: 5,
        completed: false,
        createdAt: now.toISOString(),
      },
    ];

    const result = computeSchedule({
      tasks,
      template,
      now,
    });

    expect(result.atRiskTasks).toHaveLength(0);
    // 240 minutes broken into 50m chunks = 50 + 50 (Mon: 100m) + 50 + 50 (Tue: 100m) + 40 (Wed: 40m) = 5 sessions
    expect(result.sessions).toHaveLength(5);

    // Mon Part 1: 50m with 10m break
    expect(result.sessions[0].durationMinutes).toBe(50);
    expect(result.sessions[0].breakAfterMinutes).toBe(10);
    expect(result.sessions[0].sessionIndex).toBe(1);
    expect(result.sessions[0].totalSessions).toBe(5);

    // Mon Part 2: 50m with 10m break
    expect(result.sessions[1].durationMinutes).toBe(50);
    expect(result.sessions[1].breakAfterMinutes).toBe(10);

    // Tue Part 3: 50m with 10m break
    expect(result.sessions[2].durationMinutes).toBe(50);
    expect(result.sessions[2].breakAfterMinutes).toBe(10);

    // Tue Part 4: 50m with 10m break
    expect(result.sessions[3].durationMinutes).toBe(50);
    expect(result.sessions[3].breakAfterMinutes).toBe(10);

    // Wed Part 5: remaining 40m
    expect(result.sessions[4].durationMinutes).toBe(40);

    const totalAllocated = result.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    expect(totalAllocated).toBe(240);
  });
});
