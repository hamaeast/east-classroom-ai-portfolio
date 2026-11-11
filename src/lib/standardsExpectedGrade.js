import { EAST_TARGETS, STANDARD_KEYS, STANDARD_NAMES, gradeBandFor } from '@/lib/eastStandards';
import { buildCurrentAssessment } from '@/lib/standardsProgress';
import { standardsNineWeeksPercent, standardsNineWeeksPoints, standardsResultPercent } from '@/lib/standardsGrade';

const BANDS = ['K-2', '3-6', '7-8', '9-12'];
const LEVELS = ['Emerging', 'Proficient', 'Mastery'];

function nextTarget(result, enrolledBand, key) {
  const current = Math.max(0, BANDS.indexOf(result.assessed_grade_band) * 3 + LEVELS.indexOf(result.level));
  const target = BANDS.indexOf(enrolledBand) * 3 + 2;
  const next = Math.min(current + 1, target);
  const band = BANDS[Math.floor(next / 3)], level = LEVELS[next % 3];
  return EAST_TARGETS[band]?.[key]?.[level];
}

export function expectedStandardsGrade(student, assessments, segment = 1) {
  const history = assessments.filter(item => item.student_id === student.id).sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
  const assessment = buildCurrentAssessment(history);
  if (!assessment) return { assessment: null, percent: null, points: null, previousPercent: null, improvement: 0, suggestions: [] };
  const band = gradeBandFor(Number(student.grade));
  const points = standardsNineWeeksPoints(assessment, student.grade, segment);
  const percent = standardsNineWeeksPercent(assessment, student.grade, segment);
  const previousAssessment = buildCurrentAssessment(history.slice(1));
  const previousPercent = previousAssessment ? standardsNineWeeksPercent(previousAssessment, student.grade, segment) : null;
  const improvement = previousPercent == null ? 0 : Math.max(0, percent - previousPercent);
  if (percent >= 100 || !band) return { assessment, percent, points, previousPercent, improvement, suggestions: [] };
  const results = [...(assessment.results || [])].filter(result => standardsResultPercent(result, student.grade) < 100).sort((a, b) => standardsResultPercent(b, student.grade) - standardsResultPercent(a, student.grade));
  const suggestions = results.slice(0, 2).map(result => `${STANDARD_NAMES[result.standard_key]}: ${nextTarget(result, band, result.standard_key)}`);
  const used = new Set(results.map(result => result.standard_key));
  STANDARD_KEYS.filter(key => !used.has(key)).slice(0, 2 - suggestions.length).forEach(key => suggestions.push(`${STANDARD_NAMES[key]}: add clear work evidence showing “${EAST_TARGETS[band][key].Emerging}”`));
  return { assessment, percent, points, previousPercent, improvement, suggestions };
}