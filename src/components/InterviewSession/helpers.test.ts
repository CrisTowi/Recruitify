import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApiError,
  classifyError,
  startSession,
  submitAnswer,
  completeSession,
  cancelSession,
  isCloudTtsProvider,
  isCloudSttProvider,
  formatElapsed,
} from './helpers';

describe('ApiError', () => {
  it('sets name, message, status, and optional code', () => {
    const error = new ApiError('Something failed', 429, 'RATE_LIMIT');
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Something failed');
    expect(error.status).toBe(429);
    expect(error.code).toBe('RATE_LIMIT');
  });

  it('works without a code', () => {
    const error = new ApiError('Forbidden', 403);
    expect(error.code).toBeUndefined();
  });

  it('is an instance of Error', () => {
    expect(new ApiError('msg', 500)).toBeInstanceOf(Error);
  });
});

describe('classifyError', () => {
  it('classifies 429 ApiError as rate_limit and retryable', () => {
    const result = classifyError(new ApiError('Too many requests', 429));
    expect(result.kind).toBe('rate_limit');
    expect(result.retryable).toBe(true);
  });

  it('classifies 403 ApiError as invalid_key and not retryable', () => {
    const result = classifyError(new ApiError('Forbidden', 403));
    expect(result.kind).toBe('invalid_key');
    expect(result.retryable).toBe(false);
  });

  it('classifies NO_AI_SETTINGS code as invalid_key', () => {
    const result = classifyError(new ApiError('Not configured', 200, 'NO_AI_SETTINGS'));
    expect(result.kind).toBe('invalid_key');
  });

  it('uses the ApiError message for invalid_key', () => {
    const result = classifyError(new ApiError('Custom error message', 403));
    expect(result.message).toBe('Custom error message');
  });

  it('classifies other ApiErrors as fatal and not retryable', () => {
    const result = classifyError(new ApiError('Server error', 500));
    expect(result.kind).toBe('fatal');
    expect(result.retryable).toBe(false);
  });

  it('classifies TypeError as network error and retryable', () => {
    const result = classifyError(new TypeError('Failed to fetch'));
    expect(result.kind).toBe('network');
    expect(result.retryable).toBe(true);
  });

  it('classifies generic Error as fatal', () => {
    const result = classifyError(new Error('Something broke'));
    expect(result.kind).toBe('fatal');
    expect(result.message).toBe('Something broke');
  });

  it('classifies unknown values as fatal with a fallback message', () => {
    const result = classifyError('some string error');
    expect(result.kind).toBe('fatal');
    expect(result.message).toBe('An unexpected error occurred.');
  });
});

describe('startSession', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('POSTs to the correct endpoint and returns the response', async () => {
    const mockResponse = { status: 'in_progress', started_at: '2026-01-01T00:00:00Z', current_question: { id: 'q-1', question_number: 1, question_text: 'Tell me about yourself' } };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response);

    const result = await startSession('session-1');

    expect(fetch).toHaveBeenCalledWith('/api/sessions/session-1/start', { method: 'POST' });
    expect(result).toEqual(mockResponse);
  });

  it('throws ApiError on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'No AI settings', code: 'NO_AI_SETTINGS' }),
    } as unknown as Response);

    await expect(startSession('session-1')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('submitAnswer', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('POSTs to the answer endpoint with the correct body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ is_last_question: false }),
    } as unknown as Response);

    await submitAnswer('session-1', 'q-1', 'My answer', 45);

    expect(fetch).toHaveBeenCalledWith('/api/sessions/session-1/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: 'q-1', answer_transcript: 'My answer', duration_seconds: 45 }),
    });
  });

  it('throws ApiError on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limit' }),
    } as unknown as Response);

    await expect(submitAnswer('session-1', 'q-1', 'answer', 10)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('completeSession', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('POSTs to the complete endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as unknown as Response);
    await completeSession('session-1');
    expect(fetch).toHaveBeenCalledWith('/api/sessions/session-1/complete', { method: 'POST' });
  });

  it('throws ApiError on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    } as unknown as Response);

    await expect(completeSession('session-1')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('cancelSession', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('POSTs to the cancel endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as unknown as Response);
    await cancelSession('session-1');
    expect(fetch).toHaveBeenCalledWith('/api/sessions/session-1/cancel', { method: 'POST' });
  });

  it('throws ApiError on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    } as unknown as Response);

    await expect(cancelSession('session-1')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('isCloudTtsProvider', () => {
  it('returns true for deepgram', () => {
    expect(isCloudTtsProvider('deepgram')).toBe(true);
  });

  it('returns false for browser', () => {
    expect(isCloudTtsProvider('browser')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isCloudTtsProvider(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCloudTtsProvider(undefined)).toBe(false);
  });
});

describe('isCloudSttProvider', () => {
  it('returns true for deepgram', () => {
    expect(isCloudSttProvider('deepgram')).toBe(true);
  });

  it('returns false for browser', () => {
    expect(isCloudSttProvider('browser')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isCloudSttProvider(null)).toBe(false);
  });
});

describe('formatElapsed', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('formats 65 seconds as 01:05', () => {
    expect(formatElapsed(65)).toBe('01:05');
  });

  it('formats 3600 seconds as 60:00', () => {
    expect(formatElapsed(3600)).toBe('60:00');
  });

  it('pads single-digit seconds with a leading zero', () => {
    expect(formatElapsed(9)).toBe('00:09');
  });
});
