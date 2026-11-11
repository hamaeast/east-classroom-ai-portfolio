import { isAssignmentClosed } from '@/lib/gradingPeriods';
import { assignmentReleaseDate } from '@/lib/assignmentRelease';

export default function AssignmentManagementRow({ item, onEdit, onPreview, toggle, toggleInstant }) {
  const automatic = item.assignment_type === 'project_work' || /^(Weekly Goal|Goal Reflection|Student Standards)/.test(item.title);
  const editable = !automatic && !isAssignmentClosed(item);
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-sm">
    <span>{editable ? <button type="button" onClick={() => onEdit(item)} className="text-left font-bold underline-offset-2 hover:underline">{item.title}</button> : <b>{item.title}</b>} · {item.max_points} pts {item.due_date && `· due ${item.due_date}${item.due_time ? ` at ${item.due_time}` : ''}`}{item.assignment_type === 'project_work' && ' · Live automatic grade'}{isAssignmentClosed(item) && ' · Locked'}</span>
    <div className="flex flex-wrap gap-2">{editable && <button type="button" onClick={() => onEdit(item)} className="rounded-lg border px-3 py-1 text-xs font-semibold">Edit & grading</button>}{!automatic && <button type="button" onClick={() => onPreview(item)} className="rounded-lg border px-3 py-1 text-xs font-semibold">Student view</button>}{item.assignment_type === 'reading' && assignmentReleaseDate(item) && editable && <button type="button" aria-pressed={Boolean(item.instant_release)} onClick={() => toggleInstant(item)} className="rounded-lg border px-3 py-1 text-xs font-semibold">Instant {item.instant_release ? 'on' : 'off'}</button>}{!automatic && <button type="button" onClick={() => toggle(item)} className="rounded-lg border px-3 py-1 text-xs font-semibold">{item.is_active ? 'Turn off' : 'Turn on'}</button>}</div>
  </div>;
}