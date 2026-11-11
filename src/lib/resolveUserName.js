// Turns a comma-separated list of tagged emails into a comma-separated list of display names,
// using a resolved email->name map (see useResolvedNames), falling back to the raw email.
export function namesForTaggedEmails(taggedEmails, resolvedNames = {}) {
  return (taggedEmails || '').split(',').map(e => e.trim()).filter(Boolean)
    .map(e => resolvedNames[e.toLowerCase()] || e).join(', ');
}