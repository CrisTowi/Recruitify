import { describe, it, expect } from 'vitest';
import { fmtCommas } from './formatInput';

describe('fmtCommas', () => {
  it('formats a plain number string with thousands commas', () => {
    expect(fmtCommas('150000')).toBe('150,000');
  });

  it('returns empty string for an empty input', () => {
    expect(fmtCommas('')).toBe('');
  });

  it('returns empty string for a non-numeric string', () => {
    expect(fmtCommas('abc')).toBe('');
  });

  it('strips non-digit characters before formatting', () => {
    expect(fmtCommas('1,500,00')).toBe('150,000');
  });

  it('handles single-digit numbers without commas', () => {
    expect(fmtCommas('5')).toBe('5');
  });

  it('handles numbers under 1000 without commas', () => {
    expect(fmtCommas('999')).toBe('999');
  });

  it('handles large numbers with multiple comma groups', () => {
    expect(fmtCommas('1000000')).toBe('1,000,000');
  });
});
