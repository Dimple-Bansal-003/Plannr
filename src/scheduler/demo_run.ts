import { computeSchedule } from './engine';
import { Task, RecurringTimeBlock, ScheduledSession } from './types';

function logSection(title: string) {
  console.log('\n============================================================');
  console.log(`  ${title}`);
  console.log('============================================================');
}

// 1. CLEAN FIT DEMO
{
  logSection('SCENARIO 1: CLEAN FIT (No Splits, All Fit Cleanly)');
  const now = new Date(2026, 9, 5, 10, 0, 0); // Monday Oct 5 10:00
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
    { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  ];
  const tasks: Task[] = [
    {
      id: 'task-dbms',
      title: 'DBMS Lab Report',
      deadline: new Date(2026, 9, 6, 17, 0, 0).toISOString(),
      effort: '1hr',
      importance: 4,
      completed: false,
      createdAt: now.toISOString(),
    },
    {
      id: 'task-os',
      title: 'Operating Systems Assignment',
      deadline: new Date(2026, 9, 7, 12, 0, 0).toISOString(),
      effort: '2hr',
      importance: 3,
      completed: false,
      createdAt: now.toISOString(),
    },
  ];

  const result = computeSchedule({ tasks, template, now });
  console.log('Input Tasks:', tasks.map(t => `${t.title} (Effort: ${t.effort}, Imp: ${t.importance}, Due: ${t.deadline})`));
  console.log('Scheduled Sessions:');
  result.sessions.forEach(s => {
    console.log(`  - [${s.taskTitle}] ${new Date(s.startTime).toLocaleTimeString()} to ${new Date(s.endTime).toLocaleTimeString()} (${s.durationMinutes}m) [Session ${s.sessionIndex}/${s.totalSessions}]`);
  });
  console.log('At-Risk Tasks:', result.atRiskTasks.length === 0 ? 'None (0)' : result.atRiskTasks);
}

// 2. SPLIT ACROSS SESSIONS DEMO
{
  logSection('SCENARIO 2: TASK SPLITTING ACROSS MULTIPLE SESSIONS');
  const now = new Date(2026, 9, 5, 10, 0, 0);
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 }, // 2hr
    { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 }, // 2hr
  ];
  const tasks: Task[] = [
    {
      id: 'task-paper',
      title: 'Semester Term Paper Draft',
      deadline: new Date(2026, 9, 7, 12, 0, 0).toISOString(),
      effort: 'half-day', // 240 mins
      importance: 5,
      completed: false,
      createdAt: now.toISOString(),
    },
  ];

  const result = computeSchedule({ tasks, template, now });
  console.log('Input Task: 4-hour (half-day) paper with 2-hour daily slots');
  console.log('Scheduled Sessions:');
  result.sessions.forEach(s => {
    const d = new Date(s.startTime);
    console.log(`  - [${s.taskTitle}] Part ${s.sessionIndex} of ${s.totalSessions}: ${d.toDateString()} at ${d.toLocaleTimeString()} (${s.durationMinutes}m)`);
  });
  console.log('At-Risk Tasks:', result.atRiskTasks.length === 0 ? 'None (0)' : result.atRiskTasks);
}

// 3. HONEST OVERCOMMIT (AT RISK) DEMO
{
  logSection('SCENARIO 3: HONEST OVERCOMMIT (AT-RISK DETECTION)');
  const now = new Date(2026, 9, 5, 10, 0, 0);
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 }, // only 2hr available
  ];
  const tasks: Task[] = [
    {
      id: 'task-exam',
      title: 'Final Exam Preparation',
      deadline: new Date(2026, 9, 6, 9, 0, 0).toISOString(),
      effort: '2hr',
      importance: 5,
      completed: false,
      createdAt: now.toISOString(),
    },
    {
      id: 'task-elective',
      title: 'Elective Reading Assignment',
      deadline: new Date(2026, 9, 6, 9, 0, 0).toISOString(),
      effort: '1hr',
      importance: 2,
      completed: false,
      createdAt: now.toISOString(),
    },
  ];

  const result = computeSchedule({ tasks, template, now });
  console.log('Input: 2 competing tasks needing 3h total, but only 2h free time exists before deadline.');
  console.log('Scheduled Sessions:');
  result.sessions.forEach(s => {
    console.log(`  - [${s.taskTitle}] ${new Date(s.startTime).toLocaleTimeString()} (${s.durationMinutes}m)`);
  });
  console.log('At-Risk Flags:');
  result.atRiskTasks.forEach(ar => {
    console.log(`  - ⚠️ [${ar.taskTitle}] Missing: ${ar.missingMinutes}m. Reason: "${ar.reason}"`);
  });
}

