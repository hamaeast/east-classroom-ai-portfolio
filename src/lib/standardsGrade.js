const BAND_START = { 'K-2': 0, '3-6': 3, '7-8': 6, '9-12': 9 };
const BAND_MASTERY = { 'K-2': 3, '3-6': 6, '7-8': 9, '9-12': 12 };
const LEVEL_VALUE = { Emerging: 1, Proficient: 2, Mastery: 3 };
export const STANDARDS_USED = { 1: 2, 2: 3, 3: 4, 4: 7 };

const resultRank = result => (BAND_START[result.assessed_grade_band] || 0) + (LEVEL_VALUE[result.level] || 0);
const targetRank = grade => BAND_MASTERY[Number(grade) >= 9 ? '9-12' : Number(grade) >= 7 ? '7-8' : Number(grade) >= 3 ? '3-6' : 'K-2'];

export function standardsResultPercent(result, grade) {
  return Math.round(Math.min(1, resultRank(result) / targetRank(grade)) * 100);
}

export function standardsNineWeeksPoints(assessment, grade, segment) {
  const count = STANDARDS_USED[segment];
  if (!assessment || !count) return 0;
  const strongest = [...(assessment.results || [])].sort((a, b) => resultRank(b) - resultRank(a)).slice(0, count);
  const total = strongest.reduce((sum, result) => sum + Math.min(1, resultRank(result) / targetRank(grade)), 0);
  return Math.round((total / count) * 200) / 10;
}

export function standardsNineWeeksPercent(assessment, grade, segment = 1) {
  return Math.round(standardsNineWeeksPoints(assessment, grade, segment) * 5);
}