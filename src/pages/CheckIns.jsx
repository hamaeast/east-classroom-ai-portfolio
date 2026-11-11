import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import CheckInExemptionManager from '@/components/east/CheckInExemptionManager';
import ConversationThread from '@/components/east/ConversationThread';
import AiFeedbackModal from '@/components/east/AiFeedbackModal';
import MissingCheckInsSection from '@/components/east/MissingCheckInsSection';
import CheckInMakeupSection from '@/components/east/CheckInMakeupSection';
import RejectWithFeedback from '@/components/east/RejectWithFeedback';
import CheckInWeekSelector from '@/components/east/CheckInWeekSelector';
import CheckInViewerFilters from '@/components/east/CheckInViewerFilters';
import CheckInLongAnswerField from '@/components/east/CheckInLongAnswerField';
import EvidenceAnalysisView from '@/components/east/EvidenceAnalysisView';
import WeeklyGradebook from '@/components/east/WeeklyGradebook';
import { currentGoalWeekStart, isEnrollmentExemptWeek } from '@/lib/weeklyGoals';
import { showSubmissionRequirements } from '@/lib/submissionRequirements';
import { buildStudentRecommendationContext } from '@/lib/studentRecommendationContext';
import { isFullSchoolWeekClosed } from '@/lib/schoolCalendar';
import { buildWeeklyGrades, isCheckInGradeEligible, normalizedCheckInWeekEnding, suggestedCheckInPoints } from '@/lib/gradebook';
import { checkInSubmissionCutoff, isCheckInSubmissionClosed } from '@/lib/checkInDeadline';
import { isEnrollmentWeekCheckIn, weekEndingFriday } from '@/lib/checkinWeeks';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';
import { missingCheckInWeeks } from '@/lib/checkInReminder';
import { isUnreleasedCheckIn, releasedFriday } from '@/lib/checkInRules';
import { currentSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';

const MIN_WAGE = 11.00; // Arkansas minimum wage — used server-side for reports only; students never set this
const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const OTHER_ACTIVITY_OPTIONS = ['Learning software', 'Research'];

function pad(n) { return String(n).padStart(2, '0'); }

function chicagoCalendarDate() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return { text: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday };
}

// The Friday that governs the week we're currently in (today/upcoming Fri, or yesterday if it's Saturday).
function currentDueFriday() {
  const { text, weekday } = chicagoCalendarDate();
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const offset = day <= 5 ? (5 - day) : -1;
  const [year, month, date] = text.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + offset)).toISOString().slice(0, 10);
}

function getSubmissionStatus(weekEnding) {
  if (!weekEnding) return { isLate: false, isBackdated: false };
  const { text: today, weekday } = chicagoCalendarDate();
  const due = currentDueFriday();
  const selectedWeek = weekEndingFriday(weekEnding);
  if (selectedWeek >= today) return { isLate: weekday === 'Sat' && selectedWeek === due, isBackdated: false };
  if (selectedWeek < due) return { isLate: false, isBackdated: true };
  return { isLate: false, isBackdated: false };
}

