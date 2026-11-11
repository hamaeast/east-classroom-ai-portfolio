import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Date picker that only allows Monday–Friday selections, for the weekly check-in's "week ending" date.
export default function WeekdayDatePicker({ value, onChange, placeholder = 'Select a date', error, maxDate }) {
  const selected = value ? parseISO(value) : undefined;
  const latest = maxDate ? parseISO(maxDate) : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`flex w-full items-center gap-2 text-left text-slate-700 ${error ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}>
          <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
          {selected ? format(selected, 'MM/dd/yyyy') : <span className="text-slate-400">{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && onChange(format(date, 'yyyy-MM-dd'))}
          disabled={(date) => date.getDay() === 0 || date.getDay() === 6 || (latest && date > latest)}
          initialFocus
        />
      </PopoverContent>
      {error && <p className="mt-1 text-xs font-semibold text-red-700">{error}</p>}
    </Popover>
  );
}