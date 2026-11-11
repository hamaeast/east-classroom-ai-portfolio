import { isInNineWeeks } from './gradingPeriods';

// Identifies the 20-point "Student Standards — Nine Weeks N" assignments an admin
// has frozen (snapshot taken). Standards assessments are never deleted, so the
// live grade for the next nine weeks keeps compounding on the same evidence.
export function frozenStandardsAssignments(assignments) {
  return (assignments || [])
    .filter(item => item.frozen_at && item.title && /^Student Standards — Nine Weeks \d$/.test(item.title))
    .map(item => ({
      ...item,
      segment: Number(item.grading_period || item.title.match(/\d/)?.[0] || 1)
    }))
    .sort((a, b) => a.segment - b.segment);
}

// The nine weeks a student's live standing should be measured against:
// the segment after the most recent freeze, or the period containing today
// when nothing has been frozen yet.
export function liveSegment(assignments, now = new Date()) {
  const frozen = frozenStandardsAssignments(assignments);
  if (frozen.length) return Math.min(4, frozen[frozen.length - 1].segment + 1);
  const today = now.toISOString().slice(0, 10);
  for (let segment = 1; segment <= 4; segment++) {
    if (isInNineWeeks(today, segment)) return segment;
  }
  return 1;
}

// A student's frozen grade for one frozen standards assignment: points out of 20,
// the matching percent, and the underlying grade record.
export function frozenGradeForStudent(assignment, grades, studentId) {
  const grade = (grades || []).find(item => item.assignment_id === assignment.id && item.student_id === studentId);
  const points = Number(grade?.points || 0);
  return { points, percent: Math.round((points / 20) * 100), grade };
}