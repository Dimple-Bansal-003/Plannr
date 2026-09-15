import { computeSchedule } from '../engine';
import { Task, RecurringTimeBlock, ScheduledSession } from '../types';

describe('Daily Practice Habits & Cognitive Slot Sequencing', () => {
  // Monday Oct 5, 2026, 09:00 local
  const fixedNow = new Date(2026, 9, 5, 9, 0, 0);

  // Daily free-time template: Monday to Sunday 18:00 to 22:00 (4 hours / 240m per day)
  const template: RecurringTimeBlock[] = [
    { id: 'b-sun', dayOfWeek: 0, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-thu', dayOfWeek: 4, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-fri', dayOfWeek: 5, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-sat', dayOfWeek: 6, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  ];

  test('schedules daily practice habit every day and sequences warm-up before peak deep work', () => {
    const tasks: Task[] = [
      // 1. Daily practice: 30 min daily LeetCode/DSA with warm-up preference
      {
        id: 'daily-dsa',
        title: 'Daily LeetCode & DSA Problem',
        deadline: new Date(2026, 9, 19, 23, 59, 0).toISOString(),
        effort: '30min',
        importance: 4,
        completed: false,
        createdAt: fixedNow.toISOString(),
        taskType: 'daily_practice',
        preferredSlot: 'warmup',
        completedDates: [],
      },
      // 2. Heavy Coursework: Distributed Systems Project (due in 2 days, high weight)
      {
        id: 'dist-sys',
        title: 'Distributed Systems Raft Protocol',
        deadline: new Date(2026, 9, 7, 23, 59, 0).toISOString(),
        effort: '2hr',
        importance: 5,
        completed: false,
        createdAt: fixedNow.toISOString(),
        taskType: 'coursework',
      },
      // 3. Daily Reading: 15 min wind-down
      {
        id: 'daily-reading',
        title: 'Tech Paper Reading',
        deadline: new Date(2026, 9, 19, 23, 59, 0).toISOString(),
        effort: '15min',
        importance: 2,
        completed: false,
        createdAt: fixedNow.toISOString(),
        taskType: 'daily_practice',
        preferredSlot: 'winddown',
        completedDates: [],
      },
    ];

    const result = computeSchedule({ tasks, template, now: fixedNow });

    // Filter Monday's scheduled sessions (Day 0: 2026-10-05)
    const mondaySessions = result.sessions.filter((s: ScheduledSession) => {
      const sessionDate = new Date(s.startTime);
      return sessionDate.getDate() === 5 && sessionDate.getMonth() === 9;
    });
    expect(mondaySessions.length).toBeGreaterThanOrEqual(3);

    // Slot 1 must be the Warm-Up Daily Practice (DSA)
    const slot1 = mondaySessions[0];
    expect(slot1.taskId).toBe('daily-dsa');
    expect(slot1.isDailyPractice).toBe(true);
    expect(slot1.sequenceRank).toBe(1);
    expect(slot1.sequenceLabel).toContain('Slot 1: Warm-Up Flow');
    expect(slot1.sequenceReason).toMatch(/overcome procrastination/i);

    // Slot 2 must be the Peak Deep Work Coursework (Raft Protocol)
    const slot2 = mondaySessions[1];
    expect(slot2.taskId).toBe('dist-sys');
    expect(slot2.sequenceRank).toBe(2);
    expect(slot2.sequenceLabel).toContain('Slot 2: Peak Focus');
    expect(slot2.sequenceReason).toMatch(/mental stamina/i);

    // Last slot of Monday should be the Wind-Down session (Reading)
    const lastSlot = mondaySessions[mondaySessions.length - 1];
    expect(lastSlot.taskId).toBe('daily-reading');
    expect(lastSlot.sequenceLabel).toContain('Wind-Down Slot');

    // Check Tuesday (Day 1: 2026-10-06): Daily habits must also be scheduled!
    const tuesdaySessions = result.sessions.filter((s: ScheduledSession) => {
      const sessionDate = new Date(s.startTime);
      return sessionDate.getDate() === 6 && sessionDate.getMonth() === 9;
    });
    const tuesdayDSA = tuesdaySessions.find((s: ScheduledSession) => s.taskId === 'daily-dsa');
    expect(tuesdayDSA).toBeDefined();
    expect(tuesdayDSA?.isDailyPractice).toBe(true);
  });

  test('does not schedule daily practice for today if completedDates contains todayKey', () => {
    // Format YYYY-MM-DD for fixedNow in local time
    const year = fixedNow.getFullYear();
    const month = String(fixedNow.getMonth() + 1).padStart(2, '0');
    const day = String(fixedNow.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;

    const tasks: Task[] = [
      {
        id: 'daily-dsa',
        title: 'Daily LeetCode & DSA Problem',
        deadline: new Date(2026, 9, 19, 23, 59, 0).toISOString(),
        effort: '30min',
        importance: 4,
        completed: false,
        createdAt: fixedNow.toISOString(),
        taskType: 'daily_practice',
        preferredSlot: 'warmup',
        completedDates: [todayKey], // marked done for today!
      },
    ];

    const result = computeSchedule({ tasks, template, now: fixedNow });

    // Today (2026-10-05) should NOT have daily-dsa scheduled
    const mondayDSA = result.sessions.find((s: ScheduledSession) => {
      const sessionDate = new Date(s.startTime);
      return (
        s.taskId === 'daily-dsa' &&
        sessionDate.getDate() === 5 &&
        sessionDate.getMonth() === 9
      );
    });
    expect(mondayDSA).toBeUndefined();

    // Tomorrow (2026-10-06) MUST still be scheduled
    const tuesdayDSA = result.sessions.find((s: ScheduledSession) => {
      const sessionDate = new Date(s.startTime);
      return (
        s.taskId === 'daily-dsa' &&
        sessionDate.getDate() === 6 &&
        sessionDate.getMonth() === 9
      );
    });
    expect(tuesdayDSA).toBeDefined();
    expect(tuesdayDSA?.durationMinutes).toBe(30);
  });
});
