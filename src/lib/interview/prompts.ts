import type { InterviewSession, SessionQuestion, Company, InterviewStage } from '@/types';
import type { ChatMessage } from '@/lib/llm/types';

export function buildInterviewSystemPrompt(
  session: InterviewSession,
  company: Company,
  stage: InterviewStage,
): string {
  const persona = session.interviewer_persona ?? 'an experienced technical interviewer';
  const focusAreas = session.focus_areas.length > 0
    ? session.focus_areas.join(', ')
    : 'general competencies for the role';

  const feedbackModeInstructions = session.feedback_mode === 'immediate'
    ? 'After the candidate answers each question, provide brief constructive feedback (2-3 sentences) before moving to the next question.'
    : 'Do NOT provide feedback during the interview. Ask all questions sequentially without commentary. The candidate will receive a full debrief at the end.';

  if (session.is_dry_run) {
    const contextLine = session.dry_run_context
      ? `Role / context provided by the candidate: ${session.dry_run_context}`
      : 'No specific role or context was provided — conduct a general professional interview.';

    return [
      `You are ${persona} conducting a practice interview.`,
      ``,
      `${contextLine}`,
      ``,
      `Interview configuration:`,
      `- Total questions to ask: ${session.num_questions}`,
      `- Difficulty: ${session.difficulty}`,
      `- Focus areas: ${focusAreas}`,
      ``,
      `Rules:`,
      `- Ask exactly ${session.num_questions} questions, one at a time`,
      `- Stay in character as the interviewer throughout`,
      `- Wait for the candidate's response before asking the next question`,
      `- ${feedbackModeInstructions}`,
      `- Do not reveal the total number of questions to the candidate`,
      `- Be professional and realistic — this is a mock of a real interview`,
      `- When starting the interview, open immediately with your first question — do not greet the candidate or say anything before the question`,
    ].join('\n');
  }

  const prepContext = company.prep_notes
    ? `\nCompany context and prep notes: ${company.prep_notes}`
    : '';

  return [
    `You are ${persona} conducting a ${stage.stage_name} interview at ${company.name}.`,
    ``,
    `Interview configuration:`,
    `- Total questions to ask: ${session.num_questions}`,
    `- Difficulty: ${session.difficulty}`,
    `- Focus areas: ${focusAreas}`,
    prepContext,
    ``,
    `Rules:`,
    `- Ask exactly ${session.num_questions} questions, one at a time`,
    `- Stay in character as the interviewer throughout`,
    `- Questions should be realistic for ${company.name} and this stage type`,
    `- Vary question types within the ${stage.stage_name} category`,
    `- Wait for the candidate's response before asking the next question`,
    `- ${feedbackModeInstructions}`,
    `- Do not reveal the total number of questions to the candidate`,
    `- Be professional and realistic — this is a mock of a real interview`,
    `- When starting the interview, open immediately with your first question — do not greet the candidate or say anything before the question`,
  ].filter((line) => line !== null && line !== undefined).join('\n');
}

export function buildDebriefSystemPrompt(
  session: InterviewSession,
  company: Company,
  stage: InterviewStage,
): string {
  const sessionDescription = session.is_dry_run
    ? `a practice interview${session.dry_run_context ? ` (context: ${session.dry_run_context})` : ''}`
    : `a ${stage.stage_name} interview simulation at ${company.name}`;

  return [
    `You are an expert interview coach reviewing a completed ${sessionDescription}.`,
    ``,
    `Provide a structured debrief in valid JSON format with the following shape:`,
    `{`,
    `  "overall_score": <number 1-10>,`,
    `  "summary": "<2-3 sentence narrative summarizing performance>",`,
    `  "verdict": "<'pass' | 'fail' | 'borderline'>",`,
    `  "interviewer_note": "<1-2 sentences from the interviewer's perspective — would they move this candidate forward, and why?>",`,
    `  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],`,
    `  "improvements": ["<improvement area 1>", "<improvement area 2>", "<improvement area 3>"],`,
    `  "resources": ["<resource or topic to study 1>", "<resource 2>"],`,
    `  "per_question": [`,
    `    {`,
    `      "question_number": <number>,`,
    `      "score": <number 1-10>,`,
    `      "strengths": "<what was good about this answer>",`,
    `      "improvements": "<how this answer could be improved>"`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Guidelines:`,
    `- Be constructive, specific, and encouraging`,
    `- Reference exact quotes from the candidate's answers where helpful`,
    `- Difficulty level of the session was: ${session.difficulty}`,
    `- Calibrate scores accordingly (a score of 7 on "hard" is excellent)`,
    `- verdict must be exactly one of: "pass", "fail", or "borderline". Use "pass" for scores 7+, "fail" for scores below 5, and "borderline" for 5-6`,
    `- Respond with ONLY the JSON object, no additional text`,
  ].join('\n');
}

export function buildFeedbackMessages(question: SessionQuestion): ChatMessage[] {
  return [
    {
      role: 'user' as const,
      content: [
        `Question asked: ${question.question_text}`,
        ``,
        `Candidate's answer: ${question.answer_transcript ?? '(no answer provided)'}`,
        ``,
        `Provide feedback in valid JSON format:`,
        `{`,
        `  "score": <number 1-10>,`,
        `  "strengths": "<what was good about the answer>",`,
        `  "improvements": "<specific ways to improve>",`,
        `  "suggested_answer": "<a brief example of a stronger opening or key point to add>"`,
        `}`,
        ``,
        `Respond with ONLY the JSON object, no additional text.`,
      ].join('\n'),
    },
  ];
}

export function buildConversationHistory(questions: SessionQuestion[]): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const question of questions) {
    messages.push({ role: 'assistant', content: question.question_text });

    if (question.answer_transcript) {
      messages.push({ role: 'user', content: question.answer_transcript });
    }
  }

  return messages;
}
