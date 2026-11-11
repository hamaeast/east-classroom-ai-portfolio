const ZONE = 'America/Chicago';
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export const PROJECT_WORK_MAX = 5;

export function projectWorkWeekStart(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(date).map(p => [p.type, p.value])
  );
  const d = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  d.setUTCDate(d.getUTCDate() - ((DAY_INDEX[parts.weekday] + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function projectWorkIncidentWeek(value) {
  const date = new Date(`${value}T12:00:00Z`);
  if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function weeklyIncidentCount(studentId, incidents, weekStart = projectWorkWeekStart()) {
  return incidents.filter(i => i.student_id === studentId && projectWorkIncidentWeek(i.week_start) === weekStart).length;
}

export function projectWorkScore(studentId, incidents, weekStart = projectWorkWeekStart()) {
  const count = weeklyIncidentCount(studentId, incidents, weekStart);
  return Math.max(0, PROJECT_WORK_MAX - Math.min(count, PROJECT_WORK_MAX));
}