import { base44 } from '@/api/base44Client';
import fetchAllEntityPages from '@/lib/fetchAllEntityPages';
import { STANDARD_KEYS, STANDARD_NAMES } from '@/lib/eastStandards';

const BANDS = ['K-2', '3-6', '7-8', '9-12'];
const LEVELS = ['Emerging', 'Proficient', 'Mastery'];

const dateOnly = value => String(value || '').slice(0, 10);
const inRange = (value, from, to) => { const day = dateOnly(value); return Boolean(day) && day >= from && day <= to; };
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : '0%');

export function chicagoToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Small groups are hidden so no subgroup can be traced back to a student.
export const maskCount = value => (value > 0 && value < 5 ? '<5' : String(value));

async function loadUsers() {
  const result = await base44.entities.User.list();
  return Array.isArray(result) ? result : result?.items || [];
}

export async function computeUsageStats({ from, to }) {
  const [users, allGoals, allCheckIns, allMakeups, allGrades, allStandards] = await Promise.all([
    loadUsers(),
    fetchAllEntityPages(base44.entities.WeeklyGoal),
    fetchAllEntityPages(base44.entities.WeeklyCheckIn),
    fetchAllEntityPages(base44.entities.CheckInMakeup),
    fetchAllEntityPages(base44.entities.AssignmentGrade),
    fetchAllEntityPages(base44.entities.StandardsAssessment),
  ]);

  const goals = allGoals.filter(item => inRange(item.week_start, from, to));
  const checkIns = allCheckIns.filter(item => inRange(item.week_ending, from, to));
  const makeups = allMakeups.filter(item => inRange(item.week_ending, from, to));
  const grades = allGrades.filter(item => inRange(item.created_date, from, to));
  const standards = allStandards.filter(item => inRange(item.generated_at, from, to));

  // Students
  const studentCount = users.filter(user => user.role !== 'admin' && !user.is_archived).length;
  const goalStudents = new Set(goals.filter(item => item.goal_submitted_at && item.student_id).map(item => item.student_id));
  const checkInStudents = new Set(checkIns.map(item => item.created_by_id).filter(Boolean));
  const standardsStudents = new Set(standards.map(item => item.student_id).filter(Boolean));
  const completeStudents = [...goalStudents].filter(id => checkInStudents.has(id) && standardsStudents.has(id)).length;

  // Weekly goals
  const submittedGoals = goals.filter(item => item.goal_submitted_at).length;
  const clarifiedGoals = goals.filter(item => item.ai_suggestion_used === true).length;
  const reflections = goals.filter(item => item.reflection_submitted_at).length;

  // Weekly check-ins
  const flaggedCheckIns = checkIns.filter(item => item.ai_review_flag === true).length;
  const returnedCheckIns = checkIns.filter(item => item.approval_status === 'rejected').length;
  const pendingCheckIns = checkIns.filter(item => item.grade_status === 'pending_review').length;
  const evidenceItems = checkIns.flatMap(item => item.evidence_analysis || []);
  const evidenceAccessible = evidenceItems.filter(item => item.accessible === true).length;
  const evidenceBlocked = evidenceItems.filter(item => item.accessible === false).length;

  // Makeup tutorials
  const gradedMakeups = makeups.filter(item => item.status === 'graded').length;
  const returnedMakeups = makeups.filter(item => item.status === 'returned').length;
  const makeupScores = makeups.map(item => Number(item.ai_score)).filter(value => Number.isFinite(value));
  const makeupAverage = makeupScores.length ? (makeupScores.reduce((sum, value) => sum + value, 0) / makeupScores.length).toFixed(1) : '—';

  // Assignments
  const reviewMentions = grades.filter(item => /teacher review required/i.test(`${item.teacher_note || ''} ${item.feedback || ''}`)).length;

  // Standards
  const bestPlacements = new Map();
  standards.forEach(record => (record.results || []).forEach(result => {
    const bandIndex = BANDS.indexOf(result.assessed_grade_band);
    const levelIndex = LEVELS.indexOf(result.level);
    if (bandIndex < 0 || levelIndex < 0 || !record.student_id) return;
    const key = `${record.student_id}:${result.standard_key}`;
    const rank = bandIndex * LEVELS.length + levelIndex;
    const previous = bestPlacements.get(key);
    if (!previous || rank > previous.rank) bestPlacements.set(key, { band: result.assessed_grade_band, level: result.level, rank });
  }));
  const standardRows = STANDARD_KEYS.map(key => {
    const bands = Object.fromEntries(BANDS.map(band => [band, 0]));
    const levels = Object.fromEntries(LEVELS.map(level => [level, 0]));
    [...bestPlacements.entries()].forEach(([placementKey, placement]) => {
      if (!placementKey.endsWith(`:${key}`)) return;
      bands[placement.band] += 1;
      levels[placement.level] += 1;
    });
    return { key, name: STANDARD_NAMES[key], bands, levels };
  });
  const notEnoughEvidence = standards.reduce((total, record) => total + (record.results || []).filter(result => String(result.evidence_summary || '').startsWith('Not enough dashboard evidence yet')).length, 0);

  return {
    from,
    to,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        id: 'students', title: 'Students',
        note: 'Non-admin accounts. The second number counts students with a submitted goal, a check-in, and a standards assessment in this range.',
        rows: [
          { label: 'Non-admin users', value: String(studentCount) },
          { label: 'Students with a submitted goal, a check-in, and a standards assessment', value: String(completeStudents) },
        ],
      },
      {
        id: 'goals', title: 'Weekly goals',
        note: 'Filtered by the week each goal belongs to.',
        rows: [
          { label: 'Goals submitted', value: String(submittedGoals) },
          { label: 'Goals that received one AI clarification', value: `${clarifiedGoals} (${pct(clarifiedGoals, submittedGoals)} of submitted goals)` },
          { label: 'Reflections submitted', value: String(reflections) },
        ],
      },
      {
        id: 'check-ins', title: 'Weekly check-ins',
        note: 'Filtered by week ending. The AI-review flag clears when a teacher marks the check-in reviewed, so that count is a minimum.',
        rows: [
          { label: 'Check-ins submitted', value: String(checkIns.length) },
          { label: 'Check-ins still flagged as submitted after two AI suggestions', value: String(flaggedCheckIns) },
          { label: 'Check-ins returned to the student', value: String(returnedCheckIns) },
          { label: 'Check-ins with a grade pending review', value: String(pendingCheckIns) },
          { label: 'Evidence items reviewed by AI', value: String(evidenceItems.length) },
          { label: 'Evidence items the AI could open', value: String(evidenceAccessible) },
          { label: 'Evidence items the AI could not open', value: String(evidenceBlocked) },
        ],
      },
      {
        id: 'makeups', title: 'Makeup tutorials',
        note: 'Filtered by week ending.',
        rows: [
          { label: 'Makeup tutorials submitted', value: String(makeups.length) },
          { label: 'Graded', value: String(gradedMakeups) },
          { label: 'Returned for revision', value: String(returnedMakeups) },
          { label: 'Average AI score', value: String(makeupAverage) },
        ],
      },
      {
        id: 'assignments', title: 'Assignments',
        note: 'Filtered by the date the grade record was created.',
        rows: [
          { label: 'Grade records', value: String(grades.length) },
          { label: 'Grades whose note says teacher review is required', value: String(reviewMentions) },
        ],
      },
      {
        id: 'standards', title: 'Standards',
        note: 'Filtered by the date each assessment was generated.',
        rows: [
          { label: 'Standards assessment records', value: String(standards.length) },
          { label: 'Students assessed', value: String(standardsStudents.size) },
          { label: 'Results saying there is not enough dashboard evidence yet', value: String(notEnoughEvidence) },
        ],
      },
    ],
    standards: { rows: standardRows, note: 'Each student’s highest placement per standard. Any group under 5 students shows as <5.' },
  };
}

export function usageStatsText(report) {
  const lines = [
    'EAST Dashboard usage stats',
    `Range: ${report.from} to ${report.to}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    'Aggregate totals only — no names, emails, IDs, or per-student rows.',
    '',
  ];
  report.sections.forEach(section => {
    lines.push(section.title.toUpperCase(), section.note);
    section.rows.forEach(row => lines.push(`- ${row.label}: ${row.value}`));
    lines.push('');
  });
  lines.push('STANDARDS — HIGHEST PLACEMENT PER STUDENT', report.standards.note);
  lines.push(['Standard', ...BANDS.map(band => `Band ${band}`), ...LEVELS].join(' | '));
  report.standards.rows.forEach(row => {
    lines.push([row.name, ...BANDS.map(band => maskCount(row.bands[band])), ...LEVELS.map(level => maskCount(row.levels[level]))].join(' | '));
  });
  return lines.join('\n');
}

export { BANDS, LEVELS };