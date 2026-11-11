import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import QuickPanel from './QuickPanel';
import StudentRosterFields from './StudentRosterFields';

export default function ClassPeriodManager({ users, loading, reload }) {
  const byFirstName = (a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email, undefined, { sensitivity: 'base' });
  const students = users.filter(u => u.role !== 'admin').sort(byFirstName);
  const activeStudents = students.filter(u => !u.is_archived);
  const archivedStudents = students.filter(u => u.is_archived);
  const [savingId, setSavingId] = useState(null);

  const updateStudent = async (user, data) => {
    setSavingId(user.id);
    await base44.entities.User.update(user.id, data);
    await reload();
    setSavingId(null);
  };
  const changeRole = async (user, value) => {
    setSavingId(user.id);
    await base44.entities.User.update(user.id, { role: value });
    await reload();
    setSavingId(null);
  };
  const toggleArchived = async (user) => {
    setSavingId(user.id);
    await base44.entities.User.update(user.id, { is_archived: !user.is_archived });
    await reload();
    setSavingId(null);
  };
  const deleteStudent = async (user) => {
    const ok = window.confirm(`Delete ${user.full_name || user.email} for sure? This permanently deletes their account and all their check-ins, project pitches, service entries, and skills. This cannot be undone.`);
    if (!ok) return;
    setSavingId(user.id);
    await Promise.all([
      base44.entities.WeeklyCheckIn.deleteMany({ created_by_id: user.id }),
      base44.entities.ProjectPitch.deleteMany({ created_by_id: user.id }),
      base44.entities.ServiceEntry.deleteMany({ created_by_id: user.id }),
      base44.entities.StudentSkill.deleteMany({ created_by_id: user.id }),
      base44.entities.Comment.deleteMany({ created_by_id: user.id }),
    ]);
    await base44.entities.User.delete(user.id);
    await reload();
    setSavingId(null);
  };

  const row = (u) => <div key={u.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0 text-sm">
    <div><p className="font-medium">{u.full_name || u.email}</p><p className="text-xs text-slate-500">{u.email}</p></div>
    <div className="flex items-center gap-2">
      <StudentRosterFields student={u} disabled={savingId === u.id} onUpdate={updateStudent} />
      <select disabled={savingId === u.id} value={u.role || 'user'} onChange={e => changeRole(u, e.target.value)} className="w-auto min-h-9">
        <option value="user">Student</option>
        <option value="admin">Admin</option>
      </select>
      <button disabled={savingId === u.id} onClick={() => toggleArchived(u)} className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">{u.is_archived ? 'Unarchive' : 'Archive'}</button>
      <button disabled={savingId === u.id} onClick={() => deleteStudent(u)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
    </div>
  </div>;

  return <QuickPanel title="Class periods & access">
    {loading ? <p className="text-sm text-slate-500">Loading students…</p> : !students.length ? <p className="text-sm text-slate-500">No students yet.</p> : <>
      <div className="max-h-80 space-y-2 overflow-y-auto">{activeStudents.map(row)}</div>
      {archivedStudents.length > 0 && <div className="mt-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Archived ({archivedStudents.length}) — their dashboard & report data is unaffected</p>
        <div className="max-h-64 space-y-2 overflow-y-auto opacity-70">{archivedStudents.map(row)}</div>
      </div>}
    </>}
  </QuickPanel>;
}