import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { dryRun = false } = await req.json().catch(() => ({}));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const cutoff = new Date(`${today}T12:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - 56);
    const since = cutoff.toISOString().slice(0, 10);
    const api = base44.asServiceRole.entities;
    async function allPages(entity, query, sort) {
      const items = [];
      for (let offset = 0; ; offset += 500) {
        const page = await api[entity].filter(query, sort, 500, offset);
        items.push(...page);
        if (page.length < 500) return items;
      }
    }
    const [goals, students, profiles] = await Promise.all([
      allPages('WeeklyGoal', { week_start: { $gte: since } }, '-week_start'),
      allPages('User', { role: 'user' }, '-created_date'),
      allPages('GoalCoachingProfile', {}, '-created_date')
    ]);
    const byStudent = new Map();
    for (const goal of goals) {
      if (!goal.student_id) continue;
      const rows = byStudent.get(goal.student_id) || [];
      rows.push(goal);
      byStudent.set(goal.student_id, rows);
    }
    const existing = new Map(profiles.map(item => [item.student_id, item]));
    const creates = [], updates = [];
    let flagged = 0;
    for (const student of students.filter(item => !item.is_archived)) {
      const rows = byStudent.get(student.id) || [];
      // The existing goal review saves a revision suggestion on goals it found unclear or too broad.
      const revisions = [...new Map(rows.filter(item => item.ai_suggestion_used && item.ai_suggestion).map(item => [item.week_start, item])).values()];
      const unmet = [...new Map(rows.filter(item => item.reflection_submitted_at && item.met_goal === 'no').map(item => [item.week_start, item])).values()];
      const needsCoaching = revisions.length >= 3 || unmet.length >= 3 || (revisions.length >= 1 && unmet.length >= 2);
      if (needsCoaching) flagged++;
      const recentExamples = [
        ...revisions.slice(0, 2).map(item => `${item.week_start}: goal feedback — ${item.ai_suggestion.slice(0, 180)}`),
        ...unmet.slice(0, 2).map(item => `${item.week_start}: goal not met — ${(item.reflection_notes || item.goal_text || '').slice(0, 180)}`)
      ];
      const previous = existing.get(student.id);
      const data = { student_id: student.id, needs_coaching: needsCoaching, vague_goal_count: revisions.length, unmet_goal_count: unmet.length, recent_examples: recentExamples };
      if (previous && ['needs_coaching', 'vague_goal_count', 'unmet_goal_count', 'recent_examples'].every(key => JSON.stringify(previous[key]) === JSON.stringify(data[key]))) continue;
      data.assessed_at = new Date().toISOString();
      if (previous) updates.push({ id: previous.id, ...data });
      else creates.push(data);
    }
    if (!dryRun) {
      for (let offset = 0; offset < creates.length; offset += 500) await api.GoalCoachingProfile.bulkCreate(creates.slice(offset, offset + 500));
      for (let offset = 0; offset < updates.length; offset += 500) await api.GoalCoachingProfile.bulkUpdate(updates.slice(offset, offset + 500));
    }
    return Response.json({ dryRun, since, flagged, created: creates.length, updated: updates.length });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not update coaching profiles.' }, { status: 500 });
  }
}