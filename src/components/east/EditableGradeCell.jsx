import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { enqueue } from '@/lib/apiQueue';
import { useToast } from '@/components/ui/use-toast';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

export default function EditableGradeCell({ column, student, cell, weeklyRows, grades, reloadGrades, reloadCheckIns }) {
  const [value, setValue] = useState(cell.excused ? 'EX' : cell.points);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  useEffect(() => setValue(cell.excused ? 'EX' : cell.points), [cell.excused, cell.points]);

  const locked = column.locked || isNineWeeksClosed(column.weekEnding || column.dueDate || column.eventDate);
  const save = async () => {
    if (locked) return;
    const excused = String(value).trim().toUpperCase() === 'EX' || String(value).trim() === '';
    const points = excused ? 0 : Math.max(0, Math.min(Number(value), Number(column.max)));
    if (Number.isNaN(points)) return;
    setSaving(true);
    try {
    const assignmentId = column.type === 'weekly' ? column.key : column.id;
    const existing = grades.find(item => item.id && item.assignment_id === assignmentId && item.student_id === student.id);
    const weeklyRow = column.type === 'weekly' && weeklyRows.find(item => item.studentId === student.id && item.weekEnding === column.weekEnding);
    if (excused) {
      const data = { assignment_id: assignmentId, student_id: student.id, points: 0, excused: true, status: 'graded', is_late: false };
      if (existing) await enqueue(() => base44.entities.AssignmentGrade.update(existing.id, data));
      else await base44.entities.AssignmentGrade.create(data);
      if (column.type === 'custom') {
        const messages = await base44.entities.AssignmentReminder.filter({ assignment_id: assignmentId, student_id: student.id });
        await Promise.all(messages.filter(item => item.message_type === 'late_deduction').map(item => base44.entities.AssignmentReminder.delete(item.id)));
      }
      await reloadGrades();
    } else if (weeklyRow?.source?.id) {
      await enqueue(() => base44.entities.WeeklyCheckIn.update(weeklyRow.source.id, { grade: points, grade_status: 'reviewed', ai_review_flag: false }));
      if (existing) await base44.entities.AssignmentGrade.delete(existing.id);
      await Promise.all([reloadCheckIns(), reloadGrades()]);
    } else if (existing) {
      await enqueue(() => base44.entities.AssignmentGrade.update(existing.id, { points, excused: false, status: 'graded' }));
      if (column.type === 'custom' && existing.is_late) {
        const responses = await base44.entities.ReadingResponse.filter({ assignment_id: assignmentId, student_id: student.id });
        if (responses[0]) await base44.entities.ReadingResponse.update(responses[0].id, { score: points, status: 'graded' });
        const deduction = Math.max(0, Number(existing.auto_points ?? existing.points) - points);
        const messages = await base44.entities.AssignmentReminder.filter({ assignment_id: assignmentId, student_id: student.id });
        const lateMessage = messages.find(item => item.message_type === 'late_deduction');
        if (deduction > 0) {
          const messageData = { assignment_id: assignmentId, student_id: student.id, student_name: student.full_name, assignment_title: column.label, due_date: column.dueDate, due_time: column.dueTime, message_type: 'late_deduction', points_deducted: deduction, message: `You lost ${deduction} point${deduction === 1 ? '' : 's'} on ${column.label} because it was submitted late. Your final score is ${points}/${column.max}.`, zero_recorded_at: new Date().toISOString() };
          if (lateMessage) await base44.entities.AssignmentReminder.update(lateMessage.id, messageData); else await base44.entities.AssignmentReminder.create(messageData);
        } else if (lateMessage) {
          await base44.entities.AssignmentReminder.delete(lateMessage.id);
        }
      }
      await reloadGrades();
    } else {
      await base44.entities.AssignmentGrade.create({ assignment_id: assignmentId, student_id: student.id, points, excused: false, status: 'graded' });
      await reloadGrades();
    }
    } catch (error) {
      toast({ title: 'Grade save could not finish', description: 'Check your connection and reload grades before retrying to see whether the change was saved.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (cell.excused && !grades.some(item => item.id && item.assignment_id === column.key && item.student_id === student.id)) return <span className="text-xs font-semibold text-muted-foreground">Excused</span>;
  if (cell.enrollmentExempt) return <span className="text-xs font-semibold text-muted-foreground" aria-label="Exempt because student joined later">Exempt</span>;
  if (!cell.required && !cell.excused) return <span aria-label="Not required">&nbsp;</span>;
  if (cell.label === 'Missing' || cell.awaitingDeadline) return <span className="text-xs font-semibold text-primary">Missing</span>;
  if (locked) return <span className="text-xs font-semibold text-muted-foreground" title="Closed nine-weeks grade, locked">{cell.excused ? 'EX' : cell.points ?? '—'} · Locked</span>;
  if (column.live) return <span className="font-semibold text-neon-cyan">{cell.points}/{column.max} · Live</span>;
  const grade = column.type === 'custom' && grades.find(item => item.assignment_id === column.id && item.student_id === student.id);
  return <div className="flex min-w-24 items-center gap-1">{grade?.is_late && <span className="text-[10px] font-bold uppercase text-destructive">Late</span>}<input aria-label={`${column.label} score for ${student.full_name}`} inputMode="decimal" value={value} onChange={event => setValue(event.target.value)} className="h-8 min-h-8 w-14 px-2" /><button disabled={saving} onClick={save} className="rounded-md border px-1.5 py-1 text-[11px] font-semibold">{saving ? '…' : 'Save'}</button></div>;
}