import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatSessionDate, scoreColorClass, buildSparklinePath, fetchSessionsForCompany } from './helpers';

describe('formatSessionDate', () => {
  it('returns a human-readable date string', () => {
    // Use a fixed date to avoid locale differences in CI
    const result = formatSessionDate('2026-03-15T12:00:00Z');
    // The exact format varies by locale, so just check it contains recognisable parts
    expect(result).toMatch(/mar/i);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });
});

describe('scoreColorClass (SessionHistory)', () => {
  const styles = { scoreHigh: 'high', scoreMid: 'mid', scoreLow: 'low', scoreNeutral: 'neutral' };

  it('returns scoreNeutral for null', () => {
    expect(scoreColorClass(null, styles)).toBe('neutral');
  });

  it('returns scoreHigh for 8 and above', () => {
    expect(scoreColorClass(8, styles)).toBe('high');
    expect(scoreColorClass(10, styles)).toBe('high');
  });

  it('returns scoreMid for 5–7', () => {
    expect(scoreColorClass(5, styles)).toBe('mid');
    expect(scoreColorClass(7.9, styles)).toBe('mid');
  });

  it('returns scoreLow for below 5', () => {
    expect(scoreColorClass(4.9, styles)).toBe('low');
    expect(scoreColorClass(1, styles)).toBe('low');
  });
});

describe('buildSparklinePath', () => {
  it('returns empty string for fewer than 2 scores', () => {
    expect(buildSparklinePath([], 100, 20)).toBe('');
    expect(buildSparklinePath([8], 100, 20)).toBe('');
  });

  it('returns an SVG path string starting with M for 2+ scores', () => {
    const path = buildSparklinePath([5, 8], 100, 20);
    expect(path).toMatch(/^M /);
    expect(path).toContain('L');
  });

  it('maps the first point to x=0 and the last point to x=width', () => {
    const path = buildSparklinePath([5, 8], 100, 20);
    // First point should have x = 0.0
    expect(path).toContain('0.0,');
    // Last point should have x = 100.0
    expect(path).toContain('100.0,');
  });

  it('maps score 1 to y=height and score 10 to y=0', () => {
    const path = buildSparklinePath([1, 10], 100, 20);
    // Score 1 → y = 20 - ((1-1)/(10-1))*20 = 20.0
    expect(path).toContain(',20.0');
    // Score 10 → y = 20 - ((10-1)/(10-1))*20 = 0.0
    expect(path).toContain(',0.0');
  });

  it('generates the correct number of path segments for multiple scores', () => {
    const path = buildSparklinePath([5, 6, 7, 8], 100, 20);
    // Should have 1 M and 3 L commands
    const lCount = (path.match(/ L /g) ?? []).length;
    expect(lCount).toBe(3);
  });
});

describe('fetchSessionsForCompany', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('fetches from the correct URL and returns sessions', async () => {
    const mockSessions = [{ id: 'session-1' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: mockSessions }),
    } as unknown as Response);

    const result = await fetchSessionsForCompany('company-1');

    expect(fetch).toHaveBeenCalledWith('/api/sessions?company_id=company-1&limit=50');
    expect(result).toEqual(mockSessions);
  });

  it('returns an empty array when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const result = await fetchSessionsForCompany('company-1');
    expect(result).toEqual([]);
  });
});
