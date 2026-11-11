export default function CheckInViewerFilters({ periods, students, period, student, onPeriodChange, onStudentChange }) {
  return <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
    <label className="east-label">Class period
      <select value={period} onChange={e => onPeriodChange(e.target.value)}>
        <option value="">Select class period…</option>
        {periods.map(value => <option key={value} value={value}>Period {value}</option>)}
      </select>
    </label>
    <label className="east-label">Student name
      <select value={student} disabled={!period} onChange={e => onStudentChange(e.target.value)}>
        <option value="">{period ? 'Select student…' : 'Select a class period first…'}</option>
        {students.map(item => <option key={item.id} value={item.id}>{item.display_name || item.full_name || item.email}</option>)}
      </select>
    </label>
  </div>;
}