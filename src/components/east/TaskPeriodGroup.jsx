import TaskRequestCard from './TaskRequestCard';

export default function TaskPeriodGroup({ period, tasks, onStatus, busyId }) {
  if (!tasks.length) return null;
  return <section>
    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-neon-cyan">{period ? `Class period ${period}` : 'No class period'}</h2>
    <div className="space-y-3">{tasks.map(task => <TaskRequestCard key={task.id} task={task} isAdmin onStatus={onStatus} busy={busyId === task.id} />)}</div>
  </section>;
}