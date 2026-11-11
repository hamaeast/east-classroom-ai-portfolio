import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import useFacilitationData from '@/hooks/useFacilitationData';
import PageHeader from '@/components/east/PageHeader';
import FacilitationRecordFilters from '@/components/east/FacilitationRecordFilters';
import FacilitationRecordCard from '@/components/east/FacilitationRecordCard';

const initial = { search: '', student: '', team: '', project: '', status: '', concern: '', scope: 'all', from: '', to: '' };
export default function FacilitationRecords() {
  const { user } = useAuth(); const data = useFacilitationData(); const [filters, setFilters] = useState(initial);
  const records = useMemo(() => data.records.filter(record => {
    const text = JSON.stringify(record).toLowerCase(), complete = ['resolved', 'complete'].includes(record.status), date = record.date_addressed?.slice(0, 10) || '';
    return (!filters.search || text.includes(filters.search.toLowerCase())) && (!filters.student || record.student_name === filters.student) && (!filters.team || record.team_name === filters.team) && (!filters.project || record.project_name === filters.project) && (!filters.status || record.status === filters.status) && (!filters.concern || record.concern_type === filters.concern) && (filters.scope === 'all' || (filters.scope === 'complete') === complete) && (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to);
  }), [data.records, filters]);
  if (user?.role !== 'admin') return <p>This workspace is available to facilitators only.</p>;
  return <><PageHeader title="Facilitation Records" description="Search the permanent concern, response, evidence, and outcome history." action={<Link to="/facilitation-review" className="east-button">Return to review queue</Link>} /><div className="mb-4"><Link to="/pgp-building-goal-report" className="text-sm font-semibold text-neon-cyan">Open PGP Building Goal Report →</Link></div><FacilitationRecordFilters records={data.records} filters={filters} setFilters={setFilters} />{!records.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No records match these filters.</div> : <div className="space-y-3">{records.map(record => <FacilitationRecordCard key={record.id} record={record} sources={data.sources} onSaved={data.reload} />)}</div>}</>;
}