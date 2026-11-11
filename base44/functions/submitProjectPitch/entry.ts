import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const PITCH_FIELDS = ['project_title', 'problem', 'solution', 'technology_use', 'ethics_statement', 'ethical_concerns', 'client_name', 'community_partner_name'];
const text = (value: any) => String(value ?? '').trim();
const emailList = (value: any) => [...new Set(String(value || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean))];

// Student pitch submissions. Students can only ever set approval_status to "pending"
// here; approving, rejecting or requesting revision stays an admin edit.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: any) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload: any = await req.json().catch(() => ({}));
    const action = text(payload.action) || 'update';
    const service = base44.asServiceRole.entities;

    if (action === 'create') {
      const missing = ['project_title', 'problem', 'solution', 'technology_use'].filter(field => !text(payload[field]));
      if (missing.length) return Response.json({ error: 'Fill in the project title, problem, solution and technology use.' }, { status: 400 });
      const emails = [...new Set([...emailList(payload.tagged_emails), String(user.email || '').trim().toLowerCase()].filter(Boolean))];
      const studentNames = [...new Set([user.full_name || user.email, ...(Array.isArray(payload.tagged_names) ? payload.tagged_names : [])].filter(Boolean))];
      // Created with the student's own token so the pitch belongs to them.
      const pitch = await base44.entities.ProjectPitch.create({
        project_title: text(payload.project_title),
        problem: text(payload.problem),
        solution: text(payload.solution),
        technology_use: text(payload.technology_use),
        ethics_statement: text(payload.ethics_statement),
        ethical_concerns: text(payload.ethical_concerns),
        client_name: text(payload.client_name),
        community_partner_name: text(payload.community_partner_name),
        student_names: studentNames.join(', '),
        tagged_emails: emails.join(', '),
        member_emails: emails,
        approval_status: 'pending'
      });
      return Response.json({ pitch });
    }

    const pitchId = text(payload.pitchId);
    if (!pitchId) return Response.json({ error: 'pitchId is required' }, { status: 400 });
    const pitch: any = await service.ProjectPitch.get(pitchId).catch((error: any) => (error.status === 404 ? null : Promise.reject(error)));
    if (!pitch) return Response.json({ error: 'Pitch not found' }, { status: 404 });
    const memberEmails = [...new Set([...(pitch.member_emails || []), ...emailList(pitch.tagged_emails)].map(item => String(item).toLowerCase()))];
    const allowed = user.role === 'admin' || pitch.created_by_id === user.id || memberEmails.includes(String(user.email || '').toLowerCase());
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'touch') {
      const touched = await service.ProjectPitch.update(pitch.id, { student_interaction_at: new Date().toISOString() });
      return Response.json({ pitch: touched });
    }
    if (action !== 'update') return Response.json({ error: 'Invalid action' }, { status: 400 });

    const updates: any = {};
    for (const field of PITCH_FIELDS) {
      if (field in payload) updates[field] = text(payload[field]);
    }
    const changedFields = PITCH_FIELDS.filter(field => field in payload && String(updates[field] || '') !== String(pitch[field] || ''));

    let teamChanged = false;
    if ('tagged_emails' in payload) {
      const emails = [...new Set([...emailList(payload.tagged_emails || pitch.tagged_emails), String(user.email || '').trim().toLowerCase()].filter(Boolean))];
      const previous = [...new Set([...(pitch.member_emails || []), ...emailList(pitch.tagged_emails)].map(item => String(item).toLowerCase()))];
      teamChanged = emails.slice().sort().join(',') !== previous.slice().sort().join(',');
      updates.tagged_emails = emails.join(', ');
      updates.member_emails = emails;
      const names = Array.isArray(payload.tagged_names) ? payload.tagged_names.filter(Boolean) : [];
      if (names.length) updates.student_names = [...new Set(names)].join(', ');
      else if (pitch.student_names) updates.student_names = pitch.student_names;
    }

    updates.student_changed_fields = changedFields;
    if (changedFields.length || teamChanged) updates.approval_status = 'pending';
    if (changedFields.length || teamChanged || action === 'update') updates.student_interaction_at = new Date().toISOString();

    const saved = await service.ProjectPitch.update(pitch.id, updates);
    return Response.json({ pitch: saved, changedFields, teamChanged });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}