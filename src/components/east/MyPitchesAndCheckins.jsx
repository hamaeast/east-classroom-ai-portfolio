import { useState } from 'react';
import QuickPanel from './QuickPanel';

export default function MyPitchesAndCheckins({ pitches, checks, me }) {
  const [view, setView] = useState('mine');
  const myName = (me?.full_name || '').toLowerCase();
  const mySubmitted = checks.filter(c => c.created_by_id === me?.id);
  const taggedIn = checks.filter(c => c.created_by_id !== me?.id && (c.student_names || '').toLowerCase().includes(myName));
  const shown = (view === 'mine' ? mySubmitted : taggedIn).slice().sort((a, b) => new Date(b.week_ending) - new Date(a.week_ending));

  return <div className="mt-6 grid gap-6 xl:grid-cols-2">
    <QuickPanel title="My project pitches">
      {!pitches.length ? <p className="text-sm text-slate-500">You haven't submitted or been tagged on a pitch yet.</p> : <div className="space-y-3">{pitches.map(p => <div key={p.id} className="border-b pb-3 last:border-0 text-sm"><p className="font-medium">{p.project_title}</p><p className="text-xs text-slate-500">Submitted by {p.student_names} · Submitted {new Date(p.created_date).toLocaleDateString()} · <span className="font-semibold capitalize">{p.approval_status || 'pending'}</span></p></div>)}</div>}
    </QuickPanel>
    <QuickPanel title="My weekly check-ins">
      <div className="mb-3 flex gap-2 text-xs font-semibold">
        <button type="button" onClick={() => setView('mine')} className={`rounded-lg px-3 py-1.5 ${view === 'mine' ? 'bg-[#117b8a] text-white' : 'bg-slate-100 text-slate-600'}`}>Submitted by me</button>
        <button type="button" onClick={() => setView('tagged')} className={`rounded-lg px-3 py-1.5 ${view === 'tagged' ? 'bg-[#117b8a] text-white' : 'bg-slate-100 text-slate-600'}`}>Tagged in</button>
      </div>
      {!shown.length ? <p className="text-sm text-slate-500">{view === 'mine' ? "You haven't submitted a check-in yet." : "No check-ins you're tagged in yet."}</p> : <div className="max-h-64 space-y-2 overflow-y-auto">{shown.map(c => <div key={c.id} className="flex items-center justify-between border-b py-2 last:border-0 text-sm"><div><p className="font-medium">{c.project_title}</p><p className="text-xs text-slate-500">Week ending {c.week_ending} · {c.hours} hrs</p></div><span className="font-semibold">{c.grade != null ? `${c.grade}/10` : 'Pending'}</span></div>)}</div>}
    </QuickPanel>
  </div>;
}