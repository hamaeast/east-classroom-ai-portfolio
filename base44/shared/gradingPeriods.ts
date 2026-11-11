// Shared nine-weeks grading period definitions and closed-period logic for
// backend functions. Mirrors src/lib/gradingPeriods.js + src/lib/nineWeeksUnlock.js.

export const NINE_WEEK_PERIODS = [
  { number: 1, start: '2026-08-04', end: '2026-09-30' },
  { number: 2, start: '2026-10-01', end: '2027-01-08' },
  { number: 3, start: '2027-01-11', end: '2027-03-18' },
  { number: 4, start: '2027-03-19', end: '2027-05-28' }
];

export function chicagoToday(date: Date = new Date()): string {
  const parts: any = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date).map(p => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function nineWeeksForDate(dateText: string) {
  if (!dateText) return null;
  return NINE_WEEK_PERIODS.find(p => dateText >= p.start && dateText <= p.end) || null;
}

// A date is "closed" for student editing when it falls inside a nine-weeks
// period whose end date has already passed.
export function isNineWeeksClosed(dateText: string, today: string = chicagoToday()): boolean {
  if (!dateText) return false;
  return NINE_WEEK_PERIODS.some(p => dateText >= p.start && dateText <= p.end && p.end < today);
}

export function isWeeklyGoalClosed(record) {
  return isNineWeeksClosed(String(record?.reflection_due_at || record?.week_start || '').slice(0, 10));
}

export function isAssignmentClosed(assignment) {
  if (assignment?.frozen_at) return true;
  const period = NINE_WEEK_PERIODS.find(item => item.number === Number(assignment?.grading_period));
  // Honor the assigned period even when a legacy due date falls outside the school calendar.
  if (period && period.end < chicagoToday()) return true;
  return isNineWeeksClosed(assignment?.due_date?.slice(0, 10));
}

// Closed periods remain locked, including previously issued rescue windows. `unlocks`
// is the student's NineWeeksUnlock records for the relevant period (or all of
// them — filtered here by student_id + nine_weeks).
export function isClosedForStudent(
  dateText: string,
  studentId: string,
  unlocks: any[],
  today: string = chicagoToday()
): boolean {
  return isNineWeeksClosed(dateText, today);
}