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

// Match the client assignment clock: October 9–18 contributes no aging days.
export function assignmentDaysBetween(from, to) {
  const day = value => Date.parse(`${String(value).slice(0, 10)}T00:00:00Z`) / 86400000;
  const clock = value => {
    const number = day(value);
    return number - Math.max(0, Math.min(number, day('2026-10-19')) - day('2026-10-09'));
  };
  return clock(to) - clock(from);
}

export function addAssignmentDays(value, count) {
  let result = String(value).slice(0, 10);
  let remaining = count;
  while (remaining > 0) {
    result = nextDate(result);
    if (result < '2026-10-09' || result >= '2026-10-19') remaining -= 1;
  }
  return result;
}

function nextDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function isInstructionDay(dateText) {
  if (CLOSED_DATES.has(dateText)) return false;
  const weekday = new Date(`${dateText}T12:00:00Z`).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function isFullSchoolWeekClosed(dateValue) {
  const dateText = String(dateValue || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return false;
  const monday = new Date(`${dateText}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  for (let offset = 0; offset < 5; offset += 1) {
    if (isInstructionDay(monday.toISOString().slice(0, 10))) return false;
    monday.setUTCDate(monday.getUTCDate() + 1);
  }
  return true;
}

function addInstructionDays(dateText, count) {
  let result = dateText;
  let remaining = Math.max(0, Number(count) || 0);
  while (remaining > 0) {
    result = nextDate(result);
    if (isInstructionDay(result)) remaining -= 1;
  }
  return result;
}

function absenceDates(adjustments) {
  const dates = [];
  for (const item of adjustments || []) {
    let candidate = item.start_date;
    let remaining = Math.max(0, Number(item.days) || 0);
    while (remaining > 0) {
      if (isInstructionDay(candidate)) { dates.push(candidate); remaining -= 1; }
      candidate = nextDate(candidate);
    }
  }
  return new Set(dates);
}

export function isAssignmentAbsenceExempt(dueValue, student) {
  const dueDate = String(dueValue || '').slice(0, 10);
  return Boolean(dueDate && (student?.absence_deadline_adjustments || []).some(item => Number(item.days) >= 4 && absenceDates([item]).has(dueDate)));
}

export function joinedAfterAssignmentDeadline(student, assignment) {
  return Boolean(student?.created_date && assignment?.due_date && student.created_date.slice(0, 10) > assignment.due_date);
}

export function extendedDueDate(dueDate, student) {
  if (!dueDate) return dueDate;
  const enabled = student?.modifications?.includes('assignment_deadline_extension');
  let result = addInstructionDays(dueDate, enabled ? student.assignment_deadline_extension_days : 0);
  const absent = absenceDates(student?.absence_deadline_adjustments);
  while (absent.has(result)) result = addInstructionDays(result, 1);
  return result;
}