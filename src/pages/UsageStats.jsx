import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import UsageStatsTable from '@/components/east/UsageStatsTable';
import StandardsUsageTable from '@/components/east/StandardsUsageTable';
import { chicagoToday, computeUsageStats, usageStatsText } from '@/lib/usageStats';

export default function UsageStats() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [from, setFrom] = useState('2026-08-01');
  const [to, setTo] = useState(chicagoToday());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setCopied(false);
    computeUsageStats({ from, to })
      .then(result => { if (active) setReport(result); })
      .catch(err => { if (active) { setReport(null); setError(err?.message || 'The numbers could not be loaded.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, isAdmin]);

  if (!isAdmin) return <p className="text-sm text-muted-foreground">This page is available to facilitators only.</p>;

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(usageStatsText(report));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      setError('Copying is not available in this browser. You can select the numbers on the page instead.');
    }
  };

  return <>
    <PageHeader
      title="Usage Stats"
      description="Read-only totals for the selected date range. No names, emails, IDs, or per-student rows are shown or stored."
      action={<button type="button" onClick={copy} disabled={!report || loading} className="east-button">{copied ? 'Copied' : 'Copy as text'}</button>}
    />
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 shadow-sm">
      <label className="east-label">From<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className="east-label">To<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
      <p className="text-xs text-muted-foreground">Totals update as soon as a date changes.</p>
    </div>
    {error && <div role="alert" className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div>}
    {loading ? <p className="text-sm text-muted-foreground">Counting records…</p> : report && <>
      {report.sections.map(section => <UsageStatsTable key={section.id} title={section.title} note={section.note} rows={section.rows} />)}
      <StandardsUsageTable rows={report.standards.rows} note={report.standards.note} />
    </>}
  </>;
}