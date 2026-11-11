import { useState } from 'react';
import QuickPanel from './QuickPanel';

export default function CustomServiceReport({ service, users = [] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [student, setStudent] = useState('');
  const [result, setResult] = useState(null);

  const students = users.filter(u => u.role !== 'admin' && !u.is_archived).map(u => ({ name: u.full_name, email: u.email })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const selectedUser = students.find(s => s.name === student);

  const generate = () => {
    if (!from || !to) return;
    // Prefer matching by the submitter's email — student_names lists every teammate tagged on an
    // entry, so a name-substring match would also pull in hours for students who were only tagged.
    const filtered = service.filter(x => {
      if (x.service_date < from || x.service_date > to) return false;
      if (!student) return true;
      const emails = (x.student_emails || '').toLowerCase().split(',').map(e => e.trim()).filter(Boolean);
      if (emails.length) return selectedUser && emails.includes((selectedUser.email || '').toLowerCase());
      return (x.student_names || '').toLowerCase().includes(student.toLowerCase());
    });
    const hours = filtered.reduce((s, x) => s + Number(x.hours || 0), 0);
    const value = filtered.reduce((s, x) => s + Number(x.hours || 0) * Number(x.hourly_value || 0) + Number(x.donated_goods_value || 0), 0);
    setResult({ from, to, count: filtered.length, hours, value });
  };

  return <QuickPanel title="Custom Community Service Report">
    <p className="mb-3 text-sm text-slate-500">Choose a date range (and optionally a student) and generate a service-hours report for any period — past school years' data is never removed.</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="east-label">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className="east-label">To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <label className="east-label">Student
        <select value={student} onChange={e => setStudent(e.target.value)}>
          <option value="">All students</option>
          {students.map(s => <option key={s.email || s.name} value={s.name}>{s.name}</option>)}
        </select>
      </label>
      <button onClick={generate} disabled={!from || !to} className="east-button">Generate report</button>
    </div>
    {result && <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Range</p><p className="text-sm">{result.from} – {result.to}{student ? ` · ${student}` : ''}</p></div>
      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service hours</p><p className="text-lg font-semibold">{result.hours.toFixed(1)} ({result.count} entries)</p></div>
      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Community value</p><p className="text-lg font-semibold">${result.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
    </div>}
  </QuickPanel>;
}