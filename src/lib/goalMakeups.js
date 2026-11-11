import { addAssignmentDays } from '@/lib/assignmentClock';
import { adjustedAssignmentDueDate } from '@/lib/assignmentDeadline';
import { chicagoEndOfDay } from '@/lib/weeklyGoals';

const ZONE = 'America/Chicago';

export function chicagoDateText(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isOverSevenDaysOld(dueAt, now = new Date()) {
  const dueDate = dueAt?.slice(0, 10);
  return Boolean(dueDate && chicagoDateText(now) > addAssignmentDays(dueDate, 7));
}

export function isGoalPhasePastDue(record, phase, student, now = new Date()) {
  const due = adjustedAssignmentDueDate(record?.[`${phase}_due_at`], student);
  return Boolean(due && new Date(due.includes('T') ? due : chicagoEndOfDay(due)).getTime() < now.getTime());
}

export function lateMakeupPoints(dueAt, submittedAt, student) {
  const adjustedDue = adjustedAssignmentDueDate(dueAt, student);
  const deadline = adjustedDue && (adjustedDue.includes('T') ? adjustedDue : chicagoEndOfDay(adjustedDue));
  return deadline && new Date(submittedAt).getTime() > new Date(deadline).getTime() ? 4 : 5;
}