export default function CheckIns() {
  const { items, loading, reload } = useEntityList('WeeklyCheckIn');
  const { items: partners } = useEntityList('CommunityPartner');
  const { items: pitches } = useEntityList('ProjectPitch');
  const { items: exemptions, loading: exemptionsLoading, reload: reloadExemptions } = useEntityList('CheckInExemption');
  const { items: dismissals, loading: dismissalsLoading } = useEntityList('CheckInDismissal');
  const { items: users } = useEntityList('User');
  const { items: weeklyGoals, loading: weeklyGoalsLoading, reload: reloadWeeklyGoals } = useEntityList('WeeklyGoal');
  const { items: assignmentGrades, loading: assignmentGradesLoading } = useEntityList('AssignmentGrade');
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const requiredWeek = new URLSearchParams(window.location.search).get('requiredWeek') || '';
  const makeupWeek = new URLSearchParams(window.location.search).get('makeupWeek') || '';
  const goalWeekStart = currentGoalWeekStart();
  const myPitchIds = me ? pitches.filter(p => p.created_by_id === me.id || (p.tagged_emails || '').split(',').map(e => e.trim().toLowerCase()).includes((me.email || '').toLowerCase()) || (p.group_members || '').toLowerCase().includes((me.full_name || '').toLowerCase())).map(p => p.id) : [];
  const [periodFilter, setPeriodFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const students = users.filter(u => u.role !== 'admin' && !u.is_archived);
  const periodStudents = periodFilter ? students.filter(u => String(u.class_period) === periodFilter).slice().sort((a, b) => (a.display_name || a.full_name || a.email).localeCompare(b.display_name || b.full_name || b.email)) : [];
  const adminFiltered = periodFilter && studentFilter ? items.filter(item => item.created_by_id === studentFilter).slice().sort((a, b) => new Date(b.week_ending) - new Date(a.week_ending) || new Date(b.created_date) - new Date(a.created_date)) : [];
  const visibleItems = isAdmin ? adminFiltered : items.filter(x => (x.student_names || '').toLowerCase().includes((me?.full_name || '').toLowerCase()) || myPitchIds.includes(x.project_pitch_id));
  const approvedPitches = pitches.filter(p => p.approval_status === 'approved' && (isAdmin || myPitchIds.includes(p.id)));
  const missingWeeks = !isAdmin && me && !assignmentGradesLoading ? missingCheckInWeeks(me, items, exemptions, dismissals, new Date(), assignmentGrades) : [];
  const openMissingWeeks = missingWeeks.filter(week => !isCheckInSubmissionClosed(week, me) && !isNineWeeksClosed(week));
  const currentWeek = currentDueFriday();
  const defaultWeek = requiredWeek && openMissingWeeks.includes(requiredWeek) ? requiredWeek : openMissingWeeks.includes(currentWeek) ? currentWeek : openMissingWeeks[0] || currentWeek;
  const blank = { project_title: '', student_names: '', partner_name: '', project_pitch_id: '', week_ending: defaultWeek, hours: '', accomplishment: '', next_step: '', blocker: '', help_needed: '', confidence: 3, late_reason: '', evidence_links: [{ url: '', description: '' }], evidence_files: [{ url: '', description: '' }] };
  const [form, setForm] = useState(blank);
  const [otherProject, setOtherProject] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState('');
  const submittingRef = useRef(false);
  const initialWeekResolved = useRef(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [aiHints, setAiHints] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [driveConfirmed, setDriveConfirmed] = useState(false);
  const [lateReasonChoice, setLateReasonChoice] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [goalsRefreshed, setGoalsRefreshed] = useState(false);
  const draftKey = me?.id ? `weekly-check-in-draft:${me.id}` : '';
  const currentGoal = weeklyGoals.find(item => item.student_id === me?.id && item.week_start?.slice(0, 10) === goalWeekStart);
  const targetWeekEnding = isAdmin ? form.week_ending : weekEndingFriday(form.week_ending || defaultWeek);
  const currentWeekIsDue = !isAdmin && !editingId && targetWeekEnding === currentWeek && targetWeekEnding <= releasedFriday() && !isFullSchoolWeekClosed(targetWeekEnding) && !exemptions.some(item => weekEndingFriday(item.week_ending) === targetWeekEnding) && !dismissals.some(item => item.student_id === me?.id && weekEndingFriday(item.week_ending) === targetWeekEnding) && !isEnrollmentWeekCheckIn(me, targetWeekEnding) && !items.some(item => item.created_by_id === me?.id && item.approval_status !== 'rejected' && !['duplicate', 'extra'].includes(item.grade_status) && normalizedCheckInWeekEnding(item) === targetWeekEnding) && !assignmentGrades.some(item => item.student_id === me?.id && item.assignment_id === `weekly-${targetWeekEnding}` && item.points === 10 && !item.excused);
  const selectedWeekIsMissing = openMissingWeeks.includes(targetWeekEnding) || currentWeekIsDue;
  const goalBlocked = !isAdmin && goalsRefreshed && !weeklyGoalsLoading && !selectedWeekIsMissing && !isEnrollmentExemptWeek(me, goalWeekStart) && !currentGoal?.goal_submitted_at;
  useEffect(() => {
    if (!me?.id) return;
    setGoalsRefreshed(false);
    reloadWeeklyGoals().finally(() => setGoalsRefreshed(true));
    let saved;
    try { saved = JSON.parse(localStorage.getItem(`weekly-check-in-draft:${me.id}`) || 'null'); } catch { saved = null; }
    setForm(saved?.form ? { ...blank, ...saved.form, week_ending: requiredWeek && openMissingWeeks.includes(requiredWeek) ? requiredWeek : saved.form.week_ending || defaultWeek, student_names: saved.form.student_names || me.full_name || '' } : { ...blank, student_names: me.full_name || '' });
    setOtherProject(Boolean(saved?.otherProject));
    setDriveConfirmed(Boolean(saved?.driveConfirmed));
    setLateReasonChoice(saved?.lateReasonChoice || '');
    setDraftLoaded(true);
  }, [me?.id]);
  useEffect(() => {
    if (isAdmin || !me?.id || editingId || loading || exemptionsLoading || dismissalsLoading || assignmentGradesLoading) return;
    if (!initialWeekResolved.current) {
      initialWeekResolved.current = true;
      if (requiredWeek && openMissingWeeks.includes(requiredWeek)) {
        setForm(current => ({ ...current, week_ending: requiredWeek }));
        return;
      }
    }
    setForm(current => current.week_ending === currentWeek || openMissingWeeks.includes(current.week_ending) ? current : { ...current, week_ending: defaultWeek });
  }, [isAdmin, me?.id, editingId, loading, exemptionsLoading, dismissalsLoading, assignmentGradesLoading, requiredWeek, defaultWeek, currentWeek, openMissingWeeks.join(',')]);
  useLayoutEffect(() => {
    if (!draftLoaded || !draftKey || editingId) return;
    localStorage.setItem(draftKey, JSON.stringify({ form, otherProject, driveConfirmed, lateReasonChoice }));
  }, [draftLoaded, draftKey, editingId, form, otherProject, driveConfirmed, lateReasonChoice]);
  useEffect(() => {
    if (!draftLoaded || !draftKey || editingId) return undefined;
    const preserveDraft = () => localStorage.setItem(draftKey, JSON.stringify({ form, otherProject, driveConfirmed, lateReasonChoice }));
    const preserveHiddenDraft = () => { if (document.visibilityState === 'hidden') preserveDraft(); };
    window.addEventListener('pagehide', preserveDraft);
    document.addEventListener('visibilitychange', preserveHiddenDraft);
    return () => {
      window.removeEventListener('pagehide', preserveDraft);
      document.removeEventListener('visibilitychange', preserveHiddenDraft);
    };
  }, [draftLoaded, draftKey, editingId, form, otherProject, driveConfirmed, lateReasonChoice]);
  const status = getSubmissionStatus(targetWeekEnding);
  const isEarlyExtra = !isAdmin && !editingId && !selectedWeekIsMissing;
  const selectedDay = targetWeekEnding ? new Date(`${targetWeekEnding}T12:00:00`).getDay() : null;
  const checkInWasDue = selectedDay === 5 && !exemptions.some(item => item.week_ending === targetWeekEnding) && !isFullSchoolWeekClosed(targetWeekEnding);
  const currentSuggestedPoints = targetWeekEnding ? suggestedCheckInPoints({ week_ending: targetWeekEnding, original_submitted_at: new Date().toISOString() }, me) : 10;
  const requiresLateReview = checkInWasDue && currentSuggestedPoints < 10;
  const schoolYear = currentSchoolYearRange();
  const exemptWeeks = new Set(exemptions.map(item => weekEndingFriday(item.week_ending)));
  const pendingReviewRows = isAdmin ? buildWeeklyGrades(items.filter(item => inSchoolYear(item.week_ending, schoolYear) && !exemptWeeks.has(weekEndingFriday(item.week_ending))), users).map(row => ({ ...row, classPeriod: users.find(item => item.id === row.studentId)?.class_period })).filter(row => row.status === 'pending_review' && !isNineWeeksClosed(row.weekEnding)) : [];
  const errorClass = key => fieldErrors[key] ? 'border-red-500 ring-2 ring-red-500/20' : '';
  const suggestedPointsFor = item => suggestedCheckInPoints(item, users.find(user => user.id === item.created_by_id));

  const updateFileUrl = (i, url) => setForm(f => ({ ...f, evidence_files: f.evidence_files.map((x, idx) => idx === i ? { ...x, url } : x) }));
  const updateFileDesc = (i, description) => setForm(f => ({ ...f, evidence_files: f.evidence_files.map((x, idx) => idx === i ? { ...x, description } : x) }));
  const addFileRow = () => setForm(f => ({ ...f, evidence_files: [...f.evidence_files, { url: '', description: '' }] }));
  const removeFile = (i) => setForm(f => ({ ...f, evidence_files: f.evidence_files.filter((_, idx) => idx !== i) }));
  const addLink = () => setForm(f => ({ ...f, evidence_links: [...f.evidence_links, { url: '', description: '' }] }));
  const updateLinkUrl = (i, url) => setForm(f => ({ ...f, evidence_links: f.evidence_links.map((l, idx) => idx === i ? { ...l, url } : l) }));
  const updateLinkDesc = (i, description) => setForm(f => ({ ...f, evidence_links: f.evidence_links.map((l, idx) => idx === i ? { ...l, description } : l) }));
  const removeLink = (i) => setForm(f => ({ ...f, evidence_links: f.evidence_links.filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    if (loading || exemptionsLoading || dismissalsLoading || assignmentGradesLoading) return;
    setSubmissionNotice('');
    if (isNineWeeksClosed(targetWeekEnding)) {
      showSubmissionRequirements('This check-in belongs to a closed nine-weeks period and cannot be submitted or changed.');
      return;
    }
    if (!isAdmin && !selectedWeekIsMissing && !isEnrollmentExemptWeek(me, goalWeekStart)) {
      let submittedGoal = currentGoal?.goal_submitted_at ? currentGoal : null;
      if (!submittedGoal && me?.id) {
        const { items: matchingGoals } = await base44.entities.WeeklyGoal.filter({ student_id: me.id, week_start: goalWeekStart, goal_submitted_at: { $exists: true } }, { limit: 1 });
        submittedGoal = matchingGoals.find(item => item.goal_submitted_at);
      }
      if (!submittedGoal) { showSubmissionRequirements('Submit your weekly goal before completing a weekly check-in.'); return; }
    }
    if (!isAdmin && targetWeekEnding && isCheckInSubmissionClosed(targetWeekEnding, me)) {
      const { adjustedDeadline } = checkInSubmissionCutoff(targetWeekEnding, me);
      const message = `This weekly check-in is more than two weeks past your adjusted deadline of ${adjustedDeadline} and can no longer be submitted. Ask your teacher if you need an extension.`;
      setFieldErrors({ week_ending: message });
      showSubmissionRequirements(message);
      return;
    }
    const lateReason = lateReasonChoice === 'other' ? form.late_reason.trim() : lateReasonChoice;
    const links = form.evidence_links.filter(l => l.url.trim());
    const files = form.evidence_files.filter(f => f.url.trim());
    const errs = {};
    if (!form.project_title.trim()) errs.project_title = 'Select your approved project or enter another project or skill.';
    if (!form.student_names.trim()) errs.student_names = 'Enter your name and any teammates.';
    if (!form.partner_name) errs.partner_name = 'Select a community partner or “No community partner yet.”';
    if (!targetWeekEnding) errs.week_ending = 'Choose a Monday–Friday week-ending date.';
    if (form.hours === '' || Number(form.hours) < 0) errs.hours = 'Enter the hours you worked this week.';
    if (!form.accomplishment.trim()) errs.accomplishment = 'Write what you accomplished this week.';
    if (!form.next_step.trim()) errs.next_step = 'Write what your next step will be.';
    if (!form.blocker.trim()) errs.blocker = 'Describe a challenge or write “none.”';
    if (!form.help_needed.trim()) errs.help_needed = 'Describe the help you need or write “none.”';
    if (requiresLateReview && !lateReason) errs.late_reason = 'Choose why this check-in is late, or type your reason.';
    if (!links.length && !files.length) errs.evidence = 'Attach at least one Google Drive file link or other evidence link.';
    else if (links.some(l => !l.description.trim()) || files.some(f => !f.description.trim())) errs.evidence = 'Add a short description for every file or link you attached.';
    if (files.length && !driveConfirmed) errs.evidence = 'Check the box confirming your Google Drive file is shared with your school.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      showSubmissionRequirements(`Please correct these items: ${Object.values(errs).join(' ')}`);
      document.getElementById('check-in-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const aiKey = `weekly-ai-checks:${me?.id || 'student'}:${targetWeekEnding}:${form.project_title}`;
    const previousAiChecks = Number(localStorage.getItem(aiKey) || 0);
    const bypassAi = previousAiChecks >= 2;
    let evidenceAnalysis = [];
    if (!bypassAi || links.length || files.length) {
      setChecking(true);
      let result;
      try {
        // Once written-answer review is bypassed (two failed attempts), drop the
        // written-answer validation block, the written answers themselves, and
        // the recommendation context from the prompt and schema — only the
        // evidence inspection is still needed, so the call uses far fewer tokens.
        const evidenceJson = JSON.stringify([...links, ...files]);
        const evidenceInstructions = `For every evidence URL, inspect its public content when available. Set accessible=false if it requires login, is blocked, or cannot be confidently inspected. Summarize only content actually visible. Identify concrete learning or skills demonstrated and concise standards-relevant evidence, but never assume the student personally created everything merely because they linked it. If the evidence is vague, inaccessible, or does not clearly support the check-in, give one easy, useful suggestion such as changing sharing permissions, linking a specific page, adding a screenshot, or improving the description. Evidence review is advisory and must never prevent submission. Treat tagged team work as project context, not proof that this student personally completed it.`;
        const evidenceSchema = { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, accessible: { type: 'boolean' }, summary: { type: 'string' }, demonstrated_learning: { type: 'string' }, standards_evidence: { type: 'string' }, suggestion: { type: 'string' } }, required: ['url', 'accessible', 'summary', 'demonstrated_learning', 'standards_evidence', 'suggestion'] } };
        if (bypassAi) {
          result = await base44.integrations.Core.InvokeLLM({
            prompt: `Inspect this student's weekly check-in evidence links and review each one.\n\nPUBLIC EVIDENCE TO INSPECT:\n${evidenceJson}\n\n${evidenceInstructions}`,
            add_context_from_internet: true,
            model: 'gemini_3_flash',
            response_json_schema: { type: 'object', properties: { evidence_reviews: evidenceSchema }, required: ['evidence_reviews'] },
          });
        } else {
          const recommendationContext = buildStudentRecommendationContext(me, { goals: weeklyGoals, pitches, checkIns: items });
          result = await base44.integrations.Core.InvokeLLM({
            prompt: `Review this student's weekly check-in and its evidence links. For the written answers, use a very lenient 2nd-grade reading/writing bar: short answers, typos, and simple grammar are fine; invalid means only blank, random gibberish, or no attempt to answer. Give a short suggestion for an invalid answer without writing it for the student.

Accomplished: "${form.accomplishment}"
Next step: "${form.next_step}"
Challenges: "${form.blocker}"

PUBLIC EVIDENCE TO INSPECT:
${evidenceJson}

${evidenceInstructions}

${recommendationContext}`,
            add_context_from_internet: true,
            model: 'gemini_3_flash',
            response_json_schema: { type: 'object', properties: { accomplishment_valid: { type: 'boolean' }, accomplishment_hint: { type: 'string' }, next_step_valid: { type: 'boolean' }, next_step_hint: { type: 'string' }, blocker_valid: { type: 'boolean' }, blocker_hint: { type: 'string' }, evidence_reviews: evidenceSchema }, required: ['accomplishment_valid', 'accomplishment_hint', 'next_step_valid', 'next_step_hint', 'blocker_valid', 'blocker_hint', 'evidence_reviews'] },
          });
        }
      } catch {
        result = null;
      }
      setChecking(false);
      evidenceAnalysis = result?.evidence_reviews || [];
      if (result && !bypassAi) {
        const fieldErrs = {}, hints = [];
        if (!result.accomplishment_valid) { fieldErrs.accomplishment = 'Please write a real answer about what you accomplished.'; hints.push({ label: 'What did you accomplish', hint: result.accomplishment_hint }); }
        if (!result.next_step_valid) { fieldErrs.next_step = 'Please write a real answer about your next step.'; hints.push({ label: 'Next step', hint: result.next_step_hint }); }
        if (!result.blocker_valid) { fieldErrs.blocker = 'Please write a real answer (or "none") about any challenges.'; hints.push({ label: 'Challenges', hint: result.blocker_hint }); }
        if (hints.length) { localStorage.setItem(aiKey, String(previousAiChecks + 1)); setFieldErrors(fieldErrs); setAiHints(hints); return; }
      }
    }
    setFieldErrors({});
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const hours = Number(form.hours);
    const submittedAt = new Date().toISOString();
    const editingEntry = items.find(item => item.id === editingId);
    const originalSubmittedAt = editingEntry?.original_submitted_at || editingEntry?.created_date || submittedAt;
    const effectiveWeekEnding = normalizedCheckInWeekEnding({ week_ending: targetWeekEnding, original_submitted_at: originalSubmittedAt });
    const suggestedPoints = suggestedCheckInPoints({ week_ending: effectiveWeekEnding, original_submitted_at: originalSubmittedAt }, me);
    const alreadyFulfilled = items.some(item => item.created_by_id === me?.id && item.approval_status !== 'rejected' && !['duplicate', 'extra'].includes(item.grade_status) && normalizedCheckInWeekEnding(item) === effectiveWeekEnding && item.id !== editingId);
    const isExcusedWeek = exemptions.some(item => weekEndingFriday(item.week_ending) === effectiveWeekEnding) || dismissals.some(item => item.student_id === me?.id && weekEndingFriday(item.week_ending) === effectiveWeekEnding);
    const lateSubmission = !alreadyFulfilled && !isExcusedWeek && suggestedPoints < 10;
    const returnedEntry = !editingId && selectedWeekIsMissing ? items.find(item => item.created_by_id === me?.id && item.approval_status === 'rejected' && normalizedCheckInWeekEnding(item) === effectiveWeekEnding) : null;
    const existingEntry = editingEntry || returnedEntry;
    const targetId = existingEntry?.id;
    const authoritativeSubmittedAt = existingEntry?.original_submitted_at || existingEntry?.created_date || originalSubmittedAt;
    const gradeEligible = isCheckInGradeEligible({ week_ending: effectiveWeekEnding, original_submitted_at: authoritativeSubmittedAt }, me);
    const gradeWeekEnding = effectiveWeekEnding;
    const existingWeeklyGrade = items.some(item => item.created_by_id === me?.id && normalizedCheckInWeekEnding(item) === gradeWeekEnding && item.id !== targetId && item.approval_status !== 'rejected' && !['duplicate', 'extra'].includes(item.grade_status));
    const needsGradeReview = lateSubmission || !gradeEligible;
    const extra = !isAdmin && !existingEntry && !selectedWeekIsMissing && !currentWeekIsDue;
    const grade_status = existingEntry?.grade_status === 'reviewed' ? 'reviewed' : extra ? 'extra' : existingWeeklyGrade ? 'duplicate' : needsGradeReview ? 'pending_review' : 'auto';
    const gradeValue = grade_status === 'extra' || grade_status === 'duplicate' ? undefined : grade_status === 'reviewed' ? existingEntry.grade : suggestedPoints;
    const selectedPitch = pitches.find(pitch => pitch.id === form.project_pitch_id);
    const memberIds = [...new Set([me?.id, ...(selectedPitch?.member_ids || [])].filter(Boolean))];
    const memberEmails = [...new Set([me?.email?.toLowerCase(), ...(selectedPitch?.member_emails || [])].filter(Boolean))];
    const approvalStatus = grade_status === 'extra' ? 'approved' : editingId || needsGradeReview ? 'pending' : 'approved';
    const changes = { ...form, week_ending: effectiveWeekEnding, member_ids: memberIds, member_emails: memberEmails, late_reason: lateReason, evidence_links: links, evidence_files: files, evidence_analysis: evidenceAnalysis, hours, hourly_value: MIN_WAGE, confidence: Number(form.confidence), is_late: lateSubmission, is_backdated: status.isBackdated, approval_status: approvalStatus, ai_review_flag: bypassAi && gradeEligible, grade: gradeValue, grade_status, original_submitted_at: authoritativeSubmittedAt };
    let checkIn;
    try {
      if (targetId) checkIn = await base44.entities.WeeklyCheckIn.update(targetId, changes);
      else checkIn = await base44.entities.WeeklyCheckIn.create(changes);
      const savedCheckIn = await base44.entities.WeeklyCheckIn.get(checkIn.id);
      const answerFields = ['accomplishment', 'next_step', 'blocker', 'help_needed'];
      const answersSaved = answerFields.every(field => String(savedCheckIn?.[field] || '').trim() === String(changes[field] || '').trim());
      if (!answersSaved) throw new Error('The written answers were not confirmed after saving.');
      checkIn = savedCheckIn;
      if (targetId) setEditingId(null);
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setSubmissionNotice('Your check-in was not confirmed as saved. Your answers are still here—please submit again.');
      return;
    }
    if (approvalStatus === 'approved') {
      const serviceEntries = await base44.entities.ServiceEntry.filter({ weekly_check_in_id: checkIn.id });
      const serviceChanges = { project_title: form.project_title, project_pitch_id: form.project_pitch_id, student_names: me?.full_name || form.student_names, student_emails: me?.email || '', member_ids: [me.id], member_emails: [me.email.toLowerCase()], partner_name: form.partner_name, service_date: effectiveWeekEnding, hours, hourly_value: MIN_WAGE, description: form.accomplishment, weekly_check_in_id: checkIn.id };
      if (serviceEntries.length) await base44.entities.ServiceEntry.update(serviceEntries[0].id, serviceChanges);
      else await base44.entities.ServiceEntry.create(serviceChanges);
    }
    const remainingMissingCount = Math.max(0, missingWeeks.length - (selectedWeekIsMissing && !alreadyFulfilled && !isExcusedWeek ? 1 : 0));
    const remainingNotice = remainingMissingCount > 0 ? ` ${remainingMissingCount} missing check-in${remainingMissingCount === 1 ? '' : 's'} remaining.` : '';
    const notice = grade_status === 'extra'
      ? `Check-in saved for ${effectiveWeekEnding} as an extra. It does not count toward a grade${isUnreleasedCheckIn(effectiveWeekEnding, new Date(submittedAt)) ? " because this week's assignment releases Thursday" : ' because no required check-in is currently due'}.${remainingNotice}`
      : grade_status === 'duplicate'
      ? `Check-in submitted successfully for ${effectiveWeekEnding}. A check-in for that week was already on file, so this copy will not count twice.${remainingNotice}`
      : approvalStatus === 'pending'
        ? `Check-in submitted successfully for ${effectiveWeekEnding} and sent to your teacher for review.${remainingNotice}`
        : `Check-in submitted successfully for ${effectiveWeekEnding}.${remainingNotice}`;
    localStorage.removeItem(aiKey); if (draftKey) localStorage.removeItem(draftKey); setForm({ ...blank, student_names: me?.full_name || '' }); setOtherProject(false); setDriveConfirmed(false); setLateReasonChoice(''); await reload(); setSubmissionNotice(notice);
    submittingRef.current = false;
    setSubmitting(false);
  };
  const startEdit = (item) => {
    if (!isAdmin && isNineWeeksClosed(weekEndingFriday(item.week_ending))) return;
    setEditingId(item.id);
    setForm({
      project_title: item.project_title || '', student_names: item.student_names || '', partner_name: item.partner_name || '',
      project_pitch_id: item.project_pitch_id || '', week_ending: item.week_ending || '', hours: item.hours ?? '',
      accomplishment: item.accomplishment || '', next_step: item.next_step || '', blocker: item.blocker || '',
      help_needed: item.help_needed || '', confidence: item.confidence || 3, late_reason: item.late_reason || '',
      evidence_links: item.evidence_links?.length ? item.evidence_links : [{ url: '', description: '' }],
      evidence_files: item.evidence_files?.length ? item.evidence_files : [{ url: '', description: '' }],
    });
    setLateReasonChoice(['I just forgot', 'Sick'].includes(item.late_reason) ? item.late_reason : item.late_reason ? 'other' : '');
    setOtherProject(!item.project_pitch_id);
    setFieldErrors({});
    setDriveConfirmed((item.evidence_files || []).some(f => f.url?.trim()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(blank); setOtherProject(false); setFieldErrors({}); setDriveConfirmed(false); setLateReasonChoice(''); };
  const ensureServiceEntry = async (item) => {
    const existing = await base44.entities.ServiceEntry.filter({ weekly_check_in_id: item.id });
    if (existing.length) return;
    const submitter = users.find(u => u.id === item.created_by_id);
    await base44.entities.ServiceEntry.create({ project_title: item.project_title, project_pitch_id: item.project_pitch_id, student_names: submitter?.full_name || item.student_names, student_emails: submitter?.email || '', member_ids: submitter?.id ? [submitter.id] : [], member_emails: submitter?.email ? [submitter.email.toLowerCase()] : [], partner_name: item.partner_name, service_date: item.week_ending, hours: item.hours, hourly_value: item.hourly_value || MIN_WAGE, description: item.accomplishment, weekly_check_in_id: item.id });
  };
  const grade = async (item, value) => {
    if (isNineWeeksClosed(weekEndingFriday(item.week_ending))) return;
    await base44.entities.WeeklyCheckIn.update(item.id, { grade: Number(value), grade_status: 'reviewed', ai_review_flag: false, approval_status: item.approval_status === 'pending' ? 'approved' : item.approval_status || 'approved' });
    if (item.approval_status !== 'rejected') await ensureServiceEntry(item);
    reload();
  };
  const clearAiFlag = async (item) => { await base44.entities.WeeklyCheckIn.update(item.id, { ai_review_flag: false }); reload(); };
  const returnCheckIn = async (item, feedback) => {
    if (isNineWeeksClosed(weekEndingFriday(item.week_ending))) return;
    await base44.entities.WeeklyCheckIn.update(item.id, { approval_status: 'rejected' });
    if (feedback) await base44.entities.Comment.create({ parent_type: 'check_in', parent_id: item.id, message: feedback, author_name: me?.full_name || 'Teacher', author_role: 'admin', member_ids: [item.created_by_id], member_emails: [item.created_by || ''].filter(Boolean) });
    reload();
  };
  const approveCheckIn = async (item) => {
    if (isNineWeeksClosed(weekEndingFriday(item.week_ending))) return;
    await base44.entities.WeeklyCheckIn.update(item.id, { approval_status: 'approved' });
    await ensureServiceEntry(item);
    reload();
  };

  return <><PageHeader title="Weekly Check-Ins" description="A required weekly assignment: log this week's service hours plus a short reflection worth a quick 10-point progress grade." />
    {!isAdmin && <MissingCheckInsSection />}
    {!isAdmin && <CheckInMakeupSection preselectWeek={makeupWeek} />}
    {isAdmin && <CheckInExemptionManager exemptions={exemptions} reload={reloadExemptions} />}
    {isAdmin && <CheckInViewerFilters periods={PERIODS} students={periodStudents} period={periodFilter} student={studentFilter} onPeriodChange={value => { setPeriodFilter(value); setStudentFilter(''); }} onStudentChange={setStudentFilter} />}
    {isAdmin && pendingReviewRows.length > 0 && <WeeklyGradebook rows={pendingReviewRows} isAdmin reload={reload} />}
    {goalBlocked && <p className="mb-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm font-semibold text-primary">Submit your weekly goal before completing a weekly check-in.</p>}
    {submissionNotice && <div role="status" className="mb-3 rounded-lg border border-success/50 bg-success/10 p-4 text-sm font-semibold text-foreground">{submissionNotice}</div>}
    <form noValidate onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-2">
      {Object.keys(fieldErrors).length > 0 && <div id="check-in-errors" className="rounded-lg border-2 border-red-500 bg-red-500/10 p-3 text-sm font-semibold text-red-700 md:col-span-2"><p>Please correct the red fields below:</p><ul className="mt-1 list-disc space-y-1 pl-5">{Object.values(fieldErrors).map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
      <div>
        <select className={errorClass('project_title')} required={!otherProject} value={otherProject ? '__other__' : form.project_pitch_id} onChange={e => {
          if (e.target.value === '__other__') { setOtherProject(true); setForm({ ...form, project_pitch_id: '', project_title: '' }); return; }
          const p = pitches.find(x => x.id === e.target.value);
          setOtherProject(false);
          setForm({ ...form, project_pitch_id: e.target.value, project_title: p ? p.project_title : '' });
        }}>
          <option value="">Select your approved project…</option>
          {approvedPitches.map(p => <option key={p.id} value={p.id}>{p.project_title}</option>)}
          <option value="__other__">Other — write in project name or skill</option>
        </select>
        {otherProject && <div className="mt-2 space-y-2"><select className={errorClass('project_title')} value={OTHER_ACTIVITY_OPTIONS.includes(form.project_title) ? form.project_title : '__custom__'} onChange={e => setForm({ ...form, project_title: e.target.value === '__custom__' ? '' : e.target.value })}><option value="__custom__">Other project or skill — write in</option>{OTHER_ACTIVITY_OPTIONS.map(activity => <option key={activity} value={activity}>{activity}</option>)}</select>{!OTHER_ACTIVITY_OPTIONS.includes(form.project_title) && <input className={errorClass('project_title')} required placeholder="Project name or skill" value={form.project_title} onChange={e => setForm({ ...form, project_title: e.target.value })} />}</div>}
        {fieldErrors.project_title && <p className="mt-1 text-xs font-semibold text-red-700">{fieldErrors.project_title}</p>}
      </div>
      <div><input className={errorClass('student_names')} required placeholder="Student names (add teammates, comma separated)" value={form.student_names} onChange={e => setForm({ ...form, student_names: e.target.value })} />{fieldErrors.student_names && <p className="mt-1 text-xs font-semibold text-red-700">{fieldErrors.student_names}</p>}</div>
      <div><select className={errorClass('partner_name')} required value={form.partner_name} onChange={e => setForm({ ...form, partner_name: e.target.value })}><option value="">Select community partner…</option><option value="No community partner yet">No community partner yet</option>{partners.map(p => <option key={p.id} value={p.contact_name || p.name}>{p.contact_name || p.name}</option>)}</select>{fieldErrors.partner_name && <p className="mt-1 text-xs font-semibold text-red-700">{fieldErrors.partner_name}</p>}</div>
      {isAdmin ? <CheckInWeekSelector value={form.week_ending} onChange={(week_ending) => setForm({ ...form, week_ending })} error={fieldErrors.week_ending} maxDate={currentWeek} /> : <label className="east-label">Week this check-in is for<select value={targetWeekEnding} onChange={e => setForm(current => ({ ...current, week_ending: e.target.value }))}>{openMissingWeeks.map(week => <option key={week} value={week}>Week ending {week}{week === currentWeek ? ' (this week)' : ' (missing)'}</option>)}{!openMissingWeeks.includes(currentWeek) && <option value={currentWeek}>Week ending {currentWeek}{currentWeekIsDue ? ' (this week)' : ' (extra — not graded)'}</option>}</select><span className="mt-1 block font-normal text-muted-foreground">{selectedWeekIsMissing ? `This check-in will count for the week ending ${targetWeekEnding}. Submission time is saved automatically.` : 'This check-in will be saved as an extra and will not count toward a grade.'}</span></label>}
      <div><input className={errorClass('hours')} required type="number" step=".25" min="0" placeholder="Hours worked this week" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />{fieldErrors.hours && <p className="mt-1 text-xs font-semibold text-red-700">{fieldErrors.hours}</p>}</div>
      <select value={form.confidence} onChange={e => setForm({ ...form, confidence: e.target.value })}><option value="1">Confidence: 1 — stuck</option><option value="2">Confidence: 2</option><option value="3">Confidence: 3 — steady</option><option value="4">Confidence: 4</option><option value="5">Confidence: 5 — strong</option></select>
      <CheckInLongAnswerField field="accomplishment" placeholder="What did you accomplish?" value={form.accomplishment} onChange={accomplishment => setForm({ ...form, accomplishment })} error={fieldErrors.accomplishment} />
      <CheckInLongAnswerField field="next_step" placeholder="What is your next step?" value={form.next_step} onChange={next_step => setForm({ ...form, next_step })} error={fieldErrors.next_step} />
      <CheckInLongAnswerField field="blocker" placeholder="Any challenges? (write 'none' if not)" value={form.blocker} onChange={blocker => setForm({ ...form, blocker })} error={fieldErrors.blocker} />
      <CheckInLongAnswerField field="help_needed" placeholder="What do you need help with? (write 'none' if not)" value={form.help_needed} onChange={help_needed => setForm({ ...form, help_needed })} error={fieldErrors.help_needed} />
      {requiresLateReview && status.isBackdated && <p className="text-xs font-semibold text-amber-700 md:col-span-2">This required week ending date is in the past — this check-in will be sent to your teacher for approval.</p>}
      {requiresLateReview && status.isLate && <p className="text-xs font-semibold text-red-700 md:col-span-2">This week's Friday deadline has passed — this will be marked late.</p>}
      {requiresLateReview && <div className="grid gap-2 md:col-span-2"><label className="east-label">Why is this late?<select className={errorClass('late_reason')} required value={lateReasonChoice} onChange={e => setLateReasonChoice(e.target.value)}><option value="">Choose a reason…</option><option value="I just forgot">I just forgot</option><option value="Sick">Sick</option><option value="other">Other reason</option></select></label>{lateReasonChoice === 'other' && <label className="east-label">Tell your teacher why<input className={errorClass('late_reason')} required placeholder="Type why it is late" value={form.late_reason} onChange={e => setForm({ ...form, late_reason: e.target.value })} /></label>}{fieldErrors.late_reason && <p className="text-xs font-semibold text-red-700">{fieldErrors.late_reason}</p>}</div>}
      <div className={`md:col-span-2 grid gap-3 rounded-lg border p-3 ${fieldErrors.evidence ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200'}`}>
        <p className="text-xs font-semibold text-slate-600">Evidence — at least one Google Drive file link or link is required, each needs a short description</p>
        {form.evidence_files.map((f, i) => <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input placeholder="Paste Google Drive share link" value={f.url} onChange={e => updateFileUrl(i, e.target.value)} className="flex-1" />
          <input required={!!f.url} placeholder="Describe this file (required)" value={f.description} onChange={e => updateFileDesc(i, e.target.value)} className="flex-1" />
          {form.evidence_files.length > 1 && <button type="button" onClick={() => removeFile(i)} className="text-xs font-semibold text-red-600">Remove</button>}
        </div>)}
        <button type="button" onClick={addFileRow} className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add another Google Drive link</button>
        {form.evidence_files.some(f => f.url.trim()) && <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">
          <input type="checkbox" className="mt-0.5 h-4 w-4 min-h-0" checked={driveConfirmed} onChange={e => setDriveConfirmed(e.target.checked)} />
          I confirm I made this Google Drive file public/shared with your school so my teacher can view it.
        </label>}
        {form.evidence_links.map((l, i) => <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input placeholder="Link URL" value={l.url} onChange={e => updateLinkUrl(i, e.target.value)} className="flex-1" />
          <input required={!!l.url} placeholder="Describe this link (required)" value={l.description} onChange={e => updateLinkDesc(i, e.target.value)} className="flex-1" />
          {form.evidence_links.length > 1 && <button type="button" onClick={() => removeLink(i)} className="text-xs font-semibold text-red-600">Remove</button>}
        </div>)}
        <button type="button" onClick={addLink} className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add another link</button>
        {fieldErrors.evidence && <p className="text-xs font-semibold text-red-700">{fieldErrors.evidence}</p>}
      </div>
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" disabled={loading || exemptionsLoading || dismissalsLoading || assignmentGradesLoading || checking || submitting} className="east-button">{checking ? 'Checking answers and evidence…' : submitting ? 'Submitting…' : editingId ? 'Resubmit check-in' : isEarlyExtra ? 'Save extra check-in' : 'Submit required check-in'}</button>
        {editingId && <button type="button" onClick={cancelEdit} className="rounded-lg border px-4 text-sm font-semibold text-slate-600">Cancel edit</button>}
      </div>
    </form>
    {loading ? <p>Loading…</p> : !visibleItems.length ? <EmptyState>{isAdmin && (!periodFilter || !studentFilter) ? 'Select a class period and student name to view weekly check-ins.' : 'No weekly check-ins found for this student.'}</EmptyState> : <div className="space-y-3">{visibleItems.map(x => <article key={x.id} className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{x.project_title}</h3>
          <p className="text-xs text-slate-500">{x.student_names} · {x.partner_name} · Week ending {x.week_ending} · Submitted {new Date(x.original_submitted_at || x.created_date).toLocaleString()} · {x.hours} hrs</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {x.grade_status === 'extra' && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Extra — not graded</span>}
             {x.approval_status === 'pending' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Pending approval</span>}
            {x.grade_status !== 'extra' && (suggestedPointsFor(x) < 10 ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Late — {suggestedPointsFor(x)}/10 suggested because this was submitted after the absence-adjusted deadline</span> : x.grade_status === 'pending_review' && !isCheckInGradeEligible(x, users.find(user => user.id === x.created_by_id)) && (x.is_late || x.is_backdated) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Late/backdated — teacher grade review required</span>)}
            {x.approval_status === 'rejected' && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Rejected</span>}
            {x.is_late && !isCheckInGradeEligible(x, users.find(user => user.id === x.created_by_id)) && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Late</span>}
            {x.is_backdated && !isCheckInGradeEligible(x, users.find(user => user.id === x.created_by_id)) && suggestedPointsFor(x) === 10 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Backdated</span>}
            {isAdmin && x.ai_review_flag && <span className="rounded-full bg-neon-magenta/15 px-2 py-0.5 text-xs font-semibold text-neon-magenta">Submitted after two AI suggestions</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && !isNineWeeksClosed(weekEndingFriday(x.week_ending)) && x.grade_status !== 'extra' ? <label className="text-xs font-semibold text-slate-600">Grade / 10 <input className="ml-2 w-16" type="number" min="0" max="10" defaultValue={x.grade ?? ''} onBlur={e => e.target.value !== '' && grade(x, e.target.value)} /></label> : x.grade_status === 'extra' ? <span className="text-xs text-muted-foreground">Not graded</span> : x.grade_status === 'pending_review' ? <span className="text-xs font-semibold text-amber-700">Grade pending review</span> : x.grade != null && <span className="text-xs font-semibold text-slate-600">Grade: {x.grade}/10</span>}
          {isAdmin && x.ai_review_flag && <button onClick={() => clearAiFlag(x)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Mark reviewed</button>}
          {isAdmin && !isNineWeeksClosed(weekEndingFriday(x.week_ending)) && x.approval_status === 'pending' && <button onClick={() => approveCheckIn(x)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>}
          {isAdmin && !isNineWeeksClosed(weekEndingFriday(x.week_ending)) && x.approval_status !== 'rejected' && <RejectWithFeedback onReject={(feedback) => returnCheckIn(x, feedback)} label="Return to student" confirmLabel="Confirm return" />}
          {!isAdmin && x.approval_status === 'rejected' && x.created_by_id === me?.id && !isNineWeeksClosed(weekEndingFriday(x.week_ending)) && <button onClick={() => startEdit(x)} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Edit &amp; resubmit</button>}
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <p><b>Accomplished:</b> {x.accomplishment}</p>
        <p><b>Next:</b> {x.next_step}</p>
        <p><b>Challenges:</b> {x.blocker || 'None'} · Confidence {x.confidence}/5</p>
        <p><b>Help needed:</b> {x.help_needed || 'None'}</p>
        {x.late_reason && <p className="md:col-span-3"><b>Late/backdate reason:</b> {x.late_reason}</p>}
        {(x.evidence_links || []).map((l, i) => <p key={`l${i}`} className="md:col-span-3"><b>Evidence link:</b> <a href={l.url} target="_blank" rel="noreferrer" className="text-cyan-700 underline">{l.url}</a>{l.description && <> — {l.description}</>}</p>)}
        {(x.evidence_files || []).map((f, i) => <p key={`f${i}`} className="md:col-span-3"><b>Evidence file:</b> <a href={f.url} target="_blank" rel="noreferrer" className="text-cyan-700 underline">{f.description || 'View'}</a></p>)}
        <EvidenceAnalysisView analysis={x.evidence_analysis} />
      </div>
      {x.approval_status === 'rejected' && <ConversationThread parentType="check_in" parentId={x.id} memberIds={[x.created_by_id]} memberEmails={[x.created_by || ''].filter(Boolean)} me={me} />}
    </article>)}</div>}
    <AiFeedbackModal hints={aiHints} onClose={() => setAiHints(null)} />
  </>;
}