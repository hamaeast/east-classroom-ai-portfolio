import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function pad(value) { return String(value).padStart(2, '0'); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const friday = new Date(now);
    friday.setHours(0, 0, 0, 0);
    friday.setDate(now.getDate() - ((now.getDay() + 2) % 7));
    const weekEnding = `${friday.getFullYear()}-${pad(friday.getMonth() + 1)}-${pad(friday.getDate())}`;
    const exemptions = await base44.asServiceRole.entities.CheckInExemption.filter({ week_ending: weekEnding });
    if (exemptions.length) return Response.json({ skipped: true, reason: 'exempted week', weekEnding });

    const checkIns = await base44.asServiceRole.entities.WeeklyCheckIn.filter({ week_ending: weekEnding });
    const needsHelp = checkIns.filter(item => {
      const help = (item.help_needed || '').trim().toLowerCase();
      return help && help !== 'none';
    });
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (!admins.length) return Response.json({ skipped: true, reason: 'no admin users found', weekEnding });
    const body = needsHelp.length ? needsHelp.map(item => `${item.student_names}: ${item.help_needed}`).join('\n') : 'No students requested help this week.';
    for (const admin of admins) await base44.asServiceRole.integrations.Core.SendEmail({ to: admin.email, subject: `Weekly check-in help requests — week ending ${weekEnding}`, body: `Summary of help requests from this week's check-ins (week ending ${weekEnding}):\n\n${body}` });
    return Response.json({ sent: true, weekEnding, count: needsHelp.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}