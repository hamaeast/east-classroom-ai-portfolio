import useEntityList from '@/hooks/useEntityList';

export default function useFacilitationData() {
  const users = useEntityList('User');
  const checkIns = useEntityList('WeeklyCheckIn');
  const goals = useEntityList('WeeklyGoal');
  const projects = useEntityList('Project');
  const pitches = useEntityList('ProjectPitch');
  const tasks = useEntityList('TaskRequest');
  const help = useEntityList('HelpRequest');
  const comments = useEntityList('Comment');
  const service = useEntityList('ServiceEntry');
  const assignments = useEntityList('Assignment');
  const assignmentGrades = useEntityList('AssignmentGrade');
  const readingResponses = useEntityList('ReadingResponse');
  const standards = useEntityList('StandardsAssessment');
  const skills = useEntityList('StudentSkill');
  const doNowResponses = useEntityList('DoNowResponse');
  const reviewItems = useEntityList('FacilitationReviewItem');
  const records = useEntityList('FacilitationRecord');
  const settings = useEntityList('FacilitationSetting');
  const writingGrowthRecords = useEntityList('WritingGrowthRecord');
  const sources = { users: users.items, checkIns: checkIns.items, goals: goals.items, projects: projects.items, pitches: pitches.items, tasks: tasks.items, help: help.items, comments: comments.items, service: service.items, assignments: assignments.items, assignmentGrades: assignmentGrades.items, readingResponses: readingResponses.items, standards: standards.items, skills: skills.items, doNowResponses: doNowResponses.items, facilitationRecords: records.items };
  const loading = [users, checkIns, goals, projects, pitches, tasks, help, comments, service, assignments, assignmentGrades, readingResponses, standards, skills, doNowResponses, reviewItems, records, settings, writingGrowthRecords].some(list => list.loading);
  const reload = () => Promise.all([reviewItems.reload(), records.reload(), settings.reload(), writingGrowthRecords.reload()]);
  return { sources, reviewItems: reviewItems.items, records: records.items, settings: settings.items, writingGrowthRecords: writingGrowthRecords.items, loading, reload };
}