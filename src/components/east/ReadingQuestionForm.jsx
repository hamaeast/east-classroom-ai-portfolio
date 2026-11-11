import DictationButton from './DictationButton';
import SpeakTextButton from './SpeakTextButton';

export default function ReadingQuestionForm({ question, index, value, onChange, disabled }) {
  return <fieldset className="rounded-lg border border-border/60 p-4"><legend className="px-1 font-semibold"><span>{index + 1}. {question.prompt} <span className="text-xs text-muted-foreground">({question.points} pts)</span></span><span className="ml-2 inline-flex"><SpeakTextButton text={question.prompt} /></span></legend>
    {question.type === 'multiple_choice' ? <div className="mt-3 space-y-2">{question.choices.map(choice => <label key={choice} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 p-3"><input disabled={disabled} type="radio" name={question.id} value={choice} checked={value === choice} onChange={event => onChange(event.target.value)} />{choice}</label>)}</div> : <><textarea disabled={disabled} className="mt-3" required rows={5} value={value || ''} onChange={event => onChange(event.target.value)} placeholder="Write your response…" />{!disabled && <DictationButton value={value || ''} onChange={onChange} />}</>}
  </fieldset>;
}