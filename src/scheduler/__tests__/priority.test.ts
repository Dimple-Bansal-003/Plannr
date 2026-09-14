import { calculateDaysUntilDeadline, calculateUrgency, calculatePriorityScore } from '../priority';
import { Task } from '../types';

describe('Priority & Urgency Formulas', () => {
  const baseNow = new Date('2026-10-01T10:00:00.000Z');

  test('computes exact days until deadline', () => {
    const deadline = new Date('2026-10-03T10:00:00.000Z'); // 2.0 days
    const days = calculateDaysUntilDeadline(deadline, baseNow);
    expect(days).toBeCloseTo(2.0, 5);
  });

  test('calculates urgency as 1 / max(days_until_deadline, 0.5)', () => {
    // 2 days out -> urgency = 1 / 2 = 0.5
    const twoDaysDeadline = new Date('2026-10-03T10:00:00.000Z');
    expect(calculateUrgency(twoDaysDeadline, baseNow)).toBeCloseTo(0.5, 5);

    // 4 days out -> urgency = 1 / 4 = 0.25
    const fourDaysDeadline = new Date('2026-10-05T10:00:00.000Z');
    expect(calculateUrgency(fourDaysDeadline, baseNow)).toBeCloseTo(0.25, 5);

    // 0.2 days out (less than 0.5 cap) -> urgency = 1 / 0.5 = 2.0
    const fewHoursDeadline = new Date('2026-10-01T14:48:00.000Z'); // 4.8 hours = 0.2 days
    expect(calculateUrgency(fewHoursDeadline, baseNow)).toBeCloseTo(2.0, 5);

    // Past deadline (negative days) -> max(neg, 0.5) = 0.5 -> urgency = 2.0
    const pastDeadline = new Date('2026-09-30T10:00:00.000Z');
    expect(calculateUrgency(pastDeadline, baseNow)).toBeCloseTo(2.0, 5);
  });

  test('priority score scales directly with syllabus importance (1-5)', () => {
    const taskLowImportance: Task = {
      id: 't-1',
      title: 'Minor Quiz',
      deadline: '2026-10-03T10:00:00.000Z', // 2 days away -> urgency = 0.5
      effort: '30min',
      importance: 1,
      completed: false,
      createdAt: baseNow.toISOString(),
    };

    const taskHighImportance: Task = {
      id: 't-2',
      title: 'Final Exam (30% grade)',
      deadline: '2026-10-03T10:00:00.000Z', // 2 days away -> urgency = 0.5
      effort: '2hr',
      importance: 5,
      completed: false,
      createdAt: baseNow.toISOString(),
    };

    const scoreLow = calculatePriorityScore(taskLowImportance, baseNow);
    const scoreHigh = calculatePriorityScore(taskHighImportance, baseNow);

    expect(scoreLow).toBeCloseTo(0.5 * 1, 5); // 0.5
    expect(scoreHigh).toBeCloseTo(0.5 * 5, 5); // 2.5
    expect(scoreHigh).toBe(scoreLow * 5);
  });
});
