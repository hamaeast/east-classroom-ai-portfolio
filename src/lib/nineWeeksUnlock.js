import { NINE_WEEK_PERIODS, isNineWeeksClosed } from './gradingPeriods';
import { isCheckInSubmissionClosed } from './checkInDeadline';

// Returns the active unlock record for a student + date's nine-weeks period, or null.
// An unlock is active only when unlocked_until is still in the future.
export function activeUnlockForDate(unlocks, studentId, date) {
  if (!date || !studentId || !Array.isArray(unlocks)) return null;
  const period = NINE_WEEK_PERIODS.find(item => date >= item.start && date <= item.end);
  if (!period) return null;
  const now = new Date();
  return unlocks.find(item => item.student_id === studentId && Number(item.nine_weeks) === period.number && item.unlocked_until && new Date(item.unlocked_until) > now) || null;
}

// Closed grading periods cannot be reopened by a legacy rescue window.
export function isNineWeeksClosedForStudent(date, studentId, unlocks = []) {
  return isNineWeeksClosed(date);
}

// Missing check-in weeks that are eligible for the makeup tutorial route. A week
// qualifies when the regular submission window has closed OR the student has an
// active nine-weeks unlock for that week (the rescue "too-old-to-make-up" path).
export function closedMissingWeeksForStudent(missingWeeks, student, unlocks = []) {
  return (missingWeeks || []).filter(week => isCheckInSubmissionClosed(week, student) || Boolean(activeUnlockForDate(unlocks, student?.id, week)));
}

// True when an excused AssignmentGrade is on file for this student + assignment.
export function hasExcusedGrade(grades, studentId, assignmentId) {
  return Boolean(assignmentId) && Array.isArray(grades) && grades.some(grade => grade.student_id === studentId && grade.assignment_id === assignmentId && grade.excused);
}