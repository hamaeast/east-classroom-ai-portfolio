/* Isolated demo UI. No network access (blocked by the page's CSP). */
(function () {
  const D = window.DemoData;
  const P = window.DemoPolicy;
  const app = document.getElementById('app');
  const me = D.students[0]; // the fictional student whose view is shown

  // ---- tiny DOM helper (textContent only, so typed input is never parsed as HTML)
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  }
  const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  const recContext = '[Student history context: in production this lists the student\'s own recent goals, pitches, and check-ins. Omitted in the demo.]';

  // ---- state
  const state = {
    goal: { record: {}, text: '', result: null, sim: null, prompt: '' },
    checkIn: { attempts: 0, form: { accomplishment: '', next_step: '', blocker: '', url: '', desc: '' }, result: null, sim: null, prompt: '' },
    submitted: [], // check-ins this demo session sent to the teacher
    reviewed: {},
  };

  function simBox(label, prompt, response, note) {
    return h('div', { class: 'sim' },
      h('span', { class: 'tag' }, 'Simulated AI response'), ' ',
      h('b', {}, label),
      h('p', { class: 'small' }, note || 'Prerecorded for this demo. In the live app this step sends the prompt below to a language model through Base44 and requires a JSON reply matching a schema.'),
      h('details', {}, h('summary', {}, 'Prompt the live app would send'), h('pre', {}, prompt)),
      response === undefined ? null : h('details', { open: true }, h('summary', {}, 'Prerecorded JSON reply used here'), h('pre', {}, JSON.stringify(response, null, 2)))
    );
  }

  // ======================= 1. Weekly goal =======================
  function goalSubmit() {
    const g = state.goal;
    const text = g.text.trim();
    if (text.length < 8) { g.result = { outcome: 'blocked', reason: 'The form requires at least 8 characters (browser validation, no AI involved).' }; g.sim = null; return render(); }
    let response;
    if (g.record.ai_suggestion_used) response = undefined; // no model call
    else if (text === D.goalSamples.unclear.text) response = D.goalSamples.unclear.response;
    else response = D.goalSamples.clear.response;
    const decision = P.decideGoal(g.record, response === undefined ? { acceptable: true } : response);
    g.prompt = fill(D.prompts.goal, { goal: text, recommendationContext: recContext });
    g.sim = response === undefined ? null : response;
    g.calledModel = decision.calledModel;
    if (decision.recordChanges) Object.assign(g.record, decision.recordChanges);
    g.result = decision;
    render();
  }

  function goalView() {
    const g = state.goal;
    const sampleText = text => () => { g.text = text; render(); };
    const r = g.result;
    return [
      h('section', { class: 'panel' },
        h('h2', {}, 'Weekly goal'),
        h('p', { class: 'muted' }, `Signed in as ${me.name} · Project: ${me.project}`),
        h('p', { class: 'small' }, 'Choose one clear goal you can accomplish in one week—not one day and not one month.'),
        h('div', { class: 'row sample-btns' }, h('span', { class: 'small muted' }, 'Try a sample:'),
          h('button', { onclick: sampleText(D.goalSamples.clear.text) }, 'Clear short goal'),
          h('button', { onclick: sampleText(D.goalSamples.unclear.text) }, 'Unclear goal'),
          g.record.ai_suggestion_used ? h('button', { onclick: sampleText(D.goalSamples.revised.text) }, 'Revised goal') : null,
          h('button', { onclick: () => { state.goal = { record: {}, text: '', result: null, sim: null, prompt: '' }; render(); } }, 'Reset')),
        h('label', { for: 'goal' }, 'My goal for this week'),
        h('textarea', { id: 'goal', rows: 3, placeholder: 'My goal for this week is…', oninput: e => { g.text = e.target.value; } }, g.text),
        g.record.ai_suggestion && !(r && r.outcome === 'accepted') ? h('div', { class: 'status warn' }, h('b', {}, 'AI suggestion: '), g.record.ai_suggestion, ' Revise once, then submit again.') : null,
        h('div', { class: 'row mt' }, h('button', { class: 'primary', onclick: goalSubmit }, 'Submit weekly goal')),
        r && r.outcome === 'accepted' ? h('div', { class: 'status ok' }, h('b', {}, 'Goal accepted. '), r.reason) : null,
        r && r.outcome === 'blocked' ? h('div', { class: 'status bad' }, r.reason) : null,
        r && r.outcome === 'needs_revision' ? h('div', { class: 'status warn' }, 'Not submitted yet. The student gets one short clarifying question. The next submission is accepted without another AI check.') : null,
        r && g.calledModel ? simBox('Goal review', g.prompt, g.sim) : null,
        r && r.outcome === 'accepted' && !g.calledModel ? h('div', { class: 'sim' }, h('span', { class: 'tag' }, 'No model call'), ' The record already has ai_suggestion_used = true, so the code skips the AI check.') : null,
        h('p', { class: 'where' }, 'Mirrors src/components/east/WeeklyGoalForm.jsx. Enforced in code: one clarification per goal (stored flag), fail-open if the AI call errors. Asked in the prompt only: accept short or misspelled goals, ask at most one question.')
      ),
    ];
  }

  // ======================= 2. Weekly check-in =======================
  function checkInSubmit() {
    const c = state.checkIn;
    const f = c.form;
    const missing = ['accomplishment', 'next_step', 'blocker'].filter(k => !f[k].trim());
    if (missing.length || !f.url.trim() || !f.desc.trim()) {
      c.result = { outcome: 'blocked', reason: 'Required fields are checked in code before any AI call: every written answer, at least one evidence link, and a description for each link.' };
      c.sim = null; return render();
    }
    const evidence = [{ url: f.url.trim(), description: f.desc.trim() }];
    const bypass = c.attempts >= 2;
    const isWeak = f.accomplishment.trim() === D.checkInSamples.weak.accomplishment;
    let response;
    if (bypass) response = D.checkInSamples.evidenceOnlyResponse;
    else if (isWeak) response = D.checkInSamples.response;
    else response = { accomplishment_valid: true, accomplishment_hint: '', next_step_valid: true, next_step_hint: '', blocker_valid: true, blocker_hint: '', evidence_reviews: D.checkInSamples.evidenceOnlyResponse.evidence_reviews };
    c.prompt = bypass
      ? fill(D.prompts.evidenceOnly, { evidenceJson: JSON.stringify(evidence), evidenceInstructions: D.prompts.evidenceInstructions })
      : fill(D.prompts.checkIn, { ...f, evidenceJson: JSON.stringify(evidence), evidenceInstructions: D.prompts.evidenceInstructions, recommendationContext: recContext });
    c.sim = response;
    const decision = P.decideCheckIn(c.attempts, response);
    c.attempts = decision.attempts;
    c.result = decision;
    if (decision.outcome === 'submitted') {
      state.submitted.unshift({
        id: 'demo-' + Date.now(), studentId: me.id, week: 'Week ending Oct 23 (sample)', hours: 2,
        accomplishment: f.accomplishment, next_step: f.next_step, blocker: f.blocker,
        flag: decision.ai_review_flag, late: false,
        evidence: decision.evidence_analysis.map(e => ({ ...e })),
      });
    }
    render();
  }

  function checkInView() {
    const c = state.checkIn;
    const f = c.form;
    const r = c.result;
    const field = (key, label) => [h('label', { for: key }, label), h('textarea', { id: key, rows: 2, oninput: e => { f[key] = e.target.value; } }, f[key])];
    const loadWeak = () => { const w = D.checkInSamples.weak; Object.assign(f, { accomplishment: w.accomplishment, next_step: w.next_step, blocker: w.blocker, url: w.evidence[0].url, desc: w.evidence[0].description }); render(); };
    return [
      h('section', { class: 'panel' },
        h('h2', {}, 'Weekly check-in'),
        h('p', { class: 'muted' }, `${me.name} · ${me.project} · Week ending Oct 23 (sample)`),
        h('div', { class: 'row sample-btns' }, h('span', { class: 'small muted' }, 'Try a sample:'),
          h('button', { onclick: loadWeak }, 'Low-effort answers + private link'),
          h('button', { onclick: () => { state.checkIn = { attempts: 0, form: { accomplishment: '', next_step: '', blocker: '', url: '', desc: '' }, result: null, sim: null, prompt: '' }; render(); } }, 'Reset')),
        h('div', { class: 'attempts', title: 'AI suggestion rounds used' }, h('span', { class: c.attempts >= 1 ? 'used' : '' }), h('span', { class: c.attempts >= 2 ? 'used' : '' }), h('small', { class: 'muted small' }, ` AI suggestion rounds used: ${c.attempts} of 2`)),
        ...field('accomplishment', 'What did you accomplish this week?'),
        ...field('next_step', 'What is your next step?'),
        ...field('blocker', 'Challenges (or "none")'),
        h('label', { for: 'url' }, 'Evidence link'),
        h('input', { id: 'url', type: 'text', value: f.url, oninput: e => { f.url = e.target.value; } }),
        h('label', { for: 'desc' }, 'Describe the evidence'),
        h('input', { id: 'desc', type: 'text', value: f.desc, oninput: e => { f.desc = e.target.value; } }),
        h('div', { class: 'row mt' }, h('button', { class: 'primary', onclick: checkInSubmit }, 'Submit check-in')),
        r && r.outcome === 'blocked' ? h('div', { class: 'status bad' }, r.reason) : null,
        r && r.outcome === 'returned_with_hints' ? h('div', { class: 'status warn' },
          h('b', {}, `Attempt ${r.attempts}: a few answers need more detail. `), 'The app shows hints and does not write the answers.',
          h('ul', { class: 'hints' }, r.hints.map(x => h('li', {}, h('b', {}, x.label + ': '), x.hint))),
          r.attempts >= 2 ? h('p', { class: 'small' }, 'Two suggestion rounds used. The next submission skips written-answer review and goes to the teacher.') : null) : null,
        r && r.outcome === 'submitted' ? h('div', { class: 'status ok' }, h('b', {}, 'Check-in submitted. '), r.reason, r.ai_review_flag ? ' Flagged for the teacher: "Submitted after two AI suggestions."' : '') : null,
        r && r.outcome === 'submitted' && r.evidence_analysis.length ? evidenceBox(r.evidence_analysis, 'Evidence review (advisory, did not block submission)') : null,
        r && r.outcome !== 'blocked' ? simBox(r.bypassAi ? 'Evidence-only review (written answers no longer re-checked)' : 'Written answers + evidence review', c.prompt, c.sim) : null,
        h('p', { class: 'where' }, 'Mirrors src/pages/CheckIns.jsx. Enforced in code: required fields, a two-round limit before bypass, teacher flag on bypass, evidence review never blocks, fail-open on AI errors. Note: production stores the attempt counter in the browser (localStorage), so it is a UX limit, not a security control.')
      ),
    ];
  }

  function evidenceBox(list, title) {
    return h('div', { class: 'evidence' }, h('b', {}, title),
      list.map(e => h('div', {},
        h('p', {}, h('b', {}, e.accessible ? 'Public evidence found: ' : 'Could not inspect: '), e.summary),
        e.demonstrated_learning ? h('p', {}, h('b', {}, 'Learning shown: '), e.demonstrated_learning) : null,
        e.suggestion ? h('p', {}, h('b', {}, 'Suggestion: '), e.suggestion) : null,
        h('p', { class: 'muted' }, 'Link (not opened in demo): ', h('code', {}, e.url)))));
  }

  // ======================= 3. Teacher review =======================
  function teacherView() {
    const rows = [...state.submitted, ...D.teacherQueue];
    const name = id => (D.students.find(s => s.id === id) || {}).name || 'Student';
    const g = D.growthSample;
    return [
      h('section', { class: 'panel' },
        h('h2', {}, 'Check-in review queue'),
        h('p', { class: 'muted' }, 'Teacher view · sample records. AI output is shown as advice next to the student\'s own words; the teacher approves, returns, or clears the flag.'),
        !state.submitted.length ? h('div', { class: 'status warn' }, 'Tip: submit a check-in in step 2 (use the low-effort sample three times) to see it arrive here with the teacher flag.') : null),
      ...rows.map(x => {
        const done = state.reviewed[x.id];
        return h('section', { class: 'panel' },
          h('div', { class: 'row' }, h('h3', {}, name(x.studentId)), h('span', { class: 'muted small' }, `${x.week} · ${x.hours} h`),
            x.flag && !done ? h('span', { class: 'badge flag' }, 'Submitted after two AI suggestions') : null,
            x.late ? h('span', { class: 'badge late' }, 'Late — grade needs review') : null,
            done ? h('span', { class: 'badge ok' }, done) : null),
          h('div', { class: 'grid2' },
            h('div', {}, h('p', {}, h('b', {}, 'Accomplished: '), x.accomplishment), h('p', {}, h('b', {}, 'Next step: '), x.next_step), h('p', {}, h('b', {}, 'Challenge: '), x.blocker)),
            x.evidence.length ? evidenceBox(x.evidence, 'Evidence review (AI, advisory)') : h('p', { class: 'muted' }, 'No evidence review.')),
          h('div', { class: 'row mt' },
            h('button', { class: 'primary', disabled: !!done, onclick: () => { state.reviewed[x.id] = 'Approved by teacher (demo)'; render(); } }, 'Approve'),
            h('button', { disabled: !!done, onclick: () => { state.reviewed[x.id] = 'Returned to student (demo)'; render(); } }, 'Return to student'),
            x.flag ? h('button', { disabled: !!done, onclick: () => { state.reviewed[x.id] = 'Flag cleared (demo)'; render(); } }, 'Mark reviewed') : null));
      }),
      h('section', { class: 'panel' },
        h('h2', {}, 'Learning-evidence summary (sample)'),
        h('p', { class: 'muted small' }, 'Static example of a teacher-facing growth record. Shown to illustrate the cautious language required by the prompt and the fixed status list enforced by the schema.'),
        h('p', {}, h('b', {}, name(g.student)), ' · Focus: ', g.focus, ' · ', h('span', { class: 'badge ok' }, g.status)),
        h('p', {}, h('b', {}, 'Starting point: '), g.starting),
        h('p', {}, h('b', {}, 'Teacher action: '), g.teacherAction),
        h('p', {}, h('b', {}, 'Later work: '), g.later),
        h('div', { class: 'sim' }, h('span', { class: 'tag' }, 'Sample, not model output'), ' ', g.note),
        h('p', { class: 'where' }, 'Mirrors src/lib/learningGrowthAnalysis.js. Enforced in code: the model can only select from case IDs built from real records, and statuses come from a fixed enum. Asked in the prompt only: no causal or unsupported growth claims.'))
    ];
  }

  // ======================= routing =======================
  const views = { goal: goalView, checkin: checkInView, teacher: teacherView };
  function current() { const t = location.hash.replace('#', ''); return views[t] ? t : 'goal'; }
  function render() {
    const tab = current();
    document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
    app.replaceChildren(...views[tab]());
  }
  window.addEventListener('hashchange', render);

  // ?scene=… preloads a state (used for screenshots in docs/screenshots/)
  const scene = new URLSearchParams(location.search).get('scene');
  const weak = () => { const w = D.checkInSamples.weak; Object.assign(state.checkIn.form, { accomplishment: w.accomplishment, next_step: w.next_step, blocker: w.blocker, url: w.evidence[0].url, desc: w.evidence[0].description }); };
  const scenes = {
    'goal-clear': () => { location.hash = 'goal'; state.goal.text = D.goalSamples.clear.text; goalSubmit(); },
    'goal-unclear': () => { location.hash = 'goal'; state.goal.text = D.goalSamples.unclear.text; goalSubmit(); },
    'goal-revised': () => { location.hash = 'goal'; state.goal.text = D.goalSamples.unclear.text; goalSubmit(); state.goal.text = D.goalSamples.revised.text; goalSubmit(); },
    'checkin-attempt2': () => { location.hash = 'checkin'; weak(); checkInSubmit(); checkInSubmit(); },
    'checkin-fallback': () => { location.hash = 'checkin'; weak(); checkInSubmit(); checkInSubmit(); checkInSubmit(); },
    'teacher': () => { location.hash = 'checkin'; weak(); checkInSubmit(); checkInSubmit(); checkInSubmit(); location.hash = 'teacher'; },
  };
  if (scenes[scene]) scenes[scene]();
  render();
})();
