import { adjustedAssignmentDueDate, isAssignmentAbsenceExempt } from '@/lib/assignmentDeadline';
import { isAssignmentReleased } from '@/lib/assignmentRelease';
import { chicagoToday } from '@/lib/weeklyGoals';
import { isCurrentNineWeeksAssignment } from '@/lib/gradingPeriods';

const AUTOMATIC_MISSING_NOTES = new Set([
  'Missing at the end of the accommodated due date',
]);

export function missingAssignmentCount(student, assignments, grades, responses, schoolYear, now = Date.now()) {
  if (!student?.id) return 0;
  const today = chicagoToday();
  const joined = student.created_date?.slice(0, 10);
  return assignments.filter(assignment => {
    if (!isCurrentNineWeeksAssignment(assignment) || assignment.school_year !== schoolYear || assignment.is_active === false || !assignment.due_date) return false;
    if (assignment.assignment_type === 'project_work' || /^(Weekly Goal|Goal Reflection|Student Standards)/.test(assignment.title) || !isAssignmentReleased(assignment, student.class_period, now)) return false;
    const due = String(adjustedAssignmentDueDate(assignment.due_date, student)).slice(0, 10);
    if (due > today || (joined && assignment.due_date < joined) || isAssignmentAbsenceExempt(assignment.due_date, student)) return false;
    if (responses.some(response => response.assignment_id === assignment.id && response.student_id === student.id)) return false;
    const grade = grades.find(item => item.assignment_id === assignment.id && item.student_id === student.id);
    if (grade?.excused) return false;
    return !grade || AUTOMATIC_MISSING_NOTES.has(grade.teacher_note);
  }).length;
}

export function uncompletedAssignmentCount(student, assignments, grades, responses, schoolYear, now = Date.now()) {
  if (!student?.id) return 0;
  return assignments.filter(assignment => {
    if (!isCurrentNineWeeksAssignment(assignment) || assignment.school_year !== schoolYear || assignment.is_active === false) return false;
    if (assignment.assignment_type === 'project_work' || /^(Weekly Goal|Goal Reflection|Student Standards)/.test(assignment.title) || !isAssignmentReleased(assignment, student.class_period, now)) return false;
    if (!assignment.due_date || isAssignmentAbsenceExempt(assignment.due_date, student)) return false;
    if (responses.some(response => response.assignment_id === assignment.id && response.student_id === student.id)) return false;
    const grade = grades.find(item => item.assignment_id === assignment.id && item.student_id === student.id);
    if (grade?.excused) return false;
    return true;
  }).length;
}