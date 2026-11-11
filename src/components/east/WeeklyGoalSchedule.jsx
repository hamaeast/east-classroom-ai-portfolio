import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { schoolGoalWeeks } from '@/lib/schoolCalendar';
import { NINE_WEEK_PERIODS } from '@/lib/gradingPeriods';

const title = week => `Weekly Goal & Reflection — ${week.weekStart}`;
const legacyTitles = week => [`Weekly Goal — ${week.weekStart}`, `Goal Reflection — ${week.weekStart}`];
const periodFor = date => NINE_WEEK_PERIODS.find(item => date >= item.start && date <= item.end)?.number || 1;
const assignmentData = (week, schoolYear, active) => ({ title: title(week), description: 'Set one weekly goal and complete the Friday reflection.', max_points: 10, due_date: week.weekEnd, is_active: active, school_year: schoolYear, grading_period: periodFor(week.weekEnd) });
const labelDate = value => new Date(`${value}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' });

export default function WeeklyGoalSchedule({ assignments, schoolYear, reloadAssignments, reloadGrades }) {
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const setWeekActive = async (week, active) => {
    setSaving(week.weekStart); setError('');
    const combined = assignments.find(item => item.school_year === schoolYear && item.title === title(week));
    const legacy = assignments.filter(item => item.school_year === schoolYear && legacyTitles(week).includes(item.title));
    try {
      const current = combined ? await base44.entities.Assignment.update(combined.id, { is_active: active, max_points: 10 }) : await base44.entities.Assignment.create(assignmentData(week, schoolYear, active));
      if (legacy.length) await Promise.all(legacy.map(item => base44.entities.Assignment.update(item.id, { is_active: false })));
      if (!active) await Promise.all([current, ...legacy].map(item => base44.entities.AssignmentGrade.deleteMany({ assignment_id: item.id })));
      await Promise.all([reloadAssignments(), reloadGrades()]);
    } catch (message) { setError(message.message || 'The week could not be updated.'); }
    setSaving('');
  };
  return <section className="glass-panel mt-6 p-5"><h3 className="font-semibold">School-year weekly goal schedule</h3><p className="mb-4 text-sm text-muted-foreground">Each switch controls both the weekly goal and Friday reflection. Weeks are on by default.</p><div className="divide-y divide-border/60">{schoolGoalWeeks().map(week => { const combined = assignments.find(item => item.school_year === schoolYear && item.title === title(week)); const legacy = assignments.filter(item => item.school_year === schoolYear && legacyTitles(week).includes(item.title)); const active = combined ? combined.is_active !== false : !legacy.some(item => item.is_active === false); return <div key={week.weekStart} className="flex items-center justify-between gap-4 py-3"><span className="text-sm font-medium">{labelDate(week.weekStart)} – {labelDate(week.weekEnd)}</span><button type="button" role="switch" aria-checked={active} disabled={saving === week.weekStart} onClick={() => setWeekActive(week, !active)} className={`relative h-7 w-12 rounded-full border ${active ? 'border-accent bg-accent' : 'border-border bg-muted'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-foreground ${active ? 'left-6' : 'left-1'}`} /></button></div>; })}</div>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}</section>;
}