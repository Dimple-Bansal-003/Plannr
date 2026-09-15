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
  const dailyPracticeTasks = incompleteTasks.filter((t) => t.taskType === 'daily_practice');
  const courseworkTasks = incompleteTasks.filter((t) => t.taskType !== 'daily_practice');

  // 2. Separate coursework tasks into active horizon vs beyond horizon & detect overdue tasks
  const activeTasks: Task[] = [];
  for (const task of courseworkTasks) {
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

  // 4b. Allocate recurring Daily Practice tasks across horizon days
  const warmupTasks = dailyPracticeTasks
    .filter((t) => (t.preferredSlot || 'warmup') === 'warmup')
    .sort((a, b) => (a.slotOrder || 1) - (b.slotOrder || 1));
  const winddownTasks = dailyPracticeTasks
    .filter((t) => t.preferredSlot === 'winddown')
    .sort((a, b) => (a.slotOrder || 99) - (b.slotOrder || 99));
  const otherDailyTasks = dailyPracticeTasks
    .filter((t) => t.preferredSlot === 'peak' || t.preferredSlot === 'any')
    .sort((a, b) => (a.slotOrder || 2) - (b.slotOrder || 2));

  for (let d = 0; d < horizonDays; d++) {
    const dayStart = new Date(currentNow.getFullYear(), currentNow.getMonth(), currentNow.getDate() + d, 0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayKey = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;

    // 1. Allocate Warm-Up tasks at the START of the day's available time
    for (const dpTask of warmupTasks) {
      if (dpTask.completedDates && dpTask.completedDates.includes(dayKey)) continue;
      const neededMins = EFFORT_MINUTES[dpTask.effort];

      for (let i = 0; i < availableIntervals.length; i++) {
        const interval = availableIntervals[i];
        if (interval.end.getTime() <= dayStart.getTime() || interval.start.getTime() >= dayEnd.getTime()) continue;

        const effStartMs = Math.max(interval.start.getTime(), dayStart.getTime(), currentNow.getTime());
        const effEndMs = Math.min(interval.end.getTime(), dayEnd.getTime());
        const availMins = Math.round((effEndMs - effStartMs) / (1000 * 60));

        if (availMins >= neededMins) {
          const sessionStart = new Date(effStartMs);
          const sessionEnd = new Date(effStartMs + neededMins * 60 * 1000);

          const dpSessions = taskSessionsMap.get(dpTask.id) || [];
          dpSessions.push({
            id: `session-dp-${dpTask.id}-${dayKey}`,
            taskId: dpTask.id,
            taskTitle: dpTask.title,
            startTime: sessionStart.toISOString(),
            endTime: sessionEnd.toISOString(),
            durationMinutes: neededMins,
            sessionIndex: 1,
            totalSessions: 1,
            isManualOverride: false,
            reason: `🔁 Daily Practice Habit • Warm-up routine to build momentum`,
            isDailyPractice: true,
          });
          taskSessionsMap.set(dpTask.id, dpSessions);

          availableIntervals = subtractInterval(availableIntervals, {
            start: sessionStart,
            end: sessionEnd,
          });
          break;
        }
      }
    }

    // 2. Allocate Wind-Down tasks at the END of the day's available time
    for (const dpTask of winddownTasks) {
      if (dpTask.completedDates && dpTask.completedDates.includes(dayKey)) continue;
      const neededMins = EFFORT_MINUTES[dpTask.effort];

      let lastMatchIdx = -1;
      let lastEffEndMs = 0;

      for (let i = availableIntervals.length - 1; i >= 0; i--) {
        const interval = availableIntervals[i];
        if (interval.end.getTime() <= dayStart.getTime() || interval.start.getTime() >= dayEnd.getTime()) continue;

        const effStartMs = Math.max(interval.start.getTime(), dayStart.getTime(), currentNow.getTime());
        const effEndMs = Math.min(interval.end.getTime(), dayEnd.getTime());
        const availMins = Math.round((effEndMs - effStartMs) / (1000 * 60));

        if (availMins >= neededMins) {
          lastMatchIdx = i;
          lastEffEndMs = effEndMs;
          break;
        }
      }

      if (lastMatchIdx !== -1) {
        const sessionEnd = new Date(lastEffEndMs);
        const sessionStart = new Date(lastEffEndMs - neededMins * 60 * 1000);

        const dpSessions = taskSessionsMap.get(dpTask.id) || [];
        dpSessions.push({
          id: `session-dp-${dpTask.id}-${dayKey}`,
          taskId: dpTask.id,
          taskTitle: dpTask.title,
          startTime: sessionStart.toISOString(),
          endTime: sessionEnd.toISOString(),
          durationMinutes: neededMins,
          sessionIndex: 1,
          totalSessions: 1,
          isManualOverride: false,
          reason: `🔁 Daily Practice Habit • Wind-down routine`,
          isDailyPractice: true,
        });
        taskSessionsMap.set(dpTask.id, dpSessions);

        availableIntervals = subtractInterval(availableIntervals, {
          start: sessionStart,
          end: sessionEnd,
        });
      }
    }

    // 3. Allocate other daily tasks (peak / any)
    for (const dpTask of otherDailyTasks) {
      if (dpTask.completedDates && dpTask.completedDates.includes(dayKey)) continue;
      const neededMins = EFFORT_MINUTES[dpTask.effort];

      for (let i = 0; i < availableIntervals.length; i++) {
        const interval = availableIntervals[i];
        if (interval.end.getTime() <= dayStart.getTime() || interval.start.getTime() >= dayEnd.getTime()) continue;

        const effStartMs = Math.max(interval.start.getTime(), dayStart.getTime(), currentNow.getTime());
        const effEndMs = Math.min(interval.end.getTime(), dayEnd.getTime());
        const availMins = Math.round((effEndMs - effStartMs) / (1000 * 60));

        if (availMins >= neededMins) {
          const sessionStart = new Date(effStartMs);
          const sessionEnd = new Date(effStartMs + neededMins * 60 * 1000);

          const dpSessions = taskSessionsMap.get(dpTask.id) || [];
          dpSessions.push({
            id: `session-dp-${dpTask.id}-${dayKey}`,
            taskId: dpTask.id,
            taskTitle: dpTask.title,
            startTime: sessionStart.toISOString(),
            endTime: sessionEnd.toISOString(),
            durationMinutes: neededMins,
            sessionIndex: 1,
            totalSessions: 1,
            isManualOverride: false,
            reason: `🔁 Daily Practice Habit • Consistency and steady practice`,
            isDailyPractice: true,
          });
          taskSessionsMap.set(dpTask.id, dpSessions);

          availableIntervals = subtractInterval(availableIntervals, {
            start: sessionStart,
            end: sessionEnd,
          });
          break;
        }
      }
    }
  }

  // 5. Score active coursework tasks and sort descending by priority score
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

  // 9. Cognitive Time-Slot Sequencing & Explanation
  // Group sessions by day and assign optimal sequencing labels and reasons
  const sessionsByDay = new Map<string, ScheduledSession[]>();
  for (const session of allSessions) {
    const dayKey = new Date(session.startTime).toDateString();
    const list = sessionsByDay.get(dayKey) || [];
    list.push(session);
    sessionsByDay.set(dayKey, list);
  }

  sessionsByDay.forEach((daySessions) => {
    daySessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const N = daySessions.length;
    daySessions.forEach((s, idx) => {
      s.sequenceRank = idx + 1;

      if (s.isOverdue) {
        s.sequenceLabel = `🚨 Slot ${idx + 1}: Immediate Priority`;
        s.sequenceReason = 'Overdue task must be tackled first to prevent further academic penalties.';
      } else if (idx === 0 && s.isDailyPractice) {
        s.sequenceLabel = `🌅 Slot ${idx + 1}: Warm-Up Flow`;
        s.sequenceReason = `Start your study session with an accessible win (${s.durationMinutes}m practice) to overcome procrastination and build momentum.`;
      } else if (idx === 0 || (idx === 1 && daySessions[0].isDailyPractice)) {
        s.sequenceLabel = `🎯 Slot ${idx + 1}: Peak Focus (Deep Work)`;
        s.sequenceReason = 'Tackle your highest-stakes, cognitively demanding coursework when mental stamina and freshness are peak.';
      } else if (s.totalSessions > 1 && s.sessionIndex > 1) {
        s.sequenceLabel = `🔥 Slot ${idx + 1}: Deep Work Continuation`;
        s.sequenceReason = `Continuation block (Part ${s.sessionIndex} of ${s.totalSessions}) after a break while concepts are fresh in working memory.`;
      } else if (idx === N - 1 && (s.isDailyPractice || N >= 3)) {
        s.sequenceLabel = `🌙 Slot ${idx + 1}: Wind-Down Slot`;
        s.sequenceReason = 'Lower cognitive load session placed towards the end of your study time to wind down without burnout.';
      } else if (s.isDailyPractice) {
        s.sequenceLabel = `🔁 Slot ${idx + 1}: Daily Habit Practice`;
        s.sequenceReason = `Daily consistency habit (${s.durationMinutes}m) to maintain skills and steady progress.`;
      } else {
        s.sequenceLabel = `⚡ Slot ${idx + 1}: Focused Study Block`;
        s.sequenceReason = 'Scheduled focus block packed into your evening study time.';
      }
    });
  });

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
