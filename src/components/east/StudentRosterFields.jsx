const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const GRADES = [7, 8, 9];

export default function StudentRosterFields({ student, disabled, onUpdate }) {
  return <div className="flex flex-wrap items-center gap-2">
    <select disabled={disabled} value={student.class_period || ''} onChange={event => onUpdate(student, { class_period: event.target.value ? Number(event.target.value) : null })} className="w-auto min-h-9">
      <option value="">Unassigned</option>{PERIODS.map(value => <option key={value} value={value}>Period {value}</option>)}
    </select>
    <select disabled={disabled} value={student.grade || ''} onChange={event => onUpdate(student, { grade: event.target.value ? Number(event.target.value) : null })} className="w-auto min-h-9">
      <option value="">Grade</option>{GRADES.map(value => <option key={value} value={value}>Grade {value}</option>)}
    </select>
  </div>;
}