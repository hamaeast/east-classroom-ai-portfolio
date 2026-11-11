import { isFullSchoolWeekClosed } from './schoolCalendar';

// Shared helpers for computing which Friday "week ending" check-ins are expected.
export function getLastFriday(now = new Date()) {
  const day = now.getDay();
  let diff = (day - 5 + 7) % 7;
  if (diff === 0) diff = 7; // today is Friday, but the day hasn't fully passed yet — not due until it's over
  const f = new Date(now); f.setHours(0, 0, 0, 0); f.setDate(now.getDate() - diff);
  return f;
}

function toDateStr(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekEndingFriday(dateText) {
  if (!dateText) return '';
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7));
  return toDateStr(date);
}

export function isEnrollmentWeekCheckIn(student, weekEnding) {
  return Boolean(student?.created_date && weekEnding && weekEndingFriday(student.created_date.slice(0, 10)) === weekEnding);
}

// Every Friday (as 'YYYY-MM-DD') from `start` through `end`, inclusive.
export function fridaysBetween(start, end) {
  const dates = [];
  const d = new Date(start);
  if (d > end) return dates;
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  while (d <= end) {
    const dateText = toDateStr(d);
    if (!isFullSchoolWeekClosed(dateText)) dates.push(dateText);
    d.setDate(d.getDate() + 7);
  }
  return dates;
}