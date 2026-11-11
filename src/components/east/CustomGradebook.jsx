import { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function CustomGradebook({ assignments, grades, students, reload }) {
  const [drafts, setDrafts] = useState({});
  const save = async (assignment, student) => {
    const key = `${assignment.id}:${student.id}`, value = drafts[key];
    if (value === undefined) return;
    const existing = grades.find(g => g.assignment_id === assignment.id && g.student_id === student.id);
    const excused = String(value).trim().toUpperCase() === 'EX' || String(value).trim() === '';
    const points = excused ? 0 : Math.max(0, Math.min(Number(value), assignment.max_points));
    if (Number.isNaN(points)) return;
    const data = { assignment_id: assignment.id, student_id: student.id, points, excused, status: 'graded' };
    if (existing) await base44.entities.AssignmentGrade.update(existing.id, data);
    else await base44.entities.AssignmentGrade.create(data);
    reload();
  };
  if (!assignments.length) return null;
  return <section className="glass-panel mb-6 overflow-x-auto p-5"><h3 className="mb-3 font-semibold">Other assignment grades</h3>
    <table className="east-table"><thead><tr><th>Assignment</th><th>Student</th><th>Period</th><th>Grade</th></tr></thead><tbody>
      {assignments.flatMap(a => students.map(s => { const key = `${a.id}:${s.id}`; const grade = grades.find(g => g.assignment_id === a.id && g.student_id === s.id); return <tr key={key}><td>{a.title} ({a.max_points} pts)</td><td>{s.full_name}</td><td>{s.class_period || '—'}</td><td><div className="flex items-center gap-2"><input inputMode="decimal" className="w-20" value={drafts[key] ?? (grade?.excused ? 'EX' : grade?.points) ?? ''} onChange={e => setDrafts({ ...drafts, [key]: e.target.value })} /><button onClick={() => save(a, s)} className="east-button">Save</button></div></td></tr>; }))}
    </tbody></table>
  </section>;
}