import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { standardGrowthPoints } from '@/lib/standardsProgress';

const bandTick = value => ({ 0: 'K-2', 3: '3-6', 6: '7-8', 9: '9-12' }[value] || '');

export default function StandardGrowthChart({ assessments, standardKey }) {
  const data = standardGrowthPoints(assessments, standardKey);
  if (!data.length) return <div className="flex h-36 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">Growth appears after an assessment.</div>;
  return <div className="h-44 rounded-lg border bg-muted/20 p-2" aria-label="Dated growth trajectory chart">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 2, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
        <XAxis dataKey="date" tick={{ fontSize: 9 }} minTickGap={14} />
        <YAxis domain={[0, 11]} ticks={[0, 3, 6, 9]} tickFormatter={bandTick} width={38} tick={{ fontSize: 10 }} />
        <Tooltip labelFormatter={(_, items) => items?.[0]?.payload?.kind === 'Checked' ? `Score checked: ${items[0].payload.date}` : `Advanced: ${items?.[0]?.payload?.date || ''}`} formatter={(_, __, item) => [item.payload.level, 'Level']} />
        <Line type="stepAfter" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 5, fill: 'hsl(var(--accent))' }} activeDot={{ r: 7 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}