import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PERSONA_PRESETS,
  DIFFICULTY_OPTIONS,
  FEEDBACK_MODE_OPTIONS,
  FOCUS_AREA_SUGGESTIONS,
  fetchActiveSession,
  cancelSessionById,
  createSession,
} from './helpers';

describe('PERSONA_PRESETS', () => {
  it('includes at least one preset and a Custom option', () => {
    expect(PERSONA_PRESETS.length).toBeGreaterThan(1);
    const customPreset = PERSONA_PRESETS.find((preset) => preset.label === 'Custom');
    expect(customPreset).toBeDefined();
    expect(customPreset?.value).toBe('');
  });

  it('every non-custom preset has a non-empty value', () => {
    const nonCustom = PERSONA_PRESETS.filter((preset) => preset.label !== 'Custom');
    for (const preset of nonCustom) {
      expect(preset.value.length).toBeGreaterThan(0);
    }
  });
});

describe('DIFFICULTY_OPTIONS', () => {
  it('contains easy, medium, and hard', () => {
    const values = DIFFICULTY_OPTIONS.map((option) => option.value);
    expect(values).toContain('easy');
    expect(values).toContain('medium');
    expect(values).toContain('hard');
  });

  it('every option has a label and description', () => {
    for (const option of DIFFICULTY_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    }
  });
});

describe('FEEDBACK_MODE_OPTIONS', () => {
  it('contains immediate and full_simulation', () => {
    const values = FEEDBACK_MODE_OPTIONS.map((option) => option.value);
    expect(values).toContain('immediate');
    expect(values).toContain('full_simulation');
  });
});

describe('FOCUS_AREA_SUGGESTIONS', () => {
  it('is a non-empty array of strings', () => {
    expect(FOCUS_AREA_SUGGESTIONS.length).toBeGreaterThan(0);
    for (const suggestion of FOCUS_AREA_SUGGESTIONS) {
      expect(typeof suggestion).toBe('string');
    }
  });
});

describe('fetchActiveSession', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns the first in-progress session when found', async () => {
    const mockSession = { id: 'session-1', status: 'in_progress' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: [mockSession], total: 1 }),
    } as unknown as Response);

    const result = await fetchActiveSession();
    expect(result).toEqual(mockSession);
    expect(fetch).toHaveBeenCalledWith('/api/sessions?status=in_progress&limit=1');
  });

  it('returns null when no active session exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: [], total: 0 }),
    } as unknown as Response);

    const result = await fetchActiveSession();
    expect(result).toBeNull();
  });

  it('returns null on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const result = await fetchActiveSession();
    expect(result).toBeNull();
  });
});

describe('cancelSessionById', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('POSTs to the cancel endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as unknown as Response);
    await cancelSessionById('session-1');
    expect(fetch).toHaveBeenCalledWith('/api/sessions/session-1/cancel', { method: 'POST' });
  });

  it('throws an error with the server message on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Session not found' }),
    } as unknown as Response);

    await expect(cancelSessionById('session-1')).rejects.toThrow('Session not found');
  });

  it('falls back to HTTP status in the error message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    await expect(cancelSessionById('session-1')).rejects.toThrow('HTTP 503');
  });
});

describe('createSession', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  const payload = {
    company_id: 'company-1',
    stage_id: 'stage-1',
    feedback_mode: 'immediate' as const,
    num_questions: 5,
    interviewer_persona: null,
    difficulty: 'medium' as const,
    focus_areas: ['Leadership'],
  };

  it('POSTs the payload to /api/sessions and returns the session', async () => {
    const mockSession = { id: 'session-new' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSession),
    } as unknown as Response);

    const result = await createSession(payload);

    expect(fetch).toHaveBeenCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(mockSession);
  });

  it('throws with the server error message on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'No API key configured' }),
    } as unknown as Response);

    await expect(createSession(payload)).rejects.toThrow('No API key configured');
  });
});
