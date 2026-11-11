import { useState } from 'react';

export default function SpellCheckModal({ diffs, onAccept, onDecline }) {
  const [confirming, setConfirming] = useState(false);
  if (!diffs) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
      {!confirming ? <>
        <h3 className="mb-3 font-semibold">We found some spelling/grammar fixes</h3>
        <div className="mb-4 space-y-3 text-sm">
          {diffs.map(d => <div key={d.key}>
            <p className="text-xs font-semibold text-slate-500">{d.label}</p>
            <p className="text-red-600 line-through">{d.original}</p>
            <p className="text-green-700">{d.corrected}</p>
          </div>)}
        </div>
        <p className="mb-4 text-sm text-slate-600">Would you like to accept these corrections?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirming(true)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">No, keep mine</button>
          <button onClick={onAccept} className="east-button">Yes, fix it</button>
        </div>
      </> : <>
        <h3 className="mb-3 font-semibold">Are you sure?</h3>
        <p className="mb-4 text-sm text-slate-600">Are you sure you don't want to fix the spelling and grammar?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirming(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Go back</button>
          <button onClick={onDecline} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Yes, keep as written</button>
        </div>
      </>}
    </div>
  </div>;
}