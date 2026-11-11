import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { chicagoToday } from '@/lib/weeklyGoals';
import { isInstructionDay } from '@/lib/schoolCalendar';
import DictationButton from './DictationButton';
import SpeakTextButton from './SpeakTextButton';

export default function DailyDoNowPopup({ student }) {
  const { items: questions, loading: loadingQuestions } = useEntityList('DoNowQuestion');
  const { items: responses, loading: loadingResponses, reload } = useEntityList('DoNowResponse');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = chicagoToday();
  const question = isInstructionDay(today) ? questions.find(item => item.school_date === today) : null;
  const completed = question && responses.some(item => item.question_id === question.id && item.student_id === student.id);

  if (!student.class_period || !student.grade || loadingQuestions || loadingResponses || !question || completed) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!answer.trim()) return;
    setSaving(true);
    setError('');
    try {
      await base44.entities.DoNowResponse.create({ question_id: question.id, student_id: student.id, school_date: today, answer: answer.trim() });
      await reload();
    } catch {
      setError('Your answer could not be saved. Please try again.');
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
    <form onSubmit={submit} className="glass-panel w-full max-w-xl p-6">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-neon-magenta">EAST Do Now</p>
      <div className="mt-2 flex items-start justify-between gap-3"><h2 className="text-xl font-semibold text-foreground">{question.question}</h2><SpeakTextButton text={question.question} /></div>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">Write a short answer to begin today.</p>
      <textarea autoFocus required rows={4} value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Type your answer…" />
      <DictationButton value={answer} onChange={setAnswer} />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <button disabled={saving || !answer.trim()} className="east-button mt-4 w-full">{saving ? 'Saving…' : 'Continue'}</button>
    </form>
  </div>;
}