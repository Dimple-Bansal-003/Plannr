export type EffortPreset = '15min' | '30min' | '1hr' | '2hr' | 'half-day' | 'full-day';

export const EFFORT_MINUTES: Record<EffortPreset, number> = {
  '15min': 15,
  '30min': 30,
  '1hr': 60,
  '2hr': 120,
  'half-day': 240, // 4 hours
  'full-day': 480, // 8 hours
};

// Recommended maximum focus block length and standard break duration for large efforts
export const MAX_FOCUS_BLOCK_MINUTES = 50;
export const SUGGESTED_BREAK_MINUTES = 10;

export type SlotPreference = 'warmup' | 'peak' | 'winddown' | 'any';

export interface Task {
  id: string;
  title: string;
  deadline: string; // ISO 8601 string (for daily_practice, placeholder / ongoing)
  effort: EffortPreset;
  importance: 1 | 2 | 3 | 4 | 5; // syllabus weightage (1 to 5)
  completed: boolean;
  createdAt: string;
  taskType?: 'coursework' | 'daily_practice';
  preferredSlot?: SlotPreference;
  completedDates?: string[]; // Date strings (YYYY-MM-DD) when this daily practice was completed
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

export interface RecurringTimeBlock {
  id: string;
  dayOfWeek: DayOfWeek;
  startHour: number;   // 0-23
  startMinute: number; // 0-59
  endHour: number;     // 0-23
  endMinute: number;   // 0-59
}

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface ScheduledSession {
  id: string;
  taskId: string;
  taskTitle: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  durationMinutes: number;
  sessionIndex: number;
  totalSessions: number;
  isManualOverride?: boolean;
  reason?: string;              // Deterministic reasoning (e.g. "Scheduled first: due in 1.2d, weighted 4/5")
  isOverdue?: boolean;          // True if the parent task deadline is already past
  breakAfterMinutes?: number;   // e.g. 10 minutes break suggested after a 50m block
  isDailyPractice?: boolean;
  sequenceRank?: number;        // 1, 2, 3... in chronological sequence for that day
  sequenceLabel?: string;       // e.g. "🌅 Warm-up Flow", "🎯 Peak Focus", "🔥 Deep Work", "🌙 Wind-down"
  sequenceReason?: string;      // Pedagogical explanation of why this session is placed in this slot
}

export interface AtRiskTaskInfo {
  taskId: string;
  taskTitle: string;
  deadline: string;
  totalEffortMinutes: number;
  allocatedMinutes: number;
  missingMinutes: number;
  reason: string;
}

export interface OverdueTaskInfo {
  taskId: string;
  taskTitle: string;
  deadline: string;
  hoursOverdue: number;
  reason: string;
}

export interface BeyondHorizonTaskInfo {
  taskId: string;
  taskTitle: string;
  deadline: string;
  daysUntilDeadline: number;
  entryDate: string; // The date when this task will enter the 14-day window
  status: 'beyond_horizon';
}

export interface ScheduleResult {
  sessions: ScheduledSession[];
  atRiskTasks: AtRiskTaskInfo[];
  overdueTasks: OverdueTaskInfo[];
  beyondHorizonTasks: BeyondHorizonTaskInfo[];
  generatedAt: string;
  horizonStart: string;
  horizonEnd: string;
}

export interface ScheduleOptions {
  tasks: Task[];
  template: RecurringTimeBlock[];
  now?: Date | string;
  horizonDays?: number; // defaults to 14
  manualOverrides?: ScheduledSession[];
  maxFocusBlockMinutes?: number; // defaults to 50 for large tasks
  suggestedBreakMinutes?: number; // defaults to 10
}
