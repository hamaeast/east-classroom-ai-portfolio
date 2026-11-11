import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import useFacilitationData from '@/hooks/useFacilitationData';
import { scanFacilitationData } from '@/lib/facilitationAnalysis';
import { runLearningGrowthAnalysis } from '@/lib/learningGrowthAnalysis';
import PageHeader from '@/components/east/PageHeader';
import FacilitationQueue from '@/components/east/FacilitationQueue';
import ReviewItemEditor from '@/components/east/ReviewItemEditor';
import FacilitationRecordCard from '@/components/east/FacilitationRecordCard';
import LearningGrowthReport from '@/components/east/LearningGrowthReport';
import GradeReprocessButton from '@/components/east/GradeReprocessButton';

function schoolYearRange() { const now = new Date(), year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; return { from: `${year}-08-01`, to: now.toISOString().slice(0, 10) }; }

export default function FacilitationReview() {
  const { user } = useAuth(); const data = useFacilitationData();
  const [active, setActive] = useState('to_review'), [selected, setSelected] = useState(null), [scanning, setScanning] = useState(false), [growthLoading, setGrowthLoading] = useState(false), [growthReport, setGrowthReport] = useState(null), [message, setMessage] = useState('');
  const groups = useMemo(() => ({
    to_review: data.reviewItems.filter(item => item.queue_status === 'to_review' && item.concern_type !== 'positive_progress').map(item => ({ ...item, kind: 'review' })),
    response_needed: data.reviewItems.filter(item => item.queue_status === 'response_needed' && item.concern_type !== 'positive_progress').map(item => ({ ...item, kind: 'review' })),
    monitoring: [...data.reviewItems.filter(item => item.queue_status === 'monitoring' && item.concern_type !== 'positive_progress').map(item => ({ ...item, kind: 'review' })), ...data.records.filter(item => item.concern_type !== 'positive_progress' && !['resolved', 'complete'].includes(item.status) && !item.pending_follow_up?.length).map(item => ({ ...item, kind: 'record' }))],
    follow_up_ready: data.records.filter(item => item.concern_type !== 'positive_progress' && item.pending_follow_up?.length).map(item => ({ ...item, kind: 'record' })),
    positive_progress: [...data.reviewItems.filter(item => item.concern_type === 'positive_progress').map(item => ({ ...item, kind: 'review' })), ...data.records.filter(item => item.concern_type === 'positive_progress').map(item => ({ ...item, kind: 'record' }))]
  }), [data.reviewItems, data.records]);
  const scan = async () => { setScanning(true); setMessage(''); try { const items = await scanFacilitationData(data.sources, data.reviewItems, data.records); const updates = items.filter(item => item.id), additions = items.filter(item => !item.id); if (updates.length) await base44.entities.FacilitationReviewItem.bulkUpdate(updates); if (additions.length) await base44.entities.FacilitationReviewItem.bulkCreate(additions); setMessage(items.length ? `${items.length} meaningful item${items.length === 1 ? '' : 's'} added or returned for review.` : 'No new meaningful items were found.'); await data.reload(); } catch { setMessage('The current data scan could not be completed. Please try again.'); } finally { setScanning(false); } };
  const runGrowthReport = async () => { setGrowthLoading(true); setMessage(''); const range = schoolYearRange(); try { const entries = await runLearningGrowthAnalysis(data.sources, range.from, range.to); setGrowthReport({ entries, range, generated: Date.now() }); } catch { setMessage('The learning growth report could not be completed. Please try again.'); } finally { setGrowthLoading(false); } };
  const saved = async () => { setSelected(null); await data.reload(); };
  if (user?.role !== 'admin') return <p>This workspace is available to facilitators only.</p>;
  if (growthReport) return <LearningGrowthReport key={growthReport.generated} initialEntries={growthReport.entries} range={growthReport.range} onClose={() => setGrowthReport(null)} onRerun={runGrowthReport} />;
  return <><PageHeader title="Facilitation Review" description="Review concise, data-informed items a few minutes at a time. Unfinished work stays in your queue." action={<div className="flex flex-wrap items-start gap-2"><GradeReprocessButton /><button disabled={scanning || data.loading} onClick={scan} className="east-button">{scanning ? 'Scanning current data…' : 'Scan Current Data'}</button></div>} /><div className="mb-5 flex flex-wrap gap-2 print:hidden"><Link to="/facilitation-records" className="rounded-lg border px-3 py-2 text-sm font-semibold">Facilitation Records</Link><Link to="/pgp-building-goal-report" className="rounded-lg border px-3 py-2 text-sm font-semibold">PGP Building Goal Report</Link><button disabled={growthLoading || data.loading} onClick={runGrowthReport} className="rounded-lg border px-3 py-2 text-sm font-semibold">{growthLoading ? 'Building growth report…' : 'Learning Growth Report'}</button></div>{message && <p className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">{message}</p>}{selected ? selected.kind === 'record' ? <FacilitationRecordCard record={selected} sources={data.sources} onSaved={saved} /> : <ReviewItemEditor item={selected} sources={data.sources} onSaved={saved} /> : <FacilitationQueue active={active} setActive={setActive} groups={groups} onOpen={setSelected} />}</>;
}