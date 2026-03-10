import { describe, it, expect } from 'vitest';
import { STATUSES } from './helpers';

describe('AddCompanyModal helpers', () => {
  describe('STATUSES', () => {
    it('contains all six application statuses', () => {
      expect(STATUSES).toHaveLength(6);
    });

    it('includes every expected status', () => {
      expect(STATUSES).toContain('Wishlist');
      expect(STATUSES).toContain('Applied');
      expect(STATUSES).toContain('Interviewing');
      expect(STATUSES).toContain('Offer');
      expect(STATUSES).toContain('Rejected');
      expect(STATUSES).toContain('Ghosted');
    });

    it('has Wishlist as the first status', () => {
      expect(STATUSES[0]).toBe('Wishlist');
    });
  });
});
