import { useState } from 'react';

// Small toggleable control: click "Dismiss" to reveal a required-reason form, then confirm.
export default function DismissCheckInButton({ onDismiss }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSending(true);
    await onDismiss(reason.trim());
    setSending(false);
    setOpen(false);
    setReason('');
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-slate-500 underline">Dismiss</button>;

  return <form onSubmit={submit} className="flex items-center gap-2">
    <input required placeholder="Reason for dismissing" value={reason} onChange={e => setReason(e.target.value)} className="h-8 w-40 text-xs" />
    <button disabled={sending} className="rounded-lg bg-slate-700 px-2 py-1 text-xs font-semibold text-white">Confirm</button>
    <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500">Cancel</button>
  </form>;
}