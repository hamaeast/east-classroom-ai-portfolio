import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { isInNineWeeks, NINE_WEEK_PERIODS } from '@/lib/gradingPeriods';
import { currentSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';
import { missingCheckInWeeks } from '@/lib/checkInReminder';
import { useToast } from '@/components/ui/use-toast';
import { Shield } from 'lucide-react';

// Teacher tool: reopen a closed nine-weeks period for ONE selected student until
// a chosen deadline, optionally excusing missing goal/reflection grades and
// allowing full-credit check-in makeups.
//
// Public-copy note: the production version of this panel was written for a
// single, hardcoded student. Here it is generalized so the teacher chooses the
// student and the options; no student is identified in code.
const endOfTodayLocal = () => { const d = new Date(); d.setHours(23, 59, 0, 0); return d.toISOString().slice(0, 16); };

export default function ClosedPeriodRescuePanel({ users, assignments, grades, checkIns, exemptions, dismissals, reloadGrades }) {
  const { toast } = useToast();
  const { items: goals } = useEntityList('WeeklyGoal');
  const { items: unlocks, reload: reloadUnlocks } = useEntityList('NineWeeksUnlock');
  const [studentId, setStudentId] = useState('');
  const [period, setPeriod] = useState(1);
  const [deadline, setDeadline] = useState(endOfTodayLocal);
  const [excuseGoals, setExcuseGoals] = useState(true);
  const [fullCredit, setFullCredit] = useState(false);
  const [applying, setApplying] = useState(false);
  const year = currentSchoolYearRange();
  const student = useMemo(() => users.find(item => item.id === studentId), [users, studentId]);

  const missingCheckIns = useMemo(() => student ? missingCheckInWeeks(student, checkIns, exemptions, dismissals, new Date(), grades).filter(week => isInNineWeeks(week, period)) : [], [student, checkIns, exemptions, dismissals, grades, period]);
  const missingGoals = useMemo(() => student ? goals.filter(item => item.student_id === student.id && inSchoolYear(item.week_start, year) && isInNineWeeks(item.week_start, period) && (!item.goal_submitted_at || !item.reflection_submitted_at)) : [], [student, goals, year, period]);
  const existingUnlock = useMemo(() => unlocks.find(item => item.student_id === studentId && Number(item.nine_weeks) === Number(period) && new Date(item.unlocked_until) > new Date()), [unlocks, studentId, period]);

  const apply = async () => {
    if (!student) return;
    setApplying(true);
    try {
      const unlockedUntil = new Date(deadline).toISOString();
      const note = `Nine Weeks ${period} makeup window`;
      if (existingUnlock) await base44.entities.NineWeeksUnlock.update(existingUnlock.id, { unlocked_until: unlockedUntil, full_credit_makeup: fullCredit });
      else await base44.entities.NineWeeksUnlock.create({ student_id: student.id, nine_weeks: Number(period), unlocked_until: unlockedUntil, full_credit_makeup: fullCredit, reason: note });
      if (excuseGoals) {
        for (const goal of missingGoals) {
          const assignment = assignments.find(item => item.title === `Weekly Goal & Reflection — ${goal.week_start}`);
          if (!assignment) continue;
          const existing = grades.find(grade => grade.assignment_id === assignment.id && grade.student_id === student.id);
          const data = { excused: true, points: 0, status: 'graded', teacher_note: `Excused — ${note}` };
          if (existing) await base44.entities.AssignmentGrade.update(existing.id, data);
          else await base44.entities.AssignmentGrade.create({ assignment_id: assignment.id, student_id: student.id, ...data });
        }
      }
      await Promise.all([reloadGrades(), reloadUnlocks()]);
      toast({ title: 'Makeup window opened', description: `${student.full_name || 'The student'} can submit makeups until ${new Date(unlockedUntil).toLocaleString()}.` });
    } catch (error) {
      toast({ title: 'Could not open makeup window', description: error.message, variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  const students = users.filter(item => item.role !== 'admin').sort((a, b) => String(a.full_name || a.email).localeCompare(String(b.full_name || b.email)));

  return (
    <details className="glass-panel mb-6 p-5">
      <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-neon-magenta"><Shield className="h-4 w-4" /> Closed-period makeup window</summary>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Reopen a closed nine-weeks period for one student until a deadline you choose. Use for documented individual circumstances; the reason is stored with the unlock.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Student<select className="mt-1 w-full" value={studentId} onChange={e => setStudentId(e.target.value)}><option value="">Choose a student…</option>{students.map(item => <option key={item.id} value={item.id}>{item.full_name || item.email}</option>)}</select></label>
        <label className="text-sm">Nine weeks<select className="mt-1 w-full" value={period} onChange={e => setPeriod(Number(e.target.value))}>{NINE_WEEK_PERIODS.map(item => <option key={item.number} value={item.number}>Nine Weeks {item.number}</option>)}</select></label>
        <label className="text-sm">Open until<input type="datetime-local" className="mt-1 w-full" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>
        <div className="space-y-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={excuseGoals} onChange={e => setExcuseGoals(e.target.checked)} /> Excuse missing goals/reflections</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={fullCredit} onChange={e => setFullCredit(e.target.checked)} /> Allow full-credit check-in makeups</label>
        </div>
      </div>
      {student && <p className="mt-3 text-xs text-muted-foreground">Missing check-ins: {missingCheckIns.join(', ') || 'none'} · Missing goals/reflections: {missingGoals.map(goal => goal.week_start).join(', ') || 'none'}{existingUnlock ? ` · Active window until ${new Date(existingUnlock.unlocked_until).toLocaleString()}` : ''}</p>}
      <button disabled={!student || applying} onClick={apply} className="east-button mt-4">{applying ? 'Applying…' : existingUnlock ? 'Update makeup window' : 'Open makeup window'}</button>
    </details>
  );
}
