import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function TaskDatePicker({ value, onChange }) {
  const selected = value ? parseISO(value) : undefined;
  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-neon-magenta/60 bg-input px-3 text-left text-sm text-foreground">
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {selected ? format(selected, 'MM/dd/yyyy') : <span className="text-muted-foreground">Choose due date (optional)</span>}
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar mode="single" selected={selected} onSelect={date => onChange(date ? format(date, 'yyyy-MM-dd') : '')} initialFocus />
      {selected && <button type="button" onClick={() => onChange('')} className="w-full border-t px-3 py-2 text-xs font-semibold text-muted-foreground">Clear due date</button>}
    </PopoverContent>
  </Popover>;
}