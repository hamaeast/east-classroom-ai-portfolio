import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const emailsFrom = value => (value || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);

export default function StudentTagPicker({ value, onChange }) {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const selectedEmails = emailsFrom(value);
  const selected = students.filter(student => selectedEmails.includes(student.email));
  const matches = query.trim() ? students.filter(student => !selectedEmails.includes(student.email) && `${student.name} ${student.email}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];

  useEffect(() => { base44.functions.invoke('listTaggableStudents', {}).then(response => setStudents(response.data.students || [])); }, []);
  const update = emails => onChange(emails.join(', '), students.filter(student => emails.includes(student.email)));
  const add = student => { update([...new Set([...selectedEmails, student.email])]); setQuery(''); };
  const remove = email => update(selectedEmails.filter(item => item !== email));

  return <div className="relative rounded-lg border border-border bg-input p-2">
    <div className="flex flex-wrap gap-2">{selected.map(student => <button key={student.id} type="button" onClick={() => remove(student.email)} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold" aria-label={`Remove ${student.name}`}>{student.name} ×</button>)}</div>
    <input className="mt-1 border-0 bg-transparent p-1 focus:ring-0" value={query} onChange={event => setQuery(event.target.value)} placeholder={selected.length ? 'Type another student name or email…' : 'Type a student name or email to tag…'} />
    {matches.length > 0 && <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover shadow-xl">{matches.map(student => <button key={student.id} type="button" onClick={() => add(student)} className="block w-full px-3 py-2 text-left text-sm hover:bg-accent/20"><b>{student.name}</b><span className="ml-2 text-xs text-muted-foreground">{student.email}</span>{student.class_period && <span className="ml-2 text-xs text-muted-foreground">Period {student.class_period}</span>}</button>)}</div>}
    <p className="px-1 pt-1 text-xs text-muted-foreground">Search by name or email, then click a suggestion to link the correct account.</p>
  </div>;
}