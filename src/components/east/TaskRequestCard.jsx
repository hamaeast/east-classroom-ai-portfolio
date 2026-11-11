import TaskLinks from '@/components/east/TaskLinks';

const labels = { pending: 'Waiting for teacher', accepted: 'Agreed', declined: 'Declined', completed: 'Completed' };
const tones = { pending: 'text-amber-300', accepted: 'text-neon-cyan', declined: 'text-neon-magenta', completed: 'text-emerald-300' };

export default function TaskRequestCard({ task, isAdmin, onStatus, onEdit, canEdit, onDelete, busy }) {
  return <article className="glass-panel rounded-xl p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-foreground">{task.title}</h3><p className="mt-1 text-xs text-muted-foreground">Sent by {task.student_name} · {new Date(task.created_date).toLocaleDateString()}{task.due_date ? ` · Due ${task.due_date}` : ''}</p></div>
      <span className={`text-xs font-bold ${tones[task.status]}`}>{labels[task.status]}</span>
    </div>
    {task.description && <p className="mt-3 text-sm text-card-foreground">{task.description}</p>}
    <TaskLinks urlText={task.link_url} description={task.link_description} />
    {isAdmin && <div className="mt-4 flex flex-wrap gap-2">
      {task.status === 'pending' && <><button disabled={busy} onClick={() => onStatus(task, 'accepted')} className="east-button">Agree</button><button disabled={busy} onClick={() => onStatus(task, 'declined')} className="rounded-lg border border-neon-magenta px-4 text-sm font-semibold text-neon-magenta">Decline</button></>}
      {task.status === 'accepted' && <button disabled={busy} onClick={() => onStatus(task, 'completed')} className="east-button">Complete</button>}
    </div>}
    {!isAdmin && <div className="mt-4 flex flex-wrap gap-2">
      {canEdit && <button disabled={busy} onClick={onEdit} className="east-button">Edit task</button>}
      {onDelete && <button disabled={busy} onClick={() => onDelete(task)} className="rounded-lg border border-neon-magenta px-4 py-2 text-sm font-semibold text-neon-magenta">Delete task</button>}
    </div>}
  </article>;
}