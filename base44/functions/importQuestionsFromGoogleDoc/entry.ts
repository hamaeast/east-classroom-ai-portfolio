import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function publicExportUrl(value) {
  const url = new URL(value);
  if (url.hostname !== 'docs.google.com') throw new Error('Enter a valid Google Docs link.');
  const match = url.pathname.match(/^\/document\/d\/([^/]+)/);
  if (!match) throw new Error('Enter a valid Google Docs document link.');
  return `https://docs.google.com/document/d/${match[1]}/export?format=txt`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { docUrl, sourceText } = await req.json();
    if (!docUrl && !sourceText?.trim()) return Response.json({ error: 'Paste text or provide a Google Doc link.' }, { status: 400 });

    let documentText = sourceText?.trim() || '';
    if (!documentText) {
      let exportUrl;
      try {
        exportUrl = publicExportUrl(docUrl);
      } catch (urlError) {
        return Response.json({ error: urlError.message }, { status: 400 });
      }
      const response = await fetch(exportUrl, { redirect: 'follow' });
      if (!response.ok) return Response.json({ error: 'The Google Doc could not be opened. Confirm that anyone with the link can view it.' }, { status: 400 });
      documentText = (await response.text()).trim();
      if (!documentText) return Response.json({ error: 'The Google Doc is empty or is not publicly viewable.' }, { status: 400 });
    }
    const pastedContent = Boolean(sourceText?.trim());

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: pastedContent
        ? `Convert every question in the pasted quiz below into structured data. Return exactly the same number of questions as the source—never shorten, summarize, combine, skip, or invent questions. Preserve each question's wording, order, answer choices, and point value. Lines labeled Answer, Correct Answer, Key, or similar belong to the preceding question and are not separate questions. For multiple-choice questions, correct_choice must be the full choice text, even when the source key uses a letter. For free-response questions with a supplied answer or rubric, use scoring_strategy "ai" and copy that material into answer_key so it can be scored automatically; without a supplied answer, use "manual". Use 1 point only when no point value is provided.\n\nPASTED QUIZ:\n${documentText.slice(0, 60000)}`
        : `Extract assignment questions from the Google Doc text below. Preserve the wording and order. Classify questions with answer choices as multiple_choice and include every choice. Set correct_choice only from an explicit answer key or clearly marked correct answer; otherwise use an empty string. Classify open questions as free_response, set scoring_strategy to manual, and include any explicit rubric or sample answer as answer_key. Use a positive integer point value stated in the document, or 1 when none is stated. Do not invent questions or answers.\n\nGOOGLE DOC:\n${documentText.slice(0, 60000)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['multiple_choice', 'free_response'] },
                prompt: { type: 'string' },
                choices: { type: 'array', items: { type: 'string' } },
                correct_choice: { type: 'string' },
                scoring_strategy: { type: 'string', enum: ['manual', 'ai', 'keyword'] },
                answer_key: { type: 'string' },
                points: { type: 'number' }
              },
              required: ['type', 'prompt', 'choices', 'correct_choice', 'scoring_strategy', 'answer_key', 'points']
            }
          }
        },
        required: ['questions']
      }
    });
    const questions = (result.questions || []).filter(item => item.prompt?.trim());
    if (!questions.length) return Response.json({ error: 'No quiz questions could be created from this content.' }, { status: 422 });
    return Response.json({ questions });
  } catch (error) {
    return Response.json({ error: error.message || 'The questions could not be imported.' }, { status: 500 });
  }
}