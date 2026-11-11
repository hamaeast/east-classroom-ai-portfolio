import QuickPanel from './QuickPanel';
import { adjustedAssignmentDueDate } from '@/lib/assignmentDeadline';
import { nextInstructionDates } from '@/lib/schoolCalendar';

export default function AbsenceImpactReport({ student, assignments }) {
  const absences = student.absence_deadline_adjustments || [];
  const withoutAbsences = { ...student, absence_deadline_adjustments: [] };
  const moved = assignments.map(assignment => ({ assignment, original: adjustedAssignmentDueDate(assignment.due_date, withoutAbsences), adjusted: adjustedAssignmentDueDate(assignment.due_date, student) })).filter(item => item.original && item.adjusted !== item.original);

  return <QuickPanel title="Absences and Deadline Changes">
    {!absences.length ? <p className="text-sm text-muted-foreground">No absences are recorded for this student.</p> : <div className="space-y-2 text-sm">{absences.map(absence => <p key={absence.id}><b>{absence.start_date}</b> · {absence.days} instructional day{absence.days === 1 ? '' : 's'} ({nextInstructionDates(absence.start_date, Number(absence.days) || 1).join(', ')})</p>)}</div>}
    {moved.length > 0 && <div className="mt-3 border-t pt-3 text-sm"><p className="mb-2 font-semibold">Deadlines moved because of an absence</p>{moved.map(({ assignment, original, adjusted }) => <p key={assignment.id}>{assignment.title}: <b>{String(original).slice(0, 10)}</b> → <b>{String(adjusted).slice(0, 10)}</b></p>)}</div>}
    {absences.length > 0 && !moved.length && <p className="mt-3 text-xs text-muted-foreground">No assignment deadlines fell on the recorded absence dates.</p>}
  </QuickPanel>;
}