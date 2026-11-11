import { isCheckInSubmissionClosed } from './checkInDeadline';

// Teacher-note prefixes that mark an AssignmentGrade as a check-in makeup tutorial.
export const MAKEUP_NOTE_PREFIX = 'Check-in makeup tutorial — half credit, AI-graded';
export const FULL_CREDIT_MAKEUP_NOTE_PREFIX = 'Check-in makeup tutorial — full credit, AI-graded';
export const MAKEUP_HALF_MAX_POINTS = 5;
export const MAKEUP_FULL_MAX_POINTS = 10;
// Back-compat: the half-credit cap most students earn.
export const MAKEUP_MAX_POINTS = MAKEUP_HALF_MAX_POINTS;

// Full-credit makeups are granted per student by a teacher: an active
// NineWeeksUnlock with full_credit_makeup=true (created from the Grades page
// "Closed-period makeup window" panel). Everyone else earns the half-credit cap.
// (The production copy identified one student by email here; the public copy
// generalizes that one-off exception into this teacher-controlled flag.)
export function hasActiveFullCreditUnlock(unlocks, studentId, now = new Date()) {
  return Boolean(studentId) && (unlocks || []).some(item => item.student_id === studentId
    && item.full_credit_makeup === true
    && item.unlocked_until && new Date(item.unlocked_until) > now);
}

export function isFullCreditMakeupStudent(student, unlocks = []) {
  return hasActiveFullCreditUnlock(unlocks, student?.id);
}

export function makeupMaxPoints(student, unlocks = []) {
  return isFullCreditMakeupStudent(student, unlocks) ? MAKEUP_FULL_MAX_POINTS : MAKEUP_HALF_MAX_POINTS;
}

export function isMakeupGrade(grade) {
  const note = String(grade?.teacher_note || '');
  return note.startsWith(MAKEUP_NOTE_PREFIX) || note.startsWith(FULL_CREDIT_MAKEUP_NOTE_PREFIX);
}

export function isFullCreditMakeup(grade) {
  return Boolean(grade && String(grade.teacher_note || '').startsWith(FULL_CREDIT_MAKEUP_NOTE_PREFIX));
}

// A week is fulfilled by a makeup when a graded (non-zero) makeup override is on file.
export function hasMakeupGrade(grades, studentId, weeklyAssignmentId) {
  return grades.some(grade => grade.student_id === studentId
    && grade.assignment_id === weeklyAssignmentId
    && grade.status === 'graded'
    && !grade.excused
    && Number(grade.points) > 0
    && isMakeupGrade(grade));
}

// Closed missing weeks: missing weeks whose regular submission window has passed.
export function closedMissingWeeks(missingWeeks, student) {
  return (missingWeeks || []).filter(week => isCheckInSubmissionClosed(week, student));
}