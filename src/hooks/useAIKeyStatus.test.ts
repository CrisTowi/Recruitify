import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAIKeyStatus } from './useAIKeyStatus';

describe('useAIKeyStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null before the fetch resolves', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAIKeyStatus());
    expect(result.current).toBeNull();
  });

  it('returns true when the API key is present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ has_llm_key: true }),
    } as unknown as Response);

    const { result } = renderHook(() => useAIKeyStatus());

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toBe(true);
  });

  it('returns false when has_llm_key is false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ has_llm_key: false }),
    } as unknown as Response);

    const { result } = renderHook(() => useAIKeyStatus());

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toBe(false);
  });

  it('returns false when the API response is not ok (404)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    const { result } = renderHook(() => useAIKeyStatus());

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toBe(false);
  });

  it('returns false when fetch throws a network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useAIKeyStatus());

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toBe(false);
  });

  it('fetches from /api/ai-settings', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ has_llm_key: true }),
    } as unknown as Response);

    renderHook(() => useAIKeyStatus());

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/ai-settings'));
  });
});
