import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import QuickPanel from './QuickPanel';

export default function MissingStudentIds({ users, loading, reload }) {
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState('');
  const missing = users.filter(user => user.role !== 'admin' && !user.is_archived && !user.student_id)
    .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));

  const save = async student => {
    const studentId = (drafts[student.id] || '').trim();
    if (!/^\d{7}$/.test(studentId)) return;
    setSavingId(student.id);
    await base44.entities.User.update(student.id, { student_id: studentId });
    setDrafts(current => ({ ...current, [student.id]: '' }));
    await reload();
    setSavingId('');
  };

  return <QuickPanel title={`Missing student IDs${missing.length ? ` (${missing.length})` : ''}`}>
    {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : !missing.length ? <p className="text-sm text-muted-foreground">All active students have an ID.</p> : <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Complete each task by entering the student’s 7-digit eSchool ID.</p>
      {missing.map(student => <div key={student.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><p className="font-semibold">{student.full_name || student.email}</p><p className="truncate text-xs text-muted-foreground">{student.email}</p></div>
        <input type="password" autoComplete="new-password" value={drafts[student.id] || ''} onChange={event => setDrafts(current => ({ ...current, [student.id]: event.target.value.replace(/\D/g, '').slice(0, 7) }))} placeholder="Enter 7-digit ID" inputMode="numeric" aria-label={`Enter student ID for ${student.full_name || student.email}`} className="sm:w-48" />
        <button type="button" disabled={savingId === student.id || !/^\d{7}$/.test(drafts[student.id] || '')} onClick={() => save(student)} className="east-button sm:w-24">{savingId === student.id ? 'Saving…' : 'Save ID'}</button>
      </div>)}
    </div>}
  </QuickPanel>;
}