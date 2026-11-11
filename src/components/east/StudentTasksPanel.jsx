import { Link } from 'react-router-dom';
import QuickPanel from './QuickPanel';

const labels = { pending: 'Waiting for teacher', accepted: 'Agreed', declined: 'Declined', completed: 'Completed' };

export default function StudentTasksPanel({ tasks }) {
  const active = tasks.filter(task => task.status !== 'declined' && task.status !== 'completed');
  return <div className="mt-6"><QuickPanel title={<Link to="/tasks" className="hover:underline">My Tasks</Link>}>
    {!active.length ? <p className="text-sm text-muted-foreground">No active tasks.</p> : <div className="space-y-2">{active.map(task => <Link key={task.id} to="/tasks" className="flex items-start justify-between gap-3 border-b py-2 text-sm last:border-0">
      <div><p className="font-medium">{task.title}</p>{task.due_date && <p className="text-xs text-muted-foreground">Due {task.due_date}</p>}</div>
      <span className="text-xs font-semibold text-neon-cyan">{labels[task.status]}</span>
    </Link>)}</div>}
  </QuickPanel></div>;
}