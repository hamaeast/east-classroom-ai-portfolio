// School year runs Aug 1 through the following Jul 31 (rolls forward every Aug 1).
export function currentSchoolYearRange(date = new Date()) {
  const year = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1; // Aug = month index 7
  const start = new Date(year, 7, 1);
  const end = new Date(year + 1, 7, 1);
  return { start, end, label: `${year}–${String(year + 1).slice(-2)}` };
}

export function inSchoolYear(dateStr, range) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= range.start && d < range.end;
}

export function previousSchoolYearRange(date = new Date()) {
  const current = currentSchoolYearRange(date);
  const year = current.start.getFullYear() - 1;
  const start = new Date(year, 7, 1);
  const end = new Date(year + 1, 7, 1);
  return { start, end, label: `${year}–${String(year + 1).slice(-2)}` };
}