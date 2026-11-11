import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import useEntityList from '@/hooks/useEntityList';
import { namesForTaggedEmails } from '@/lib/resolveUserName';
import useResolvedNames from '@/hooks/useResolvedNames';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import StatusBadge from '@/components/east/StatusBadge';

export default function ProjectSnapshot() {
  const { id } = useParams();
  // Reuse the same cached lists every other tab already warms/shares — instant on repeat visits
  // instead of this page always making its own fresh network round trip.
  const { items: pitches, loading: pitchesLoading } = useEntityList('ProjectPitch');
  const { items: checks, loading: checksLoading } = useEntityList('WeeklyCheckIn');
  const pitch = pitches.find(p => p.id === id) || null;
  const tagged = checks.filter(c => c.project_pitch_id === id).sort((a, b) => new Date(a.week_ending) - new Date(b.week_ending));
  const loading = pitchesLoading || checksLoading;
  const resolvedNames = useResolvedNames((pitch?.tagged_emails || '').split(','));

  if (loading) return <p>Loading…</p>;
  if (!pitch) return <EmptyState>Project not found.</EmptyState>;

  return <>
    <div className="mb-4 flex items-center justify-between print:hidden">
      <Link to="/my-projects" className="flex items-center gap-1 text-sm font-semibold text-cyan-700"><ArrowLeft size={16} />Back to my projects</Link>
      <button onClick={() => window.print()} className="east-button"><Printer size={16} />Print snapshot</button>
    </div>
    <PageHeader title={pitch.project_title} description="Project snapshot — pitch details and every check-in submitted, in order." action={<StatusBadge status={pitch.approval_status || 'pending'} />} />
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs text-slate-500">Submitted by {pitch.student_names} · Tagged: {namesForTaggedEmails(pitch.tagged_emails, resolvedNames)} · Submitted {new Date(pitch.created_date).toLocaleString()}</p>
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <p><b>Problem:</b> {pitch.problem}</p>
        <p><b>Solution:</b> {pitch.solution}</p>
        <p><b>Technology:</b> {pitch.technology_use}</p>
        <p><b>Client/Partner:</b> {pitch.client_partner_name || 'None'}</p>
      </div>
    </div>
    <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">Weekly check-ins ({tagged.length})</h3>
      {!tagged.length ? <p className="text-sm text-slate-500">No check-ins have been tagged to this project yet.</p> : <div className="space-y-4">
        {tagged.map(c => <div key={c.id} className="border-b pb-4 last:border-0">
          <p className="mb-1 text-xs font-semibold text-slate-500">Week ending {c.week_ending} · {c.hours} hrs {c.is_late && <span className="ml-1 font-semibold text-amber-700">(late)</span>}{c.approval_status === 'pending' && <span className="ml-1 font-semibold text-amber-700">(pending approval)</span>}{c.approval_status === 'rejected' && <span className="ml-1 font-semibold text-red-700">(rejected)</span>}</p>
          <p className="text-sm"><b>Accomplished:</b> {c.accomplishment}</p>
          <p className="text-sm"><b>Next step:</b> {c.next_step}</p>
          {c.blocker && <p className="text-sm"><b>Blocker:</b> {c.blocker}</p>}
          {c.grade != null && <p className="text-sm"><b>Grade:</b> {c.grade}/10</p>}
          {c.teacher_feedback && <p className="text-sm"><b>Teacher feedback:</b> {c.teacher_feedback}</p>}
        </div>)}
      </div>}
    </div>
  </>;
}