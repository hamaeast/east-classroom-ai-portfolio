export function showSubmissionRequirements(messages) {
  window.dispatchEvent(new CustomEvent('submission-requirements', { detail: Array.isArray(messages) ? messages : [messages] }));
}