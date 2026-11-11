import { createContext, useContext, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

const StandardsUpdateContext = createContext(null);
export const useStandardsUpdate = () => useContext(StandardsUpdateContext);

export default function StandardsUpdateProvider({ children }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const cancelRequested = useRef(false);
  const active = useRef(false);
  const queryClient = useQueryClient();

  const start = async (work) => {
    if (active.current) return;
    active.current = true;
    cancelRequested.current = false;
    setRunning(true);
    setProgress('Preparing standards update…');
    try {
      const result = await work(message => setProgress(message), () => cancelRequested.current);
      await queryClient.invalidateQueries({ queryKey: ['entity', 'StandardsAssessment'] });
      const message = `${result.updated} updated · ${result.unchanged} unchanged · ${result.skipped} skipped with no new evidence${result.failed ? ` · ${result.failed} failed` : ''}`;
      const summary = cancelRequested.current ? `Update canceled · ${message}` : message;
      setProgress(summary);
      toast({ title: cancelRequested.current ? 'Standards update canceled' : 'Standards update finished', description: summary, duration: 10000 });
    } catch {
      setProgress('Standards update stopped unexpectedly. Please try again.');
      toast({ title: 'Standards update stopped', description: 'Please try again.', variant: 'destructive', duration: 10000 });
    } finally {
      active.current = false;
      setRunning(false);
    }
  };

  const cancel = () => {
    cancelRequested.current = true;
    setProgress('Canceling after current student…');
  };

  return <StandardsUpdateContext.Provider value={{ running, progress, start, cancel }}>{children}</StandardsUpdateContext.Provider>;
}