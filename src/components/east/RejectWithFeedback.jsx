import { useState } from 'react';

export default function RejectWithFeedback({ onReject, label = 'Deny', confirmLabel = 'Confirm deny' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    await onReject(text.trim());
    setSending(false);
    setOpen(false);
    setText('');
  };

  if (!open) return <button onClick={() => setOpen(true)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">{label}</button>;

  return <form onSubmit={submit} className="flex flex-col gap-2">
    <textarea placeholder="Feedback for the student (optional)" value={text} onChange={e => setText(e.target.value)} className="w-56" />
    <div className="flex gap-2">
      <button disabled={sending} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">{confirmLabel}</button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
    </div>
  </form>;
}