import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { projectWorkWeekStart, weeklyIncidentCount, projectWorkIncidentWeek, PROJECT_WORK_MAX } from '@/lib/projectWork';

export default function ProjectWorkIncidentDialog({ studentId, studentName, incidents = [], trigger, className = '' }) {
  const [open, setOpen] = useState(false);
  const [allWeeks, setAllWeeks] = useState(false);
  const weekStart = projectWorkWeekStart();
  const visible = useMemo(() => {
    const list = incidents.filter(i => i.student_id === studentId);
    const scoped = allWeeks ? list : list.filter(i => projectWorkIncidentWeek(i.week_start) === weekStart);
    return [...scoped].sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime());
  }, [incidents, studentId, allWeeks, weekStart]);

  const thisWeekCount = weeklyIncidentCount(studentId, incidents, weekStart);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <button type="button" className={`text-left ${className}`}>{studentName || 'Student'}</button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Project Work — {studentName}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>This week: {PROJECT_WORK_MAX - Math.min(thisWeekCount, PROJECT_WORK_MAX)}/{PROJECT_WORK_MAX} ({thisWeekCount} mark{thisWeekCount === 1 ? '' : 's'})</span>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={allWeeks} onChange={e => setAllWeeks(e.target.checked)} className="w-auto" />
            Show all weeks
          </label>
        </div>
        {!visible.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No off-task marks {allWeeks ? 'recorded' : 'this week'}.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {visible.map(i => (
              <li key={i.id} className="border border-border/60 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{new Date(i.marked_at).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">Week of {i.week_start}</span>
                </div>
                {i.note && <p className="mt-1 text-muted-foreground">"{i.note}"</p>}
                {i.created_by_name && <p className="mt-1 text-xs text-muted-foreground">Marked by {i.created_by_name}</p>}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}