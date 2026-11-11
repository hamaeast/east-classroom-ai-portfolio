import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showSubmissionRequirements } from '@/lib/submissionRequirements';
import DictationButton from './DictationButton';
import { isWeeklyGoalClosed } from '@/lib/gradingPeriods';

export default function CartMakeupForm({ record, phase, reload }) {
  const field = phase === 'goal' ? 'cart_goal_answer' : 'cart_reflection_answer';
  const [answer, setAnswer] = useState(record[field] || '');
  const [suggestion, setSuggestion] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async event => {
    event.preventDefault();
    if (isWeeklyGoalClosed(record)) { showSubmissionRequirements('This nine-weeks period is closed. Grades and submissions are locked.'); return; }
    setSaving(true);
    let review;
    try {
      review = await base44.integrations.Core.InvokeLLM({
        prompt: `Decide whether this student answer makes sense at a third-grade reading and writing level and answers the question. Accept simple sentences, spelling mistakes, and basic grammar. Reject only blank, gibberish, unrelated, or impossible-to-understand answers. If rejected, give one short, specific suggestion without writing the answer for the student.\n\nQuestion: How do Critical Thinking, Advance, Real, and Technology (CART) apply to your project or skill?\nAnswer: "${answer}"`,
        response_json_schema: { type: 'object', properties: { acceptable: { type: 'boolean' }, suggestion: { type: 'string' } }, required: ['acceptable', 'suggestion'] }
      });
    } catch {
      review = { acceptable: true, suggestion: '' };
    }
    if (!review.acceptable) {
      setSuggestion(review.suggestion);
      showSubmissionRequirements(review.suggestion || 'Please revise your answer so it clearly explains how CART applies.');
      setSaving(false);
      return;
    }
    await base44.functions.invoke('submitWeeklyGoal', { weeklyGoalId: record.id, kind: phase === 'goal' ? 'cart-goal' : 'cart-reflection', answer });
    setSaving(false);
    await reload();
  };
  return <form onSubmit={submit} className="space-y-3"><p className="text-sm text-muted-foreground">This work is more than seven days old. Explain how <b>Critical Thinking, Advance, Real, and Technology (CART)</b> apply to your project or skill.</p><textarea required minLength={8} value={answer} onChange={event => setAnswer(event.target.value)} placeholder="CART applies to my project or skill because…" /><DictationButton value={answer} onChange={setAnswer} />{suggestion && <p className="rounded-lg bg-primary/10 p-3 text-sm font-medium text-primary">Writing suggestion: {suggestion}</p>}<button disabled={saving} className="east-button">{saving ? 'Checking answer…' : 'Submit CART make-up for 4/5'}</button></form>;
}