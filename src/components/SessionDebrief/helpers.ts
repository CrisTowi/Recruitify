import type { InterviewSessionFull } from '@/types';

export function scoreColorClass(score: number | null, styles: Record<string, string>): string {
  if (score === null) return '';
  if (score >= 8) return styles.scoreHigh;
  if (score >= 5) return styles.scoreMid;
  return styles.scoreLow;
}

export function formatScoreLabel(score: number | null): string {
  if (score === null) return '—';
  return `${score.toFixed(1)}/10`;
}

export async function generateDebrief(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}/debrief`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json() as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
}

export function buildDebriefMarkdown(session: InterviewSessionFull): string {
  const lines: string[] = [];

  lines.push('# Session Debrief');
  lines.push('');

  if (session.completed_at) {
    lines.push(`**Date:** ${new Date(session.completed_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`);
  }
  if (session.overall_score !== null) {
    lines.push(`**Overall Score:** ${session.overall_score.toFixed(1)}/10`);
  }
  const answeredCount = session.questions.filter((question) => question.answer_transcript !== null).length;
  lines.push(`**Questions Answered:** ${answeredCount} of ${session.num_questions}`);
  lines.push('');

  if (session.debrief_summary) {
    lines.push('## Summary');
    lines.push('');
    lines.push(session.debrief_summary);
    lines.push('');
  }

  if (session.debrief_strengths.length > 0) {
    lines.push('## Strengths');
    lines.push('');
    for (const strength of session.debrief_strengths) {
      lines.push(`- ${strength}`);
    }
    lines.push('');
  }

  if (session.debrief_improvements.length > 0) {
    lines.push('## Areas to Improve');
    lines.push('');
    for (const improvement of session.debrief_improvements) {
      lines.push(`- ${improvement}`);
    }
    lines.push('');
  }

  if (session.debrief_resources.length > 0) {
    lines.push('## Suggested Resources');
    lines.push('');
    for (const resource of session.debrief_resources) {
      lines.push(`- ${resource}`);
    }
    lines.push('');
  }

  if (session.questions.length > 0) {
    lines.push('## Question Breakdown');
    lines.push('');
    for (const question of session.questions) {
      const scoreLabel = question.score !== null ? ` — ${question.score.toFixed(1)}/10` : '';
      lines.push(`### Q${question.question_number}${scoreLabel}`);
      lines.push('');
      lines.push(`**Question:** ${question.question_text}`);
      lines.push('');
      if (question.answer_transcript) {
        lines.push(`**Your Answer:** ${question.answer_transcript}`);
        lines.push('');
      }
      if (question.feedback_strengths) {
        lines.push(`**What Worked:** ${question.feedback_strengths}`);
        lines.push('');
      }
      if (question.feedback_improvements) {
        lines.push(`**How to Improve:** ${question.feedback_improvements}`);
        lines.push('');
      }
      if (question.feedback_suggested_answer) {
        lines.push(`**Suggested Direction:** ${question.feedback_suggested_answer}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Legacy fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
