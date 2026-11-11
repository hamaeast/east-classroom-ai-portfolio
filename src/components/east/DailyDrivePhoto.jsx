import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';
import { base44 } from '@/api/base44Client';

// The production copy shipped a saved list of classroom photo IDs here as a
// fallback. It is intentionally empty in the public copy; photos come only from
// the configured folder (see listPublicDrivePhotos).
const PHOTOS = [];

function chicagoDayNumber() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  return Math.floor(Date.UTC(value.year, value.month - 1, value.day) / 86400000);
}

export default function DailyDrivePhoto() {
  const [photos, setPhotos] = useState(PHOTOS.map(([name, id]) => ({ name, id })).reverse());
  const [refreshing, setRefreshing] = useState(true);
  const [dayNumber, setDayNumber] = useState(chicagoDayNumber);
  const [aspectRatio, setAspectRatio] = useState(null);

  useEffect(() => {
    let active = true;
    const loadPhotos = async () => {
      if (active) setRefreshing(true);
      try {
        const { data } = await base44.functions.invoke('listPublicDrivePhotos', {});
        if (active && data.photos?.length) setPhotos([...data.photos].sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || '')));
      } catch (error) {
        console.warn('Photo refresh unavailable; using the saved photo list.', error);
      } finally {
        if (active) setRefreshing(false);
      }
    };
    loadPhotos();
    const dayTimer = window.setInterval(() => setDayNumber(chicagoDayNumber()), 60000);
    const photoTimer = window.setInterval(loadPhotos, 15 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(dayTimer);
      window.clearInterval(photoTimer);
    };
  }, []);

  if (!photos.length) return <figure className="relative flex w-full min-w-0 items-center justify-center self-start border-4 border-mission-cyan bg-background/80 p-10 text-sm text-muted-foreground lg:col-span-8">{refreshing ? 'Loading classroom photos…' : 'No classroom photo folder configured.'}</figure>;
  const { id } = photos[0];
  return <figure className="relative w-full min-w-0 self-start overflow-hidden border-4 border-mission-cyan bg-background/80 lg:col-span-8" style={aspectRatio ? { aspectRatio } : undefined}>
    <Image key={id} src={`https://drive.google.com/thumbnail?id=${id}&sz=w1600&daily=${dayNumber}`} alt="Classroom activity photo" className="block h-full w-full object-contain" fittingType="fit" onLoad={event => setAspectRatio(`${event.currentTarget.naturalWidth} / ${event.currentTarget.naturalHeight}`)} />
    <div className="pointer-events-none absolute inset-0 bg-mission-cyan/10" />
    {refreshing && <span className="absolute right-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs text-muted-foreground">Refreshing photos…</span>}
  </figure>;
}