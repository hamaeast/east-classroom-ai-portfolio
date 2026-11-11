import { STANDARD_KEYS } from '@/lib/eastStandards';

const BANDS = ['K-2', '3-6', '7-8', '9-12'];
const LEVELS = ['Emerging', 'Proficient', 'Mastery'];

export function resultScore(result) {
  return BANDS.indexOf(result?.assessed_grade_band) * 3 + LEVELS.indexOf(result?.level);
}

export function buildCurrentAssessment(assessments) {
  const sorted = [...assessments].sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
  if (!sorted.length) return null;
  const results = STANDARD_KEYS.map(key => sorted.reduce((best, assessment) => {
    const result = assessment.results?.find(item => item.standard_key === key);
    return !best || resultScore(result) > resultScore(best) ? result : best;
  }, null)).filter(Boolean);
  return { ...sorted[0], results };
}

export function preserveHighestResults(generated, current) {
  const previous = Object.fromEntries((current?.results || []).map(result => [result.standard_key, result]));
  return generated.map(result => resultScore(result) > resultScore(previous[result.standard_key]) ? result : previous[result.standard_key] || result);
}

export function hasPositionGrowth(results, current) {
  const previous = Object.fromEntries((current?.results || []).map(result => [result.standard_key, result]));
  return !current || results.some(result => resultScore(result) > resultScore(previous[result.standard_key]));
}

export function standardGrowthPoints(assessments, standardKey) {
  let highest = -1;
  const points = [...assessments].sort((a, b) => new Date(a.generated_at) - new Date(b.generated_at)).flatMap(assessment => {
    const result = assessment.results?.find(item => item.standard_key === standardKey);
    const score = resultScore(result);
    if (score <= highest) return [];
    highest = score;
    return [{ date: new Date(assessment.generated_at).toLocaleDateString(), score, level: `${result.assessed_grade_band} ${result.level}`, kind: 'Advanced' }];
  });
  const latestCheck = [...assessments].sort((a, b) => new Date(b.last_checked_at || b.generated_at) - new Date(a.last_checked_at || a.generated_at))[0];
  const checkedAt = latestCheck?.last_checked_at || latestCheck?.generated_at;
  if (points.length && checkedAt && new Date(checkedAt).toLocaleDateString() !== points.at(-1).date) {
    points.push({ ...points.at(-1), date: new Date(checkedAt).toLocaleDateString(), kind: 'Checked' });
  }
  return points;
}