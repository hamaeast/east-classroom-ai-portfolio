export default function CheckInHistoryEntry({ checkIn }) {
  const grade = checkIn.grade != null ? `${checkIn.grade}/10` : checkIn.grade_status === 'duplicate' ? 'Not graded (extra)' : checkIn.grade_status === 'pending_review' ? 'Pending review' : 'Not graded';
  return <article className="student-history-entry border-b pb-4 last:border-0">
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">Weekly check-in — {checkIn.project_title}</h4><p className="text-xs font-semibold">Week ending {checkIn.week_ending} · Submitted {new Date(checkIn.original_submitted_at || checkIn.created_date).toLocaleString()} · Grade: {grade}</p></div>
    <p className="mt-1 text-xs text-muted-foreground">{checkIn.student_names} · {checkIn.partner_name || 'No community partner'} · {checkIn.hours} hours · Confidence {checkIn.confidence}/5</p>
    <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
      <p><b>Accomplished:</b> {checkIn.accomplishment}</p><p><b>Next step:</b> {checkIn.next_step}</p>
      <p><b>Challenges:</b> {checkIn.blocker || 'None'}</p><p><b>Help needed:</b> {checkIn.help_needed || 'None'}</p>
      {checkIn.late_reason && <p className="md:col-span-2"><b>Late/backdate reason:</b> {checkIn.late_reason}</p>}
      {[...(checkIn.evidence_links || []), ...(checkIn.evidence_files || [])].map((evidence, index) => <p key={index} className="md:col-span-2"><b>Evidence:</b> {evidence.description || evidence.url}</p>)}
      {checkIn.teacher_feedback && <p className="md:col-span-2"><b>Teacher feedback:</b> {checkIn.teacher_feedback}</p>}
    </div>
  </article>;
}