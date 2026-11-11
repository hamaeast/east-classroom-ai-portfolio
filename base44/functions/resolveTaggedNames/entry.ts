import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { emails } = await req.json();
    if (!Array.isArray(emails) || emails.length > 50) return Response.json({ error: 'emails must be an array of at most 50 items' }, { status: 400 });
    const requested = [...new Set(emails.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))];
    const allowed = new Set();
    if (user.role === 'admin') requested.forEach(email => allowed.add(email));
    else {
      const pitches = await base44.entities.ProjectPitch.list();
      pitches.forEach(pitch => (pitch.tagged_emails || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean).forEach(email => allowed.add(email)));
      allowed.add((user.email || '').toLowerCase());
    }
    const permitted = requested.filter(email => allowed.has(email));
    const users = await base44.asServiceRole.entities.User.list();
    const names = {};
    users.forEach(item => {
      const email = (item.email || '').toLowerCase();
      if (permitted.includes(email)) names[email] = item.display_name || item.full_name || item.email;
    });
    permitted.forEach(email => { if (!names[email]) names[email] = email; });
    return Response.json({ names });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}