import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { chicagoToday } from '@/lib/weeklyGoals';
import { nextMissingInstructionDates } from '@/lib/schoolCalendar';
import QuickPanel from './QuickPanel';

export default function AdminDoNowManager() {
  const { items, loading, reload } = useEntityList('DoNowQuestion');
  const [bulkQuestions, setBulkQuestions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const scheduled = items.slice().sort((a, b) => a.school_date.localeCompare(b.school_date));
  const questions = bulkQuestions.split('\n').map(question => question.trim()).filter(Boolean);
  const normalizeQuestion = question => question.toLowerCase().replace(/\s+/g, ' ').trim();
  const usedQuestions = new Set(items.map(item => normalizeQuestion(item.question)));
  const batchQuestions = new Set();
  const repeatedQuestions = questions.filter(question => {
    const normalized = normalizeQuestion(question);
    if (usedQuestions.has(normalized) || batchQuestions.has(normalized)) return true;
    batchQuestions.add(normalized);
    return false;
  });
  const dates = nextMissingInstructionDates(chicagoToday(), questions.length, items.map(item => item.school_date));

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (!questions.length) return;
    if (repeatedQuestions.length) return setError(`These Do Nows have already been used or repeated in this batch: ${repeatedQuestions.join(' | ')}`);
    if (dates.length < questions.length) return setError('There are not enough remaining school days in the 2026–2027 calendar.');
    setSaving(true);
    try {
      await base44.entities.DoNowQuestion.bulkCreate(questions.map((question, index) => ({ question, school_date: dates[index] })));
      setBulkQuestions('');
      await reload();
    } catch {
      setError('The Do Nows could not be added. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <QuickPanel title="Daily EAST Do Nows">
    <form onSubmit={submit} className="space-y-3">
      <label className="east-label">Bulk questions — one question per line<textarea required rows={6} value={bulkQuestions} onChange={event => setBulkQuestions(event.target.value)} placeholder={'What will you accomplish today?\nWhat is your next project step?\nWhat help do you need today?'} /></label>
      {questions.length > 0 && <p className="text-sm text-muted-foreground">{questions.length} question{questions.length === 1 ? '' : 's'} will be scheduled on the next open school days{dates.length ? `, starting ${dates[0]}${dates.length > 1 ? ` and ending ${dates[dates.length - 1]}` : ''}` : ''}.</p>}
      <button disabled={saving || !questions.length || loading} className="east-button">{saving ? 'Scheduling…' : `Schedule ${questions.length || ''} Do Now${questions.length === 1 ? '' : 's'}`}</button>
    </form>
    {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : scheduled.map(item => <div key={item.id} className="border-t border-border/60 pt-2 text-sm"><span className="font-semibold text-neon-cyan">{item.school_date}</span><span className="ml-2 text-foreground">{item.question}</span></div>)}
    </div>
  </QuickPanel>;
}