import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';

// A private, per-student notes box shown under each important link — only the student who
// wrote it can ever see or edit it (enforced both here and via RLS on LinkNote).
export default function LinkNoteBox({ linkId }) {
  const { user: me } = useAuth();
  const { items, reload } = useEntityList('LinkNote');
  const myNote = items.find(n => n.link_id === linkId && n.created_by_id === me?.id);
  const [text, setText] = useState(myNote?.note || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setText(myNote?.note || ''); }, [myNote?.note]);

  const save = async () => {
    setSaving(true);
    if (myNote) await base44.entities.LinkNote.update(myNote.id, { note: text });
    else await base44.entities.LinkNote.create({ link_id: linkId, note: text });
    setSaving(false);
    reload();
  };

  return <div className="mt-2">
    <textarea placeholder="Your private notes on this link…" value={text} onChange={e => setText(e.target.value)} className="min-h-16 text-sm" />
    <button onClick={save} disabled={saving || text === (myNote?.note || '')} className="mt-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50">{saving ? 'Saving…' : 'Save note'}</button>
  </div>;
}