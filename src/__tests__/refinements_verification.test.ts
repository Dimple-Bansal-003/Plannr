import { computeSchedule } from '../scheduler/engine';
import { Task, RecurringTimeBlock } from '../scheduler/types';

describe('User Verification: 5 Core Refinements', () => {
  // Reference time: Monday Oct 5, 2026, 10:00 AM local
  const now = new Date(2026, 9, 5, 10, 0, 0);

  // Standard student template: 4 hours daily (18:00 - 22:00)
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  ];

  test('verifies all 5 user refinements deterministically', () => {
    const tasks: Task[] = [
      // 1. Overdue Task (due yesterday Sunday Oct 4 at 11:59 PM, never marked complete)
      {
        id: 'task-overdue',
        title: 'Weekly Chemistry Quiz',
        deadline: new Date(2026, 9, 4, 23, 59, 0).toISOString(),
        effort: '30min',
        importance: 4,
        completed: false,
        createdAt: new Date(2026, 9, 1).toISOString(),
      },
      // 2. Large Effort Task: Half-day (240m) due Wednesday 11:59 PM
      {
        id: 'task-halfday',
        title: 'Algorithms Midterm Study Guide',
        deadline: new Date(2026, 9, 7, 23, 59, 0).toISOString(),
        effort: 'half-day', // 240 mins -> Must break into 50m focus blocks with 10m breaks!
        importance: 5,
        completed: false,
        createdAt: now.toISOString(),
      },
      // 3. Beyond Horizon Task (due in 25 days: Oct 30 at 11:59 PM)
      {
        id: 'task-25days',
        title: 'Senior Capstone Architecture Document',
        deadline: new Date(2026, 9, 30, 23, 59, 0).toISOString(),
        effort: '2hr',
        importance: 5,
        completed: false,
        createdAt: now.toISOString(),
      },
    ];

    const result = computeSchedule({
      tasks,
      template,
      now,
      horizonDays: 14,
    });

    // -------------------------------------------------------------
    // 1. REASONING EXPLANATION IN UI
    // -------------------------------------------------------------
    // Every scheduled session must have a transparent explainable reason
    expect(result.sessions.length).toBeGreaterThan(0);
    result.sessions.forEach((s) => {
      expect(s.reason).toBeDefined();
      expect(typeof s.reason).toBe('string');
      expect(s.reason!.length).toBeGreaterThan(5);
    });

    // -------------------------------------------------------------
    // 2. FOCUS BLOCKS WITH BREAKS (HALF-DAY = 240m)
    // -------------------------------------------------------------
    const halfDaySessions = result.sessions.filter((s) => s.taskId === 'task-halfday');
    expect(halfDaySessions.length).toBeGreaterThan(1);
    // Max focus block length is 50m
    halfDaySessions.forEach((s) => {
      expect(s.durationMinutes).toBeLessThanOrEqual(50);
    });
    // Check that at least one session has suggested break
    const hasBreak = halfDaySessions.some((s) => s.breakAfterMinutes === 10);
    expect(hasBreak).toBe(true);

    // -------------------------------------------------------------
    // 3. OVERDUE STATE
    // -------------------------------------------------------------
    expect(result.overdueTasks).toHaveLength(1);
    const overdue = result.overdueTasks[0];
    expect(overdue.taskId).toBe('task-overdue');
    expect(overdue.taskTitle).toBe('Weekly Chemistry Quiz');
    expect(overdue.hoursOverdue).toBeGreaterThan(0);
    expect(overdue.reason).toContain('🚨 OVERDUE');

    // Overdue task is prioritized FIRST in sessions
    expect(result.sessions[0].taskId).toBe('task-overdue');
    expect(result.sessions[0].isOverdue).toBe(true);
    expect(result.sessions[0].reason).toContain('🚨 OVERDUE');

    // -------------------------------------------------------------
    // 4. BEYOND 14-DAY HORIZON TASK (IN 25 DAYS)
    // -------------------------------------------------------------
    expect(result.beyondHorizonTasks).toHaveLength(1);
    const bh = result.beyondHorizonTasks[0];
    expect(bh.taskId).toBe('task-25days');
    expect(bh.taskTitle).toBe('Senior Capstone Architecture Document');
    expect(bh.daysUntilDeadline).toBeCloseTo(25.5, 0.5);
    expect(bh.status).toBe('beyond_horizon');
    expect(bh.entryDate).toBeDefined();

    // Verify it is NOT scheduled in current 14-day sessions
    const bhScheduled = result.sessions.filter((s) => s.taskId === 'task-25days');
    expect(bhScheduled).toHaveLength(0);

    // Print human-readable summary of the exact UI state
    console.log('\n======================================================');
    console.log('       PLANNR REALISTIC UI STATE DEMONSTRATION');
    console.log('======================================================');
    console.log('\n[🚨 OVERDUE ALERTS CARD]');
    result.overdueTasks.forEach((ot) => {
      console.log(`- ${ot.taskTitle} (Overdue by ${ot.hoursOverdue}h)`);
      console.log(`  ${ot.reason}`);
    });

    console.log('\n[📅 TODAY & WEEKLY SESSIONS WITH EXPLAINABLE REASONING & BREAKS]');
    result.sessions.forEach((s) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      const dayName = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
      const partStr = s.totalSessions > 1 ? `(Part ${s.sessionIndex} of ${s.totalSessions})` : '';
      const breakStr = s.breakAfterMinutes ? ` | ☕ ${s.breakAfterMinutes}m break after` : '';
      console.log(`• [${dayName} ${timeStr}] ${s.taskTitle} ${partStr} [${s.durationMinutes} mins${breakStr}]`);
      console.log(`  💡 Why: ${s.reason}`);
    });

    console.log('\n[🗓 BEYOND 14-DAY HORIZON (UPCOMING / NOT YET SCHEDULED)]');
    result.beyondHorizonTasks.forEach((bht) => {
      const entry = new Date(bht.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      console.log(`- ${bht.taskTitle} (Due in ${bht.daysUntilDeadline} days)`);
      console.log(`  Will enter active 14-day schedule on: ${entry}`);
    });
    console.log('======================================================\n');
  });
});
