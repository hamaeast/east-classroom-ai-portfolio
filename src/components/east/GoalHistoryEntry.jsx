export default function GoalHistoryEntry({ goal }) {
  const goalScore = goal.goal_grade == null ? null : Number(goal.goal_grade);
  const reflectionScore = goal.reflection_grade == null ? null : Number(goal.reflection_grade);
  const total = goalScore == null && reflectionScore == null ? null : (goalScore || 0) + (reflectionScore || 0);

  return <article className="student-history-entry border-b pb-4 last:border-0">
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">Weekly goal and reflection</h4><p className="text-xs font-semibold">Week of {goal.week_start} · Grade: {total == null ? 'Not graded' : `${total}/10`}</p></div>
    <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
      <p><b>Goal:</b> {goal.goal_text || 'Not submitted'}</p>
      <p><b>Goal score:</b> {goalScore == null ? '—' : `${goalScore}/5`}</p>
      <p><b>Met the goal:</b> {goal.met_goal || '—'}{goal.met_goal_day ? ` (${goal.met_goal_day})` : ''}</p>
      <p><b>Goal was too difficult:</b> {goal.goal_too_hard || '—'}</p>
      <p className="md:col-span-2"><b>Reflection:</b> {goal.reflection_notes || 'Not submitted'}</p>
      <p className="md:col-span-2"><b>Collaboration contribution:</b> {goal.collaboration_contribution || '—'}</p>
      <p><b>Reflection score:</b> {reflectionScore == null ? '—' : `${reflectionScore}/5`}</p>
    </div>
  </article>;
}