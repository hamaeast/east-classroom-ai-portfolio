import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import EditableGradeCell from './EditableGradeCell';
import CheckInDateEditor from './CheckInDateEditor';

export default function PendingGradeReviewSummary({ assignmentGrades, weeklyRows, assignments, students, allGrades, reloadGrades, reloadCheckIns }) {
  const [open, setOpen] = useState(false);
  const total = assignmentGrades.length + weeklyRows.length;
  const studentFor = id => students.find(item => item.id === id);

  const editor = (column, student, points, excused = false) => <EditableGradeCell column={column} student={student} cell={{ points, required: true, excused }} weeklyRows={weeklyRows} grades={allGrades} reloadGrades={reloadGrades} reloadCheckIns={reloadCheckIns} />;

  return <section className={`mb-5 rounded-lg border p-4 ${total ? 'border-primary/60 bg-primary/10' : 'border-success/50 bg-success/10'}`}>
    <button type="button" disabled={!total} onClick={() => setOpen(value => !value)} className="flex w-full items-start gap-3 text-left">
      {total ? <AlertCircle className="mt-0.5 shrink-0 text-primary" size={20} /> : <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={20} />}
      <div className="flex-1"><h3 className="font-semibold">{total ? `${total} grade${total === 1 ? '' : 's'} need manual review` : 'No grades need manual review'}</h3>{total > 0 && <p className="mt-1 text-sm text-muted-foreground">{assignmentGrades.length} assignment grade{assignmentGrades.length === 1 ? '' : 's'} · {weeklyRows.length} weekly check-in{weeklyRows.length === 1 ? '' : 's'} · Click to review</p>}</div>
      {total > 0 && <ChevronDown size={18} className={`mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />}
    </button>
    {open && <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
      {assignmentGrades.map(grade => {
        const assignment = assignments.find(item => item.id === grade.assignment_id);
        const student = studentFor(grade.student_id);
        if (!assignment || !student) return null;
        const column = { type: 'custom', id: assignment.id, label: assignment.title, max: Number(assignment.max_points), dueDate: assignment.due_date, dueTime: assignment.due_time || '23:59' };
        return <div key={grade.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"><div><p className="text-sm font-semibold">{student.display_name || student.full_name || student.email} · {assignment.title}</p><p className="text-xs text-muted-foreground">{grade.teacher_note || (grade.is_late ? 'Late submission needs a final score' : 'Assignment score needs review')}</p></div>{editor(column, student, Number(grade.points || 0), grade.excused)}</div>;
      })}
      {weeklyRows.map(row => {
        const student = studentFor(row.studentId);
        if (!student) return null;
        const column = { type: 'weekly', key: `weekly-${row.weekEnding}`, weekEnding: row.weekEnding, label: `Check-in ${row.weekEnding}`, max: 10 };
        return <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"><div><p className="text-sm font-semibold">{row.studentName} · Check-in {row.weekEnding}</p><p className="text-xs text-muted-foreground">{row.reviewReason || 'Weekly check-in needs review'}</p></div><CheckInDateEditor checkIn={row.source} onSaved={reloadCheckIns} />{editor(column, student, Number(row.points ?? row.suggestedPoints ?? 0))}</div>;
      })}
    </div>}
  </section>;
}