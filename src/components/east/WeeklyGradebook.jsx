import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

function ReviewGrade({ row, reload }) {
  const [points, setPoints] = useState(row.suggestedPoints ?? 10);
  const [saving, setSaving] = useState(false);
  const save = async () => { if (isNineWeeksClosed(row.weekEnding)) return; setSaving(true); await base44.entities.WeeklyCheckIn.update(row.source.id, { grade: Math.min(Number(points), 10), grade_status: 'reviewed', ai_review_flag: false }); setSaving(false); reload(); };
  return <div className="flex min-w-64 items-center gap-2"><input aria-label="Points after any late deduction" type="number" min="0" max="10" className="w-20" value={points} onChange={e => setPoints(e.target.value)} /><span className="text-xs text-muted-foreground">/10 after deduction</span><button disabled={saving} onClick={save} className="east-button">Save</button></div>;
}

export default function WeeklyGradebook({ rows, isAdmin, period = '', reload }) {
  const visible = period ? rows.filter(row => String(row.classPeriod) === period) : rows;
  if (!visible.length) return <p className="text-sm text-muted-foreground">No weekly check-in grades yet.</p>;
  return <section className="glass-panel mb-6 overflow-x-auto p-5"><h3 className="mb-3 font-semibold">Weekly check-ins</h3>
    <table className="east-table"><thead><tr><th>Week ending</th>{isAdmin && <><th>Student</th><th>Period</th></>}<th>Grade</th>{isAdmin && <th>Review</th>}</tr></thead><tbody>
      {visible.map(row => <tr key={row.key}><td>{row.weekEnding}</td>{isAdmin && <><td>{row.studentName}</td><td>{row.classPeriod || '—'}</td></>}<td>{row.status === 'pending_review' ? <span className="font-semibold text-primary">Pending review</span> : `${Math.min(Number(row.points || 0), 10)}/10`}</td>{isAdmin && <td>{isNineWeeksClosed(row.weekEnding) ? <span className="text-xs text-muted-foreground">Locked</span> : row.status === 'pending_review' ? <div><p className="mb-2 text-xs text-muted-foreground">{row.reviewReason}</p><ReviewGrade row={row} reload={reload} /></div> : <span className="text-xs text-muted-foreground">{row.status === 'auto' ? 'Automatic' : 'Reviewed'}</span>}</td>}</tr>)}
    </tbody></table>
  </section>;
}