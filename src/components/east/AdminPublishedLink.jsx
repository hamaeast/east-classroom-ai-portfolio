import { useState } from 'react';

export default function AdminPublishedLink({ link, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: link.title, url: link.url, description: link.description || '' });
  const [saving, setSaving] = useState(false);

  const save = async event => {
    event.preventDefault(); setSaving(true);
    await onSave(link.id, form);
    setSaving(false); setEditing(false);
  };
  const cancel = () => {
    setForm({ title: link.title, url: link.url, description: link.description || '' });
    setEditing(false);
  };

  return <div className="rounded-xl border bg-white p-5 shadow-sm">
    {editing ? <form onSubmit={save} className="space-y-3">
      <input required placeholder="Link title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
      <input required type="url" placeholder="URL" value={form.url} onChange={event => setForm({ ...form, url: event.target.value })} />
      <input placeholder="Description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
      <div className="flex gap-2"><button disabled={saving} className="east-button">{saving ? 'Saving…' : 'Save changes'}</button><button type="button" onClick={cancel} className="rounded-lg border px-3 text-xs font-semibold">Cancel</button></div>
    </form> : <div className="flex items-start justify-between gap-3">
      <div><a href={link.url} target="_blank" rel="noreferrer" className="font-semibold text-cyan-700 underline">{link.title}</a>{link.description && <p className="mt-1 text-sm text-slate-600">{link.description}</p>}</div>
      <div className="flex gap-2"><button onClick={() => setEditing(true)} className="rounded-lg border px-2.5 py-1 text-xs font-semibold">Edit</button><button onClick={() => onDelete(link.id)} className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button></div>
    </div>}
  </div>;
}