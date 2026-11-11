export default function PitchEthicsFields({ draft, setDraft }) {
  return <>
    <label className="east-label">How is this project ethical, fair, and responsible?
      <textarea required value={draft.ethics_statement || ''} onChange={event => setDraft({ ...draft, ethics_statement: event.target.value })} placeholder="Explain how your project helps people and treats everyone fairly." />
    </label>
    <label className="east-label">What ethical concerns could this project create, and how will your team address them?
      <textarea required value={draft.ethical_concerns || ''} onChange={event => setDraft({ ...draft, ethical_concerns: event.target.value })} placeholder="Consider privacy, safety, fairness, access, bias, or unintended harm." />
    </label>
  </>;
}