import {
  Task,
  RecurringTimeBlock,
  ScheduledSession,
  AtRiskTaskInfo,
  OverdueTaskInfo,
  BeyondHorizonTaskInfo,
  ScheduleResult,
  ScheduleOptions,
  EFFORT_MINUTES,
  TimeInterval,
  MAX_FOCUS_BLOCK_MINUTES,
  SUGGESTED_BREAK_MINUTES,
} from './types';
import { calculatePriorityScore, calculateDaysUntilDeadline, calculateUrgency } from './priority';
import { expandTemplateToIntervals, subtractInterval } from './interval';

const DEFAULT_HORIZON_DAYS = 14;

/**
 * Computes a proposed deterministic schedule for academic tasks given
 * weekly recurring free-time availability and user preferences.
 */
export function computeSchedule(options: ScheduleOptions): ScheduleResult {
  const {
    tasks,
    template,
    now = new Date(),
    horizonDays = DEFAULT_HORIZON_DAYS,
    manualOverrides = [],
  } = options;

  const currentNow = typeof now === 'string' ? new Date(now) : new Date(now.getTime());
  const horizonStart = new Date(currentNow);
  const horizonEnd = new Date(currentNow.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  const atRiskTasks: AtRiskTaskInfo[] = [];
  const overdueTasks: OverdueTaskInfo[] = [];
  const beyondHorizonTasks: BeyondHorizonTaskInfo[] = [];
  const taskSessionsMap = new Map<string, ScheduledSession[]>();

  // 1. Filter incomplete tasks
  const incompleteTasks = tasks.filter((t) => !t.completed);

  // 2. Separate tasks into active horizon vs beyond horizon & detect overdue tasks
  const activeTasks: Task[] = [];
  for (const task of incompleteTasks) {
    const deadlineDate = new Date(task.deadline);
    const daysUntilDeadline = calculateDaysUntilDeadline(task.deadline, currentNow);

    // Overdue task detection
    if (deadlineDate.getTime() < currentNow.getTime()) {
      const hoursOverdue = Math.max(1, Math.round(Math.abs(daysUntilDeadline) * 24));
      const formattedDate = deadlineDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = deadlineDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      overdueTasks.push({
        taskId: task.id,
        taskTitle: task.title,
        deadline: task.deadline,
        hoursOverdue,
        reason: `🚨 OVERDUE by ${hoursOverdue}h (was due ${formattedDate} at ${formattedTime}). Still incomplete — prioritized for immediate completion with urgency 2.0.`,
      });
    }

    if (deadlineDate.getTime() > horizonEnd.getTime()) {
      // Entry date is when deadline is 14 days away from 'now'
      const entryTime = deadlineDate.getTime() - horizonDays * 24 * 60 * 60 * 1000;
      const entryDate = new Date(Math.max(entryTime, currentNow.getTime())).toISOString();

      beyondHorizonTasks.push({
        taskId: task.id,
        taskTitle: task.title,
        deadline: task.deadline,
        daysUntilDeadline: Math.round(daysUntilDeadline * 10) / 10,
        entryDate,
        status: 'beyond_horizon',
      });
    } else {
      activeTasks.push(task);
    }
  }

  // 3. Expand template into concrete free-time intervals within horizon
  let availableIntervals: TimeInterval[] = expandTemplateToIntervals(
    template,
    horizonStart,
    horizonEnd
  );

  // 4. Process manual overrides: deduct intervals and deduct allocated time from tasks
  const overrideMinutesByTask = new Map<string, number>();

  for (const override of manualOverrides) {
    const oStart = new Date(override.startTime);
    const oEnd = new Date(override.endTime);

    // Subtract override interval from available free time
    availableIntervals = subtractInterval(availableIntervals, {
      start: oStart,
      end: oEnd,
    });

    const sessions = taskSessionsMap.get(override.taskId) || [];
    sessions.push({ ...override, isManualOverride: true });
    taskSessionsMap.set(override.taskId, sessions);

    const currentMinutes = overrideMinutesByTask.get(override.taskId) || 0;
    overrideMinutesByTask.set(override.taskId, currentMinutes + override.durationMinutes);
  }

  // 5. Score active tasks and sort descending by priority score
  const scoredTasks = activeTasks.map((task) => {
    const score = calculatePriorityScore(task, currentNow);
    const days = calculateDaysUntilDeadline(task.deadline, currentNow);
    const urgency = calculateUrgency(task.deadline, currentNow);

    let reason: string;
    if (days < 0) {
      const hours = Math.max(1, Math.round(Math.abs(days) * 24));
      reason = `🚨 OVERDUE (${hours}h ago) • Weighted ${task.importance}/5 • Top priority`;
    } else if (days < 1) {
      const hours = Math.round(days * 24);
      reason = `Due in ${hours}h • Weighted ${task.importance}/5 • Urgency ${urgency.toFixed(1)}`;
    } else {
      reason = `Due in ${days.toFixed(1)}d • Weighted ${task.importance}/5 (score ${score.toFixed(1)})`;
    }

    return {
      task,
      score,
      reason,
      isOverdue: days < 0,
      deadlineMs: new Date(task.deadline).getTime(),
    };
  });

  scoredTasks.sort((a, b) => {
    // Overdue tasks always top priority
    if (a.isOverdue !== b.isOverdue) {
      return a.isOverdue ? -1 : 1;
    }
    // Highest priority score first
    if (Math.abs(b.score - a.score) > 0.0001) {
      return b.score - a.score;
    }
    // Earlier deadline first in tie
    if (a.deadlineMs !== b.deadlineMs) {
      return a.deadlineMs - b.deadlineMs;
    }
    // Higher importance first in tie
    return b.task.importance - a.task.importance;
  });

  // 6. Greedily allocate each task into earliest available free intervals
  for (const { task, reason, isOverdue } of scoredTasks) {
    const totalEffortMinutes = EFFORT_MINUTES[task.effort];
    const alreadyAllocated = overrideMinutesByTask.get(task.id) || 0;
    let neededMinutes = Math.max(0, totalEffortMinutes - alreadyAllocated);

    const deadlineMs = new Date(task.deadline).getTime();
    const sessions = taskSessionsMap.get(task.id) || [];

    // Check if large effort block should be partitioned into 50-min focus sessions with breaks
    const shouldBreakIntoFocusBlocks = task.effort === 'half-day' || task.effort === 'full-day';
    const maxSessionDuration = shouldBreakIntoFocusBlocks ? MAX_FOCUS_BLOCK_MINUTES : 99999;

    if (neededMinutes > 0) {
      let i = 0;
      while (i < availableIntervals.length && neededMinutes > 0) {
        const interval = availableIntervals[i];
        const iStartMs = interval.start.getTime();

        // If not overdue and interval starts at or after deadline, stop
        if (!isOverdue && iStartMs >= deadlineMs) {
          break;
        }

        // For overdue tasks, usableEnd is whole interval; otherwise clipped to deadline
        const usableEndMs = isOverdue ? interval.end.getTime() : Math.min(interval.end.getTime(), deadlineMs);
        const usableMinutes = Math.round((usableEndMs - iStartMs) / (1000 * 60));

        if (usableMinutes <= 0) {
          i++;
          continue;
        }

        // Cap session duration to 50m for large effort tasks
        const allocMinutes = Math.min(neededMinutes, Math.min(usableMinutes, maxSessionDuration));
        const sessionStart = new Date(iStartMs);
        const sessionEnd = new Date(iStartMs + allocMinutes * 60 * 1000);

        // If this is a focus block and more time remains in this interval, suggest a 10m break
        const hasTimeForBreak = usableMinutes >= allocMinutes + SUGGESTED_BREAK_MINUTES;
        const breakAfter = shouldBreakIntoFocusBlocks && hasTimeForBreak ? SUGGESTED_BREAK_MINUTES : undefined;

        const newSession: ScheduledSession = {
          id: `session-${task.id}-${sessions.length + 1}-${Date.now()}`,
          taskId: task.id,
          taskTitle: task.title,
          startTime: sessionStart.toISOString(),
          endTime: sessionEnd.toISOString(),
          durationMinutes: allocMinutes,
          sessionIndex: sessions.length + 1,
          totalSessions: 1, // Will be updated later
          isManualOverride: false,
          reason,
          isOverdue,
          breakAfterMinutes: breakAfter,
        };

        sessions.push(newSession);

        // Deduct allocated interval (+ break if applicable) from available intervals
        const deductionEnd = breakAfter
          ? new Date(sessionEnd.getTime() + breakAfter * 60 * 1000)
          : sessionEnd;

        availableIntervals = subtractInterval(availableIntervals, {
          start: sessionStart,
          end: deductionEnd,
        });

        neededMinutes -= allocMinutes;
        i = 0; // Restart interval search from top
      }
    }

    taskSessionsMap.set(task.id, sessions);

    // 7. Check if task could not fit before deadline ("at risk" warning)
    const totalAllocated = totalEffortMinutes - neededMinutes;
    if (neededMinutes > 0 && !isOverdue) {
      const deadlineDate = new Date(task.deadline);
      const formattedDate = deadlineDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = deadlineDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      atRiskTasks.push({
        taskId: task.id,
        taskTitle: task.title,
        deadline: task.deadline,
        totalEffortMinutes,
        allocatedMinutes: totalAllocated,
        missingMinutes: neededMinutes,
        reason: `Won't fit before deadline (${formattedDate} ${formattedTime}): requires ${totalEffortMinutes}m, but only ${totalAllocated}m of free time is available before deadline. Missing ${neededMinutes}m.`,
      });
    }
  }

  // 8. Update session numbers (e.g., "Part 1 of 4") and collect all sessions
  const allSessions: ScheduledSession[] = [];
  taskSessionsMap.forEach((sessions) => {
    sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const total = sessions.length;
    sessions.forEach((s, idx) => {
      s.sessionIndex = idx + 1;
      s.totalSessions = total;
      allSessions.push(s);
    });
  });

  // Sort all scheduled sessions chronologically
  allSessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return {
    sessions: allSessions,
    atRiskTasks,
    overdueTasks,
    beyondHorizonTasks,
    generatedAt: currentNow.toISOString(),
    horizonStart: horizonStart.toISOString(),
    horizonEnd: horizonEnd.toISOString(),
  };
}
