import { computeSchedule } from '../engine';
import { Task, RecurringTimeBlock } from '../types';

describe('Honest Overcommit & At-Risk Detection', () => {
  // Monday Oct 5, 2026, 10:00 local
  const now = new Date(2026, 9, 5, 10, 0, 0);

  // Only a single 2-hour window available on Monday before Tuesday morning deadline
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    // Wednesday evening window (after Tuesday 09:00 deadline!)
    { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  ];

  test('flags lower-priority task as at-risk when competing tasks exceed available free time', () => {
    const tasks: Task[] = [
      {
        id: 'task-exam',
        title: 'Final Exam Preparation',
        deadline: new Date(2026, 9, 6, 9, 0, 0).toISOString(), // Tuesday 09:00 AM
        effort: '2hr', // 120 mins
        importance: 5, // High syllabus weightage
        completed: false,
        createdAt: now.toISOString(),
      },
      {
        id: 'task-elective',
        title: 'Elective Reading Assignment',
        deadline: new Date(2026, 9, 6, 9, 0, 0).toISOString(), // Same Tuesday 09:00 AM deadline
        effort: '1hr', // 60 mins
        importance: 2, // Low importance
        completed: false,
        createdAt: now.toISOString(),
      },
    ];

    const result = computeSchedule({
      tasks,
      template,
      now,
    });

    // High importance task takes the only 120m available on Monday
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].taskId).toBe('task-exam');
    expect(result.sessions[0].durationMinutes).toBe(120);

    // Elective task must be flagged as At-Risk, NOT scheduled past Tuesday 09:00!
    expect(result.atRiskTasks).toHaveLength(1);
    const atRisk = result.atRiskTasks[0];
    expect(atRisk.taskId).toBe('task-elective');
    expect(atRisk.taskTitle).toBe('Elective Reading Assignment');
    expect(atRisk.totalEffortMinutes).toBe(60);
    expect(atRisk.allocatedMinutes).toBe(0);
    expect(atRisk.missingMinutes).toBe(60);
    expect(atRisk.reason).toContain("Won't fit before deadline");

    // Verify it was NEVER scheduled past its deadline (e.g., into Wednesday evening)
    const sessionsForElective = result.sessions.filter((s) => s.taskId === 'task-elective');
    expect(sessionsForElective).toHaveLength(0);
  });

  test('flags partial allocation as at-risk when only partial time fits before deadline', () => {
    // Mon 18:00 to 19:00 (60 min slot)
    const partialTemplate: RecurringTimeBlock[] = [
      { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 19, endMinute: 0 },
    ];

    const tasks: Task[] = [
      {
        id: 'task-long',
        title: 'Big Machine Learning Project',
        deadline: new Date(2026, 9, 6, 9, 0, 0).toISOString(), // Tuesday morning
        effort: '2hr', // 120 mins needed, only 60 mins available
        importance: 4,
        completed: false,
        createdAt: now.toISOString(),
      },
    ];

    const result = computeSchedule({
      tasks,
      template: partialTemplate,
      now,
    });

    // 60 mins gets scheduled
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].durationMinutes).toBe(60);

    // But task is flagged as at-risk because 60 mins are missing!
    expect(result.atRiskTasks).toHaveLength(1);
    const atRisk = result.atRiskTasks[0];
    expect(atRisk.taskId).toBe('task-long');
    expect(atRisk.totalEffortMinutes).toBe(120);
    expect(atRisk.allocatedMinutes).toBe(60);
    expect(atRisk.missingMinutes).toBe(60);
    expect(atRisk.reason).toContain('requires 120m, but only 60m of free time is available');
  });

  test('prioritizes overdue incomplete tasks at top with urgency 2.0 and populates overdueTasks', () => {
    // Current time: Tuesday Oct 6, 2026, 12:00
    const tuesdayNoon = new Date(2026, 9, 6, 12, 0, 0);

    const templateWithTuesdayAfternoon: RecurringTimeBlock[] = [
      { id: 'b-tue', dayOfWeek: 2, startHour: 14, startMinute: 0, endHour: 18, endMinute: 0 },
    ];

    const tasks: Task[] = [
      {
        id: 'task-overdue',
        title: 'Overdue Chemistry Lab Report',
        deadline: new Date(2026, 9, 5, 23, 59, 0).toISOString(), // Yesterday Oct 5 at 23:59!
        effort: '1hr',
        importance: 3,
        completed: false,
        createdAt: new Date(2026, 9, 1).toISOString(),
      },
      {
        id: 'task-upcoming',
        title: 'Upcoming Math Problem Set',
        deadline: new Date(2026, 9, 7, 23, 59, 0).toISOString(), // Tomorrow Oct 7
        effort: '1hr',
        importance: 5, // High importance, but not overdue
        completed: false,
        createdAt: new Date(2026, 9, 1).toISOString(),
      },
    ];

    const result = computeSchedule({
      tasks,
      template: templateWithTuesdayAfternoon,
      now: tuesdayNoon,
    });

    // Overdue task must be in overdueTasks list
    expect(result.overdueTasks).toHaveLength(1);
    expect(result.overdueTasks[0].taskId).toBe('task-overdue');
    expect(result.overdueTasks[0].hoursOverdue).toBeGreaterThan(0);
    expect(result.overdueTasks[0].reason).toContain('🚨 OVERDUE');

    // Overdue task must be scheduled FIRST in the session list, before the upcoming task
    expect(result.sessions.length).toBeGreaterThanOrEqual(2);
    const firstSession = result.sessions[0];
    expect(firstSession.taskId).toBe('task-overdue');
    expect(firstSession.isOverdue).toBe(true);
    expect(firstSession.reason).toContain('🚨 OVERDUE');

    // Second session is the upcoming task and has explainable reasoning
    const secondSession = result.sessions[1];
    expect(secondSession.taskId).toBe('task-upcoming');
    expect(secondSession.reason).toBeDefined();
    expect(secondSession.reason).toContain('Weighted 5/5');
  });
});
