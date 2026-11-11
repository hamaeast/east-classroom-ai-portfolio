import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useReadingDraft from '@/hooks/useReadingDraft';
import ReadingAssignmentContent from '@/components/east/ReadingAssignmentContent';
import ReadingAssignmentFrame from '@/components/east/ReadingAssignmentFrame';

export default function ReadingAssignmentModal({ assignment, studentId, existingResponse, existingDraft, onClose, onSubmitted, previewMode = false }) {
  const queryClient = useQueryClient();
  const [submission, setSubmission] = useState(existingResponse);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  useEffect(() => { if (existingResponse) setSubmission(existingResponse); }, [existingResponse]);
  const questions = assignment.questions?.length ? assignment.questions.map(({ correct_choice, answer_key, ...question }) => question) : [{ id: 'free-response', type: 'free_response', prompt: 'Your response', points: assignment.max_points }];
  const { answers, setAnswers, savingDraft, draftError, persistDraftLocally, flushDraft, clearDraft } = useReadingDraft({ assignmentId: assignment.id, studentId, existingDraft, submittedAnswers: submission?.answers, disabled: previewMode || Boolean(submission) || saving });
  const remaining = questions.filter(item => !String(answers[item.id] ?? '').trim()).length;
  const closeAssignment = () => { persistDraftLocally(); void flushDraft().catch(() => {}); onClose?.(); };
  const submit = async event => {
    event.preventDefault();
    if (previewMode || submission || remaining || inFlight.current || !studentId) return;
    persistDraftLocally(); inFlight.current = true; setSaving(true); setError('');
    try {
      const payload = { assignmentId: assignment.id, answers: questions.map(item => ({ question_id: item.id, answer: String(answers[item.id] ?? '') })) };
      if (!assignment.questions?.length) payload.responseText = answers['free-response'];
      await flushDraft().catch(() => {});
      const { data } = await base44.functions.invoke('scoreReadingAssignment', payload);
      if (!data?.response?.id) throw new Error('Your turn-in was not confirmed. Your answers are still here; please try again.');
      setSubmission(data.response);
      const cacheRecord = (entity, record) => queryClient.setQueriesData({ queryKey: ['entity', entity] }, old => Array.isArray(old) ? [...old.filter(item => item.id !== record.id), record] : old);
      cacheRecord('ReadingResponse', data.response);
      if (data.grade) cacheRecord('AssignmentGrade', data.grade);
      await Promise.allSettled([clearDraft(), onSubmitted?.(), queryClient.invalidateQueries({ queryKey: ['entity', 'AssignmentGrade'] }), queryClient.invalidateQueries({ queryKey: ['entity', 'AssignmentReminder'] })]);
    } catch (err) { setError(err.response?.data?.error || err.data?.error || err.message || 'Your assignment could not be submitted. Your answers are still here; please try again.'); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return <ReadingAssignmentFrame assignment={assignment} previewMode={previewMode} saving={saving} submission={submission} remaining={remaining} savingDraft={savingDraft} draftError={draftError} onClose={onClose ? closeAssignment : undefined} onSubmit={submit}><ReadingAssignmentContent assignment={assignment} questions={questions} answers={answers} setAnswers={setAnswers} submission={submission} saving={saving} error={error} /></ReadingAssignmentFrame>;
}