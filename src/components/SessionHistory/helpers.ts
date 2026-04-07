import type { InterviewSession } from '@/types';

export async function fetchSessionsForCompany(companyId: string): Promise<InterviewSession[]> {
  const res = await fetch(`/api/sessions?company_id=${companyId}&limit=50`);
  if (!res.ok) return [];
  const data = await res.json() as { sessions: InterviewSession[] };
  return data.sessions;
}

export function formatSessionDate(isoString: string, locale?: string): string {
  return new Date(isoString).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function scoreColorClass(score: number | null, styles: Record<string, string>): string {
  if (score === null) return styles.scoreNeutral;
  if (score >= 8) return styles.scoreHigh;
  if (score >= 5) return styles.scoreMid;
  return styles.scoreLow;
}

export function buildSparklinePath(scores: number[], width: number, height: number): string {
  if (scores.length < 2) return '';
  const minScore = 1;
  const maxScore = 10;
  const points = scores.map((score, index) => {
    const xCoord = (index / (scores.length - 1)) * width;
    const yCoord = height - ((score - minScore) / (maxScore - minScore)) * height;
    return `${xCoord.toFixed(1)},${yCoord.toFixed(1)}`;
  });
  return `M ${points.join(' L ')}`;
}
