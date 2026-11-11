import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { toast } from '@/components/ui/use-toast';
import ProjectWorkIncidentDialog from './ProjectWorkIncidentDialog';
import { projectWorkScore, weeklyIncidentCount, projectWorkWeekStart, PROJECT_WORK_MAX } from '@/lib/projectWork';

export default function ProjectWorkTracker({ users = [] }) {
  const { items: incidents, loading: incidentsLoading, reload } = useEntityList('ProjectWorkIncident');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const weekStart = projectWorkWeekStart();
  const normalized = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!normalized) return [];
    return users
      .filter(u => u.role !== 'admin' && !u.is_archived)
      .filter(u => `${u.full_name || ''} ${u.email || ''}`.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [users, normalized]);

  const toggle = id => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const markOffTask = async () => {
    if (!selected.size) return;
    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await base44.functions.invoke('recordOffTaskIncident', { student_ids: [...selected], note });
      const summary = data.results.map(r => `${r.student_name}: ${r.week_score}/${PROJECT_WORK_MAX}${r.deducted ? '' : ' (cap)'}`).join(' · ');
      toast({ title: `${data.results.length} off-task mark${data.results.length > 1 ? 's' : ''} recorded`, description: summary });
      setResult(data);
      setSelected(new Set());
      setNote('');
      reload();
    } catch (error) {
      toast({ title: 'Could not record mark', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="glass-panel mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-neon-magenta">Project Work</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Mark students off task</h3>
          <p className="mt-1 text-sm text-muted-foreground">Week of {weekStart} · each student starts at {PROJECT_WORK_MAX} points; one point per mark, max {PROJECT_WORK_MAX} deductions/week.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input value={query} onChange={e => { setQuery(e.target.value); setSelected(new Set()); setResult(null); }} placeholder="Type a student name to search…" className="min-h-11" />
      </div>

      {normalized && !matches.length && !incidentsLoading && (
        <p className="mt-3 text-sm text-muted-foreground">No students match "{query}".</p>
      )}

      {matches.length > 0 && (
        <ul className="mt-4 space-y-2">
          {matches.map(u => {
            const score = projectWorkScore(u.id, incidents, weekStart);
            const count = weeklyIncidentCount(u.id, incidents, weekStart);
            const checked = selected.has(u.id);
            return (
              <li key={u.id}>
                <div className={`flex cursor-pointer items-center justify-between gap-3 border px-3 py-2 transition ${checked ? 'border-mission-cyan bg-mission-cyan/10' : 'border-border/60 hover:border-mission-cyan/60'}`} onClick={() => toggle(u.id)}>
                  <span className="flex items-center gap-3">
                    <input type="checkbox" checked={checked} onChange={() => toggle(u.id)} className="w-auto" />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{u.full_name || u.email}</span>
                      <span className="block text-xs text-muted-foreground">Period {u.class_period || '—'} · {u.email}</span>
                    </span>
                  </span>
                  <span className="text-right text-xs">
                    <ProjectWorkIncidentDialog studentId={u.id} studentName={u.full_name || u.email} incidents={incidents}
                      trigger={<button type="button" onClick={e => e.stopPropagation()} className="font-semibold text-mission-cyan transition hover:underline" title="View off-task marks">
                        {score}/{PROJECT_WORK_MAX}
                      </button>} />
                    <span className="block text-muted-foreground">{count} mark{count === 1 ? '' : 's'} this week</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4">
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note about the off-task behavior…" rows={2} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={markOffTask} disabled={!selected.size || submitting} className="east-button">
          {submitting ? 'Recording…' : `Mark off task${selected.size > 1 ? ` (${selected.size})` : ''}`}
        </button>
        {selected.size > 0 && <span className="text-xs text-muted-foreground">{selected.size} selected · one point deducted from each (to a minimum of 0)</span>}
      </div>

      {result && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">Recorded · week of {result.week_start}</p>
          <ul className="mt-2 space-y-1 text-sm text-card-foreground">
            {result.results.map(r => (
              <li key={r.student_id}>{r.student_name}: {r.week_score}/{PROJECT_WORK_MAX}{r.deducted ? '' : ' · weekly cap reached, recorded only'}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}