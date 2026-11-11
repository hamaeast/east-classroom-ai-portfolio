// Standards-grade computation shared by backend functions. Mirrors the frontend
// logic in src/lib/standardsProgress.js and src/lib/standardsGrade.js so frozen
// nine-weeks snapshots match the on-screen StandardsGradeReport values.

export const STANDARD_KEYS = [
  'self_directed',
  'ethical_problem_solving',
  'collaboration',
  'research',
  'communication',
  'technology',
  'confidence',
];

export const STANDARDS_USED: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 7 };

const BANDS = ['K-2', '3-6', '7-8', '9-12'];
const LEVELS = ['Emerging', 'Proficient', 'Mastery'];
const BAND_START: Record<string, number> = { 'K-2': 0, '3-6': 3, '7-8': 6, '9-12': 9 };
const LEVEL_VALUE: Record<string, number> = { Emerging: 1, Proficient: 2, Mastery: 3 };
const BAND_MASTERY: Record<string, number> = { 'K-2': 3, '3-6': 6, '7-8': 9, '9-12': 12 };

// Progress-style score used to pick the strongest result per standard across assessments.
function progressScore(result: any): number {
  if (!result) return -1;
  return BANDS.indexOf(result.assessed_grade_band) * 3 + LEVELS.indexOf(result.level);
}

// Builds the current assessment by taking the strongest result per standard across
// all of the student's StandardsAssessment records (latest-generated first).
export function buildCurrentAssessment(assessments: any[]): any | null {
  const sorted = [...assessments].sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  if (!sorted.length) return null;
  const results = STANDARD_KEYS.map(key => sorted.reduce((best: any, assessment) => {
    const result = (assessment.results || []).find((item: any) => item.standard_key === key);
    return !best || progressScore(result) > progressScore(best) ? result : best;
  }, null)).filter(Boolean);
  return { ...sorted[0], results };
}

// Gradebook-style rank used to compute the 20-point nine-weeks standards score.
function resultRank(result: any): number {
  return (BAND_START[result.assessed_grade_band] || 0) + (LEVEL_VALUE[result.level] || 0);
}

function targetRank(grade: number): number {
  const band = Number(grade) >= 9 ? '9-12' : Number(grade) >= 7 ? '7-8' : Number(grade) >= 3 ? '3-6' : 'K-2';
  return BAND_MASTERY[band];
}

export function standardsNineWeeksPoints(assessment: any, grade: number, segment: number): number {
  const count = STANDARDS_USED[segment];
  if (!assessment || !count) return 0;
  const strongest = [...(assessment.results || [])].sort((a, b) => resultRank(b) - resultRank(a)).slice(0, count);
  const total = strongest.reduce((sum, result) => sum + Math.min(1, resultRank(result) / targetRank(grade)), 0);
  return Math.round((total / count) * 200) / 10;
}