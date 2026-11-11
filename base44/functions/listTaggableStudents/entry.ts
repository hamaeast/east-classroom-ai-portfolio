import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await base44.asServiceRole.entities.User.list();
    const students = users
      .filter(item => item.role !== 'admin' && !item.is_archived && item.email)
      .filter(item => user.role === 'admin' || !user.class_period || item.class_period === user.class_period)
      .filter(item => user.role === 'admin' || item.id !== user.id)
      .map(item => ({ id: item.id, name: item.display_name || item.full_name || item.email, email: item.email.toLowerCase(), class_period: item.class_period || null }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ students });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}