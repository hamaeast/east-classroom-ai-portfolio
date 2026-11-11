export default function AssignmentHistoryEntry({ assignment, grade }) {
  const status = grade.excused ? 'Excused' : grade.status === 'pending_review' ? 'Pending review' : grade.is_late ? 'Graded late' : 'Graded';
  const points = grade.excused ? '—' : String(grade.points ?? 0) + '/' + assignment.max_points;
  return <article className="student-history-entry border-b pb-3 last:border-0">
    <div className="grid gap-2 text-sm sm:grid-cols-3"><p className="font-semibold">{assignment.title}</p><p><b>Status:</b> {status}</p><p><b>Grade:</b> {points}</p></div>
  </article>;
}