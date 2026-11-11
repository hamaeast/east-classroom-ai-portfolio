import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { draftAnswerObject, readReadingDraft, writeReadingDraft, removeReadingDraft } from '@/lib/readingDraftStorage';

export default function useReadingDraft({ assignmentId, studentId, existingDraft, submittedAnswers, disabled }) {
  const storageKey = `reading-draft:${studentId || 'preview'}:${assignmentId}`;
  const [answers, updateState] = useState(() => submittedAnswers ? draftAnswerObject({ answers: submittedAnswers }) : { ...draftAnswerObject(existingDraft), ...readReadingDraft(storageKey) });
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const current = useRef(answers), draftId = useRef(existingDraft?.id || null), timer = useRef(null), queue = useRef(Promise.resolve()), cleared = useRef(false);
  const persistDraftLocally = useCallback(() => {
    if (disabled || !studentId || cleared.current) return;
    if (!writeReadingDraft(storageKey, current.current)) setDraftError('This browser cannot save a backup. Keep this assignment open until you submit.');
  }, [disabled, studentId, storageKey]);
  const setAnswers = useCallback(value => {
    const next = typeof value === 'function' ? value(current.current) : value;
    current.current = next;
    if (!disabled && studentId) writeReadingDraft(storageKey, next);
    updateState(next);
  }, [disabled, studentId, storageKey]);
  useEffect(() => {
    if (submittedAnswers) { const next = draftAnswerObject({ answers: submittedAnswers }); current.current = next; updateState(next); return; }
    if (!existingDraft?.id) return;
    draftId.current = existingDraft.id;
    if (!Object.keys(current.current).length) { const next = draftAnswerObject(existingDraft); current.current = next; updateState(next); }
  }, [existingDraft, submittedAnswers]);
  const saveDraft = useCallback(currentAnswers => {
    if (disabled || !studentId || cleared.current || !Object.values(currentAnswers).some(value => String(value ?? '').trim())) return Promise.resolve();
    const task = queue.current.then(async () => {
      if (cleared.current) return;
      setSavingDraft(true);
      try {
        const data = { assignment_id: assignmentId, student_id: studentId, answers: Object.entries(currentAnswers).map(([question_id, answer]) => ({ question_id, answer: String(answer ?? '') })) };
        if (draftId.current) await base44.entities.ReadingDraft.update(draftId.current, data);
        else draftId.current = (await base44.entities.ReadingDraft.create(data)).id;
        setDraftError('');
      } finally { setSavingDraft(false); }
    });
    queue.current = task.catch(() => setDraftError('Online draft saving is delayed. Your answers are kept in this browser; you can still submit.'));
    return task;
  }, [assignmentId, disabled, studentId]);
  useEffect(() => {
    if (disabled) return;
    persistDraftLocally();
    timer.current = setTimeout(() => { void saveDraft(answers).catch(() => {}); }, 700);
    return () => clearTimeout(timer.current);
  }, [answers, disabled, persistDraftLocally, saveDraft]);
  useEffect(() => {
    if (disabled) return;
    window.addEventListener('pagehide', persistDraftLocally);
    return () => window.removeEventListener('pagehide', persistDraftLocally);
  }, [disabled, persistDraftLocally]);
  const flushDraft = async () => { clearTimeout(timer.current); persistDraftLocally(); await saveDraft(current.current); };
  const clearDraft = async () => { cleared.current = true; clearTimeout(timer.current); await queue.current; if (draftId.current) await base44.entities.ReadingDraft.delete(draftId.current); draftId.current = null; removeReadingDraft(storageKey); };
  return { answers, setAnswers, savingDraft, draftError, persistDraftLocally, flushDraft, clearDraft };
}