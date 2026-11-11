import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import useStudentModifications from '@/hooks/useStudentModifications';

export default function DictationButton({ value, onChange }) {
  const { hasDictation } = useStudentModifications();
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => () => recognitionRef.current?.stop(), []);
  if (!hasDictation || !Recognition) return null;

  const toggle = () => {
    if (listening) return recognitionRef.current?.stop();
    setError('');
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = event => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ').trim();
      onChange([value.trim(), transcript].filter(Boolean).join(' '));
    };
    recognition.onerror = event => setError(event.error === 'not-allowed' ? 'Allow microphone access to dictate.' : 'I could not hear that. Please try again.');
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return <div className="mt-2">
    <button type="button" onClick={toggle} className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">
      {listening ? <Square size={14} /> : <Mic size={15} />}{listening ? 'Stop listening' : 'Dictate answer'}
    </button>
    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
  </div>;
}