import { accelerationStatus } from '@/lib/assessmentAcceleration';
import { STANDARD_NAMES } from '@/lib/eastStandards';

export default function AccelerationStatus({ assessments, band }) {
  const progressions = accelerationStatus(assessments, band);
  if (!progressions.length) return null;
  return <div className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
    <p className="font-semibold text-foreground">Acceleration evidence by standard</p>
    <div className="mt-2 space-y-2">{progressions.map(item => <p key={item.standardKey} className="text-muted-foreground"><span className="font-medium text-foreground">{STANDARD_NAMES[item.standardKey]}:</span> {item.targetBand} · {item.consecutive} of 3 consecutive reports{item.eligible ? ' · Teacher review ready' : ''}</p>)}</div>
  </div>;
}