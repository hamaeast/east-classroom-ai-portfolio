import { useLayoutEffect, useRef } from 'react';

export default function CheckInLongAnswerField({ field, placeholder, value, onChange, error }) {
  const ref = useRef(null);
  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  };

  useLayoutEffect(resize, [value]);

  const handleChange = event => {
    resize();
    onChange(event.target.value);
  };

  return <div className="min-w-0">
    <textarea ref={ref} required rows={3} wrap="soft" placeholder={placeholder} value={value} onChange={handleChange} className={`min-h-24 w-full min-w-0 max-w-full resize-none overflow-x-hidden overflow-y-hidden whitespace-pre-wrap break-words ${error ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${field}-error` : undefined} />
    {error && <p id={`${field}-error`} className="mt-1 text-xs font-semibold text-red-700">{error}</p>}
  </div>;
}