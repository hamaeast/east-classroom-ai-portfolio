import { ExternalLink } from 'lucide-react';
import PageHeader from '@/components/east/PageHeader';
import { Image } from '@/components/ui/image';
import { SCHOOL_CALENDAR_IMAGE_URL, SCHOOL_CALENDAR_PAGE_URL, SCHOOL_NAME } from '@/lib/schoolConfig';

export default function Calendar() {
  return <div>
    <PageHeader title="School Calendar" description={`${SCHOOL_NAME} academic calendar`} action={SCHOOL_CALENDAR_PAGE_URL ? <a href={SCHOOL_CALENDAR_PAGE_URL} target="_blank" rel="noreferrer" className="east-button"><ExternalLink size={16} />Open source page</a> : null} />
    <figure className="glass-panel overflow-hidden rounded-sm p-3 sm:p-5">
      {SCHOOL_CALENDAR_IMAGE_URL
        ? <Image src={SCHOOL_CALENDAR_IMAGE_URL} alt={`${SCHOOL_NAME} academic calendar`} className="block h-auto w-full" fittingType="fit" />
        : <p className="text-sm text-muted-foreground">Set VITE_SCHOOL_CALENDAR_IMAGE_URL to show your school's calendar here.</p>}
    </figure>
  </div>;
}
