import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isNineWeeksClosed } from '../../shared/gradingPeriods.ts';

const LOCK_MESSAGE = 'Please take time to plan your writing and try submitting again later.';
const text = (value: any) => String(value ?? '').trim();

// A student's returned service-hours entry: the writing check runs here and the entry
// always goes back to "pending" for the teacher, never straight to approved.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: any) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload: any = await req.json().catch(() => ({}));
    const entryId = text(payload.entryId);
    if (!entryId) return Response.json({ error: 'entryId is required' }, { status: 400 });
    const hours = Number(payload.hours);
    const description = text(payload.description);
    if (!Number.isFinite(hours) || hours < 0) return Response.json({ error: 'Enter the hours you worked.' }, { status: 400 });

    const service = base44.asServiceRole.entities;
    const entry: any = await service.ServiceEntry.get(entryId).catch((error: any) => (error.status === 404 ? null : Promise.reject(error)));
    if (!entry) return Response.json({ error: 'Service entry not found' }, { status: 404 });
    const isAdmin = user.role === 'admin';
    if (!isAdmin && entry.created_by_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!isAdmin && entry.approval_status !== 'rejected') return Response.json({ error: 'Only a returned entry can be resubmitted.' }, { status: 403 });
    if (entry.weekly_check_in_id && isNineWeeksClosed(entry.service_date)) {
      return Response.json({ error: 'This nine-weeks period is closed. Submissions are locked.' }, { status: 403 });
    }
    if (entry.ai_retry_after && new Date(entry.ai_retry_after) > new Date()) {
      return Response.json({ status: 'invalid', locked: true, message: LOCK_MESSAGE });
    }

    let review: any = { valid: true, hint: '' };
    try {
      review = await base44.integrations.Core.InvokeLLM({
        prompt: `Check this community-service work description using a very lenient 2nd-grade reading/writing level. Short answers, typos, and simple grammar are fine. It is valid only if it meaningfully describes community-service work completed and is not blank, gibberish, or unrelated. Do not write the answer. Give one short suggestion if invalid.\n\nDescription: "${description}"`,
        response_json_schema: { type: 'object', properties: { valid: { type: 'boolean' }, hint: { type: 'string' } }, required: ['valid', 'hint'] }
      });
    } catch {
      review = { valid: true, hint: '' };
    }

    if (!review || review.valid === false) {
      const attempts = (Number(entry.ai_check_attempts) || 0) + 1;
      const locked = attempts >= 2;
      await service.ServiceEntry.update(entry.id, { ai_check_attempts: locked ? 0 : attempts, ...(locked ? { ai_retry_after: new Date(Date.now() + 15 * 60 * 1000).toISOString() } : {}) });
      return Response.json({ status: 'invalid', locked, message: locked ? LOCK_MESSAGE : (review?.hint || 'Please describe the community-service work you completed.') });
    }

    await service.ServiceEntry.update(entry.id, { hours, description, approval_status: 'pending', admin_feedback: '', ai_check_attempts: 0 });
    if (entry.weekly_check_in_id) {
      await service.WeeklyCheckIn.update(entry.weekly_check_in_id, { hours, accomplishment: description });
    }
    return Response.json({ status: 'pending' });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}