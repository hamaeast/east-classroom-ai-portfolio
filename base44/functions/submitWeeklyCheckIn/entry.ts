import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isNineWeeksClosed } from '../../shared/gradingPeriods.ts';
import {
  isCheckInGradeEligible,
  isCheckInSubmissionClosed,
  isCurrentWeekDue,
  missingCheckInWeeks,
  normalizedCheckInWeekEnding,
  submissionStatus,
  suggestedCheckInPoints,
  weekEndingFriday
} from '../../shared/checkInScoring.ts';

const HOURLY_VALUE = 11;

const text = (value: any) => String(value ?? '').trim();
const evidenceRows = (value: any) =>
  (Array.isArray(value) ? value : [])
    .filter((row: any) => text(row?.url))
    .map((row: any) => ({ url: text(row.url), description: text(row.description) }));

// Creates or resubmits a weekly check-in. Every grade, status, timestamp and the
// linked service entry are calculated here with the rules the screens display, so a
// student can only send their answers — never a grade or approval state.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: any) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload: any = await req.json().catch(() => ({}));
    const isAdmin = user.role === 'admin';
    const weekEnding = weekEndingFriday(text(payload.weekEnding));
    const links = evidenceRows(payload.evidence_links);
    const files = evidenceRows(payload.evidence_files);
    const hours = Number(payload.hours);
    const checkInId = text(payload.checkInId) || null;

    const missing: string[] = [];
    if (!weekEnding) missing.push('Choose a Monday–Friday week-ending date.');
    if (!text(payload.project_title)) missing.push('Select your approved project or enter another project or skill.');
    if (!text(payload.student_names)) missing.push('Enter your name and any teammates.');
    if (!text(payload.partner_name)) missing.push('Select a community partner or “No community partner yet.”');
    if (!Number.isFinite(hours) || hours < 0) missing.push('Enter the hours you worked this week.');
    if (!text(payload.accomplishment)) missing.push('Write what you accomplished this week.');
    if (!text(payload.next_step)) missing.push('Write what your next step will be.');
    if (!text(payload.blocker)) missing.push('Describe a challenge or write “none.”');
    if (!text(payload.help_needed)) missing.push('Describe the help you need or write “none.”');
    if (!links.length && !files.length) missing.push('Attach at least one Google Drive file link or other evidence link.');
    else if (links.some((row: any) => !row.description) || files.some((row: any) => !row.description)) missing.push('Add a short description for every file or link you attached.');
    if (missing.length) return Response.json({ error: missing.join(' ') }, { status: 400 });

    if (isNineWeeksClosed(weekEnding)) return Response.json({ error: 'This check-in belongs to a closed nine-weeks period and cannot be submitted or changed.' }, { status: 403 });
    if (!isAdmin && isCheckInSubmissionClosed(weekEnding, user)) {
      return Response.json({ error: 'This weekly check-in is more than two weeks past your adjusted deadline and can no longer be submitted. Ask your teacher if you need an extension.' }, { status: 403 });
    }

    const service = base44.asServiceRole.entities;
    const [myCheckIns, exemptions, dismissals, grades] = await Promise.all([
      service.WeeklyCheckIn.filter({ created_by_id: user.id }),
      service.CheckInExemption.filter({}),
      service.CheckInDismissal.filter({ student_id: user.id }),
      service.AssignmentGrade.filter({ student_id: user.id })
    ]);
    const editingEntry = checkInId ? myCheckIns.find((item: any) => item.id === checkInId) || null : null;
    if (checkInId && !editingEntry) return Response.json({ error: 'Check-in not found' }, { status: 404 });

    const submittedAt = new Date().toISOString();
    const originalSubmittedAt = editingEntry?.original_submitted_at || editingEntry?.created_date || submittedAt;
    const effectiveWeekEnding = normalizedCheckInWeekEnding({ week_ending: weekEnding, original_submitted_at: originalSubmittedAt });
    const missingWeeks = isAdmin ? [] : missingCheckInWeeks(user, myCheckIns, exemptions, dismissals, grades);
    const currentWeekDue = isAdmin || editingEntry ? false : isCurrentWeekDue(effectiveWeekEnding, user, myCheckIns, exemptions, dismissals, grades);
    const selectedWeekIsMissing = isAdmin || missingWeeks.includes(effectiveWeekEnding) || currentWeekDue;
    const returnedEntry = !editingEntry && !isAdmin && selectedWeekIsMissing
      ? myCheckIns.find((item: any) => item.approval_status === 'rejected' && normalizedCheckInWeekEnding(item) === effectiveWeekEnding) || null
      : null;
    const existingEntry: any = editingEntry || returnedEntry;
    const authoritativeSubmittedAt = existingEntry?.original_submitted_at || existingEntry?.created_date || originalSubmittedAt;
    const suggestedPoints = suggestedCheckInPoints({ week_ending: effectiveWeekEnding, original_submitted_at: authoritativeSubmittedAt }, user);
    const alreadyFulfilled = myCheckIns.some((item: any) => item.id !== editingEntry?.id
      && item.approval_status !== 'rejected'
      && !['duplicate', 'extra'].includes(item.grade_status)
      && normalizedCheckInWeekEnding(item) === effectiveWeekEnding);
    const isExcusedWeek = exemptions.some((item: any) => weekEndingFriday(item.week_ending) === effectiveWeekEnding)
      || dismissals.some((item: any) => item.student_id === user.id && weekEndingFriday(item.week_ending) === effectiveWeekEnding);
    const lateSubmission = !alreadyFulfilled && !isExcusedWeek && suggestedPoints < 10;
    const gradeEligible = isCheckInGradeEligible({ week_ending: effectiveWeekEnding, original_submitted_at: authoritativeSubmittedAt }, user);
    const needsGradeReview = lateSubmission || !gradeEligible;
    const existingWeeklyGrade = myCheckIns.some((item: any) => item.id !== existingEntry?.id
      && item.approval_status !== 'rejected'
      && !['duplicate', 'extra'].includes(item.grade_status)
      && normalizedCheckInWeekEnding(item) === effectiveWeekEnding);
    const extra = !isAdmin && !existingEntry && !selectedWeekIsMissing;
    const gradeStatus = existingEntry?.grade_status === 'reviewed'
      ? 'reviewed'
      : extra ? 'extra' : existingWeeklyGrade ? 'duplicate' : needsGradeReview ? 'pending_review' : 'auto';
    const gradeValue = gradeStatus === 'extra' || gradeStatus === 'duplicate'
      ? undefined
      : gradeStatus === 'reviewed' ? existingEntry?.grade : suggestedPoints;
    const approvalStatus = gradeStatus === 'extra' ? 'approved' : editingEntry || needsGradeReview ? 'pending' : 'approved';
    const aiFallbackUsed = Boolean(payload.aiFallbackUsed);

    const pitch: any = text(payload.project_pitch_id)
      ? await service.ProjectPitch.get(text(payload.project_pitch_id)).catch((error: any) => (error.status === 404 ? null : Promise.reject(error)))
      : null;
    const memberIds = [...new Set([user.id, ...(pitch?.member_ids || [])].filter(Boolean))] as string[];
    const memberEmails = [...new Set([String(user.email || '').toLowerCase(), ...(pitch?.member_emails || [])].filter(Boolean))] as string[];

    const data = {
      project_title: text(payload.project_title),
      student_names: text(payload.student_names),
      partner_name: text(payload.partner_name),
      project_pitch_id: text(payload.project_pitch_id),
      week_ending: effectiveWeekEnding,
      hours,
      accomplishment: text(payload.accomplishment),
      next_step: text(payload.next_step),
      blocker: text(payload.blocker),
      help_needed: text(payload.help_needed),
      confidence: Math.min(5, Math.max(1, Number(payload.confidence) || 3)),
      late_reason: text(payload.late_reason),
      evidence_links: links,
      evidence_files: files,
      evidence_analysis: Array.isArray(payload.evidence_analysis) ? payload.evidence_analysis : [],
      member_ids: memberIds,
      member_emails: memberEmails,
      hourly_value: HOURLY_VALUE,
      is_late: lateSubmission,
      is_backdated: submissionStatus(weekEnding).isBackdated,
      approval_status: approvalStatus,
      ai_review_flag: aiFallbackUsed && gradeEligible,
      grade: gradeValue,
      grade_status: gradeStatus,
      original_submitted_at: authoritativeSubmittedAt
    };

    let saved: any;
    if (existingEntry) {
      saved = await service.WeeklyCheckIn.update(existingEntry.id, data);
    } else {
      // Created with the student's own token so the record belongs to the student the
      // gradebook, reminders and dashboard key on. The protected fields are staged as a
      // neutral "needs review" record and then written by the server just below.
      const staged = await base44.entities.WeeklyCheckIn.create({
        project_title: data.project_title,
        student_names: data.student_names,
        partner_name: data.partner_name,
        project_pitch_id: data.project_pitch_id,
        week_ending: data.week_ending,
        hours: data.hours,
        accomplishment: data.accomplishment,
        next_step: data.next_step,
        blocker: data.blocker,
        help_needed: data.help_needed,
        confidence: data.confidence,
        late_reason: data.late_reason,
        evidence_links: data.evidence_links,
        evidence_files: data.evidence_files,
        evidence_analysis: data.evidence_analysis,
        member_ids: data.member_ids,
        member_emails: data.member_emails,
        hourly_value: HOURLY_VALUE,
        grade_status: 'pending_review',
        approval_status: 'pending'
      });
      saved = await service.WeeklyCheckIn.update(staged.id, data);
    }

    if (approvalStatus === 'approved') {
      const serviceChanges = {
        project_title: data.project_title,
        project_pitch_id: data.project_pitch_id,
        student_names: user.full_name || data.student_names,
        student_emails: user.email || '',
        member_ids: [user.id],
        member_emails: [String(user.email || '').toLowerCase()],
        partner_name: data.partner_name,
        service_date: effectiveWeekEnding,
        hours,
        hourly_value: HOURLY_VALUE,
        description: data.accomplishment,
        weekly_check_in_id: saved.id
      };
      const existingEntries = await service.ServiceEntry.filter({ weekly_check_in_id: saved.id });
      if (existingEntries.length) await service.ServiceEntry.update(existingEntries[0].id, serviceChanges);
      else await service.ServiceEntry.create(serviceChanges);
    }

    return Response.json({ checkIn: saved, effectiveWeekEnding, gradeStatus, approvalStatus });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}