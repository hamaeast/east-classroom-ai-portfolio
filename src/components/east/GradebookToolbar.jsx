export default function GradebookToolbar({ period, setPeriod, segment, setSegment, sortMode, setSortMode }) {
  return <div className="glass-panel mb-4 flex flex-wrap gap-3 p-4">
    <label className="east-label">Class period<select value={period} onChange={event => setPeriod(Number(event.target.value))} className="mt-1"><option value="">Choose period</option>{[1,2,3,4,5,6,7].map(value => <option key={value} value={value}>Period {value}</option>)}</select></label>
    <label className="east-label">Nine-week section<select value={segment} onChange={event => setSegment(Number(event.target.value))} className="mt-1">{[1,2,3,4].map(value => <option key={value} value={value}>Nine Weeks {value}</option>)}</select></label>
    <label className="east-label">Student order<select value={sortMode} onChange={event => setSortMode(event.target.value)} className="mt-1"><option value="alpha">Alphabetical</option><option value="high">Grade: high to low</option><option value="low">Grade: low to high</option></select></label>
  </div>;
}