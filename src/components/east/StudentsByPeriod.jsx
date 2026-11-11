import QuickPanel from './QuickPanel';

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function StudentsByPeriod({ users, loading }) {
  const byName = (a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email, undefined, { sensitivity: 'base' });
  const students = users.filter(u => u.role !== 'admin' && !u.is_archived).sort(byName);
  const archived = users.filter(u => u.role !== 'admin' && u.is_archived).sort(byName);
  const unassigned = students.filter(u => !u.class_period);

  return <QuickPanel title="Students by class period">
    {loading ? <p className="text-sm text-slate-500">Loading…</p> : !students.length ? <p className="text-sm text-slate-500">No students yet.</p> : <div className="space-y-4">
      {PERIODS.map(p => {
        const group = students.filter(u => u.class_period === p);
        if (!group.length) return null;
        return <div key={p}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Period {p} ({group.length})</p>
          <div className="flex flex-wrap gap-2">{group.map(u => <span key={u.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{u.full_name || u.email}{u.grade ? ` · Gr. ${u.grade}` : ''}</span>)}</div>
        </div>;
      })}
      {unassigned.length > 0 && <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Unassigned ({unassigned.length})</p>
        <div className="flex flex-wrap gap-2">{unassigned.map(u => <span key={u.id} className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">{u.full_name || u.email}</span>)}</div>
      </div>}
      {archived.length > 0 && <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Archived ({archived.length})</p>
        <div className="flex flex-wrap gap-2">{archived.map(u => <span key={u.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">{u.full_name || u.email}</span>)}</div>
      </div>}
    </div>}
  </QuickPanel>;
}