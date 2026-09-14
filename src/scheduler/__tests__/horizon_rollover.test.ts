import { computeSchedule } from '../engine';
import { Task, RecurringTimeBlock } from '../types';

describe('Horizon Rollover & Beyond-Horizon Visibility', () => {
  // Free-time template: Weekdays 18:00 - 20:00
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    { id: 'b-thu', dayOfWeek: 4, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    { id: 'b-fri', dayOfWeek: 5, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
  ];

  // Day 0: Thursday Oct 1, 2026, 10:00 local
  const day0 = new Date(2026, 9, 1, 10, 0, 0);

  const taskNear: Task = {
    id: 'task-near',
    title: 'Short Term Quiz',
    deadline: new Date(2026, 9, 5, 12, 0, 0).toISOString(), // 4 days away (inside 14-day horizon)
    effort: '1hr',
    importance: 4,
    completed: false,
    createdAt: day0.toISOString(),
  };

  const taskDistant: Task = {
    id: 'task-distant',
    title: 'Comprehensive Final Exam',
    deadline: new Date(2026, 9, 26, 12, 0, 0).toISOString(), // 25 days away (outside 14-day horizon)
    effort: '2hr',
    importance: 5,
    completed: false,
    createdAt: day0.toISOString(),
  };

  test('at Day 0: distant task is categorized as beyond_horizon and visibly flagged as not yet scheduled', () => {
    const resultDay0 = computeSchedule({
      tasks: [taskNear, taskDistant],
      template,
      now: day0,
      horizonDays: 14,
    });

    // Near task is scheduled inside active horizon
    const nearSessions = resultDay0.sessions.filter((s) => s.taskId === 'task-near');
    expect(nearSessions).toHaveLength(1);

    // Distant task is NOT in active sessions
    const distantSessions = resultDay0.sessions.filter((s) => s.taskId === 'task-distant');
    expect(distantSessions).toHaveLength(0);

    // Distant task is explicitly listed in beyondHorizonTasks (not silently lost)
    expect(resultDay0.beyondHorizonTasks).toHaveLength(1);
    const beyondTask = resultDay0.beyondHorizonTasks[0];
    expect(beyondTask.taskId).toBe('task-distant');
    expect(beyondTask.taskTitle).toBe('Comprehensive Final Exam');
    expect(beyondTask.status).toBe('beyond_horizon');
    expect(beyondTask.daysUntilDeadline).toBeCloseTo(25.1, 1);
    // Entry date should be 14 days before deadline: Oct 12
    const entryDate = new Date(beyondTask.entryDate);
    expect(entryDate.getDate()).toBe(12);
  });

  test('at Day 15: rolling horizon advances, distant task enters active window and is scheduled', () => {
    // 15 days later: Friday Oct 16, 2026, 10:00 local
    const day15 = new Date(2026, 9, 16, 10, 0, 0);
    // TaskNear is now in the past (already completed), so only taskDistant remains incomplete
    const resultDay15 = computeSchedule({
      tasks: [taskDistant],
      template,
      now: day15,
      horizonDays: 14, // Horizon now covers Oct 16 to Oct 30
    });

    // Deadline (Oct 26) is now inside the 14-day window [Oct 16 - Oct 30]
    expect(resultDay15.beyondHorizonTasks).toHaveLength(0);

    // Task is now actively scheduled into weekday evening slots!
    const distantSessions = resultDay15.sessions.filter((s) => s.taskId === 'task-distant');
    expect(distantSessions.length).toBeGreaterThanOrEqual(1);

    const totalAllocated = distantSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    expect(totalAllocated).toBe(120); // Full 2 hours scheduled
  });
});
