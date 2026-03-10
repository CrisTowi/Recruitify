import type { ApplicationStatus, InterestLevel } from '@/types';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Wishlist:     'Wishlist',
  Applied:      'Applied',
  Interviewing: 'Interviewing',
  Offer:        'Offer',
  Rejected:     'Rejected',
  Ghosted:      'Ghosted',
};

export const INTEREST_EMOJI: Record<InterestLevel, string> = {
  'Excited':        '🔥',
  'Interested':     '⭐',
  'Meh':            '😐',
  'Not interested': '👎',
};
