import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GoogleDocQuestionImport({ onImport }) {
  const [docUrl, setDocUrl] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [importing, setImporting] = useState('');
  const [error, setError] = useState('');

  const makeQuestions = async mode => {
    const value = mode === 'text' ? sourceText.trim() : docUrl.trim();
    if (!value) return setError(mode === 'text' ? 'Paste the reading or lesson text first.' : 'Paste a public Google Doc link first.');
    setImporting(mode); setError('');
    try {
      const payload = mode === 'text' ? { sourceText: value } : { docUrl: value };
      const { data } = await base44.functions.invoke('importQuestionsFromGoogleDoc', payload);
      onImport(data.questions);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'The quiz could not be created.');
    } finally {
      setImporting('');
    }
  };

  return <section className="rounded-lg border border-neon-cyan/40 bg-muted/30 p-4">
    <p className="text-sm font-semibold text-foreground">Make a quiz from pasted text</p>
    <p className="mt-1 text-xs text-muted-foreground">Paste a reading, notes, or lesson content. You can edit every generated question before publishing.</p>
    <textarea className="mt-3" rows={7} placeholder="Paste the content students should be quizzed on…" value={sourceText} onChange={event => setSourceText(event.target.value)} />
    <button type="button" disabled={Boolean(importing)} onClick={() => makeQuestions('text')} className="east-button mt-2">
      {importing === 'text' && <Loader2 size={16} className="animate-spin" />}{importing === 'text' ? 'Making quiz…' : 'Make quiz'}
    </button>
    <div className="my-4 border-t border-border/60" />
    <p className="text-sm font-semibold text-foreground">Or import questions from Google Docs</p>
    <p className="mt-1 text-xs text-muted-foreground">The document must be shared as “Anyone with the link can view.”</p>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input type="url" placeholder="https://docs.google.com/document/d/…" value={docUrl} onChange={event => setDocUrl(event.target.value)} />
      <button type="button" disabled={Boolean(importing)} onClick={() => makeQuestions('doc')} className="east-button shrink-0">
        {importing === 'doc' && <Loader2 size={16} className="animate-spin" />}{importing === 'doc' ? 'Importing…' : 'Import questions'}
      </button>
    </div>
    {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
  </section>;
}