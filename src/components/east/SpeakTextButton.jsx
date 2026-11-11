import { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import useStudentModifications from '@/hooks/useStudentModifications';

export default function SpeakTextButton({ text, label = 'Read aloud' }) {
  const { hasTextToSpeech } = useStudentModifications();
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported]);
  if (!hasTextToSpeech || !supported || !String(text || '').trim()) return null;
  const toggle = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = 'en-US';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };
  return <button type="button" onClick={toggle} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground" aria-label={speaking ? 'Stop reading' : label}>{speaking ? <Square size={14} /> : <Volume2 size={15} />}{speaking ? 'Stop' : label}</button>;
}