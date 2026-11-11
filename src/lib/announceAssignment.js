import { chicagoToday } from '@/lib/weeklyGoals';
import { base44 } from '@/api/base44Client';

// Posts a student-facing announcement so the MessagesPopup + real-time toast fire when a new assignment goes live.
export async function announceNewAssignment(assignment) {
  if (!assignment?.title) return;
  const due = assignment.due_date ? ` · due ${assignment.due_date}${assignment.due_time && assignment.due_time !== '23:59' ? ` at ${assignment.due_time}` : ''}` : '';
  const message = `New assignment: "${assignment.title}" (${assignment.max_points || 10} pts${due}). Open the Assignments tab to get started.`;
  await base44.entities.AdminMessage.create({ message, sent_date: chicagoToday(), category: 'announcement' });
}