import { useState } from 'react';
import { Link } from 'react-router-dom';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import ReadingAssignmentModal from './ReadingAssignmentModal';
import AssignmentReminderCard from './AssignmentReminderCard';
import { adjustedAssignmentDueDate, isAssignmentAbsenceExempt } from '@/lib/assignmentDeadline';
import { NINE_WEEK_PERIODS, isAssignmentClosed } from '@/lib/gradingPeriods';
import { isNineWeeksClosedForStudent } from '@/lib/nineWeeksUnlock';
import { suggestedReflectionDue } from '@/lib/weeklyGoals';

const badgeFor = ({ exempt, response, locked, awaitingReflection }) => {
  if (exempt) return { text: 'Exempt', className: 'border-border bg-muted/40 text-muted-foreground' };
  if (response) return { text: 'Completed', className: 'border-success/50 bg-success/10 text-success' };
  if (locked) return { text: 'Closed', className: 'border-border bg-muted/40 text-muted-foreground' };
  if (awaitingReflection) return { text: 'Awaiting reflection', className: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan' };
  return { text: 'Uncompleted', className: 'border-destructive/60 bg-destructive/10 text-destructive' };
};

const PERIOD_LABELS = { 1: 'Nine Weeks 1', 2: 'Nine Weeks 2', 3: 'Nine Weeks 3', 4: 'Nine Weeks 4' };

const destinationFor = item => item.assignment_type === 'project_work' ? '/grades' : /^(Weekly Goal|Goal Reflection)/.test(item.title) ? '/goals' : /^Student Standards/.test(item.title) ? '/learning-summary' : null;

export default function StudentAssignments({ assignments, weeklyGoal, weeklyGoals = [], responses, reloadResponses, now = Date.now() }) {
  const { user } = useAuth();
  const { items: reminders } = useEntityList('AssignmentReminder');
  const { items: drafts, reload: reloadDrafts } = useEntityList('ReadingDraft');
  const { items: unlocks } = useEntityList('NineWeeksUnlock');
  const [selected, setSelected] = useState(null);
  const assignmentDueFor = item => item.id === weeklyGoal?.goal_assignment_id ? weeklyGoal.goal_due_at : item.id === weeklyGoal?.reflection_assignment_id ? weeklyGoal.reflection_due_at : item.due_date;
  const dueFor = item => adjustedAssignmentDueDate(assignmentDueFor(item), user);
  const exemptFor = item => isAssignmentAbsenceExempt(assignmentDueFor(item), user);
  const responseFor = item => responses.find(response => response.assignment_id === item.id && response.student_id === user?.id);
  const draftFor = item => drafts.find(draft => draft.assignment_id === item.id && draft.student_id === user?.id);
  const lockedFor = item => isAssignmentClosed(item);

  const periods = [...new Set(assignments.map(item => Number(item.grading_period)).filter(Boolean))].sort((a, b) => a - b);
  const ungrouped = assignments.filter(item => !item.grading_period);
  const itemsForPeriod = period => assignments.filter(item => Number(item.grading_period) === period);
  const periodLocked = period => {
    const def = NINE_WEEK_PERIODS.find(p => p.number === period);
    return def ? isNineWeeksClosedForStudent(def.end, user?.id, unlocks) : false;
  };

  const renderItem = item => {
    const due = dueFor(item);
    const response = responseFor(item);
    const exempt = exemptFor(item);
    const reminder = reminders.find(entry => entry.assignment_id === item.id && entry.student_id === user?.id);
    const locked = lockedFor(item);
    const destination = destinationFor(item);
    const canOpen = (!exempt || response) && (destination === '/learning-summary' || response || !locked);
    const goalRecord = destination === '/goals' && weeklyGoals.find(goal => goal.student_id === user?.id && (goal.goal_assignment_id === item.id || goal.reflection_assignment_id === item.id || item.title.endsWith(goal.week_start)));
    const goalCompleted = goalRecord && (/^Weekly Goal & Reflection/.test(item.title) ? goalRecord.goal_submitted_at && goalRecord.reflection_submitted_at : /^Goal Reflection/.test(item.title) ? goalRecord.reflection_submitted_at : goalRecord.goal_submitted_at);
    const reflectionDue = goalRecord && (goalRecord.reflection_due_at || suggestedReflectionDue(goalRecord.week_start));
    const awaitingReflection = /^Weekly Goal & Reflection/.test(item.title) && goalRecord?.goal_submitted_at && !goalRecord.reflection_submitted_at && now <= new Date(reflectionDue).getTime();
    const badge = destination === '/grades' ? { text: 'Live grade', className: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan' } : destination === '/learning-summary' ? { text: 'Report', className: 'border-border bg-muted/40 text-muted-foreground' } : badgeFor({ exempt, response: response || goalCompleted, locked, awaitingReflection });
    return <article key={item.id} className="border-t border-border/60 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {canOpen ? destination ? <Link to={destination} className="text-left font-semibold underline-offset-2 hover:underline">{item.title}</Link> : <button type="button" onClick={() => setSelected(item)} className="text-left font-semibold underline-offset-2 hover:underline">{item.title}</button> : <p className="font-semibold">{item.title}</p>}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${badge.className}`}>{badge.text}</span>
            {locked && !response && <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-bold uppercase text-muted-foreground">Locked</span>}
          </div>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          <p className="text-xs text-muted-foreground">{item.max_points} points{due ? ` · Due ${due.includes('T') ? new Date(due).toLocaleString() : `${due}${item.due_time ? ` at ${item.due_time}` : ''}`}` : ''}</p>
          {awaitingReflection && !locked && !exempt && <p className="mt-1 text-xs text-neon-cyan">Goal completed · Reflection not due yet. Due {new Date(reflectionDue).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' })} (Chicago time).</p>}
          {response?.submitted_at && <p className="mt-1 text-xs font-medium text-success">Submitted {new Date(response.submitted_at).toLocaleString()}</p>}
        </div>
        {canOpen && (destination ? <Link to={destination} className="east-button">{destination === '/goals' ? 'Open weekly goals' : destination === '/grades' ? 'View live grade' : 'View learning summary'}</Link> : <button type="button" onClick={() => setSelected(item)} className={response ? "east-button" : "inline-flex min-h-10 items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-4 text-sm font-semibold text-destructive"}>{response ? `View submitted · ${response.score}/${item.max_points}` : 'Open assignment'}</button>)}
      </div>
      {reminder && !locked && !response && !exempt && <div className="mt-3"><AssignmentReminderCard reminder={reminder} /></div>}
    </article>;
  };

  const renderGroup = (label, items, locked) => !items.length ? null : <div>
    <div className="mb-2 flex items-center gap-2"><h4 className="text-sm font-semibold text-neon-cyan">{label}</h4>{locked && <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-bold uppercase text-muted-foreground">Locked</span>}</div>
    <div className="space-y-3">{items.map(renderItem)}</div>
  </div>;

  return <><section className="glass-panel mb-6 p-5"><h3 className="mb-3 font-semibold">Assignments</h3>
    {!assignments.length ? <p className="text-sm text-muted-foreground">No assignments are active.</p> : <div className="space-y-5">
      {periods.map(period => renderGroup(PERIOD_LABELS[period] || `Nine Weeks ${period}`, itemsForPeriod(period), periodLocked(period)))}
      {ungrouped.length > 0 && renderGroup('Current', ungrouped, false)}
    </div>}
  </section>{selected && <ReadingAssignmentModal key={selected.id} assignment={selected} studentId={user?.id} existingResponse={responseFor(selected)} existingDraft={draftFor(selected)} onClose={() => setSelected(null)} onSubmitted={async () => { await Promise.all([reloadResponses(), reloadDrafts()]); }} />}</>;
}