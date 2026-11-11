import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import TaskDatePicker from '@/components/east/TaskDatePicker';

export default function TaskRequestForm({ me, reload }) {
  const blank = { title: '', description: '', due_date: '', link_url: '', link_description: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    await base44.entities.TaskRequest.create({
      ...form, student_name: me.full_name || me.email, student_email: me.email,
      class_period: me.class_period || undefined, status: 'pending',
    });
    setForm(blank); setSaving(false); reload();
  };
  return <form onSubmit={submit} className="glass-panel mb-6 grid gap-3 rounded-2xl p-5 md:grid-cols-2">
    <input required placeholder="Task title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
    <TaskDatePicker value={form.due_date} onChange={due_date => setForm({ ...form, due_date })} />
    <textarea placeholder="Task details (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="md:col-span-2" />
    <input type="url" placeholder="Related link (optional)" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} />
    <input required={Boolean(form.link_url)} placeholder={form.link_url ? 'Link description (required)' : 'Link description'} value={form.link_description} onChange={e => setForm({ ...form, link_description: e.target.value })} />
    <button disabled={saving} className="east-button w-fit">{saving ? 'Sending…' : 'Send task to teacher'}</button>
  </form>;
}