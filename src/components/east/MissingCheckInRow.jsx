import DismissCheckInButton from '@/components/east/DismissCheckInButton';

// One row in the admin's "missing check-in" list: student name plus a control to dismiss it.
export default function MissingCheckInRow({ student, onDismiss }) {
  return <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1">
    <span className="text-sm text-red-700">{student.full_name}</span>
    <DismissCheckInButton onDismiss={(reason) => onDismiss(student, reason)} />
  </div>;
}