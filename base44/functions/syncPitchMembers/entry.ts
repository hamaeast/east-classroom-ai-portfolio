import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const emailsFromPitch = (pitch) => [...new Set([
  ...(pitch.member_emails || []),
  ...(pitch.tagged_emails || '').split(','),
].map(value => String(value || '').trim().toLowerCase()).filter(Boolean))];

const merged = (current, additions) => [...new Set([...(current || []), ...additions].filter(Boolean))];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pitchId } = await req.json();
    if (!pitchId) return Response.json({ error: 'pitchId is required' }, { status: 400 });

    const service = base44.asServiceRole.entities;
    const pitch = await service.ProjectPitch.get(pitchId);
    if (!pitch) return Response.json({ error: 'Pitch not found' }, { status: 404 });

    const memberEmails = emailsFromPitch(pitch);
    const callerEmail = String(user.email || '').trim().toLowerCase();
    const allowed = user.role === 'admin' || pitch.created_by_id === user.id || memberEmails.includes(callerEmail);
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const users = await service.User.list();
    const memberUsers = users.filter(item => item.id === pitch.created_by_id || memberEmails.includes(String(item.email || '').trim().toLowerCase()));
    const memberIds = memberUsers.map(item => item.id);
    const memberNames = [...new Set(memberUsers.map(item => item.full_name || item.email).filter(Boolean))];

    const [projects, checkIns, serviceEntries, pitchComments] = await Promise.all([
      service.Project.filter({ project_pitch_id: pitchId }),
      service.WeeklyCheckIn.filter({ project_pitch_id: pitchId }),
      service.ServiceEntry.filter({ project_pitch_id: pitchId }),
      service.Comment.filter({ parent_type: 'pitch', parent_id: pitchId }),
    ]);

    const checkInIds = new Set(checkIns.map(item => item.id));
    const allCheckInComments = checkInIds.size ? await service.Comment.filter({ parent_type: 'check_in' }) : [];
    const comments = [...pitchComments, ...allCheckInComments.filter(item => checkInIds.has(item.parent_id))];

    const operations = [service.ProjectPitch.update(pitchId, { student_names: memberNames.join(', ') })];
    if (projects.length) operations.push(service.Project.bulkUpdate(projects.map(item => ({ id: item.id, student_names: memberNames.join(', '), member_ids: merged(item.member_ids, memberIds), member_emails: merged(item.member_emails, memberEmails) }))));
    if (checkIns.length) operations.push(service.WeeklyCheckIn.bulkUpdate(checkIns.map(item => ({ id: item.id, member_ids: merged(item.member_ids, memberIds) }))));
    if (serviceEntries.length) operations.push(service.ServiceEntry.bulkUpdate(serviceEntries.map(item => ({ id: item.id, member_ids: merged(item.member_ids, memberIds), member_emails: merged(item.member_emails, memberEmails) }))));
    if (comments.length) operations.push(service.Comment.bulkUpdate(comments.map(item => ({ id: item.id, member_ids: merged(item.member_ids, memberIds) }))));
    await Promise.all(operations);

    return Response.json({
      updated: {
        projects: projects.length,
        checkIns: checkIns.length,
        serviceEntries: serviceEntries.length,
        conversations: comments.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}