// 4. HORIZON ROLLOVER DEMO
{
  logSection('SCENARIO 4: 14-DAY HORIZON ROLLOVER & BEYOND-HORIZON VISIBILITY');
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    { id: 'b-thu', dayOfWeek: 4, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
    { id: 'b-fri', dayOfWeek: 5, startHour: 18, startMinute: 0, endHour: 20, endMinute: 0 },
  ];
  const day0 = new Date(2026, 9, 1, 10, 0, 0); // Oct 1
  const distantTask: Task = {
    id: 'task-distant',
    title: 'Comprehensive Final Exam',
    deadline: new Date(2026, 9, 26, 12, 0, 0).toISOString(), // 25 days away
    effort: '2hr',
    importance: 5,
    completed: false,
    createdAt: day0.toISOString(),
  };

  const resDay0 = computeSchedule({ tasks: [distantTask], template, now: day0, horizonDays: 14 });
  console.log('At Day 0 (Oct 1): 14-day horizon covers Oct 1 - Oct 15.');
  console.log(`  Active sessions: ${resDay0.sessions.length}`);
  console.log('  Beyond-Horizon Tasks:');
  resDay0.beyondHorizonTasks.forEach(bh => {
    console.log(`  - 📅 [${bh.taskTitle}] Status: ${bh.status}, Days away: ${bh.daysUntilDeadline}, Enters active schedule on: ${new Date(bh.entryDate).toDateString()}`);
  });

  const day15 = new Date(2026, 9, 16, 10, 0, 0); // Oct 16
  const resDay15 = computeSchedule({ tasks: [distantTask], template, now: day15, horizonDays: 14 });
  console.log('\nAt Day 15 (Oct 16): Rolling horizon advances to Oct 16 - Oct 30.');
  console.log(`  Beyond-Horizon Tasks: ${resDay15.beyondHorizonTasks.length}`);
  console.log('  Scheduled Sessions now in active window:');
  resDay15.sessions.forEach(s => {
    const d = new Date(s.startTime);
    console.log(`  - [${s.taskTitle}] ${d.toDateString()} at ${d.toLocaleTimeString()} (${s.durationMinutes}m)`);
  });
}

// 5. MANUAL OVERRIDES DEMO
{
  logSection('SCENARIO 5: PRESERVING MANUAL OVERRIDES');
  const now = new Date(2026, 9, 5, 10, 0, 0);
  const template: RecurringTimeBlock[] = [
    { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 21, endMinute: 0 },
  ];
  const taskA: Task = {
    id: 'task-a',
    title: 'History Essay',
    deadline: new Date(2026, 9, 6, 12, 0, 0).toISOString(),
    effort: '2hr',
    importance: 3,
    completed: false,
    createdAt: now.toISOString(),
  };
  const taskB: Task = {
    id: 'task-b',
    title: 'Urgent Math Quiz',
    deadline: new Date(2026, 9, 6, 12, 0, 0).toISOString(),
    effort: '1hr',
    importance: 5,
    completed: false,
    createdAt: now.toISOString(),
  };
  const manualOverride: ScheduledSession = {
    id: 'manual-session-1',
    taskId: 'task-a',
    taskTitle: 'History Essay',
    startTime: new Date(2026, 9, 5, 19, 0, 0).toISOString(),
    endTime: new Date(2026, 9, 5, 20, 0, 0).toISOString(),
    durationMinutes: 60,
    sessionIndex: 1,
    totalSessions: 1,
    isManualOverride: true,
  };

  const result = computeSchedule({ tasks: [taskA, taskB], template, now, manualOverrides: [manualOverride] });
  console.log('Manual Override: History Essay pinned to 19:00 - 20:00');
  console.log('Computed Schedule:');
  result.sessions.forEach(s => {
    console.log(`  - [${s.taskTitle}] ${new Date(s.startTime).toLocaleTimeString()} - ${new Date(s.endTime).toLocaleTimeString()} (${s.durationMinutes}m) [Manual: ${Boolean(s.isManualOverride)}]`);
  });
}
console.log('\n============================================================\n');
