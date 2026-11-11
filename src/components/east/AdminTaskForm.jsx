import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import StudentTagPicker from './StudentTagPicker';
import TaskDatePicker from '@/components/east/TaskDatePicker';

export default function AdminTaskForm({ me, reload }) {
  const blank = { title: '', description: '', due_date: '', link_url: '', link_description: '' };
  const [form, setForm] = useState(blank);
  const [taggedEmails, setTaggedEmails] = useState('');
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const submit = async event => {
    event.preventDefault(); setSaving(true);
    const assignedStudents = students.filter(student => student?.id);
    await base44.entities.TaskRequest.create({
      ...form,
      student_name: assignedStudents.length ? assignedStudents.map(student => student.name).join(', ') : me.display_name || me.full_name || me.email,
      student_email: assignedStudents.length ? assignedStudents.map(student => student.email).join(', ') : me.email,
      assigned_student_ids: assignedStudents.map(student => student.id),
      class_period: assignedStudents[0]?.class_period || me.class_period || undefined,
      status: 'accepted'
    });
    setForm(blank); setTaggedEmails(''); setStudents([]); setSaving(false); await reload();
  };
  return <form onSubmit={submit} className="glass-panel mt-8 grid gap-3 rounded-2xl p-5 md:grid-cols-2">
    <h2 className="font-semibold md:col-span-2">Add a task for myself or a student</h2>
    <input required placeholder="Task title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
    <TaskDatePicker value={form.due_date} onChange={due_date => setForm({ ...form, due_date })} />
    <textarea placeholder="Task details (optional)" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="md:col-span-2" />
    <input type="url" placeholder="Related link (optional)" value={form.link_url} onChange={event => setForm({ ...form, link_url: event.target.value })} />
    <input required={Boolean(form.link_url)} placeholder={form.link_url ? 'Link description (required)' : 'Link description'} value={form.link_description} onChange={event => setForm({ ...form, link_description: event.target.value })} />
    <div className="md:col-span-2"><p className="mb-1 text-xs font-semibold text-muted-foreground">Tag a student (optional)</p><StudentTagPicker value={taggedEmails} onChange={(emails, selected) => { setTaggedEmails(emails); setStudents(selected); }} /></div>
    <button disabled={saving} className="east-button w-fit">{saving ? 'Adding…' : 'Add task'}</button>
  </form>;
}