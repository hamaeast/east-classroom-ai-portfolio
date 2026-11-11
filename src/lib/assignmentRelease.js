export const ELIGIBLE_ASSIGNMENT_PERIODS = [1, 2, 3, 6, 7];

const PERIOD_STARTS = { 1: '08:00', 2: '08:55', 3: '10:25', 6: '13:40', 7: '14:35' };

const chicagoIso = (date, time, extraMinutes) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute + extraMinutes));
  const zoneName = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'shortOffset' }).formatToParts(guess).find(part => part.type === 'timeZoneName')?.value || 'GMT-6';
  const match = zoneName.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const offset = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] || 0)) : -360;
  return new Date(guess.getTime() - offset * 60000).toISOString();
};

export const buildPeriodReleaseTimes = (releaseDate, instantRelease = false) => Object.fromEntries(
  ELIGIBLE_ASSIGNMENT_PERIODS.map(period => [String(period), chicagoIso(releaseDate, PERIOD_STARTS[period], instantRelease ? 0 : 15)])
);

export const assignmentReleaseDate = assignment => assignment.release_date || (assignment.publish_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(assignment.publish_at)) : '');

export const isAssignmentReleased = (assignment, classPeriod, now = Date.now()) => {
  if (!assignment.is_active) return false;
  const releases = assignment.period_release_times;
  if (releases && Object.keys(releases).length) {
    const releaseAt = releases[String(classPeriod)];
    if (releaseAt) return new Date(releaseAt).getTime() <= now;
    const times = Object.values(releases).map(value => new Date(value).getTime()).filter(Number.isFinite);
    return times.length > 0 && Math.min(...times) <= now;
  }
  return !assignment.publish_at || new Date(assignment.publish_at).getTime() <= now;
};