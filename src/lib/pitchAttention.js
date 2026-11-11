export function pitchNeedsAdminAttention(pitch) {
  if ((pitch.approval_status || 'pending') !== 'pending') return false;
  return !pitch.admin_feedback_at || Boolean(pitch.student_interaction_at && pitch.student_interaction_at > pitch.admin_feedback_at);
}

export function pitchAttentionLabel(pitch) {
  return pitch.admin_feedback_at ? 'Student updated — review again' : 'Needs first review';
}