import { base44 } from '@/api/base44Client';
import { isAssignmentClosed } from '@/lib/gradingPeriods';

export default async function saveAssignmentAndRegrade(assignment, changes, onProgress = () => {}) {
  if (isAssignmentClosed(assignment) || isAssignmentClosed({ ...assignment, ...changes })) throw new Error('Closed nine-weeks assignments remain locked.');
  await base44.entities.Assignment.update(assignment.id, changes);
  let cursor, more = true, completed = 0;
  while (more) {
    onProgress(`Regrading saved submissions… ${completed} checked`);
    const { data } = await base44.functions.invoke('regradeAssignment', { assignmentId: assignment.id, cursor });
    if (data.error) throw new Error(data.error);
    completed += data.processed;
    cursor = data.next_cursor;
    more = data.has_more;
  }
  return completed;
}