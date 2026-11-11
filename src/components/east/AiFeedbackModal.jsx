export default function AiFeedbackModal({ hints, onClose }) {
  if (!hints || !hints.length) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
      <h2 className="mb-2 text-lg font-semibold text-slate-950">A few answers need more detail</h2>
      <p className="mb-3 text-sm text-slate-500">Please revise the answers below before submitting — here's what to fix (we won't write it for you):</p>
      <ul className="mb-4 space-y-2 text-sm text-slate-700">
        {hints.map((h, i) => <li key={i} className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-red-700"><b>{h.label}:</b> {h.hint}</li>)}
      </ul>
      <button onClick={onClose} className="east-button w-full">Got it, let me fix it</button>
    </div>
  </div>;
}