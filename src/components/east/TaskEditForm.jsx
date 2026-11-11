import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import TaskDatePicker from '@/components/east/TaskDatePicker';

export default function TaskEditForm({ task, onCancel, onSaved }) {
  const [form, setForm] = useState({
    title: task.title || '', description: task.description || '', due_date: task.due_date || '',
    link_url: task.link_url || '', link_description: task.link_description || '',
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    await base44.entities.TaskRequest.update(task.id, form);
    setSaving(false);
    onSaved();
  };
  return <form onSubmit={submit} className="glass-panel grid gap-3 rounded-xl p-4 md:grid-cols-2">
    <input required placeholder="Task title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
    <TaskDatePicker value={form.due_date} onChange={due_date => setForm({ ...form, due_date })} />
    <textarea placeholder="Task details (optional)" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="md:col-span-2" />
    <input type="url" placeholder="Related link (optional)" value={form.link_url} onChange={event => setForm({ ...form, link_url: event.target.value })} />
    <input required={Boolean(form.link_url)} placeholder={form.link_url ? 'Link description (required)' : 'Link description'} value={form.link_description} onChange={event => setForm({ ...form, link_description: event.target.value })} />
    <div className="flex gap-2 md:col-span-2">
      <button disabled={saving} className="east-button">{saving ? 'Saving…' : 'Save changes'}</button>
      <button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm font-semibold text-muted-foreground">Cancel</button>
    </div>
  </form>;
}