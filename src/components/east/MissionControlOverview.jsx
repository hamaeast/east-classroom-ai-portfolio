import { Image } from '@/components/ui/image';
import DailyDrivePhoto from './DailyDrivePhoto';
import { PROGRAM_NAME } from '@/lib/schoolConfig';

const EAST_LOGO = 'https://www.eastinitiative.org/img/logos/EAST/EAST_Logo_Teal_Horz.webp';

function Metric({ label, value, detail, cyan = false }) {
  return <div className={`relative min-h-24 border bg-background/90 px-5 py-4 ${cyan ? 'border-mission-cyan shadow-[inset_4px_0_18px_hsl(var(--mission-cyan)/.16)]' : 'border-mission-gold shadow-[inset_4px_0_18px_hsl(var(--mission-gold)/.18)]'}`} style={{ clipPath: 'polygon(9% 0,100% 0,100% 74%,88% 100%,0 100%,0 20%)' }}>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><p className="min-w-0 font-display text-lg font-bold leading-tight text-foreground sm:text-xl">{label}</p><strong className={`whitespace-nowrap text-2xl ${cyan ? 'text-mission-cyan' : 'text-mission-gold'}`}>{value}</strong></div>
    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{detail}</p>
  </div>;
}

export default function MissionControlOverview({ activeProjects, partners, hours, impact, schoolYear }) {
  return <section className="relative mb-7 overflow-hidden rounded-sm bg-background p-6 shadow-[0_0_36px_hsl(var(--mission-cyan)/.22)] sm:p-10 lg:p-14">
    <div className="relative z-10 grid gap-4 lg:grid-cols-12">
      <div className="flex min-h-20 items-center justify-center border border-mission-cyan/50 bg-background/90 px-6 py-3 lg:col-span-12"><Image src={EAST_LOGO} alt="EAST logo" className="h-auto w-auto max-h-14 max-w-full" fittingType="fit" /></div>
      <header className="relative z-20 bg-background/95 px-4 py-3 lg:col-span-8"><p className="font-display text-4xl font-black tracking-tight text-foreground sm:text-5xl">{PROGRAM_NAME}</p><h2 className="mt-1 font-display text-xl leading-tight text-muted-foreground sm:text-2xl">Program Overview</h2><div className="mt-5 h-px w-3/4 bg-mission-cyan" /></header>
      <div className="lg:col-span-4"><Metric label="Active Projects" value={activeProjects} detail={`${schoolYear} school year`} /></div>
      <DailyDrivePhoto />
      <div className="grid gap-4 lg:col-span-4"><Metric label="Community Partners" value={partners} detail="partner organizations" cyan /><Metric label="Service Hours" value={hours} detail={`${schoolYear} school year`} /><Metric label="Estimated Impact" value={impact} detail={`${schoolYear} school year`} /></div>
    </div>
  </section>;
}