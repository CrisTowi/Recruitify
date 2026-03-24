import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PERSONA_PRESETS,
  DIFFICULTY_OPTIONS,
  FEEDBACK_MODE_OPTIONS,
  FOCUS_AREA_SUGGESTIONS,
  createDryRunSession,
} from './helpers';

describe('re-exported constants', () => {
  it('exports PERSONA_PRESETS', () => {
    expect(Array.isArray(PERSONA_PRESETS)).toBe(true);
    expect(PERSONA_PRESETS.length).toBeGreaterThan(0);
  });

  it('exports DIFFICULTY_OPTIONS', () => {
    const values = DIFFICULTY_OPTIONS.map((option) => option.value);
    expect(values).toContain('easy');
    expect(values).toContain('medium');
    expect(values).toContain('hard');
  });

  it('exports FEEDBACK_MODE_OPTIONS', () => {
    const values = FEEDBACK_MODE_OPTIONS.map((option) => option.value);
    expect(values).toContain('immediate');
    expect(values).toContain('full_simulation');
  });

  it('exports FOCUS_AREA_SUGGESTIONS', () => {
    expect(Array.isArray(FOCUS_AREA_SUGGESTIONS)).toBe(true);
    expect(FOCUS_AREA_SUGGESTIONS.length).toBeGreaterThan(0);
  });
});

describe('createDryRunSession', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  const payload = {
    feedback_mode: 'immediate' as const,
    num_questions: 5,
    interviewer_persona: null,
    difficulty: 'medium' as const,
    focus_areas: [],
    dry_run_context: null,
  };

  it('POSTs to /api/sessions with is_dry_run: true', async () => {
    const mockSession = { id: 'dry-session-1' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSession),
    } as unknown as Response);

    await createDryRunSession(payload);

    expect(fetch).toHaveBeenCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, is_dry_run: true }),
    });
  });

  it('returns the created session', async () => {
    const mockSession = { id: 'dry-session-1', is_dry_run: true };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSession),
    } as unknown as Response);

    const result = await createDryRunSession(payload);
    expect(result).toEqual(mockSession);
  });

  it('includes dry_run_context when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'session-1' }),
    } as unknown as Response);

    const payloadWithContext = { ...payload, dry_run_context: 'Senior Engineer at fintech' };
    await createDryRunSession(payloadWithContext);

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(body.dry_run_context).toBe('Senior Engineer at fintech');
    expect(body.is_dry_run).toBe(true);
  });

  it('throws an error with the server message on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'No API key' }),
    } as unknown as Response);

    await expect(createDryRunSession(payload)).rejects.toThrow('No API key');
  });

  it('falls back to HTTP status in the error message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    await expect(createDryRunSession(payload)).rejects.toThrow('HTTP 500');
  });
});
