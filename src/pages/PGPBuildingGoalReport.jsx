import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import useFacilitationData from '@/hooks/useFacilitationData';
import { DEFAULT_PGP_GOAL } from '@/lib/facilitationConstants';
import { runWritingGrowthAnalysis } from '@/lib/writingGrowthAnalysis';
import PageHeader from '@/components/east/PageHeader';
import PGPReportControls from '@/components/east/PGPReportControls';
import PGPReportDocument from '@/components/east/PGPReportDocument';
import WritingGrowthReport from '@/components/east/WritingGrowthReport';

function defaultRange() { const now = new Date(), year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; return { from: `${year}-08-01`, to: now.toISOString().slice(0, 10) }; }
export default function PGPBuildingGoalReport() {
  const { user } = useAuth(); const data = useFacilitationData(); const [range, setRange] = useState(defaultRange), [writingLoading, setWritingLoading] = useState(false), [writingReport, setWritingReport] = useState(null), [error, setError] = useState('');
  const records = useMemo(() => data.records.filter(record => { const date = record.date_addressed?.slice(0, 10); return date >= range.from && date <= range.to; }).sort((a, b) => a.date_addressed.localeCompare(b.date_addressed)), [data.records, range]);
  const goal = data.settings.find(item => item.key === 'pgp_goal')?.text_value || DEFAULT_PGP_GOAL;
  const runWritingReport = async () => { setWritingLoading(true); setError(''); try { setWritingReport(await runWritingGrowthAnalysis(data.sources, range)); } catch { setError('The writing growth report could not be completed. Please try again.'); } finally { setWritingLoading(false); } };
  if (user?.role !== 'admin') return <p>This report is available to facilitators only.</p>;
  if (writingReport) return <WritingGrowthReport entries={writingReport.entries} history={data.writingGrowthRecords} facilitator={user?.full_name || user?.email || 'EAST Facilitator'} range={range} onClose={() => setWritingReport(null)} />;
  return <><div className="print:hidden"><PageHeader title="PGP Building Goal Report" description="A concise evidence report for readers who do not use the EAST dashboard." /><Link to="/facilitation-records" className="mb-4 inline-block text-sm font-semibold text-neon-cyan">← Facilitation Records</Link></div>{error && <p className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">{error}</p>}<PGPReportControls settings={data.settings} range={range} setRange={setRange} onSaved={data.reload} onWritingReport={runWritingReport} writingLoading={writingLoading || data.loading} /><PGPReportDocument records={records} facilitator={user?.full_name || user?.email || 'EAST Facilitator'} range={range} goal={goal} /></>;
}