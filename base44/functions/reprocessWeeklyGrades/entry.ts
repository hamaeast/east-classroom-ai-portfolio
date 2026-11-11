import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { extendedDueDate, isAssignmentAbsenceExempt, assignmentDaysBetween } from '../../shared/schoolDeadline.ts';
import { isAssignmentClosed, isNineWeeksClosed, isWeeklyGoalClosed } from '../../shared/gradingPeriods.ts';

function chicagoParts(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function weekEndingFriday(dateText) {
  if (!dateText) return '';
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + ((5 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

function checkInEligible(item, student) {
  const submitted = chicagoParts(item.original_submitted_at || item.created_date).date;
  if (!submitted || !item.week_ending) return false;
  if (weekEndingFriday(item.week_ending) === '2026-10-09' && ['2026-10-07', '2026-10-08'].includes(submitted)) return true;
  const due = extendedDueDate(weekEndingFriday(item.week_ending), student);
  if (submitted > due && assignmentDaysBetween(due, submitted) <= 0) return true;
  const weekday = new Date(`${submitted}T12:00:00Z`).getUTCDay();
  return [4, 5].includes(weekday);
}

function submittedBy(value, dueDate) {
  if (!value || !dueDate) return false;
  const submitted = chicagoParts(value);
  return submitted.date < dueDate || (submitted.date === dueDate && submitted.time <= '23:59');
}

function changed(record, data) {
  return Object.entries(data).some(([key, value]) => record[key] !== value);
}

async function fetchAll(entity, query = {}) {
  const items = [];
  let cursor, hasMore = true;
  while (hasMore) {
    const page = await entity.filter(query, { limit: 500, cursor });
    if (Array.isArray(page)) { items.push(...page); break; }
    items.push(...(page.items || []));
    cursor = page.next_cursor;
    hasMore = page.has_more;
  }
  return items;
}

async function writeBatches(entity, updates, creates, dryRun) {
  if (dryRun) return;
  for (let index = 0; index < updates.length; index += 500) await entity.bulkUpdate(updates.slice(index, index + 500));
  for (let index = 0; index < creates.length; index += 500) await entity.bulkCreate(creates.slice(index, index + 500));
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { dryRun = true } = await req.json().catch(() => ({}));
    const service = base44.asServiceRole.entities;
    const [goals, checkIns, assignments, grades, readingResponses, students] = await Promise.all([
      fetchAll(service.WeeklyGoal), fetchAll(service.WeeklyCheckIn), fetchAll(service.Assignment), fetchAll(service.AssignmentGrade), fetchAll(service.ReadingResponse), service.User.filter({ role: 'user' })
    ]);
    const now = chicagoParts();
    const studentById = new Map(students.map(item => [item.id, item]));
    const assignmentById = new Map(assignments.map(item => [item.id, item]));
    const assignmentByWeek = new Map(assignments.filter(item => item.title?.startsWith('Weekly Goal & Reflection —')).map(item => [item.title.split(' — ')[1], item]));
    const gradeByKey = new Map(grades.map(item => [`${item.assignment_id}:${item.student_id}`, item]));
    const goalUpdates = [], checkInUpdates = [], gradeUpdates = [], gradeCreates = [];

    // Backfill reading-assignment grades: every scored ReadingResponse should have
    // a matching AssignmentGrade in the gradebook. If the grade is missing or the
    // recorded points drift from the response score (and the grade isn't excused
    // or teacher-protected), create or correct it so the gradebook reflects the
    // submission that followed the rules.
    for (const response of readingResponses) {
      const assignment = assignmentById.get(response.assignment_id);
      if (isAssignmentClosed(assignment)) continue;
      if (!assignment || assignment.title?.startsWith('Weekly Goal') || assignment.title?.startsWith('Goal Reflection') || assignment.title?.startsWith('Student Standards')) continue;
      const grade = gradeByKey.get(`${response.assignment_id}:${response.student_id}`);
      const expectedPoints = Math.max(0, Math.min(Number(assignment.max_points) || 10, Number(response.score || 0)));
      const expectedStatus = response.status === 'pending_review' ? 'pending_review' : 'graded';
      if (!grade) { gradeCreates.push({ assignment_id: response.assignment_id, student_id: response.student_id, points: expectedPoints, auto_points: expectedPoints, is_late: Boolean(response.is_late), excused: false, status: expectedStatus, teacher_note: '' }); continue; }
      const protectedGrade = grade.excused || (grade.teacher_note && !['Missing at the end of the accommodated due date'].includes(grade.teacher_note));
      if (protectedGrade) continue;
      if (Number(grade.points) !== expectedPoints || grade.status !== expectedStatus) gradeUpdates.push({ id: grade.id, points: expectedPoints, auto_points: expectedPoints, is_late: Boolean(response.is_late), status: expectedStatus });
    }

    for (const goal of goals) {
      const student = studentById.get(goal.student_id);
      const assignment = assignmentById.get(goal.goal_assignment_id || goal.reflection_assignment_id) || assignmentByWeek.get(goal.week_start);
      if (!student || !assignment || isAssignmentClosed(assignment) || isWeeklyGoalClosed(goal)) continue;
      const goalDue = extendedDueDate(String(goal.goal_due_at || goal.week_start).slice(0, 10), student);
      const reflectionDue = extendedDueDate(String(goal.reflection_due_at || assignment.due_date || '').slice(0, 10), student);
      const goalExempt = isAssignmentAbsenceExempt(String(goal.goal_due_at || '').slice(0, 10), student);
      const reflectionExempt = isAssignmentAbsenceExempt(assignment.due_date || String(goal.reflection_due_at || '').slice(0, 10), student);
      const goalPoints = goal.goal_submitted_at ? Math.min(5, Number(goal.goal_grade ?? 5)) : 0;
      const reflectionPoints = goal.reflection_submitted_at ? Math.min(5, Number(goal.reflection_grade ?? 5)) : 0;
      const reflectionPastDue = reflectionDue && (now.date > reflectionDue || (now.date === reflectionDue && now.time > '23:59'));
      const goalData = { goal_grade: goalPoints, reflection_grade: goal.reflection_submitted_at || (reflectionPastDue && !reflectionExempt) ? reflectionPoints : null };
      if (changed(goal, goalData)) goalUpdates.push({ id: goal.id, ...goalData });
      const relatedGoals = goals.filter(candidate => candidate.student_id === goal.student_id && candidate.week_start === goal.week_start);
      const goalSubmissions = relatedGoals.filter(candidate => candidate.goal_submitted_at);
      const reflectionSubmissions = relatedGoals.filter(candidate => candidate.reflection_submitted_at);
      const combinedGoalPoints = goalSubmissions.length ? Math.max(...goalSubmissions.map(candidate => Math.min(5, Number(candidate.goal_grade ?? 5)))) : 0;
      const combinedReflectionPoints = reflectionSubmissions.length ? Math.max(...reflectionSubmissions.map(candidate => Math.min(5, Number(candidate.reflection_grade ?? 5)))) : 0;
      const hasReflection = reflectionSubmissions.length > 0;
      // Late original submissions are graded automatically with their one-point deduction.
      // Only CART make-up answers still wait for a teacher to read them.
      const isMakeup = Boolean(goal.cart_goal_submitted_at || goal.cart_reflection_submitted_at);
      const needsReview = isMakeup && (combinedGoalPoints === 4 || combinedReflectionPoints === 4);
      const grade = gradeByKey.get(`${assignment.id}:${goal.student_id}`);
      const automaticNote = grade?.teacher_note === 'Goal reflection not submitted by the accommodated deadline';
      const protectedGrade = grade?.excused || (grade?.teacher_note && !automaticNote);
      const teacherNote = needsReview ? 'CART make-up requires review' : reflectionPastDue && !hasReflection && !reflectionExempt ? 'Goal reflection not submitted by the accommodated deadline' : null;
      const gradeData = { assignment_id: assignment.id, student_id: goal.student_id, points: combinedGoalPoints + combinedReflectionPoints, auto_points: combinedGoalPoints + combinedReflectionPoints, status: needsReview ? 'pending_review' : 'graded', teacher_note: teacherNote };
      if (!protectedGrade && grade && changed(grade, gradeData)) gradeUpdates.push({ id: grade.id, ...gradeData });
      else if (!grade && (combinedGoalPoints || combinedReflectionPoints || reflectionPastDue)) gradeCreates.push(gradeData);
    }

    for (const item of checkIns) {
      if (isNineWeeksClosed(weekEndingFriday(item.week_ending))) continue;
      const submittedAt = item.original_submitted_at || item.created_date;
      if (!submittedAt || !item.week_ending) continue;
      // Extra check-ins are not graded and must stay out of the review queue.
      if (item.grade_status === 'extra') continue;
      const eligible = checkInEligible(item, studentById.get(item.created_by_id));
      const duplicate = item.grade_status === 'duplicate';
      const reviewed = item.grade_status === 'reviewed';
      const checkData = duplicate
        ? { original_submitted_at: item.original_submitted_at || item.created_date, is_late: false }
        : reviewed
          ? { original_submitted_at: item.original_submitted_at || item.created_date, is_late: !eligible }
          : { original_submitted_at: item.original_submitted_at || item.created_date, is_late: !eligible, grade: eligible ? 10 : 0, grade_status: eligible ? 'auto' : 'pending_review', ai_review_flag: eligible ? false : Boolean(item.ai_review_flag) };
      if (changed(item, checkData)) checkInUpdates.push({ id: item.id, ...checkData });
      const weeklyId = `weekly-${weekEndingFriday(item.week_ending)}`;
      const override = gradeByKey.get(`${weeklyId}:${item.created_by_id}`);
      if (!duplicate && override && override.status === 'pending_review' && !override.teacher_note && !override.excused) {
        const overrideData = { points: eligible ? 10 : 0, status: eligible ? 'graded' : 'pending_review', is_late: !eligible };
        if (changed(override, overrideData)) gradeUpdates.push({ id: override.id, ...overrideData });
      }
    }

    const uniqueGoalUpdates = [...new Map(goalUpdates.map(item => [item.id, item])).values()];
    const uniqueCheckInUpdates = [...new Map(checkInUpdates.map(item => [item.id, item])).values()];
    const uniqueGradeUpdates = [...new Map(gradeUpdates.map(item => [item.id, item])).values()];
    const uniqueGradeCreates = [...new Map(gradeCreates.map(item => [`${item.assignment_id}:${item.student_id}`, item])).values()];
    await Promise.all([
      writeBatches(service.WeeklyGoal, uniqueGoalUpdates, [], dryRun),
      writeBatches(service.WeeklyCheckIn, uniqueCheckInUpdates, [], dryRun),
      writeBatches(service.AssignmentGrade, uniqueGradeUpdates, uniqueGradeCreates, dryRun)
    ]);
    return Response.json({ dryRun, weeklyGoalsChecked: goals.length, weeklyGoalsCorrected: uniqueGoalUpdates.length, checkInsChecked: checkIns.length, checkInsCorrected: uniqueCheckInUpdates.length, readingResponsesChecked: readingResponses.length, assignmentGradesChecked: grades.length, assignmentGradesUpdated: uniqueGradeUpdates.length, assignmentGradesCreated: uniqueGradeCreates.length, totalCorrections: uniqueGoalUpdates.length + uniqueCheckInUpdates.length + uniqueGradeUpdates.length + uniqueGradeCreates.length });
  } catch (error) {
    return Response.json({ error: error.message || 'Weekly grades could not be reconciled.' }, { status: 500 });
  }
}