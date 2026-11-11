import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';

export default function ConversationThread({ parentType, parentId, memberIds = [], memberEmails = [], me, onMessageSent, collapsed = false }) {
  const { items, loading, reload } = useEntityList('Comment');
  const thread = items.filter(c => c.parent_type === parentType && c.parent_id === parentId)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [expanded, setExpanded] = useState(!collapsed);
  const isAdmin = me?.role === 'admin';

  useEffect(() => setExpanded(!collapsed), [collapsed, parentId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    await base44.entities.Comment.create({
      parent_type: parentType,
      parent_id: parentId,
      message: text.trim(),
      author_name: me?.full_name || me?.email || 'Unknown',
      author_role: isAdmin ? 'admin' : 'student',
      member_ids: [...new Set([me?.id, ...memberIds].filter(Boolean))],
      member_emails: [...new Set([me?.email?.toLowerCase(), ...memberEmails].filter(Boolean))],
    });
    await onMessageSent?.(text.trim());
    setText('');
    setSending(false);
    reload();
  };
  const removeFeedback = async comment => {
    if (!window.confirm('Delete this pitch feedback?')) return;
    setDeletingId(comment.id);
    await base44.entities.Comment.delete(comment.id);
    await reload();
    setDeletingId('');
  };

  return <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-foreground">
    {collapsed ? <button type="button" onClick={() => setExpanded(value => !value)} className={`flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${expanded ? 'mb-2' : ''}`}><span>Feedback conversation ({thread.length})</span><span>{expanded ? 'Hide comments' : 'Show comments'}</span></button> : <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feedback conversation</p>}
    {expanded && <>{loading ? <p className="text-xs text-slate-500">Loading…</p> : !thread.length ? <p className="text-xs text-slate-500">No messages yet.</p> : <div className="mb-3 space-y-2">
      {thread.map(c => <div key={c.id} className={`rounded-lg border p-2 text-sm text-foreground ${c.author_role === 'admin' ? 'border-neon-cyan/40 bg-neon-cyan/10' : 'border-border bg-card'}`}>
        <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-foreground">{c.author_name || (c.author_role === 'admin' ? 'Teacher' : 'Student')} <span className="font-normal text-muted-foreground">· {new Date(c.created_date).toLocaleString()}</span></p>{isAdmin && parentType === 'pitch' && <button type="button" disabled={deletingId === c.id} onClick={() => removeFeedback(c)} className="text-xs font-semibold text-destructive">{deletingId === c.id ? 'Deleting…' : 'Delete'}</button>}</div>
        <p>{c.message}</p>
      </div>)}
    </div>}
    <form onSubmit={send} className="flex gap-2">
      <input required placeholder="Write a reply…" value={text} onChange={e => setText(e.target.value)} className="flex-1" />
      <button disabled={sending} className="east-button">Send</button>
    </form></>}
  </div>;
}