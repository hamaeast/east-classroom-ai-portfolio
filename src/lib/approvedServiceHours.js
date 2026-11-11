const normalize = value => String(value || '').trim().toLowerCase();

export function isForApprovedPitch(entry, checkIns = [], pitches = []) {
  const approved = pitches.filter(pitch => pitch.approval_status === 'approved' && (pitch.community_partner_name || pitch.client_partner_name));
  const linkedCheckIn = entry.weekly_check_in_id
    ? checkIns.find(checkIn => checkIn.id === entry.weekly_check_in_id)
    : null;
  const pitchId = entry.project_pitch_id || linkedCheckIn?.project_pitch_id;
  if (pitchId) return approved.some(pitch => pitch.id === pitchId);
  return approved.some(pitch => normalize(pitch.project_title) === normalize(entry.project_title));
}

export function approvedServiceEntries(entries = [], checkIns = [], pitches = []) {
  return entries.filter(entry => isForApprovedPitch(entry, checkIns, pitches));
}