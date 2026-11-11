import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Marks a student's own assignment reminders as read. Nothing else about a reminder
// (points deducted, message, dates) can be changed from the student side.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: any) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload: any = await req.json().catch(() => ({}));
    const reminderIds = [...new Set((Array.isArray(payload.reminderIds) ? payload.reminderIds : [])
      .map((id: any) => String(id || '').trim())
      .filter((id: string) => /^[a-z0-9]{20,40}$/i.test(id)))] as string[];
    if (!reminderIds.length) return Response.json({ error: 'reminderIds is required' }, { status: 400 });
    if (reminderIds.length > 200) return Response.json({ error: 'Too many reminders in one request' }, { status: 400 });

    const service = base44.asServiceRole.entities;
    const reminders = await service.AssignmentReminder.filter({ id: { $in: reminderIds } });
    const mine = reminders.filter((item: any) => item.student_id === user.id || user.role === 'admin');
    if (mine.length) await service.AssignmentReminder.bulkUpdate(mine.map((item: any) => ({ id: item.id, read: true })));
    return Response.json({ updated: mine.length });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}