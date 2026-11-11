import useEntityList from '@/hooks/useEntityList';

const entities = {
  pitches: 'ProjectPitch', goals: 'WeeklyGoal', checkIns: 'WeeklyCheckIn', comments: 'Comment',
  service: 'ServiceEntry', skills: 'StudentSkill', tasks: 'TaskRequest', grades: 'AssignmentGrade',
  help: 'HelpRequest', linkNotes: 'LinkNote', projects: 'Project', assignments: 'Assignment',
  doNowQuestions: 'DoNowQuestion', doNowResponses: 'DoNowResponse', readingResponses: 'ReadingResponse',
};

export default function useStandardsAssessmentData(users = []) {
  const pitches = useEntityList(entities.pitches), goals = useEntityList(entities.goals);
  const checkIns = useEntityList(entities.checkIns), comments = useEntityList(entities.comments);
  const service = useEntityList(entities.service), skills = useEntityList(entities.skills);
  const tasks = useEntityList(entities.tasks), grades = useEntityList(entities.grades);
  const help = useEntityList(entities.help), linkNotes = useEntityList(entities.linkNotes);
  const projects = useEntityList(entities.projects), assignments = useEntityList(entities.assignments);
  const doNowQuestions = useEntityList(entities.doNowQuestions), doNowResponses = useEntityList(entities.doNowResponses);
  const readingResponses = useEntityList(entities.readingResponses);
  const sources = { pitches, goals, checkIns, comments, service, skills, tasks, grades, help, linkNotes, projects, assignments, doNowQuestions, doNowResponses, readingResponses };
  return { data: { ...Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, value.items])), users }, loading: Object.values(sources).some(value => value.loading) };
}