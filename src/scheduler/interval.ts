import { RecurringTimeBlock, TimeInterval } from './types';

/**
 * Returns duration of an interval in minutes.
 */
export function intervalDurationMinutes(interval: TimeInterval): number {
  return Math.round((interval.end.getTime() - interval.start.getTime()) / (1000 * 60));
}

/**
 * Expands a weekly recurring template into concrete chronological intervals
 * between horizonStart and horizonEnd.
 */
export function expandTemplateToIntervals(
  template: RecurringTimeBlock[],
  horizonStart: Date,
  horizonEnd: Date
): TimeInterval[] {
  if (template.length === 0 || horizonStart >= horizonEnd) {
    return [];
  }

  const intervals: TimeInterval[] = [];

  // Iterate day by day from start to end
  const currentDay = new Date(horizonStart);
  currentDay.setHours(0, 0, 0, 0);

  const lastDay = new Date(horizonEnd);
  lastDay.setHours(23, 59, 59, 999);

  while (currentDay <= lastDay) {
    const dayOfWeek = currentDay.getDay(); // 0 = Sunday ... 6 = Saturday

    const matchingBlocks = template.filter((b) => b.dayOfWeek === dayOfWeek);

    for (const block of matchingBlocks) {
      const slotStart = new Date(currentDay);
      slotStart.setHours(block.startHour, block.startMinute, 0, 0);

      const slotEnd = new Date(currentDay);
      if (
        block.endHour < block.startHour ||
        (block.endHour === block.startHour && block.endMinute < block.startMinute)
      ) {
        // Spans past midnight
        slotEnd.setDate(slotEnd.getDate() + 1);
      }
      slotEnd.setHours(block.endHour, block.endMinute, 0, 0);

      // Clip to [horizonStart, horizonEnd]
      const clippedStart = slotStart < horizonStart ? new Date(horizonStart) : slotStart;
      const clippedEnd = slotEnd > horizonEnd ? new Date(horizonEnd) : slotEnd;

      if (clippedEnd.getTime() > clippedStart.getTime()) {
        intervals.push({
          start: clippedStart,
          end: clippedEnd,
        });
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Sort chronologically
  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping or consecutive intervals
  return mergeIntervals(intervals);
}

/**
 * Merges overlapping or touching intervals.
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length <= 1) return intervals;

  const merged: TimeInterval[] = [{ start: new Date(intervals[0].start), end: new Date(intervals[0].end) }];

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = merged[merged.length - 1];

    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = new Date(current.end);
      }
    } else {
      merged.push({ start: new Date(current.start), end: new Date(current.end) });
    }
  }

  return merged;
}

/**
 * Subtracts a consumed interval from a list of available intervals.
 * Handles partial overlaps, internal splits, and full coverage.
 */
export function subtractInterval(intervals: TimeInterval[], consumed: TimeInterval): TimeInterval[] {
  const result: TimeInterval[] = [];
  const cStart = consumed.start.getTime();
  const cEnd = consumed.end.getTime();

  for (const interval of intervals) {
    const iStart = interval.start.getTime();
    const iEnd = interval.end.getTime();

    // No overlap
    if (cEnd <= iStart || cStart >= iEnd) {
      result.push(interval);
      continue;
    }

    // Overlap at the beginning: interval trimmed from left
    if (cStart <= iStart && cEnd < iEnd) {
      result.push({
        start: new Date(cEnd),
        end: new Date(iEnd),
      });
      continue;
    }

    // Overlap at the end: interval trimmed from right
    if (cStart > iStart && cEnd >= iEnd) {
      result.push({
        start: new Date(iStart),
        end: new Date(cStart),
      });
      continue;
    }

    // Consumed strictly inside the interval: split into two
    if (cStart > iStart && cEnd < iEnd) {
      result.push({
        start: new Date(iStart),
        end: new Date(cStart),
      });
      result.push({
        start: new Date(cEnd),
        end: new Date(iEnd),
      });
      continue;
    }

    // Consumed completely covers interval: dropped completely
  }

  return result.filter((i) => i.end.getTime() > i.start.getTime());
}
