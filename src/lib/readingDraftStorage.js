export const draftAnswerObject = draft => Object.fromEntries((Array.isArray(draft?.answers) ? draft.answers : []).filter(item => item?.question_id).map(item => [item.question_id, String(item.answer ?? '')]));

export function readReadingDraft(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function writeReadingDraft(key, answers) {
  try { localStorage.setItem(key, JSON.stringify(answers)); return true; }
  catch { return false; }
}

export function removeReadingDraft(key) {
  try { localStorage.removeItem(key); } catch { /* Storage may be unavailable; the saved submission remains authoritative. */ }
}