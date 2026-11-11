import { chicagoToday } from './weeklyGoals';

export const NINE_WEEK_PERIODS = [
  { number: 1, start: '2026-08-04', end: '2026-09-30', label: 'Aug 4 – Sep 30' },
  { number: 2, start: '2026-10-01', end: '2027-01-08', label: 'Oct 1 – Jan 8' },
  { number: 3, start: '2027-01-11', end: '2027-03-18', label: 'Jan 11 – Mar 18' },
  { number: 4, start: '2027-03-19', end: '2027-05-28', label: 'Mar 19 – May 28' }
];

export function currentNineWeeks() {
  const today = chicagoToday();
  return NINE_WEEK_PERIODS.find(period => today >= period.start && today <= period.end);
}

export function isCurrentNineWeeksDate(date) {
  const period = currentNineWeeks();
  return Boolean(period && isInNineWeeks(String(date || '').slice(0, 10), period.number));
}

export function isCurrentNineWeeksAssignment(assignment) {
  const period = currentNineWeeks();
  if (!period || assignment?.frozen_at || assignment?.is_active === false) return false;
  return assignment?.grading_period
    ? Number(assignment.grading_period) === period.number
    : isCurrentNineWeeksDate(assignment?.due_date);
}

export function isWeeklyGoalClosed(record) {
  return isNineWeeksClosed(String(record?.reflection_due_at || record?.week_start || '').slice(0, 10));
}

export function isAssignmentClosed(assignment) {
  if (assignment?.frozen_at) return true;
  const period = NINE_WEEK_PERIODS.find(item => item.number === Number(assignment?.grading_period));
  // A closed assigned period stays closed even if a legacy due date falls outside its dates.
  if (period && period.end < chicagoToday()) return true;
  return isNineWeeksClosed(assignment?.due_date?.slice(0, 10));
}

export function isInNineWeeks(date, number) {
  const period = NINE_WEEK_PERIODS.find(item => item.number === Number(number));
  return Boolean(date && period && date >= period.start && date <= period.end);
}

// A date is "closed" for student editing when it falls inside a nine-weeks
// period whose end date has already passed — e.g. the first nine weeks after 9/30.
export function isNineWeeksClosed(date) {
  if (!date) return false;
  const today = chicagoToday();
  return NINE_WEEK_PERIODS.some(period => date >= period.start && date <= period.end && period.end < today);
}