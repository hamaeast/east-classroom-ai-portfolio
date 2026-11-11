import { useState } from 'react';

export default function PitchQuestionForm({ onSend }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async event => {
    event.preventDefault();
    if (!question.trim()) return;
    setSending(true);
    await onSend(question.trim());
    setQuestion('');
    setSending(false);
    setOpen(false);
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-primary/50 px-3 py-1.5 text-xs font-semibold text-primary">Request revision</button>;
  return <form onSubmit={submit} className="grid w-full gap-2 rounded-lg border bg-muted/40 p-3">
    <label className="east-label">Revision instructions<textarea required value={question} onChange={event => setQuestion(event.target.value)} placeholder="Tell the student what to revise" /></label>
    <div className="flex gap-2"><button disabled={sending} className="east-button">{sending ? 'Sending…' : 'Send revision request'}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 text-xs font-semibold">Cancel</button></div>
  </form>;
}