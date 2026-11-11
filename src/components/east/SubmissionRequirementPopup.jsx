import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

function fieldMessage(field) {
  const name = field.placeholder || field.getAttribute('aria-label') || field.name || (field.tagName === 'SELECT' ? 'This selection' : 'This field');
  if (field.validity.valueMissing) return `${name} is required.`;
  if (field.validity.typeMismatch) return `${name} must be entered in the correct format.`;
  if (field.validity.tooShort) return `${name} needs at least ${field.minLength} characters.`;
  if (field.validity.rangeUnderflow) return `${name} must be at least ${field.min}.`;
  if (field.validity.rangeOverflow) return `${name} cannot be more than ${field.max}.`;
  return field.validationMessage || `${name} needs to be corrected.`;
}

export default function SubmissionRequirementPopup() {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const invalid = event => {
      event.preventDefault();
      const fields = [...(event.target.form?.querySelectorAll(':invalid') || [event.target])];
      setMessages([...new Set(fields.map(fieldMessage))]);
      fields[0]?.focus();
    };
    const custom = event => setMessages(event.detail.filter(Boolean));
    document.addEventListener('invalid', invalid, true);
    window.addEventListener('submission-requirements', custom);
    return () => { document.removeEventListener('invalid', invalid, true); window.removeEventListener('submission-requirements', custom); };
  }, []);
  if (!messages.length) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="requirement-title"><section className="glass-panel w-full max-w-md p-5"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 text-primary" /><div className="flex-1"><h2 id="requirement-title" className="text-lg font-semibold">You can’t submit this yet</h2><p className="mt-1 text-sm text-muted-foreground">Complete the following requirement{messages.length === 1 ? '' : 's'}:</p></div><button onClick={() => setMessages([])} aria-label="Close"><X size={20} /></button></div><ul className="mt-4 list-disc space-y-2 pl-5 text-sm">{messages.map(message => <li key={message}>{message}</li>)}</ul><button onClick={() => setMessages([])} className="east-button mt-5 w-full">Go back and finish</button></section></div>;
}