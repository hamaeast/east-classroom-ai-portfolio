import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fromChicagoInput, isEnrollmentExemptWeek, suggestedGoalDue, suggestedReflectionDue, toChicagoInput } from '@/lib/weeklyGoals';

export default function AdminGoalAssignments({ students, goals, goalsLoading, weekStart, assignmentIds, reload }) {
  const current = goals.find(item => item.week_start === weekStart);
  const [goalDue, setGoalDue] = useState(toChicagoInput(current?.goal_due_at || suggestedGoalDue(weekStart)));
  const [reflectionDue, setReflectionDue] = useState(toChicagoInput(current?.reflection_due_at || suggestedReflectionDue(weekStart)));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const autoAssigned = useRef('');

  useEffect(() => {
    setGoalDue(toChicagoInput(current?.goal_due_at || suggestedGoalDue(weekStart)));
    setReflectionDue(toChicagoInput(current?.reflection_due_at || suggestedReflectionDue(weekStart)));
  }, [weekStart, current?.goal_due_at, current?.reflection_due_at]);

  const applyToAll = async (automatic = false) => {
    if (!assignmentIds?.goalAssignmentId || !assignmentIds?.reflectionAssignmentId || assignmentIds.active === false || assignmentIds.skipped) return;
    setSaving(true); setStatus('');
    const shared = { week_start: weekStart, goal_due_at: fromChicagoInput(goalDue), reflection_due_at: fromChicagoInput(reflectionDue), goal_assignment_id: assignmentIds.goalAssignmentId, reflection_assignment_id: assignmentIds.reflectionAssignmentId };
    const recordsByStudent = new Map(goals.filter(item => item.week_start === weekStart).map(item => [item.student_id, item]));
    const eligibleStudents = students.filter(student => !isEnrollmentExemptWeek(student, weekStart));
    const updates = eligibleStudents.filter(student => recordsByStudent.has(student.id)).map(student => ({ id: recordsByStudent.get(student.id).id, ...shared }));
    const creates = eligibleStudents.filter(student => !recordsByStudent.has(student.id)).map(student => ({ student_id: student.id, ...shared }));
    await Promise.all([updates.length ? base44.entities.WeeklyGoal.bulkUpdate(updates) : null, creates.length ? base44.entities.WeeklyGoal.bulkCreate(creates) : null]);
    await reload(); setSaving(false); setStatus(automatic ? 'Automatic schedule assigned to all students.' : 'Updated schedule assigned to all students.');
  };

  useEffect(() => {
    if (goalsLoading || !assignmentIds || assignmentIds.active === false || !students.length) return;
    const key = `${weekStart}:${assignmentIds.goalAssignmentId}:${students.length}`;
    if (autoAssigned.current === key) return;
    autoAssigned.current = key;
    applyToAll(true);
  }, [assignmentIds, goalsLoading, weekStart, students.length]);

  const skip = () => {
    setGoalDue(toChicagoInput(current?.goal_due_at || suggestedGoalDue(weekStart)));
    setReflectionDue(toChicagoInput(current?.reflection_due_at || suggestedReflectionDue(weekStart)));
    setStatus('Automatic schedule kept.');
  };

  return <section className="glass-panel p-5"><h3 className="mb-1 font-semibold">This week’s goal schedule</h3><p className="mb-4 text-sm text-muted-foreground">The dates are assigned automatically. Change them and click Update, or click Skip to keep them.</p><div className="grid gap-3 md:grid-cols-2"><label className="east-label">Goal due<input type="datetime-local" value={goalDue} onChange={event => setGoalDue(event.target.value)} /></label><label className="east-label">Reflection due<input type="datetime-local" value={reflectionDue} onChange={event => setReflectionDue(event.target.value)} /></label></div><div className="mt-4 flex gap-2"><button disabled={saving || !assignmentIds || assignmentIds.active === false} onClick={() => applyToAll(false)} className="east-button">{saving ? 'Updating…' : 'Update'}</button><button disabled={saving || !assignmentIds || assignmentIds.active === false} onClick={skip} className="rounded-lg border px-4 text-sm font-semibold">Skip</button></div>{status && <p className="mt-2 text-sm font-semibold text-accent">{status}</p>}</section>;
}