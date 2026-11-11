import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { isCurrentNineWeeksAssignment, isCurrentNineWeeksDate } from '@/lib/gradingPeriods';

export default function LateAssignmentNotifier({ studentId }) {
  const navigate = useNavigate();
  const { items, reload, loading } = useEntityList('AssignmentReminder');
  const { items: assignments, loading: assignmentsLoading } = useEntityList('Assignment');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const unread = items.filter(item => {
    if (item.student_id !== studentId || item.message_type !== 'missing' || item.read || /^Student Standards\b/.test(item.assignment_title || '')) return false;
    const assignment = assignments.find(assignment => assignment.id === item.assignment_id);
    return assignment ? !/^Student Standards\b/.test(assignment.title) && isCurrentNineWeeksAssignment(assignment) : isCurrentNineWeeksDate(item.due_date);
  });
  if (loading || assignmentsLoading || !unread.length) return null;
  const close = async viewAssignments => {
    setSaving(true); setError('');
    try {
      await base44.entities.AssignmentReminder.bulkUpdate(unread.map(item => ({ id: item.id, read: true })));
      await reload();
      if (viewAssignments) navigate('/assignments');
    } catch { setError('The notification could not be dismissed.'); setSaving(false); }
  };
  return <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"><section className="glass-panel w-full max-w-lg p-5" role="alertdialog" aria-labelledby="late-assignment-title"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-destructive" /><div><h2 id="late-assignment-title" className="text-lg font-semibold">Late assignments need attention</h2><p className="mt-1 text-sm text-muted-foreground">Submit the following assignment{unread.length === 1 ? '' : 's'} now. Late submissions are sent to your teacher for manual review.</p></div></div><ul className="mt-4 space-y-2">{unread.map(item => <li key={item.id} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3"><p className="font-semibold">{item.assignment_title}</p><p className="text-xs text-muted-foreground">Due {item.due_date} at {item.due_time || '23:59'}</p></li>)}</ul>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}<div className="mt-5 flex justify-end gap-3"><button disabled={saving} onClick={() => close(false)} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold">Dismiss</button><button disabled={saving} onClick={() => close(true)} className="east-button">{saving ? 'Saving…' : 'View assignments'}</button></div></section></div>;
}