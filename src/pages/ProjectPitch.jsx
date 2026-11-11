import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import ConversationThread from '@/components/east/ConversationThread';
import RejectWithFeedback from '@/components/east/RejectWithFeedback';
import AdminPitchEditor from '@/components/east/AdminPitchEditor';
import StudentPitchEditor from '@/components/east/StudentPitchEditor';
import PitchEthicsFields from '@/components/east/PitchEthicsFields';
import PitchQuestionForm from '@/components/east/PitchQuestionForm';
import PitchViewToggle from '@/components/east/PitchViewToggle';
import PitchLifecycleActions from '@/components/east/PitchLifecycleActions';
import StudentTagPicker from '@/components/east/StudentTagPicker';
import { currentSchoolYearRange } from '@/lib/schoolYear';
import { namesForTaggedEmails } from '@/lib/resolveUserName';
import useResolvedNames from '@/hooks/useResolvedNames';
import { isPitchStudent, pitchStudentIds } from '@/lib/pitchStudents';
import { pitchAttentionLabel, pitchNeedsAdminAttention } from '@/lib/pitchAttention';

function latestPitchActivity(pitch) {
  return Math.max(...[pitch.student_interaction_at, pitch.admin_feedback_at, pitch.updated_date, pitch.created_date].filter(Boolean).map(value => new Date(value).getTime()));
}

