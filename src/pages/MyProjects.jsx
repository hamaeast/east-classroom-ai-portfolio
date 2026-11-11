import { Link } from 'react-router-dom';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import StatusBadge from '@/components/east/StatusBadge';

export default function MyProjects() {
  const { items: pitches, loading } = useEntityList('ProjectPitch');
  const { user: me } = useAuth();
  const myPitches = me ? pitches.filter(p => p.created_by_id === me.id || (p.tagged_emails || '').split(',').map(e => e.trim().toLowerCase()).includes((me.email || '').toLowerCase())) : [];
  const sorted = [...myPitches].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return <><PageHeader title="My Projects" description="Every project pitch you've submitted, with its current approval status. Click a project to see its full snapshot." />
    {loading ? <p>Loading…</p> : !sorted.length ? <EmptyState>You haven't submitted any project pitches yet.</EmptyState> : <div className="space-y-3">
      {sorted.map(p => <Link key={p.id} to={`/project-snapshot/${p.id}`} className="block rounded-xl border bg-white p-5 shadow-sm transition hover:border-cyan-400 hover:shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-950">{p.project_title}</h3>
          <StatusBadge status={p.approval_status || 'pending'} />
        </div>
        <p className="mt-1 text-xs text-slate-500">Submitted {new Date(p.created_date).toLocaleDateString()}</p>
      </Link>)}
    </div>}
  </>;
}