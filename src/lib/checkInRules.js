import { weekEndingFriday } from './checkinWeeks';
import { isFullSchoolWeekClosed } from './schoolCalendar';

export const CHECK_IN_RULES_START = '2026-09-23';

// One-week exception: Friday, October 9 is a school closure.
export const SHORT_WEEK_ENDING = '2026-10-09';
export const SHORT_WEEK_SUBMISSION_DATES = ['2026-10-07', '2026-10-08'];

export function chicagoDate(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(value).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday };
}

export function releasedFriday(now = new Date()) {
  const { date, weekday } = chicagoDate(now);
  const friday = weekEndingFriday(date);
  if (['Mon', 'Tue', 'Wed'].includes(weekday) && !(friday === SHORT_WEEK_ENDING && date >= SHORT_WEEK_SUBMISSION_DATES[0])) {
    const previous = new Date(`${friday}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 7);
    return previous.toISOString().slice(0, 10);
  }
  return friday;
}

export function isUnreleasedCheckIn(week, now = new Date()) {
  const { date, weekday } = chicagoDate(now);
  if (week === SHORT_WEEK_ENDING && SHORT_WEEK_SUBMISSION_DATES.includes(date)) return false;
  return date >= CHECK_IN_RULES_START && ['Mon', 'Tue', 'Wed'].includes(weekday) && week === weekEndingFriday(date) && !isFullSchoolWeekClosed(week);
}

export function isExtraCheckIn(item) {
  return item.grade_status === 'extra';
}