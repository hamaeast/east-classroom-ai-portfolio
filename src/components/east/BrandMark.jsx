import { Image } from '@/components/ui/image';
import { Rocket } from 'lucide-react';
import { SCHOOL_LOGO_URL } from '@/lib/schoolConfig';

const EAST_LOGO = 'https://www.eastinitiative.org/img/logos/EAST/EAST_Logo_Teal_Horz.webp';

export default function BrandMark({ compact = false }) {
  return <div className="flex items-center gap-3">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neon-cyan/50 bg-background/80 p-1 shadow-neon-cyan">
      {SCHOOL_LOGO_URL
        ? <Image src={SCHOOL_LOGO_URL} alt="School logo" className="h-full w-full" fittingType="fit" />
        : <Rocket className="h-7 w-7 text-neon-cyan" aria-label="Classroom logo" />}
    </span>
    {!compact && <Image src={EAST_LOGO} alt="EAST Initiative" className="hidden h-auto w-auto max-h-11 max-w-36" fittingType="fit" />}
  </div>;
}
