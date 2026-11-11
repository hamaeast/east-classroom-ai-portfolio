import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { projectWorkMonday, syncProjectWorkGrades } from '../../shared/projectWorkGrades.ts';

const ZONE = 'America/Chicago';
const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const MAX_POINTS = 5;

function chicagoWeekStart(date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(date).map(p => [p.type, p.value])
  );
  const d = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  d.setUTCDate(d.getUTCDate() - DAY_INDEX[parts.weekday]);
  return d.toISOString().slice(0, 10);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const body = await req.json();
    const studentIds: string[] = Array.isArray(body?.student_ids) ? body.student_ids.filter(Boolean) : [];
    const note: string = String(body?.note || '').trim();
    if (!studentIds.length) return Response.json({ error: 'Select at least one student' }, { status: 400 });

    const weekStart = projectWorkMonday();
    const legacySunday = new Date(`${weekStart}T12:00:00Z`);
    legacySunday.setUTCDate(legacySunday.getUTCDate() - 1);
    const now = new Date().toISOString();

    const results = [];
    for (const studentId of studentIds) {
      const student = await base44.asServiceRole.entities.User.get(studentId);
      const studentName = student?.full_name || student?.email || '';
      const priorCount = await base44.asServiceRole.entities.ProjectWorkIncident.count({ student_id: studentId, week_start: { $in: [weekStart, legacySunday.toISOString().slice(0, 10)] } });
      const willDeduct = priorCount < MAX_POINTS;
      const newScore = Math.max(0, MAX_POINTS - Math.min(priorCount + 1, MAX_POINTS));

      await base44.asServiceRole.entities.ProjectWorkIncident.create({
        student_id: studentId,
        student_name: studentName,
        week_start: weekStart,
        marked_at: now,
        note,
        created_by_name: user.full_name || user.email || 'Teacher'
      });

      const stamp = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(now));
      const messageText = willDeduct
        ? `Off-task mark on ${stamp}. Project Work this week is now ${newScore}/${MAX_POINTS}.`
        : `Off-task mark on ${stamp}. Recorded; Project Work this week stays at ${newScore}/${MAX_POINTS} (weekly cap reached).`;

      await base44.asServiceRole.entities.AdminMessage.create({
        message: messageText,
        sent_date: now.slice(0, 10),
        category: 'intervention',
        target_student_ids: [studentId]
      });

      results.push({ student_id: studentId, student_name: studentName, deducted: willDeduct, week_score: newScore, deductions_this_week: Math.min(priorCount + 1, MAX_POINTS) });
    }

    await syncProjectWorkGrades(base44, studentIds);
    return Response.json({ week_start: weekStart, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}