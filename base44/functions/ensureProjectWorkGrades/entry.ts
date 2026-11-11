import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { syncProjectWorkGrades } from '../../shared/projectWorkGrades.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });
    const { studentId } = await req.json().catch(() => ({}));
    return Response.json(await syncProjectWorkGrades(base44, studentId ? [String(studentId)] : []));
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}