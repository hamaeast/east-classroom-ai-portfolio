import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { scanRecordFollowUp } from '@/lib/facilitationAnalysis';
import { STATUS_LABELS } from '@/lib/facilitationConstants';

export default function FollowUpReview({ record, sources, onSaved }) {
  const [scanning, setScanning] = useState(false), [status, setStatus] = useState(record.status), [note, setNote] = useState(''), [message, setMessage] = useState('');
  const pending = record.pending_follow_up || [];
  const rescan = async () => { setScanning(true); setMessage(''); try { const evidence = await scanRecordFollowUp(record, sources); await base44.entities.FacilitationRecord.update(record.id, { pending_follow_up: evidence, last_follow_up_scan_at: new Date().toISOString() }); setMessage(evidence.length ? 'New information is ready for review.' : 'No strong new follow-up information was found.'); onSaved(); } catch { setMessage('The review could not be completed. Please try again.'); } finally { setScanning(false); } };
  const decideEvidence = async (item, accept) => {
    const remaining = pending.filter(candidate => candidate.source_id !== item.source_id);
    const changes = accept ? { pending_follow_up: remaining, follow_up_evidence: [...(record.follow_up_evidence || []), item] } : { pending_follow_up: remaining, dismissed_source_ids: [...(record.dismissed_source_ids || []), item.source_id] };
    await base44.entities.FacilitationRecord.update(record.id, changes); onSaved();
  };
  const saveAssessment = async () => { const now = new Date().toISOString(); await base44.entities.FacilitationRecord.update(record.id, { status, outcome_note: note.trim(), follow_up_review_count: Number(record.follow_up_review_count || 0) + 1, status_history: [...(record.status_history || []), { date: now, status, note: note.trim() }] }); setMessage('Follow-up assessment saved.'); onSaved(); };
  return <div className="mt-5 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Follow-Up Evidence</h4><button disabled={scanning} onClick={rescan} className="rounded-lg border px-3 py-2 text-sm font-semibold">{scanning ? 'Reviewing…' : 'Rescan Follow-Up Evidence'}</button></div>{message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    {pending.map(item => <div key={item.source_id} className="mt-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm"><p className="font-semibold">New Information Available · {item.date}</p><p className="mt-1">{item.source}: {item.summary}</p><p className="mt-1 text-muted-foreground">{item.relevance_note}</p><div className="mt-2 flex gap-2"><button onClick={() => decideEvidence(item, true)} className="east-button">Accept &amp; attach</button><button onClick={() => decideEvidence(item, false)} className="rounded-lg border px-3 text-xs font-semibold">Dismiss</button></div></div>)}
    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select value={status} onChange={event => setStatus(event.target.value)}>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{key === 'monitoring' ? 'Continue Monitoring' : label}</option>)}</select><input value={note} onChange={event => setNote(event.target.value)} placeholder="Optional concise assessment note" /><button onClick={saveAssessment} className="east-button">Save assessment</button></div>
  </div>;
}