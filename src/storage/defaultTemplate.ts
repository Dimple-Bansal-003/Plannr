import { RecurringTimeBlock } from '../scheduler/types';

/**
 * Standard default template for a student:
 * - Weekday evenings: 18:00 - 22:00 (Mon through Fri)
 * - Weekend daytime: 10:00 - 18:00 (Sat & Sun)
 */
export const DEFAULT_WEEKLY_TEMPLATE: RecurringTimeBlock[] = [
  // Sunday = 0
  { id: 'block-sun', dayOfWeek: 0, startHour: 10, startMinute: 0, endHour: 18, endMinute: 0 },
  // Monday = 1
  { id: 'block-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  // Tuesday = 2
  { id: 'block-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  // Wednesday = 3
  { id: 'block-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  // Thursday = 4
  { id: 'block-thu', dayOfWeek: 4, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  // Friday = 5
  { id: 'block-fri', dayOfWeek: 5, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  // Saturday = 6
  { id: 'block-sat', dayOfWeek: 6, startHour: 10, startMinute: 0, endHour: 18, endMinute: 0 },
];
