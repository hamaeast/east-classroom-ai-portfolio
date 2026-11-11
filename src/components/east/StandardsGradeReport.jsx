import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { buildCurrentAssessment } from '@/lib/standardsProgress';
import { standardsNineWeeksPoints, STANDARDS_USED } from '@/lib/standardsGrade';
import { useToast } from '@/components/ui/use-toast';
import { NINE_WEEK_PERIODS, isNineWeeksClosed } from '@/lib/gradingPeriods';

const standardsTitle = segment => `Student Standards — Nine Weeks ${segment}`;

export default function StandardsGradeReport({ students, assignments, grades, schoolYear, reloadAssignments, reloadGrades }) {
  const { items: assessments } = useEntityList('StandardsAssessment');
  const [running, setRunning] = useState(0);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const closedSegment = segment => isNineWeeksClosed(NINE_WEEK_PERIODS.find(item => item.number === segment)?.end);
  const findAssignment = segment => assignments.find(item => item.title === standardsTitle(segment) && item.school_year === schoolYear);

  const ensureAssignment = async segment => {
    const title = standardsTitle(segment);
    let assignment = findAssignment(segment);
    if (!assignment) assignment = await base44.entities.Assignment.create({ title, description: `Grade from the ${STANDARDS_USED[segment]} highest-ranked EAST standards.`, max_points: 20, is_active: true, school_year: schoolYear, grading_period: segment });
    else if (Number(assignment.max_points) !== 20 || assignment.is_active !== true) assignment = await base44.entities.Assignment.update(assignment.id, { max_points: 20, grading_period: segment, is_active: true });
    return assignment;
  };

  // Writes the current standards grade for every student into the 20-point assignment.
  const writeGrades = async (segment, assignment) => {
    const rows = students.map(student => ({ student, assessment: buildCurrentAssessment(assessments.filter(item => item.student_id === student.id)) }));
    const updates = [], creates = [];
    rows.forEach(({ student, assessment }) => {
      const points = standardsNineWeeksPoints(assessment, student.grade, segment);
      const existing = grades.find(item => item.assignment_id === assignment.id && item.student_id === student.id);
      if (existing) updates.push({ id: existing.id, points, status: 'graded' });
      else creates.push({ assignment_id: assignment.id, student_id: student.id, points, status: 'graded' });
    });
    if (updates.length) await base44.entities.AssignmentGrade.bulkUpdate(updates);
    if (creates.length) await base44.entities.AssignmentGrade.bulkCreate(creates);
    return rows.filter(row => !row.assessment).length;
  };

  const run = async segment => {
    if (closedSegment(segment) || findAssignment(segment)?.frozen_at) return;
    setRunning(segment); setAction('run'); setMessage('');
    try {
      const assignment = await ensureAssignment(segment);
      const missing = await writeGrades(segment, assignment);
      await Promise.all([reloadAssignments(), reloadGrades()]);
      setMessage(`Nine Weeks ${segment} report added to the gradebook${missing ? ` · ${missing} student${missing === 1 ? '' : 's'} without an assessment received 0` : ''}.`);
    } catch (error) {
      toast({ title: 'Standards report could not finish', description: 'Check your connection and reload grades before retrying. Some changes may already have been saved.', variant: 'destructive' });
    } finally { setRunning(0); setAction(''); }
  };

  const freeze = async segment => {
    if (closedSegment(segment) || findAssignment(segment)?.frozen_at) return;
    setRunning(segment); setAction('freeze'); setMessage('');
    try {
      const assignment = await ensureAssignment(segment);
      const missing = await writeGrades(segment, assignment);
      const frozenAt = new Date().toISOString();
      await base44.entities.Assignment.update(assignment.id, { frozen_at: frozenAt });
      await Promise.all([reloadAssignments(), reloadGrades()]);
      setMessage(`Nine Weeks ${segment} standards grade frozen and added to the gradebook${missing ? ` · ${missing} student${missing === 1 ? '' : 's'} without an assessment received 0` : ''}.`);
    } catch (error) {
      toast({ title: 'Standards report could not finish', description: 'Check your connection and reload grades before retrying. Some changes may already have been saved.', variant: 'destructive' });
    } finally { setRunning(0); setAction(''); }
  };

  return (
    <section className="glass-panel mb-6 p-4">
      <p className="font-semibold">Student standards grade report</p>
      <p className="mt-1 text-sm text-muted-foreground">Maximum 20 points. Emerging, Proficient, and Mastery earn progressively more within the enrolled grade band; above-band work is displayed but capped at enrolled-band Mastery. Uses the strongest 2, 3, 4, then all 7 standards across the four nine weeks. <b>Freeze</b> writes the current grade and locks that nine weeks so it can’t be overwritten.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {[1, 2, 3, 4].map(segment => {
          const assignment = findAssignment(segment);
          const frozenAt = assignment?.frozen_at;
          const isFrozen = Boolean(frozenAt);
          const busy = running === segment;
          return (
            <div key={segment} className="flex items-center gap-2">
              <button disabled={Boolean(running) || isFrozen || closedSegment(segment)} onClick={() => run(segment)} className="east-button">{busy && action === 'run' ? 'Running…' : `Run Nine Weeks ${segment}`}</button>
              <button disabled={Boolean(running) || isFrozen || closedSegment(segment)} onClick={() => freeze(segment)} className="east-button">{busy && action === 'freeze' ? 'Freezing…' : `Freeze Nine Weeks ${segment}`}</button>
              {isFrozen && <span className="text-xs font-semibold text-muted-foreground">Frozen {new Date(frozenAt).toLocaleDateString()}</span>}
            </div>
          );
        })}
      </div>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}