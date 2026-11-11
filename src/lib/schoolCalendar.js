const CLOSED_DATES = new Set([
  '2026-09-07', '2026-09-08',
  '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16',
  '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27',
  '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25',
  '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
  '2027-01-01', '2027-01-04', '2027-01-05', '2027-01-18',
  '2027-02-12', '2027-02-15',
  '2027-03-19', '2027-03-22', '2027-03-23', '2027-03-24', '2027-03-25', '2027-03-26',
  '2027-04-16', '2027-04-19',
]);

export function isInstructionDay(dateText) {
  if (!dateText || dateText < '2026-08-04' || dateText > '2027-05-28' || CLOSED_DATES.has(dateText)) return false;
  const [year, month, day] = dateText.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

function addDays(dateText, count) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

export function nextMissingInstructionDates(startDate, count, occupiedDates = []) {
  const occupied = new Set(occupiedDates);
  const dates = [];
  let candidate = startDate;
  while (dates.length < count && candidate <= '2027-05-28') {
    if (isInstructionDay(candidate) && !occupied.has(candidate)) dates.push(candidate);
    candidate = addDays(candidate, 1);
  }
  return dates;
}

export function nextInstructionDates(startDate, count) {
  const dates = [];
  let candidate = startDate;
  while (dates.length < count && candidate <= '2027-05-28') {
    if (isInstructionDay(candidate)) dates.push(candidate);
    candidate = addDays(candidate, 1);
  }
  return dates;
}

export function addInstructionDays(dateText, count) {
  let result = dateText;
  let remaining = Math.max(0, Number(count) || 0);
  while (remaining > 0 && result < '2027-05-28') {
    result = addDays(result, 1);
    if (isInstructionDay(result)) remaining -= 1;
  }
  return result;
}

export function schoolWeekStart(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || '')) return '';
  const weekday = new Date(`${dateText}T12:00:00Z`).getUTCDay();
  return addDays(dateText, -((weekday + 6) % 7));
}

export function isFullSchoolWeekClosed(dateText) {
  const monday = schoolWeekStart(dateText);
  return Boolean(monday && [0, 1, 2, 3, 4].every(offset => !isInstructionDay(addDays(monday, offset))));
}

export function schoolGoalWeeks() {
  const weeks = [];
  let monday = schoolWeekStart('2026-08-04');
  while (monday <= '2027-05-28') {
    if (!isFullSchoolWeekClosed(monday)) weeks.push({ weekStart: monday, weekEnd: addDays(monday, 4) });
    monday = addDays(monday, 7);
  }
  return weeks;
}