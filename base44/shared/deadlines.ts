// School deadline math shared by backend functions. Mirrors src/lib/schoolCalendar.js,
// src/lib/assignmentDeadline.js, src/lib/periodHolidays.js and the Chicago-time helpers
// in src/lib/weeklyGoals.js so the server applies the same rules the screens show.

const ZONE = 'America/Chicago';
export const SCHOOL_YEAR_START = '2026-08-04';
export const SCHOOL_YEAR_END = '2027-05-28';

const CLOSED_DATES = new Set([
  '2026-09-07', '2026-09-08',
  '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16',
  '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27',
  '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25',
  '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
  '2027-01-01', '2027-01-04', '2027-01-05', '2027-01-18',
  '2027-02-12', '2027-02-15',
  '2027-03-19', '2027-03-22', '2027-03-23', '2027-03-24', '2027-03-25', '2027-03-26',
  '2027-04-16', '2027-04-19'
]);

const PERIOD_HOLIDAYS: Record<string, string[]> = {
  '1': ['2026-10-26']
};

export function chicagoStamp(date: Date = new Date()) {
  const parts: any = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(date).map(part => [part.type, part.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday };
}

export function chicagoToday(date: Date = new Date()): string {
  return chicagoStamp(date).date;
}

export function addDays(dateText: string, count: number): string {
  const [year, month, day] = String(dateText).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

export function isInstructionDay(dateText: string): boolean {
  if (!dateText || dateText < SCHOOL_YEAR_START || dateText > SCHOOL_YEAR_END || CLOSED_DATES.has(dateText)) return false;
  const [year, month, day] = dateText.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function addInstructionDays(dateText: string, count: number): string {
  let result = dateText;
  let remaining = Math.max(0, Number(count) || 0);
  while (remaining > 0 && result < SCHOOL_YEAR_END) {
    result = addDays(result, 1);
    if (isInstructionDay(result)) remaining -= 1;
  }
  return result;
}

export function nextInstructionDates(startDate: string, count: number): string[] {
  const dates: string[] = [];
  let candidate = startDate;
  while (dates.length < count && candidate <= SCHOOL_YEAR_END) {
    if (isInstructionDay(candidate)) dates.push(candidate);
    candidate = addDays(candidate, 1);
  }
  return dates;
}

export function isPeriodHoliday(dateText: string, classPeriod: any): boolean {
  if (!dateText) return false;
  return (PERIOD_HOLIDAYS[String(classPeriod)] || []).includes(String(dateText).slice(0, 10));
}

// Deadline with the student's extension, absence days and period holidays applied.
export function adjustedAssignmentDueDate(dueValue: string, student: any): string {
  if (!dueValue) return '';
  const originalDate = String(dueValue).slice(0, 10);
  const enabled = (student?.modifications || []).includes('assignment_deadline_extension');
  const extensionDays = enabled ? Number(student?.assignment_deadline_extension_days) || 0 : 0;
  let result = extensionDays > 0 ? addInstructionDays(originalDate, extensionDays) : originalDate;
  const absentDates = new Set<string>();
  for (const item of student?.absence_deadline_adjustments || []) {
    for (const date of nextInstructionDates(item.start_date, Number(item.days) || 0)) absentDates.add(date);
  }
  while (absentDates.has(result) || isPeriodHoliday(result, student?.class_period)) result = addInstructionDays(result, 1);
  return result === originalDate ? dueValue : result;
}

function zoneOffset(dateText: string): string {
  const probe = new Date(`${dateText}T12:00:00Z`);
  const value: any = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(probe).map(part => [part.type, part.value])
  );
  const localAsUtc = Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day), Number(value.hour), Number(value.minute));
  const minutes = Math.round((localAsUtc - probe.getTime()) / 60000);
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

export const chicagoEndOfDay = (dateText: string) => `${dateText}T23:59:59${zoneOffset(dateText)}`;