import { Task } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates days remaining until a deadline from a given reference point (now).
 * Returns a floating-point number of days.
 */
export function calculateDaysUntilDeadline(deadline: Date | string, now: Date | string): number {
  const deadlineMs = typeof deadline === 'string' ? new Date(deadline).getTime() : deadline.getTime();
  const nowMs = typeof now === 'string' ? new Date(now).getTime() : now.getTime();
  return (deadlineMs - nowMs) / MS_PER_DAY;
}

/**
 * Computes the urgency factor:
 * urgency = 1 / max(days_until_deadline, 0.5)
 * Capped at 2.0 when days_until_deadline <= 0.5 days.
 */
export function calculateUrgency(deadline: Date | string, now: Date | string): number {
  const daysUntilDeadline = calculateDaysUntilDeadline(deadline, now);
  const effectiveDays = Math.max(daysUntilDeadline, 0.5);
  return 1 / effectiveDays;
}

/**
 * Computes the priority score:
 * priority_score = urgency * importance (1-5)
 */
export function calculatePriorityScore(task: Task, now: Date | string): number {
  const urgency = calculateUrgency(task.deadline, now);
  return urgency * task.importance;
}
