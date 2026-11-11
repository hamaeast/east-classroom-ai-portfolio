import { Image } from '@/components/ui/image';
import ReadingQuestionForm from '@/components/east/ReadingQuestionForm';
import SpeakTextButton from '@/components/east/SpeakTextButton';

export default function ReadingAssignmentContent({ assignment, questions, answers, setAnswers, submission, saving, error }) {
  return <div className="space-y-5 p-5">
    {assignment.article_image_url && <Image src={assignment.article_image_url} alt={`${assignment.title} project`} className="mx-auto h-auto max-h-[70vh] w-auto max-w-full rounded-lg border border-border object-contain" fittingType="fit" />}
    {assignment.passage_text ? <section className="space-y-2"><SpeakTextButton text={assignment.passage_text} label="Read passage aloud" /><article className="max-h-[55vh] overflow-y-auto whitespace-pre-line rounded-lg border border-border bg-card p-5 text-sm leading-7 text-card-foreground">{assignment.passage_text}</article></section> : assignment.article_url ? <a href={assignment.article_url} target="_blank" rel="noreferrer" className="east-button">Open passage in a new tab</a> : null}
    <div className="space-y-4">{questions.map((question, index) => <ReadingQuestionForm key={question.id} question={question} index={index} value={answers[question.id]} disabled={saving || Boolean(submission)} onChange={value => setAnswers(current => ({ ...current, [question.id]: value }))} />)}</div>
    {submission && <section role="status" className="rounded-lg border border-neon-cyan/50 bg-neon-cyan/10 p-4"><h3 className="font-semibold">{submission.status === 'pending_review' ? 'Submitted — teacher review pending' : `Completed — ${submission.score} / ${assignment.max_points} points`}</h3><p className="text-sm text-muted-foreground">{submission.status === 'pending_review' ? 'Your work is saved. Any automatic score is provisional until your teacher reviews it.' : 'Your grade has been added to the gradebook.'}</p></section>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}