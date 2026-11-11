import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const pendingSessions = new Map();

export default function GuidedGoalCoaching({ studentId, record, phase, onReady }) {
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const loading = useRef(false);
  const load = async () => {
    if (loading.current) return;
    loading.current = true; setBusy(true); setError('');
    try {
      const key = `${studentId}:${record.week_start}:${phase}`;
      if (!pendingSessions.has(key)) {
        const promise = (async () => {
          const matches = await base44.entities.GoalCoachingSession.filter({ student_id: studentId, week_start: record.week_start, phase });
          if (matches[0]) return matches[0];
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Write exactly three short, encouraging questions for a student to answer before writing their own ${phase === 'goal' ? 'specific, achievable one-week goal' : 'specific weekly goal reflection'}. Ask about concrete actions, evidence of progress, and a realistic next step. Do not write the goal or reflection for the student. ${phase === 'reflection' ? `Their goal was: ${record.goal_text}.` : ''} Return only the questions.`,
            response_json_schema: { type: 'object', properties: { questions: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 } }, required: ['questions'] }
          });
          const questions = result.questions?.filter(q => typeof q === 'string' && q.trim()).slice(0, 3);
          if (questions?.length !== 3) throw new Error('Questions could not be prepared.');
          return base44.entities.GoalCoachingSession.create({ student_id: studentId, week_start: record.week_start, phase, questions, answers: [], completed: false });
        })();
        pendingSessions.set(key, promise);
        promise.finally(() => { if (pendingSessions.get(key) === promise) pendingSessions.delete(key); }).catch(() => {});
      }
      const item = await pendingSessions.get(key);
      setSession(item);
      if (item.completed) onReady(item.questions.map((question, i) => `${question} ${item.answers[i] || ''}`).join('\n'));
    } catch { setError('Could not load your questions. Please try again.'); }
    finally { loading.current = false; setBusy(false); }
  };
  useEffect(() => { load(); }, [studentId, record.week_start, phase]);
  const next = async () => {
    if (!answer.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const answers = [...session.answers, answer.trim()];
      const completed = answers.length >= session.questions.length;
      const updated = await base44.entities.GoalCoachingSession.update(session.id, { answers, completed });
      setSession({ ...session, ...updated, answers, completed }); setAnswer('');
      if (completed) onReady(session.questions.map((question, i) => `${question} ${answers[i]}`).join('\n'));
    } catch { setError('Your answer could not be saved. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="rounded-lg border border-accent/50 bg-accent/10 p-4"><h4 className="font-semibold text-foreground">Let’s make your {phase === 'goal' ? 'goal' : 'reflection'} more specific</h4><p className="mt-1 text-xs text-muted-foreground">Answer these to plan your own writing. Your final words are yours.</p>{busy && !session ? <p className="mt-3 text-sm">Preparing questions…</p> : session?.completed ? <div className="mt-3 space-y-2">{session.questions.map((question, i) => <p key={i} className="text-sm"><strong>{question}</strong><br />{session.answers[i]}</p>)}</div> : session && <div className="mt-3 space-y-3"><p className="text-xs font-semibold text-accent">Question {session.answers.length + 1} of {session.questions.length}</p><label className="block text-sm font-medium">{session.questions[session.answers.length]}<textarea className="mt-2" value={answer} onChange={event => setAnswer(event.target.value)} rows={3} /></label><button type="button" disabled={!answer.trim() || busy} onClick={next} className="east-button">{busy ? 'Saving…' : session.answers.length + 1 === session.questions.length ? 'Continue to my writing' : 'Next question'}</button></div>}{error && <div className="mt-2"><p role="alert" className="text-sm text-destructive">{error}</p>{!session && <button type="button" onClick={load} className="mt-2 text-sm underline">Try again</button>}</div>}</div>;
}