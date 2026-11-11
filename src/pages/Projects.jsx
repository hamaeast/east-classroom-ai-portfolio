import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import StatusBadge from '@/components/east/StatusBadge';
import { namesForTaggedEmails } from '@/lib/resolveUserName';
import useResolvedNames from '@/hooks/useResolvedNames';

export default function Projects() {
  const { items, loading, reload } = useEntityList('Project');
  const { items: pitches } = useEntityList('ProjectPitch');
  const resolvedNames = useResolvedNames(pitches.flatMap(p => (p.tagged_emails || '').split(',')));
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';

  const toggleActive = async (x) => {
    await base44.entities.Project.update(x.id, { status: x.status === 'inactive' ? 'active' : 'inactive' });
    reload();
  };

  const renderCard = (x) => {
    const pitch = pitches.find(p => p.id === x.project_pitch_id);
    return <article key={x.id} className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex justify-between gap-4">
        <div><h3 className="font-semibold">{x.title}</h3><p className="mt-1 text-sm text-slate-500">{x.student_names}</p></div>
        <div className="flex items-center gap-2"><StatusBadge status={x.status} />{isAdmin && <button onClick={() => toggleActive(x)} className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">{x.status === 'inactive' ? 'Reactivate' : 'Deactivate'}</button>}</div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-cyan-600" style={{ width: `${x.progress || 0}%` }} /></div>
      <div className="mt-3 flex justify-between text-xs text-slate-500"><span>{x.progress || 0}% complete</span><span>Tech: {x.technology_tools || 'Not listed'}</span></div>
      {pitch ? <div className="mt-4 grid gap-2 border-t pt-3 text-sm">
        <p><b>Problem:</b> {pitch.problem}</p>
        <p><b>Solution:</b> {pitch.solution}</p>
        <p><b>Technology:</b> {pitch.technology_use}</p>
        <p><b>Client/Partner:</b> {pitch.client_partner_name || 'None'}</p>
        <p className="text-xs text-slate-500">Submitted by {pitch.student_names} · Tagged: {namesForTaggedEmails(pitch.tagged_emails, resolvedNames) || '—'} · Submitted {new Date(pitch.created_date).toLocaleString()}</p>
      </div> : <p className="mt-4 border-t pt-3 text-xs text-slate-400">No pitch details linked to this project.</p>}
    </article>;
  };

  const activeItems = items.filter(x => x.status !== 'inactive');
  const inactiveItems = items.filter(x => x.status === 'inactive');

  return <><PageHeader title="Approved Projects" description="Projects are created automatically once a student's project pitch is approved — showing the full pitch behind each one." />
    {loading ? <p>Loading…</p> : !items.length ? <EmptyState>Approved project pitches will appear here.</EmptyState> : <div className="grid gap-4 lg:grid-cols-2">{activeItems.map(renderCard)}</div>}
    {isAdmin && !loading && inactiveItems.length > 0 && <div className="mt-8">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Deactivated Projects</h3>
      <div className="grid gap-4 lg:grid-cols-2">{inactiveItems.map(renderCard)}</div>
    </div>}
  </>;
}