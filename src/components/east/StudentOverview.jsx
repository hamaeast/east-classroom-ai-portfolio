import { Link } from 'react-router-dom';
import QuickPanel from './QuickPanel';
import StatusBadge from './StatusBadge';

export default function StudentOverview({ projects, partners }) {
  const activeProjects = projects.filter(p => p.status === 'active');
  const activePartners = partners.filter(p => p.status === 'active');
  return <div className="mt-6 grid gap-6 xl:grid-cols-2">
    <QuickPanel title="Active Projects">
      {!activeProjects.length ? <p className="text-sm text-slate-500">No active projects yet.</p> : <div className="space-y-3">{activeProjects.map(p => <div key={p.id} className="flex items-center justify-between border-b py-2 last:border-0"><div><p className="text-sm font-medium">{p.title}</p><p className="text-xs text-slate-500">{p.student_names}</p></div><StatusBadge status={p.status} /></div>)}</div>}
    </QuickPanel>
    <QuickPanel title={<Link to="/partners" className="hover:underline">Community Partners</Link>}>
      {!activePartners.length ? <p className="text-sm text-slate-500">No active community partners yet.</p> : <div className="space-y-2">{activePartners.map(p => <Link key={p.id} to="/partners" className="block border-b py-2 last:border-0 text-sm hover:bg-slate-50"><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.organization_type || '—'}</p></Link>)}</div>}
    </QuickPanel>
  </div>;
}