import QuickPanel from './QuickPanel';
import { isCurrentNineWeeksAssignment } from '@/lib/gradingPeriods';
import { adjustedAssignmentDueDate, isAssignmentAbsenceExempt } from '@/lib/assignmentDeadline';

export default function MissingAssignmentsReport({ student, assignments, grades, responses, today }) {
  const missing = assignments.filter(assignment => {
    if (assignment.assignment_type === 'project_work' || !isCurrentNineWeeksAssignment(assignment) || assignment.is_active === false || !assignment.due_date || isAssignmentAbsenceExempt(assignment.due_date, student) || /^(Weekly Goal|Goal Reflection|Student Standards)/.test(assignment.title)) return false;
    const dueDate = String(adjustedAssignmentDueDate(assignment.due_date, student)).slice(0, 10);
    return dueDate <= today && !grades.some(grade => grade.assignment_id === assignment.id) && !responses.some(response => response.assignment_id === assignment.id);
  }).sort((a, b) => a.due_date.localeCompare(b.due_date));

  return <QuickPanel title="Missing Assignments">
    {!missing.length ? <p className="text-sm text-muted-foreground">No overdue assignments are missing.</p> : <div className="space-y-2">{missing.map(assignment => {
      const adjusted = String(adjustedAssignmentDueDate(assignment.due_date, student)).slice(0, 10);
      return <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm last:border-0"><b>{assignment.title}</b><span className="font-semibold text-destructive">Missing · Due {adjusted}{adjusted !== assignment.due_date ? ` (originally ${assignment.due_date})` : ''}</span></div>;
    })}</div>}
  </QuickPanel>;
}