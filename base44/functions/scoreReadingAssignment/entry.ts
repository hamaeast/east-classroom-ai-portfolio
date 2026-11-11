import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { waitUntil } from 'base44:runtime';
import { saveSubmissionGrade, clearMissingNotices } from './submissionPersistence.ts';
import { extendedDueDate, joinedAfterAssignmentDeadline } from '../../shared/schoolDeadline.ts';
import { isAssignmentClosed } from '../../shared/gradingPeriods.ts';
import { gradeAssignmentAnswers } from '../../shared/assignmentScoring.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { assignmentId, answers, responseText } = await req.json();
    if (typeof assignmentId !== 'string' || !assignmentId.trim() || (answers !== undefined && !Array.isArray(answers)) || (responseText !== undefined && typeof responseText !== 'string')) return Response.json({ error: 'Invalid submission' }, { status: 400 });
    const [assignment, student, previous] = await Promise.all([
      base44.asServiceRole.entities.Assignment.get(assignmentId),
      base44.asServiceRole.entities.User.get(user.id),
      base44.asServiceRole.entities.ReadingResponse.filter({ assignment_id: assignmentId, student_id: user.id }, { limit: 1, sort: 'created_date' })
    ]);
    if (!assignment) return Response.json({ error: 'Assignment is unavailable' }, { status: 404 });
    if (assignment.assignment_type === 'project_work') return Response.json({ error: 'Project Work is graded automatically from off-task incidents. No submission is needed.' }, { status: 400 });
    if (/^(Weekly Goal|Goal Reflection|Student Standards)/.test(assignment.title)) return Response.json({ error: /^Student Standards/.test(assignment.title) ? 'View this report in My learning summary.' : 'Complete this work on the Weekly goals page.' }, { status: 400 });
    if (isAssignmentClosed(assignment)) return Response.json({ error: 'This assignment is in a closed grading period. Submissions and grades are locked.' }, { status: 403 });
    if (previous.items.length) {
      const response = previous.items[0];
      const grade = await saveSubmissionGrade(base44, response, true);
      waitUntil(clearMissingNotices(base44, response).catch(error => console.error('Missing-notice cleanup failed', error.message)));
      return Response.json({ response, grade });
    }
    if (assignment.frozen_at) return Response.json({ error: 'This assignment has been finalized and cannot accept new submissions.' }, { status: 403 });
    const releases = assignment.period_release_times;
    const now = Date.now();
    let isPublished;
    if (!assignment.is_active) {
      isPublished = false;
    } else if (releases && Object.keys(releases).length) {
      const periodReleaseAt = releases[String(student.class_period)];
      if (periodReleaseAt) {
        isPublished = new Date(periodReleaseAt).getTime() <= now;
      } else {
        // The student has no class period (or their period is not in the release
        // map). Fall back to the earliest scheduled release so released work is
        // still completable — otherwise period-less students can never submit.
        const earliest = Object.values(releases).map(v => new Date(v).getTime()).sort((a, b) => a - b)[0];
        isPublished = Boolean(earliest) && earliest <= now;
      }
    } else {
      isPublished = !assignment.publish_at || new Date(assignment.publish_at).getTime() <= now;
    }
    if (!assignment || !isPublished) return Response.json({ error: 'Assignment is unavailable' }, { status: 404 });

    const questions = assignment.questions || [];
    const hasQuestions = questions.length > 0;
    const answerMap = new Map((answers || []).filter(item => item && typeof item.question_id === 'string' && typeof item.answer === 'string').map(item => [item.question_id, item.answer.trim()]));
    const writtenResponse = String(responseText ?? answerMap.get('free-response') ?? '').trim();
    if (hasQuestions) {
      if (questions.some(question => !answerMap.get(question.id))) return Response.json({ error: 'Answer every question before submitting' }, { status: 400 });
    } else {
      if (!writtenResponse) return Response.json({ error: 'Please write your response before submitting' }, { status: 400 });
    }

    const submittedAt = new Date().toISOString();
    const chicagoParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(part => [part.type, part.value]));
    const chicagoDate = `${chicagoParts.year}-${chicagoParts.month}-${chicagoParts.day}`;
    const chicagoTime = `${chicagoParts.hour}:${chicagoParts.minute}`;
    const dueTime = assignment.due_time || '23:59';
    const dueDate = extendedDueDate(assignment.due_date, student);
    const joinedAfterDeadline = joinedAfterAssignmentDeadline(student, assignment);
    const isLate = !joinedAfterDeadline && Boolean(dueDate) && (chicagoDate > dueDate || (chicagoDate === dueDate && chicagoTime > dueTime));
    const savedResponse = await base44.asServiceRole.entities.ReadingResponse.create({ assignment_id: assignmentId, student_id: user.id, answers: hasQuestions ? questions.map(question => ({ question_id: question.id, answer: answerMap.get(question.id) })) : [{ question_id: 'free-response', answer: writtenResponse }], grading_details: [], score: 0, status: 'pending_review', is_late: isLate, submitted_at: submittedAt });
    let response = savedResponse;
    try {
      const { details, score, gradingPending } = await gradeAssignmentAnswers(base44, assignment, answers || [], writtenResponse);
      const status = isLate || gradingPending ? 'pending_review' : 'graded';
      response = await base44.asServiceRole.entities.ReadingResponse.update(savedResponse.id, { grading_details: details, score, status });
    } catch (error) { console.error('Submission saved; grading needs review', error.message); }
    const grade = await saveSubmissionGrade(base44, response);
    waitUntil(clearMissingNotices(base44, response).catch(error => console.error('Missing-notice cleanup failed', error.message)));
    return Response.json({ response, grade });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}