import { format, parseISO } from 'date-fns';

export default function GradeColumnDueDate({ column, className = '' }) {
  const date = column.dueDate || column.weekEnding;
  if (!date) return null;
  return <span className={className}>Due {format(parseISO(date), 'MMM d, yyyy')}</span>;
}