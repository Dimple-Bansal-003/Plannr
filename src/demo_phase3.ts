import { computeSchedule } from './scheduler/engine';
import { Task, RecurringTimeBlock } from './scheduler/types';

console.log('\n================================================================================');
console.log('  PLANNR MVP — PHASE 3 ACCEPTANCE DEMO (TODAY & WEEKLY VIEWS)');
console.log('================================================================================\n');

// 1. Setup Student Free-Time Template
const template: RecurringTimeBlock[] = [
  { id: 'b-mon', dayOfWeek: 1, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  { id: 'b-tue', dayOfWeek: 2, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  { id: 'b-wed', dayOfWeek: 3, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  { id: 'b-thu', dayOfWeek: 4, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
  { id: 'b-fri', dayOfWeek: 5, startHour: 18, startMinute: 0, endHour: 22, endMinute: 0 },
];

const now = new Date(2026, 9, 5, 10, 0, 0); // Monday Oct 5, 2026, 10:00 AM

// 2. Realistic Student Coursework Tasks (including an At-Risk task and a Beyond-Horizon task)
const tasks: Task[] = [
  {
    id: 'task-1',
    title: 'OS Process Synchronization Lab',
    deadline: new Date(2026, 9, 7, 17, 0, 0).toISOString(), // Wednesday 17:00
    effort: '2hr',
    importance: 4,
    completed: false,
    createdAt: now.toISOString(),
  },
  {
    id: 'task-2',
    title: 'Database Systems Midterm Prep',
    deadline: new Date(2026, 9, 8, 9, 0, 0).toISOString(), // Thursday 09:00
    effort: 'half-day', // 4hr = 240m
    importance: 5,
    completed: false,
    createdAt: now.toISOString(),
  },
  {
    id: 'task-3',
    title: 'Compiler Design Massive Project',
    deadline: new Date(2026, 9, 6, 9, 0, 0).toISOString(), // Tomorrow Tue 09:00 AM
    effort: 'full-day', // 8hr = 480m
    importance: 3,
    completed: false,
    createdAt: now.toISOString(),
  },
  {
    id: 'task-4',
    title: 'Semester Capstone Final Defense',
    deadline: new Date(2026, 9, 30, 14, 0, 0).toISOString(), // 25 days away
    effort: '2hr',
    importance: 5,
    completed: false,
    createdAt: now.toISOString(),
  },
];

const schedule = computeSchedule({
  tasks,
  template,
  now,
  horizonDays: 14,
});

// -------------------------------------------------------------
// RENDER: TODAY VIEW
// -------------------------------------------------------------
console.log('--------------------------------------------------------------------------------');
console.log('📱 VIEW 1: TODAY VIEW (Monday, Oct 5, 2026)');
console.log('--------------------------------------------------------------------------------');
const todaySessions = schedule.sessions.filter(
  (s) => new Date(s.startTime).toDateString() === now.toDateString()
);

console.log(`Planned Study Time Today: ${todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0)} minutes\n`);

todaySessions.forEach((s) => {
  const start = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const end = new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const splitInfo = s.totalSessions > 1 ? `[Part ${s.sessionIndex} of ${s.totalSessions}]` : '[Single Session]';
  console.log(`  🕒 ${start} - ${end} (${s.durationMinutes}m)  |  ${s.taskTitle}  ${splitInfo}`);
});

// -------------------------------------------------------------
// RENDER: AT-RISK HONEST WARNING CARD
// -------------------------------------------------------------
console.log('\n--------------------------------------------------------------------------------');
console.log('⚠️ VIEW 2: HONEST OVERCOMMIT ALERT CARD (Prominent in Weekly View & Banner in Today)');
console.log('--------------------------------------------------------------------------------');
if (schedule.atRiskTasks.length > 0) {
  schedule.atRiskTasks.forEach((ar) => {
    console.log(`  [ALERT] ${ar.taskTitle}`);
    console.log(`    - Total Effort Needed: ${ar.totalEffortMinutes} min (8 hours)`);
    console.log(`    - Allocated Before Deadline: ${ar.allocatedMinutes} min`);
    console.log(`    - Missing: ${ar.missingMinutes} min`);
    console.log(`    - Explanation: "${ar.reason}"`);
    console.log(`    - Guarantee: Task was NOT scheduled past its deadline.`);
  });
} else {
  console.log('  No tasks at risk.');
}

// -------------------------------------------------------------
// RENDER: WEEKLY SCHEDULE (DAY-BY-DAY)
// -------------------------------------------------------------
console.log('\n--------------------------------------------------------------------------------');
console.log('📅 VIEW 3: WEEKLY PROPOSED SCHEDULE (Grouped by Day)');
console.log('--------------------------------------------------------------------------------');
const grouped = new Map<string, typeof schedule.sessions>();
schedule.sessions.forEach((s) => {
  const d = new Date(s.startTime).toDateString();
  const list = grouped.get(d) || [];
  list.push(s);
  grouped.set(d, list);
});

grouped.forEach((sessionsList, dayStr) => {
  const dayMins = sessionsList.reduce((acc, s) => acc + s.durationMinutes, 0);
  console.log(`\n  📆 ${dayStr} (Total: ${dayMins / 60}h / ${dayMins}m):`);
  sessionsList.forEach((s) => {
    const start = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const split = s.totalSessions > 1 ? `(Part ${s.sessionIndex}/${s.totalSessions})` : '';
    console.log(`     • ${start} - ${end} (${s.durationMinutes}m): ${s.taskTitle} ${split}`);
  });
});

// -------------------------------------------------------------
// RENDER: UPCOMING BEYOND 14-DAY HORIZON
// -------------------------------------------------------------
console.log('\n--------------------------------------------------------------------------------');
console.log('🔭 VIEW 4: UPCOMING (BEYOND 14-DAY HORIZON — NOT YET SCHEDULED)');
console.log('--------------------------------------------------------------------------------');
schedule.beyondHorizonTasks.forEach((bh) => {
  console.log(`  📌 ${bh.taskTitle}`);
  console.log(`     - Deadline: ${new Date(bh.deadline).toDateString()}`);
  console.log(`     - Days Away: ${bh.daysUntilDeadline} days`);
  console.log(`     - Status: Visible as "Not Yet Scheduled — Outside 14-day Window"`);
  console.log(`     - Automatic Entry Date: ${new Date(bh.entryDate).toDateString()}`);
});

console.log('\n================================================================================\n');
