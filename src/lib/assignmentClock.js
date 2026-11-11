// Assignment aging pauses for the entire October 9–18 fall break (Chicago dates).
const PAUSE_START = '2026-10-09';
const PAUSE_END = '2026-10-19';
const DAY = 86400000;
const dayNumber = value => Date.parse(`${String(value).slice(0, 10)}T00:00:00Z`) / DAY;
const clockDay = value => {
  const day = dayNumber(value);
  return day - Math.max(0, Math.min(day, dayNumber(PAUSE_END)) - dayNumber(PAUSE_START));
};

export function assignmentDaysBetween(from, to) {
  return clockDay(to) - clockDay(from);
}

export function addAssignmentDays(value, count) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  let remaining = count;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const text = date.toISOString().slice(0, 10);
    if (text < PAUSE_START || text >= PAUSE_END) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}