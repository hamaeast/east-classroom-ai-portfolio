import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isInstructionDay } from '@/lib/schoolCalendar';

const toText = date => date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
const fromText = value => value ? new Date(`${value}T12:00:00`) : undefined;

export default function InstructionDayPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" className="flex min-h-10 w-full items-center gap-2 rounded-lg border bg-input px-3 text-left text-sm text-foreground"><CalendarDays size={16} className="text-neon-cyan" />{value || 'Choose an instructional day…'}</button></PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-0"><Calendar mode="single" selected={fromText(value)} defaultMonth={fromText(value) || new Date(2026, 7, 14)} fromMonth={new Date(2026, 7, 1)} toMonth={new Date(2027, 4, 31)} disabled={date => !isInstructionDay(toText(date))} onSelect={date => { if (!date) return; onChange(toText(date)); setOpen(false); }} /></PopoverContent>
  </Popover>;
}