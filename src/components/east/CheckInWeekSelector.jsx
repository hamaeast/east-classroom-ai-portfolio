import WeekdayDatePicker from '@/components/east/WeekdayDatePicker';

export default function CheckInWeekSelector({ suggestedWeek, value, onChange, error, maxDate }) {
  if (!suggestedWeek) return <WeekdayDatePicker value={value} onChange={onChange} placeholder="Week ending (Mon–Fri)" error={error} maxDate={maxDate} />;

  return <label className="east-label">Oldest missing week ending
    <input value={suggestedWeek} readOnly aria-describedby="suggested-check-in-week" />
    <span id="suggested-check-in-week" className="mt-1 block font-normal text-muted-foreground">This check-in will count toward your oldest missing grading period.</span>
    {error && <span className="mt-1 block font-semibold text-destructive">{error}</span>}
  </label>;
}