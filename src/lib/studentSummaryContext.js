import { CART_EVIDENCE_GUIDANCE } from '@/lib/cartFramework';
import { belongsToStudent } from '@/lib/studentRecommendationContext';

// Gathers everything tied to one student across pitches, check-ins, feedback comments,
// service hours and skills, and turns it into a context block + prompt for the AI summary,
// plus a fingerprint that changes whenever any of that underlying data changes.
export function buildStudentContext(student, { pitches, checkIns, comments, serviceEntries, skills, weeklyGoals, range = 'overall' }) {
  const name = (student.full_name || '').trim().toLowerCase();
  const email = (student.email || '').toLowerCase();

  const cutoff = range === 'month' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : null;
  const isRecent = (dateStr) => !cutoff || (dateStr && new Date(dateStr) >= cutoff);

  const myPitches = pitches.filter(p => belongsToStudent(p, student) && isRecent(p.created_date));
  const myCheckIns = checkIns.filter(c => belongsToStudent(c, student) && isRecent(c.week_ending));
  const myServiceEntries = serviceEntries.filter(s => belongsToStudent(s, student) && isRecent(s.service_date));
  const mySkills = skills.filter(s => (s.student_name || '').trim().toLowerCase() === name && isRecent(s.created_date));
  const myGoals = weeklyGoals.filter(g => g.student_id === student.id && isRecent(g.week_start));
  const pitchIds = myPitches.map(p => p.id);
  const checkInIds = myCheckIns.map(c => c.id);
  const myComments = comments.filter(c => (c.parent_type === 'pitch' && pitchIds.includes(c.parent_id)) || (c.parent_type === 'check_in' && checkInIds.includes(c.parent_id)));
  const commentsFor = (type, id) => myComments.filter(c => c.parent_type === type && c.parent_id === id).map(c => `  - Feedback from ${c.author_role || 'someone'} (${c.author_name || 'unknown'}): "${c.message}"`).join('\n');

  const partners = [...new Set([...myPitches.map(p => p.client_partner_name), ...myCheckIns.map(c => c.partner_name)].filter(Boolean))];
  const lateCount = myCheckIns.filter(c => c.is_late).length;
  const backdatedCount = myCheckIns.filter(c => c.is_backdated).length;
  const totalHours = myServiceEntries.reduce((s, x) => s + Number(x.hours || 0), 0);

  const pitchText = myPitches.map(p => `- Pitch "${p.project_title}" (status: ${p.approval_status}). Problem: ${p.problem}. Solution: ${p.solution}. Technology: ${p.technology_use}. Community partner: ${p.client_partner_name || 'none'}.\n${commentsFor('pitch', p.id)}`).join('\n');
  const checkInText = myCheckIns.slice().sort((a, b) => new Date(a.week_ending) - new Date(b.week_ending)).map(c => `- Week ending ${c.week_ending} on "${c.project_title}" (status: ${c.approval_status}${c.grade != null ? `, grade ${c.grade}/10` : ''}${c.is_late ? ', LATE' : ''}${c.is_backdated ? ', BACKDATED' : ''}). Accomplished: ${c.accomplishment}. Next step: ${c.next_step}. Challenge: ${c.blocker}. Help needed: ${c.help_needed}. Confidence: ${c.confidence}/5. Public evidence review: ${JSON.stringify(c.evidence_analysis || [])}.\n${commentsFor('check_in', c.id)}`).join('\n');
  const skillText = mySkills.length ? mySkills.map(s => `- ${s.skill_name} (${s.proficiency}${s.certification_name ? `, certified: ${s.certification_name}` : ''})`).join('\n') : 'None submitted yet.';
  const goalText = myGoals.map(g => `- Week of ${g.week_start}. Goal: ${g.goal_text || 'Not submitted'}. AI suggestion: ${g.ai_suggestion || 'None'}. Met goal: ${g.met_goal || 'Not answered'}. Day met: ${g.met_goal_day || 'Not answered'}. Goal too hard: ${g.goal_too_hard || 'Not answered'}. Student notes: ${g.reflection_notes || 'None'}.`).join('\n');

  const text = `Student: ${student.full_name || student.email}\n\nPROJECT PITCHES:\n${pitchText || 'None submitted.'}\n\nWEEKLY GOALS AND REFLECTIONS:\n${goalText || 'None submitted.'}\n\nWEEKLY CHECK-INS (${myCheckIns.length} total, ${lateCount} late, ${backdatedCount} backdated):\n${checkInText || 'None submitted.'}\n\nSERVICE HOURS: ${totalHours} hours logged.\n\nCOMMUNITY PARTNERS WORKED WITH: ${partners.join(', ') || 'None'}\n\nSKILLS SUBMITTED:\n${skillText}`;

  const fingerprint = JSON.stringify([...myPitches, ...myGoals, ...myCheckIns, ...myComments, ...myServiceEntries, ...mySkills].map(x => [x.id, x.updated_date]));
  return { text, fingerprint, hasData: !!(myPitches.length || myGoals.length || myCheckIns.length || myServiceEntries.length || mySkills.length) };
}

export function buildSummaryPrompt(contextText, range = 'overall') {
  const scopeNote = range === 'month' ? 'Focus only on the last 30 days of activity shown below.' : 'Cover the student\'s entire history shown below.';
  return `You are an encouraging but honest mentor writing a short learning summary for a student in a service-learning / project-based program. Use ONLY the real data below — do not invent details. ${scopeNote} Use the CART framework below as guidance for recognizing strong project evidence. Public evidence reviews may corroborate concrete learning shown in linked work, but do not treat a link alone as proof of authorship. Use inaccessible or unclear evidence suggestions to recommend an easier way for the student to document learning. Do not award credit for a CART concept unless the student's data demonstrates it, and do not add separate CART headings.

${CART_EVIDENCE_GUIDANCE}

${contextText}

Write the summary in very simple words a 4th grader (age 9-10) could easily read — short sentences, no big or complicated words. Use markdown with exactly these three headers, each with 2-3 short bullet points, nothing else:

## Positive Failures
Things that didn't go well (a rejected pitch, a returned check-in, a low grade, a blocker, a late submission) but where they clearly learned something. Say what happened and what they learned, in simple words.

## Growth
How their work has gotten better over time — for example getting more confident, submitting on time more, or improving skills.

## Suggestions to Improve
2-3 short, kind, simple tips for what to work on next.

Keep it short overall. If there isn't much data yet, clearly say "Not enough dashboard evidence yet" and suggest the specific examples the student should add. Never infer growth, skill, leadership, teamwork, or project quality from an enrolled grade, project title, or vague statement.`;
}