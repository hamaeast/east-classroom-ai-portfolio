import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { STANDARD_KEYS } from '@/lib/eastStandards';
import QuickPanel from './QuickPanel';

const BANDS = ['K-2', '3-6', '7-8', '9-12'];
const SKILL_NAMES = {
  self_directed: 'Self-directed learning',
  ethical_problem_solving: 'Ethical problem solving',
  collaboration: 'Collaboration',
  research: 'Research',
  communication: 'Communication',
  technology: 'Technology',
  confidence: 'Confidence',
};

function currentAssessments(assessments) {
  return Object.values(assessments.reduce((latest, item) => {
    if (!latest[item.student_id] || new Date(item.generated_at) > new Date(latest[item.student_id].generated_at)) latest[item.student_id] = item;
    return latest;
  }, {}));
}

export default function StandardsProficiencyMix({ assessments }) {
  const current = currentAssessments(assessments);
  const data = STANDARD_KEYS.map(key => {
    const results = current.map(item => item.results?.find(result => result.standard_key === key)).filter(Boolean);
    return { skill: SKILL_NAMES[key], ...Object.fromEntries(BANDS.map(band => [band, results.filter(result => result.assessed_grade_band === band).length])) };
  });
  const latestDate = assessments.reduce((latest, item) => !latest || new Date(item.generated_at) > new Date(latest) ? item.generated_at : latest, '');
  return <QuickPanel title="Students by Standard and Grade-Level Band">
    <p className="mb-4 text-sm text-muted-foreground">Each bar shows how many students are currently assessed in that grade-level band for each standard. Uses the latest cached assessment per student with no AI calls.{latestDate ? ` Updated through ${new Date(latestDate).toLocaleDateString()}.` : ''}</p>
    {current.length ? <ResponsiveContainer width="100%" height={390}><BarChart data={data} layout="vertical" margin={{ left: 12, right: 16 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} label={{ value: 'Number of students', position: 'insideBottom', offset: -4 }} height={48} /><YAxis type="category" dataKey="skill" width={155} fontSize={12} /><Tooltip /><Legend /><Bar dataKey="K-2" fill="hsl(var(--accent))" radius={[0, 3, 3, 0]} /><Bar dataKey="3-6" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} /><Bar dataKey="7-8" fill="hsl(var(--success))" radius={[0, 3, 3, 0]} /><Bar dataKey="9-12" fill="hsl(var(--destructive))" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground">No saved standards assessments yet.</p>}
  </QuickPanel>;
}