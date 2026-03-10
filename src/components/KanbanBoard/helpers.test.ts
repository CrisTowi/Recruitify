import { describe, it, expect, vi, beforeEach } from 'vitest';
import { COLUMNS, fetchBoard, patchStatus } from './helpers';

describe('KanbanBoard helpers', () => {
  describe('COLUMNS', () => {
    it('lists all six board columns in order', () => {
      expect(COLUMNS).toEqual(['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Ghosted']);
    });
  });

  describe('fetchBoard', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('returns parsed board data on success', async () => {
      const mockBoard = { Wishlist: [], Applied: [], Interviewing: [], Offer: [], Rejected: [], Ghosted: [] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBoard),
      } as unknown as Response);

      const board = await fetchBoard();

      expect(fetch).toHaveBeenCalledWith('/api/companies');
      expect(board).toEqual(mockBoard);
    });

    it('throws an error when the response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as unknown as Response);

      await expect(fetchBoard()).rejects.toThrow('HTTP 500');
    });
  });

  describe('patchStatus', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('sends a PATCH request with the new status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      } as unknown as Response);

      await patchStatus('company-1', 'Offer');

      expect(fetch).toHaveBeenCalledWith('/api/companies/company-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Offer' }),
      });
    });

    it('throws an error message from response body when not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid status' }),
      } as unknown as Response);

      await expect(patchStatus('company-1', 'Offer')).rejects.toThrow('Invalid status');
    });

    it('falls back to HTTP status when error body has no message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('not json')),
      } as unknown as Response);

      await expect(patchStatus('company-1', 'Offer')).rejects.toThrow('HTTP 503');
    });
  });
});
