import { describe, it, expect } from 'vitest';
import { STATUS_LABELS, INTEREST_EMOJI } from './helpers';

describe('CompanyCard helpers', () => {
  describe('STATUS_LABELS', () => {
    it('maps each status to a display label', () => {
      expect(STATUS_LABELS['Wishlist']).toBe('Wishlist');
      expect(STATUS_LABELS['Applied']).toBe('Applied');
      expect(STATUS_LABELS['Interviewing']).toBe('Interviewing');
      expect(STATUS_LABELS['Offer']).toBe('Offer');
      expect(STATUS_LABELS['Rejected']).toBe('Rejected');
      expect(STATUS_LABELS['Ghosted']).toBe('Ghosted');
    });

    it('covers all six statuses', () => {
      expect(Object.keys(STATUS_LABELS)).toHaveLength(6);
    });
  });

  describe('INTEREST_EMOJI', () => {
    it('maps each interest level to an emoji', () => {
      expect(INTEREST_EMOJI['Excited']).toBe('🔥');
      expect(INTEREST_EMOJI['Interested']).toBe('⭐');
      expect(INTEREST_EMOJI['Meh']).toBe('😐');
      expect(INTEREST_EMOJI['Not interested']).toBe('👎');
    });

    it('covers all four interest levels', () => {
      expect(Object.keys(INTEREST_EMOJI)).toHaveLength(4);
    });
  });
});
