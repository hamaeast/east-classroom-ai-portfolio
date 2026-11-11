import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import useEntityList from '@/hooks/useEntityList';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import TaskRequestForm from '@/components/east/TaskRequestForm';
import TaskRequestCard from '@/components/east/TaskRequestCard';
import TaskPeriodGroup from '@/components/east/TaskPeriodGroup';
import AdminTaskForm from '@/components/east/AdminTaskForm';
import TaskEditForm from '@/components/east/TaskEditForm';
import AdminTaskViewToggle from '@/components/east/AdminTaskViewToggle';

const periods = [1, 2, 3, 4, 5, 6, 7, null];
export default function Tasks() {
  const { user: me } = useAuth();
  const { items, loading, reload } = useEntityList('TaskRequest');
  const [busyId, setBusyId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [adminView, setAdminView] = useState('new');
  const isAdmin = me?.role === 'admin';
  const tasks = items.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const visibleTasks = isAdmin ? tasks.filter(task => adminView === 'completed' ? task.status === 'completed' : task.status !== 'completed') : tasks;
  const canManageTask = task => task.created_by_id === me?.id && !task.assigned_student_id && !(task.assigned_student_ids || []).length;
  const setStatus = async (task, status) => {
    setBusyId(task.id);
    await base44.entities.TaskRequest.update(task.id, { status, completed_date: status === 'completed' ? new Date().toISOString() : undefined });
    setBusyId(''); reload();
  };
  const deleteTask = async task => {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    setBusyId(task.id);
    await base44.entities.TaskRequest.delete(task.id);
    setBusyId(''); reload();
  };
  return <><PageHeader eyebrow={isAdmin ? 'Facilitator console' : 'Student workspace'} title={isAdmin ? 'Student Tasks' : 'My Tasks'} description={isAdmin ? 'Review student requests by class period, agree or decline, and mark accepted tasks complete.' : 'Send a task to your teacher and follow its status.'} />
    {isAdmin && <AdminTaskViewToggle value={adminView} onChange={setAdminView} />}
    {!isAdmin && <TaskRequestForm me={me} reload={reload} />}
    {loading ? <p className="text-muted-foreground">Loading…</p> : !visibleTasks.length ? <EmptyState>{isAdmin ? `No ${adminView} tasks.` : 'You have not sent any tasks yet.'}</EmptyState> : isAdmin
      ? <div className="space-y-8">{periods.map(period => <TaskPeriodGroup key={period || 'none'} period={period} tasks={visibleTasks.filter(t => period ? Number(t.class_period) === period : !t.class_period)} onStatus={setStatus} busyId={busyId} />)}</div>
      : <div className="space-y-3">{tasks.map(task => editingId === task.id
        ? <TaskEditForm key={task.id} task={task} onCancel={() => setEditingId('')} onSaved={() => { setEditingId(''); reload(); }} />
        : <TaskRequestCard key={task.id} task={task} onEdit={() => setEditingId(task.id)} canEdit={canManageTask(task)} onDelete={canManageTask(task) ? deleteTask : undefined} busy={busyId === task.id} />)}</div>}
    {isAdmin && <AdminTaskForm me={me} reload={reload} />}
  </>;
}