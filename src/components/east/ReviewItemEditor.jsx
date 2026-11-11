import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { facilitationSubject } from '@/lib/facilitationConstants';
import FacilitationActions from './FacilitationActions';
import StudentInterventionMessage from './StudentInterventionMessage';
import { applicableStudents, suggestedInterventionMessage } from '@/lib/facilitationRecipients';

export default function ReviewItemEditor({ item, sources, onSaved }) {
  const recipients = applicableStudents(item, sources);
  const [decision, setDecision] = useState(item.review_decision || '');
  const [actions, setActions] = useState(item.draft_actions || []);
  const [response, setResponse] = useState(item.draft_response || '');
  const [sendToStudents, setSendToStudents] = useState(false);
  const [studentMessage, setStudentMessage] = useState('');
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const saveLater = async () => {
    setSaving(true); const queue_status = decision === 'not_applicable' ? 'dismissed' : decision === 'monitoring' ? 'monitoring' : decision ? 'response_needed' : item.queue_status;
    await base44.entities.FacilitationReviewItem.update(item.id, { review_decision: decision || undefined, draft_actions: actions, draft_response: response, queue_status });
    setSaving(false); onSaved();
  };
  const createRecord = async () => {
    if (!actions.length || !response.trim()) { setError('Select at least one response and add a brief description.'); return; }
    if (sendToStudents && !studentMessage.trim()) { setError('Add a student message before sending.'); return; }
    setSaving(true); const now = new Date().toISOString();
    const record = await base44.entities.FacilitationRecord.create({ review_item_id: item.id, subject_type: item.subject_type, student_id: item.student_id, student_name: item.student_name, team_name: item.team_name, project_id: item.project_id, project_name: item.project_name, concern_type: item.concern_type, concern: item.concern, supporting_information: item.supporting_information, source_refs: item.source_refs || [], facilitator_actions: actions, facilitator_response: response.trim(), date_identified: item.scanned_at || item.created_date, date_addressed: now, follow_up_evidence: [], pending_follow_up: [], dismissed_source_ids: [], status: 'monitoring', status_history: [{ date: now, status: 'monitoring', note: 'Facilitator response documented.' }], follow_up_review_count: 0 });
    if (sendToStudents) await base44.entities.AdminMessage.create({ message: studentMessage.trim(), sent_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), category: 'intervention', target_student_ids: recipients.map(student => student.id), facilitation_record_id: record.id });
    await base44.entities.FacilitationReviewItem.update(item.id, { queue_status: 'converted', review_decision: 'yes', draft_actions: actions, draft_response: response.trim() });
    setSaving(false); onSaved();
  };
  const toggleStudentMessage = checked => {
    setSendToStudents(checked);
    if (checked && !studentMessage) setStudentMessage(suggestedInterventionMessage(item, response));
  };
  return <section className="glass-panel p-5"><p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">{facilitationSubject(item)}</p><h3 className="mt-1 text-xl font-semibold">{item.concern}</h3><p className="east-label mt-4">Supporting Information</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{item.supporting_information.map((text, index) => <li key={index}>{text}</li>)}</ul>
    <label className="east-label mt-5 block">Did you address this?<select value={decision} onChange={event => setDecision(event.target.value)} className="mt-1"><option value="">Choose…</option><option value="yes">Yes</option><option value="not_yet">Not yet</option><option value="monitoring">Continuing to monitor</option><option value="not_applicable">Not applicable</option></select></label>
    {decision && <div className="mt-5 space-y-4">{decision === 'yes' && <FacilitationActions selected={actions} onChange={setActions} />}<label className="east-label block">{decision === 'yes' ? 'Briefly describe what you did.' : 'Add information about this review decision.'}<textarea rows="3" value={response} onChange={event => setResponse(event.target.value)} placeholder={decision === 'yes' ? 'Met with the student and helped break the project into manageable next steps.' : 'Add context, observations, next steps, or other useful information.'} className="mt-1" /></label>{decision === 'yes' && <StudentInterventionMessage recipients={recipients} checked={sendToStudents} onChecked={toggleStudentMessage} message={studentMessage} onMessage={setStudentMessage} />}{error && <p className="text-sm font-semibold text-destructive">{error}</p>}</div>}
    <div className="mt-5 flex flex-wrap gap-2"><button disabled={saving} onClick={saveLater} className="rounded-lg border px-4 py-2 text-sm font-semibold">Save &amp; Return Later</button>{decision === 'yes' && <button disabled={saving} onClick={createRecord} className="east-button">{saving ? 'Saving…' : 'Create Facilitation Record'}</button>}</div>
  </section>;
}