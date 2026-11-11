import QuickPanel from './QuickPanel';
import GoalHistoryEntry from './GoalHistoryEntry';
import CheckInHistoryEntry from './CheckInHistoryEntry';
import AssignmentHistoryEntry from './AssignmentHistoryEntry';

export default function StudentInputHistory({ goals, checkIns, assignmentGrades, assignments }) {
  const entries = [
    ...goals.map(item => ({ type: 'goal', date: item.week_start, item })),
    ...checkIns.map(item => ({ type: 'check-in', date: item.week_ending, item })),
    ...assignmentGrades.map(item => ({ type: 'assignment', date: assignments.find(assignment => assignment.id === item.assignment_id)?.due_date || item.updated_date?.slice(0, 10), item }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.item.created_date || '').localeCompare(a.item.created_date || ''));

  return <div className="mt-6"><QuickPanel title="Student Work and Grade History">
    {!entries.length ? <p className="text-sm text-muted-foreground">No graded work, goals, reflections, or weekly check-ins submitted yet.</p> : <div className="space-y-4">{entries.map(entry => {
      if (entry.type === 'goal') return <GoalHistoryEntry key={`goal-${entry.item.id}`} goal={entry.item} />;
      if (entry.type === 'check-in') return <CheckInHistoryEntry key={`check-${entry.item.id}`} checkIn={entry.item} />;
      const assignment = assignments.find(item => item.id === entry.item.assignment_id);
      return assignment ? <AssignmentHistoryEntry key={`assignment-${entry.item.id}`} assignment={assignment} grade={entry.item} /> : null;
    })}</div>}
  </QuickPanel></div>;
}