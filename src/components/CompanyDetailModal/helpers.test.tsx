import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDate, formatDateTime, fmt, renderWithLinks, EVENT_TYPE_LABELS, USER_EVENT_TYPES } from './helpers';

describe('CompanyDetailModal helpers', () => {
  describe('fmt', () => {
    it('returns em-dash for null value', () => {
      expect(fmt(null, 'USD', 'currency')).toBe('—');
    });

    it('returns em-dash for undefined value', () => {
      expect(fmt(undefined, 'USD', 'currency')).toBe('—');
    });

    it('formats currency values', () => {
      expect(fmt(120000, 'USD', 'currency')).toBe('$120,000');
    });

    it('formats percentage values', () => {
      expect(fmt(15, 'USD', 'pct')).toBe('15%');
    });

    it('formats day values', () => {
      expect(fmt(20, 'USD', 'days')).toBe('20 days');
    });
  });

  describe('formatDate', () => {
    it('formats an ISO date string to a readable date', () => {
      const result = formatDate('2024-06-15T12:00:00Z');
      expect(result).toMatch(/jun/i);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/15/);
    });
  });

  describe('formatDateTime', () => {
    it('formats an ISO date string to include time', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z');
      expect(result).toMatch(/jun/i);
      expect(result).toMatch(/2024/);
    });
  });

  describe('renderWithLinks', () => {
    it('returns plain text when there are no URLs', () => {
      const parts = renderWithLinks('No links here');
      expect(parts).toEqual(['No links here']);
    });

    it('wraps URLs in anchor tags', () => {
      render(<>{renderWithLinks('Visit https://example.com for details')}</>);
      const link = screen.getByRole('link', { name: 'https://example.com' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('preserves surrounding text around a URL', () => {
      render(<>{renderWithLinks('Go to https://example.com now')}</>);
      expect(screen.getByText(/Go to/)).toBeTruthy();
      expect(screen.getByRole('link')).toHaveTextContent('https://example.com');
    });

    it('handles multiple URLs in the same string', () => {
      render(<>{renderWithLinks('https://a.com and https://b.com')}</>);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
    });

    it('returns only text when string has no URL', () => {
      const parts = renderWithLinks('just text');
      expect(parts).toHaveLength(1);
      expect(parts[0]).toBe('just text');
    });
  });

  describe('EVENT_TYPE_LABELS', () => {
    it('maps all event types to human-readable labels', () => {
      expect(EVENT_TYPE_LABELS['note']).toBe('Note');
      expect(EVENT_TYPE_LABELS['contact']).toBe('Contact');
      expect(EVENT_TYPE_LABELS['appointment']).toBe('Appointment');
      expect(EVENT_TYPE_LABELS['process_status']).toBe('Process Status');
      expect(EVENT_TYPE_LABELS['status_change']).toBe('Moved');
    });
  });

  describe('USER_EVENT_TYPES', () => {
    it('does not include status_change (system-only event)', () => {
      expect(USER_EVENT_TYPES).not.toContain('status_change');
    });

    it('includes all user-creatable event types', () => {
      expect(USER_EVENT_TYPES).toContain('note');
      expect(USER_EVENT_TYPES).toContain('contact');
      expect(USER_EVENT_TYPES).toContain('appointment');
      expect(USER_EVENT_TYPES).toContain('process_status');
    });
  });
});
