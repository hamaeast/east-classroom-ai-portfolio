// Per-period non-instruction dates. A date listed for a period is treated as a
// school closure for only that period's students — deadlines falling on it roll
// forward to the next instruction day, so work due that day is not counted late.
// Period 1 could not meet on Monday, Oct 26, 2026, so that class operates as a
// four-day week (Tue–Fri) with Monday treated as a holiday.
export const PERIOD_HOLIDAYS = {
  '1': ['2026-10-26'],
};

export function isPeriodHoliday(dateText, classPeriod) {
  if (!dateText) return false;
  return (PERIOD_HOLIDAYS[String(classPeriod)] || []).includes(String(dateText).slice(0, 10));
}