export default function ProjectPitch() {
  const { items, loading, reload } = useEntityList('ProjectPitch');
  const { items: partners, reload: reloadPartners } = useEntityList('CommunityPartner');
  const { items: users } = useEntityList('User');
  const { items: checks } = useEntityList('WeeklyCheckIn');
  const { items: pitchNotifications } = useEntityList('PitchNotification');
  const { items: pitchLifecycles, reload: reloadPitchLifecycles } = useEntityList('PitchLifecycle');
  const resolvedNames = useResolvedNames(items.flatMap(x => (x.tagged_emails || '').split(',')));
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const changedClass = (pitch, field) => isAdmin && (pitch.student_changed_fields || []).includes(field) ? 'change-highlight' : '';
  const requestedPitchId = new URLSearchParams(window.location.search).get('pitch') || '';
  const [pitchView, setPitchView] = useState('pending');
  const accessibleItems = isAdmin ? items : items.filter(item => isPitchStudent(item, me));
  const lifecycleFor = pitch => pitchLifecycles.find(item => item.pitch_id === pitch.id)?.status || (pitch.approval_status === 'approved' ? 'approved' : pitch.approval_status === 'revision_requested' ? 'revision_requested' : 'pending');
  const viewCounts = ['pending', 'revision_requested', 'approved', 'completed', 'archived', 'deleted'].reduce((counts, status) => ({ ...counts, [status]: accessibleItems.filter(item => lifecycleFor(item) === status).length }), {});
  const visibleItems = accessibleItems.filter(item => lifecycleFor(item) === pitchView).slice().sort((a, b) => Number(b.id === requestedPitchId) - Number(a.id === requestedPitchId) || Number(pitchNeedsAdminAttention(b)) - Number(pitchNeedsAdminAttention(a)) || latestPitchActivity(b) - latestPitchActivity(a));
  useEffect(() => {
    const requestedPitch = items.find(item => item.id === requestedPitchId);
    if (requestedPitch) setPitchView(lifecycleFor(requestedPitch));
  }, [items, pitchLifecycles, requestedPitchId]);
  useEffect(() => {
    const unreadApprovals = pitchNotifications.filter(item => item.recipient_id === me?.id && item.type === 'approved' && !item.read);
    if (!isAdmin && unreadApprovals.length) base44.entities.PitchNotification.bulkUpdate(unreadApprovals.map(item => ({ id: item.id, read: true })));
  }, [isAdmin, me?.id, pitchNotifications]);

  useEffect(() => {
    if (me?.id) reloadPartners();
  }, [me?.id, reloadPartners]);

  const blank = { project_title: '', problem: '', solution: '', technology_use: '', ethics_statement: '', ethical_concerns: '', client_name: '', community_partner_name: '', tagged_emails: '', tagged_names: [] };
  const [form, setForm] = useState(blank);
  const submit = async (e) => {
    e.preventDefault();
    const emails = [...new Set([...(form.tagged_emails || '').split(','), me.email].map(value => (value || '').trim().toLowerCase()).filter(Boolean))];
    const studentNames = [...new Set([me.full_name || me.email, ...form.tagged_names].filter(Boolean))];
    const { tagged_names, ...pitchForm } = form;
    await base44.entities.ProjectPitch.create({ ...pitchForm, student_names: studentNames.join(', '), tagged_emails: emails.join(', '), member_emails: emails, approval_status: 'pending' });
    setForm(blank);
    reload();
  };

  const notifyPitchStudents = async (item, type, message) => {
    const recipientIds = pitchStudentIds(item, users);
    if (recipientIds.length) await base44.entities.PitchNotification.bulkCreate(recipientIds.map(recipient_id => ({ pitch_id: item.id, recipient_id, type, message, read: false })));
  };
  const markConversationRead = async pitchId => {
    const unread = pitchNotifications.filter(item => item.pitch_id === pitchId && item.recipient_id === me?.id && item.type === 'communication' && !item.read);
    if (unread.length) await base44.entities.PitchNotification.bulkUpdate(unread.map(item => ({ id: item.id, read: true })));
  };
  const markPitchInteraction = async (id, field) => {
    const changes = { [field]: new Date().toISOString() };
    if (field === 'admin_feedback_at') changes.student_changed_fields = [];
    await base44.entities.ProjectPitch.update(id, changes);
    await reload();
  };
  const setPitchLifecycle = async (pitch, status) => {
    if (status === 'deleted' && !window.confirm(`Delete “${pitch.project_title}”? It will move to the Deleted view.`)) return;
    const existing = pitchLifecycles.find(item => item.pitch_id === pitch.id);
    if (existing) await base44.entities.PitchLifecycle.update(existing.id, { status });
    else await base44.entities.PitchLifecycle.create({ pitch_id: pitch.id, status });
    const linkedProjects = await base44.entities.Project.filter({ project_pitch_id: pitch.id });
    await Promise.all(linkedProjects.map(project => base44.entities.Project.update(project.id, { status: status === 'completed' ? 'complete' : 'inactive' })));
    await reloadPitchLifecycles();
  };

  const [decidingId, setDecidingId] = useState(null);
  const decidePitch = async (item, approvalStatus, feedback) => {
    setDecidingId(item.id);
    await base44.entities.ProjectPitch.update(item.id, { approval_status: approvalStatus, student_changed_fields: [], admin_feedback_at: new Date().toISOString() });
    if (approvalStatus === 'approved') {
      const existingProjects = await base44.entities.Project.filter({ project_pitch_id: item.id });
      if (!existingProjects.length) await base44.entities.Project.create({ title: item.project_title, student_names: item.student_names || 'Unassigned', client_name: item.client_name, partner_name: item.community_partner_name || item.client_partner_name, technology_tools: item.technology_use, community_need: item.problem, status: 'active', project_pitch_id: item.id, member_ids: pitchStudentIds(item, users), member_emails: item.member_emails || (item.tagged_emails || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean), school_year: currentSchoolYearRange().label });
      await notifyPitchStudents(item, 'approved', `Your project pitch “${item.project_title}” was approved.`);
    }
    if (approvalStatus === 'rejected' && feedback) {
      await base44.entities.Comment.create({ parent_type: 'pitch', parent_id: item.id, message: feedback, author_name: me?.full_name || 'Teacher', author_role: 'admin', member_ids: pitchStudentIds(item, users), member_emails: item.member_emails || (item.tagged_emails || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean) });
      await notifyPitchStudents(item, 'communication', `New feedback on “${item.project_title}”: ${feedback}`);
    }
    await reload();
    setDecidingId(null);
  };

  const requestPitchRevision = async (item, instructions) => {
    await base44.entities.ProjectPitch.update(item.id, { approval_status: 'revision_requested', admin_feedback_at: new Date().toISOString() });
    await base44.entities.Comment.create({ parent_type: 'pitch', parent_id: item.id, message: instructions, author_name: me?.full_name || 'Teacher', author_role: 'admin', member_ids: pitchStudentIds(item, users), member_emails: item.member_emails || (item.tagged_emails || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean) });
    await notifyPitchStudents(item, 'communication', `Revision requested for “${item.project_title}”: ${instructions}`);
    await markPitchInteraction(item.id, 'admin_feedback_at');
  };

  const [editingTechId, setEditingTechId] = useState(null);
  const [techDraft, setTechDraft] = useState('');
  const startEditTech = (x) => { setEditingTechId(x.id); setTechDraft(x.technology_use || ''); };
  const saveTech = async (x) => {
    await base44.entities.ProjectPitch.update(x.id, { technology_use: techDraft, approval_status: 'pending', student_changed_fields: ['technology_use'], student_interaction_at: new Date().toISOString() });
    setEditingTechId(null);
    reload();
  };
  const canEditPitch = (item) => !isAdmin && isPitchStudent(item, me);
  const saveStudentPitchChanges = async (item, changes) => {
    const fieldLabels = { project_title: 'project title', problem: 'problem', solution: 'solution', technology_use: 'technology use', ethics_statement: 'ethical approach', ethical_concerns: 'ethical concerns', client_name: 'client', community_partner_name: 'community partner' };
    const changedFields = Object.keys(fieldLabels).filter(field => String(changes[field] || '') !== String(item[field] || ''));
    const emails = [...new Set([...(changes.tagged_emails || item.tagged_emails || '').split(','), me?.email].map(email => (email || '').trim().toLowerCase()).filter(Boolean))];
    const teamChanged = emails.slice().sort().join(',') !== (item.member_emails || (item.tagged_emails || '').split(',')).map(email => email.trim().toLowerCase()).filter(Boolean).sort().join(',');
    const taggedNames = users.filter(user => emails.includes((user.email || '').toLowerCase())).map(user => user.display_name || user.full_name || user.email);
    const { tagged_names, ...pitchChanges } = changes;
    const reviewChanges = changedFields.length || teamChanged ? { approval_status: 'pending', student_interaction_at: new Date().toISOString() } : {};
    await base44.entities.ProjectPitch.update(item.id, { ...pitchChanges, tagged_emails: emails.join(', '), member_emails: emails, student_names: [...new Set(taggedNames)].join(', '), ...reviewChanges, student_changed_fields: changedFields });
    if (teamChanged) await base44.functions.invoke('syncPitchMembers', { pitchId: item.id });
    const changeLabels = [...changedFields.map(field => fieldLabels[field]), ...(teamChanged ? ['team members'] : [])];
    if (changeLabels.length) await base44.entities.Comment.create({ parent_type: 'pitch', parent_id: item.id, message: `Edited the pitch: ${changeLabels.join(', ')}.`, author_name: me?.full_name || me?.email || 'Student', author_role: 'student', member_ids: pitchStudentIds({ ...item, tagged_emails: emails.join(', ') }, users), member_emails: emails });
    await reload();
  };

  return <><PageHeader title="Project Pitch" description="Submit your project pitch once your group is ready — describe the problem, your solution, the technology you'll use, and who's on your team." />
    <PitchViewToggle value={pitchView} onChange={setPitchView} counts={viewCounts} />
    <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border bg-white p-5 text-foreground shadow-sm">
      <input required placeholder="Project title" value={form.project_title} onChange={e => setForm({ ...form, project_title: e.target.value })} />
      <textarea required placeholder="Problem — what community need are you addressing?" value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })} />
      <textarea required placeholder="Solution — how will your project solve it?" value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} />
      <textarea required placeholder="Technology use — what tools/software will you use?" value={form.technology_use} onChange={e => setForm({ ...form, technology_use: e.target.value })} />
      <PitchEthicsFields draft={form} setDraft={setForm} />
      <input placeholder="Client (optional)" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
      <select value={form.community_partner_name} onChange={e => setForm({ ...form, community_partner_name: e.target.value })}>
        <option value="">Community partner (optional)…</option>
        {partners.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
      </select>
      <StudentTagPicker value={form.tagged_emails} onChange={(tagged_emails, selectedStudents) => setForm({ ...form, tagged_emails, tagged_names: selectedStudents.map(student => student.name) })} />
      <button className="east-button">Submit pitch</button>
    </form>
    {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div> : !visibleItems.length ? <EmptyState>Submitted pitches will appear here.</EmptyState> : <div className="space-y-4">
      {visibleItems.map(x => <article key={x.id} className="rounded-xl border bg-white p-5 text-foreground shadow-sm">
        <div className="flex flex-wrap items-center gap-2"><h3 className={`font-semibold ${changedClass(x, 'project_title')}`}>{x.project_title}</h3>{isAdmin && pitchNeedsAdminAttention(x) && <span className="rounded-full border border-destructive/60 bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">{pitchAttentionLabel(x)}</span>}</div>
        <p className="mb-3 text-xs text-slate-500">Submitted by {x.student_names} · Tagged: {namesForTaggedEmails(x.tagged_emails, resolvedNames)} · Submitted {new Date(x.created_date).toLocaleString()} · <span className="font-semibold capitalize">{(x.approval_status || 'pending').replace('_', ' ')}</span></p>
        {isAdmin && x.student_changed_fields?.length > 0 && <p className="mb-3 text-xs font-semibold text-foreground"><span className="change-highlight">Yellow highlight</span> shows changes from the latest student resubmission.</p>}
        {isAdmin && <div className="mb-4 flex flex-wrap gap-2"><AdminPitchEditor pitch={x} partners={partners} users={users} onSave={async changes => { const memberEmails = (changes.tagged_emails || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean); await base44.entities.ProjectPitch.update(x.id, { ...changes, member_emails: memberEmails }); await base44.functions.invoke('syncPitchMembers', { pitchId: x.id }); await reload(); }} />{['pending', 'revision_requested'].includes(x.approval_status || 'pending') && <><button disabled={decidingId === x.id} onClick={() => decidePitch(x, 'approved')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">{decidingId === x.id ? 'Saving…' : 'Approve'}</button><RejectWithFeedback onReject={feedback => decidePitch(x, 'rejected', feedback)} /></>}<PitchQuestionForm onSend={instructions => requestPitchRevision(x, instructions)} /><PitchLifecycleActions status={lifecycleFor(x)} onComplete={() => setPitchLifecycle(x, 'completed')} onArchive={() => setPitchLifecycle(x, 'archived')} onDelete={() => setPitchLifecycle(x, 'deleted')} /></div>}
        {!isAdmin && canEditPitch(x) && (x.approval_status !== 'approved' || !x.ethics_statement || !x.ethical_concerns) && <div className="mb-4"><StudentPitchEditor pitch={x} partners={partners} ethicsOnly={x.approval_status === 'approved'} startOpen={x.id === requestedPitchId} onSave={changes => saveStudentPitchChanges(x, changes)} /></div>}
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <p><b>Problem:</b> <span className={changedClass(x, 'problem')}>{x.problem}</span></p>
          <p><b>Solution:</b> <span className={changedClass(x, 'solution')}>{x.solution}</span></p>
          <p><b>Ethical approach:</b> <span className={changedClass(x, 'ethics_statement')}>{x.ethics_statement || 'Needs to be added'}</span></p>
          <p><b>Ethical concerns:</b> <span className={changedClass(x, 'ethical_concerns')}>{x.ethical_concerns || 'Needs to be added'}</span></p>
          <div>
            <b>Technology:</b> {editingTechId === x.id ? null : <span className={changedClass(x, 'technology_use')}>{x.technology_use}</span>}
            {x.approval_status === 'approved' && canEditPitch(x) && editingTechId !== x.id && <button onClick={() => startEditTech(x)} className="ml-2 text-xs font-semibold text-neon-cyan underline">add more</button>}
            {editingTechId === x.id && <div className="mt-2 flex flex-col gap-2">
              <textarea value={techDraft} onChange={e => setTechDraft(e.target.value)} />
              <div className="flex gap-2"><button onClick={() => saveTech(x)} className="east-button">Save</button><button onClick={() => setEditingTechId(null)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button></div>
            </div>}
          </div>
          <p><b>Client:</b> <span className={changedClass(x, 'client_name')}>{x.client_name || 'None'}</span></p>
          <p><b>Community Partner:</b> <span className={changedClass(x, 'community_partner_name')}>{x.community_partner_name || x.client_partner_name || 'None'}</span></p>
        </div>
        {(() => { const tagged = checks.filter(c => c.project_pitch_id === x.id); return tagged.length ? <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-semibold text-slate-600">Check-ins tagged to this project</p>
          <div className="space-y-2">{tagged.map(c => <div key={c.id} className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-500">{c.student_names} · week ending {c.week_ending} · {c.hours} hrs {c.approval_status === 'pending' && <span className="ml-1 font-semibold text-primary">(pending approval)</span>}</p>
            <p><b>Accomplished:</b> {c.accomplishment}</p>
          </div>)}</div>
        </div> : null; })()}
        <ConversationThread parentType="pitch" parentId={x.id} collapsed={x.approval_status === 'approved'} memberIds={pitchStudentIds(x, users)} memberEmails={x.member_emails || (x.tagged_emails || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean)} me={me} onMessageSent={async message => { if (isAdmin) { await notifyPitchStudents(x, 'communication', `New message about “${x.project_title}”: ${message}`); await markPitchInteraction(x.id, 'admin_feedback_at'); } else { await markPitchInteraction(x.id, 'student_interaction_at'); await markConversationRead(x.id); } }} />
      </article>)}
    </div>}
  </>;
}