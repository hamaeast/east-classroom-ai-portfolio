import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fromChicagoInput, suggestedGoalDue, suggestedReflectionDue, toChicagoInput } from '@/lib/weeklyGoals';

export default function GoalDueDateRow({ student, record, weekStart, assignmentIds, reload }) {
  const [goalDue, setGoalDue] = useState(toChicagoInput(record?.goal_due_at || suggestedGoalDue(weekStart)));
  const [reflectionDue, setReflectionDue] = useState(toChicagoInput(record?.reflection_due_at || suggestedReflectionDue(weekStart)));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setGoalDue(toChicagoInput(record?.goal_due_at || suggestedGoalDue(weekStart)));
    setReflectionDue(toChicagoInput(record?.reflection_due_at || suggestedReflectionDue(weekStart)));
  }, [record, weekStart]);
  const save = async () => {
    setSaving(true);
    const data = { student_id: student.id, week_start: weekStart, goal_due_at: fromChicagoInput(goalDue), reflection_due_at: fromChicagoInput(reflectionDue), goal_assignment_id: assignmentIds?.goalAssignmentId, reflection_assignment_id: assignmentIds?.reflectionAssignmentId };
    if (record) await base44.entities.WeeklyGoal.update(record.id, data);
    else await base44.entities.WeeklyGoal.create(data);
    await reload(); setSaving(false);
  };
  return <div className="grid gap-2 border-t border-border/60 py-3 md:grid-cols-[1fr_1.2fr_1.2fr_auto] md:items-end"><div><p className="font-semibold">{student.full_name || student.email}</p><p className="text-xs text-muted-foreground">Suggested: Monday goal, Friday reflection</p></div><label className="east-label">Goal due<input type="datetime-local" value={goalDue} onChange={event => setGoalDue(event.target.value)} /></label><label className="east-label">Reflection due<input type="datetime-local" value={reflectionDue} onChange={event => setReflectionDue(event.target.value)} /></label><button disabled={saving} onClick={save} className="east-button">{saving ? 'Saving…' : 'Save'}</button></div>;
}