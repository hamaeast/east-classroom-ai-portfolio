export const FACILITATION_ACTIONS = [
  'Individual student conference', 'Team conference', 'Small-group support', 'Whole-group instruction',
  'Project planning support', 'Helped identify next steps', 'Provided resources', 'Adjusted facilitation or instruction',
  'Helped remove a project barrier', 'Clarified team roles or responsibilities', 'Connected students with a community partner', 'Provided feedback', 'Other'
];

export const STATUS_LABELS = {
  monitoring: 'Monitoring', improvement_evident: 'Improvement Evident', some_improvement: 'Some Improvement',
  continued_support_needed: 'Continued Support Needed', no_clear_change: 'No Clear Change Yet', resolved: 'Resolved', complete: 'Complete'
};

export const CONCERN_LABELS = {
  next_steps: 'Next steps', repeated_challenge: 'Repeated challenge', help_request: 'Help request', project_progress: 'Project progress',
  teamwork: 'Teamwork', communication: 'Communication', documentation: 'Documentation', returned_work: 'Returned work',
  positive_progress: 'Positive progress', other: 'Other'
};

export const DEFAULT_PGP_GOAL = 'By May, I will strengthen my instructional decision-making and facilitation within EAST by regularly analyzing student project and reflection data to identify learning needs and implement targeted instructional responses, as evidenced through the Base44 PGP Building Goal Report.';

export function facilitationSubject(item) {
  return [item.student_name, item.team_name, item.project_name].filter(Boolean).join(' · ') || 'Program-level review';
}