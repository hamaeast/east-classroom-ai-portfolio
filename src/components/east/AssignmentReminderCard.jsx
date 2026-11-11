export default function AssignmentReminderCard({ reminder, showStudent = false }) {
  return <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-foreground">{reminder.message_type === 'late_deduction' ? 'Late assignment adjustment' : 'Missing reading assignment'}</p>
      <time className="text-xs text-muted-foreground">{new Date(reminder.zero_recorded_at).toLocaleString()}</time>
    </div>
    {showStudent && <p className="mt-1 text-xs font-semibold text-muted-foreground">{reminder.student_name}</p>}
    <p className="mt-1 text-sm text-foreground">{reminder.message}</p>
  </div>;
}