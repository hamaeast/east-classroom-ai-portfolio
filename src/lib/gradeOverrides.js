// A teacher's full-credit override satisfies a missing weekly requirement without
// inventing a student submission. Other grades still follow the submission rules.
export function hasFullCreditOverride(grades, studentId, assignmentId, maxPoints = 10) {
  return grades.some(grade => grade.student_id === studentId && grade.assignment_id === assignmentId && grade.status === 'graded' && !grade.excused && grade.teacher_note?.startsWith('Manual full-credit override for week of ') && Number(grade.points) >= maxPoints);
}