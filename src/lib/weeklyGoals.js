import { hasFullCreditOverride } from '@/lib/gradeOverrides';
import { isCurrentNineWeeksDate } from '@/lib/gradingPeriods';
import { isFullSchoolWeekClosed, isInstructionDay } from '@/lib/schoolCalendar';

const ZONE = 'America/Chicago';
const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

function parts(date = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' }).formatToParts(date).map(part => [part.type, part.value]));
}

function addDays(dateText, count) {
  const [year, month, day] = dateText.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + count));
  return value.toISOString().slice(0, 10);
}

export function chicagoToday() {
  const value = parts();
  return `${value.year}-${value.month}-${value.day}`;
}

export function currentGoalWeekStart() {
  const value = parts();
  return addDays(`${value.year}-${value.month}-${value.day}`, -DAY_INDEX[value.weekday]);
}

export function isEnrollmentExemptWeek(student, weekStart) {
  return Boolean(student?.created_date && weekStart && weekStart < student.created_date.slice(0, 10));
}

export function weeklyGoalRequirementCounts(student, goals, assignments, now = new Date(), grades = []) {
  if (!student?.id) return { goals: 0, reflections: 0 };
  const value = parts(now);
  const today = `${value.year}-${value.month}-${value.day}`;
  const schoolYearStart = `${Number(value.month) >= 8 ? value.year : Number(value.year) - 1}-08-01`;
  const byWeek = new Map();
  goals.filter(item => item.student_id === student.id && isCurrentNineWeeksDate(item.reflection_due_at || item.week_start) && item.week_start >= schoolYearStart && item.week_start <= today).forEach(item => byWeek.set(item.week_start, [...(byWeek.get(item.week_start) || []), item]));
  // The Monday badge must not depend on the popup creating a goal record first.
  const thisWeek = addDays(today, -DAY_INDEX[value.weekday]);
  if (!byWeek.has(thisWeek) && isInstructionDay(today) && isCurrentNineWeeksDate(thisWeek)) byWeek.set(thisWeek, []);
  let missingGoals = 0;
  let missingReflections = 0;
  byWeek.forEach((records, weekStart) => {
    if (isEnrollmentExemptWeek(student, weekStart) || isFullSchoolWeekClosed(weekStart)) return;
    const assignmentIds = records.flatMap(item => [item.goal_assignment_id, item.reflection_assignment_id]).filter(Boolean);
    if (assignmentIds.length && assignments.some(item => assignmentIds.includes(item.id) && item.is_active === false)) return;
    const assignment = assignments.find(item => item.title === `Weekly Goal & Reflection — ${weekStart}`);
    if (assignment?.is_active === false) return;
    if (assignment && hasFullCreditOverride(grades, student.id, assignment.id, Number(assignment.max_points))) return;
    const goalDue = records.map(item => item.goal_due_at?.slice(0, 10)).filter(Boolean).sort()[0];
    const reflectionDue = Math.min(...records.map(item => new Date(item.reflection_due_at || suggestedReflectionDue(weekStart)).getTime()));
    if ((!goalDue || today >= goalDue) && !records.some(item => item.goal_submitted_at)) missingGoals += 1;
    if (now.getTime() > reflectionDue && !records.some(item => item.reflection_submitted_at)) missingReflections += 1;
  });
  return { goals: missingGoals, reflections: missingReflections };
}

export function isChicagoSchoolDay() {
  return isInstructionDay(chicagoToday());
}

function zoneOffset(dateText) {
  const probe = new Date(`${dateText}T12:00:00Z`);
  const value = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(probe).map(part => [part.type, part.value]));
  const localAsUtc = Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day), Number(value.hour), Number(value.minute));
  const minutes = Math.round((localAsUtc - probe.getTime()) / 60000);
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

export const chicagoEndOfDay = dateText => `${dateText}T23:59:59${zoneOffset(dateText)}`;
export const suggestedGoalDue = weekStart => chicagoEndOfDay(weekStart);
export const suggestedReflectionDue = weekStart => chicagoEndOfDay(weekStart === '2026-10-05' ? '2026-10-19' : addDays(weekStart, 4));

export function toChicagoInput(iso) {
  if (!iso) return '';
  const value = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso)).map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

export function fromChicagoInput(value) {
  if (!value) return '';
  const dateText = value.slice(0, 10);
  return `${value}:00${zoneOffset(dateText)}`;
}