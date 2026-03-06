-- ============================================================
-- Recruitify – Demo Data Seed
-- ============================================================
-- Run this in the Supabase SQL Editor to populate the app
-- with realistic demo data for presentation or testing.
--
-- If you are using SUPABASE_AUTH=true, replace the
-- user_id values below with your actual Supabase user UUID:
--   SELECT id FROM auth.users WHERE email = 'you@example.com';
-- Then set user_id on each INSERT below.
--
-- If auth is disabled, you can remove all user_id references.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Companies
-- ────────────────────────────────────────────────────────────
INSERT INTO companies (id, name, status, interest_level, created_at) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000000', 'Google',    'Interviewing', 'Excited',        '2026-01-10T09:00:00Z'),
  ('aaaaaaaa-0002-0000-0000-000000000000', 'Stripe',    'Offer',        'Excited',        '2026-01-14T11:00:00Z'),
  ('aaaaaaaa-0003-0000-0000-000000000000', 'Netflix',   'Offer',        'Excited',        '2025-12-20T10:00:00Z'),
  ('aaaaaaaa-0004-0000-0000-000000000000', 'Meta',      'Rejected',     'Interested',     '2025-12-05T10:00:00Z'),
  ('aaaaaaaa-0005-0000-0000-000000000000', 'Airbnb',    'Wishlist',     'Interested',     '2026-02-01T14:00:00Z'),
  ('aaaaaaaa-0006-0000-0000-000000000000', 'OpenAI',    'Applied',      'Excited',        '2026-01-28T16:00:00Z'),
  ('aaaaaaaa-0007-0000-0000-000000000000', 'Figma',     'Ghosted',      'Meh',            '2025-11-15T10:00:00Z'),
  ('aaaaaaaa-0008-0000-0000-000000000000', 'Vercel',    'Applied',      'Interested',     '2026-02-03T09:30:00Z'),
  ('aaaaaaaa-0009-0000-0000-000000000000', 'Linear',    'Wishlist',     'Excited',        '2026-02-10T10:00:00Z'),
  ('aaaaaaaa-0010-0000-0000-000000000000', 'Shopify',   'Offer',        'Excited',        '2026-01-20T10:00:00Z'),
  ('aaaaaaaa-0011-0000-0000-000000000000', 'Anthropic', 'Applied',      'Excited',        '2026-02-15T14:00:00Z'),
  ('aaaaaaaa-0012-0000-0000-000000000000', 'Notion',    'Wishlist',     'Interested',     '2026-02-20T11:00:00Z'),
  ('aaaaaaaa-0013-0000-0000-000000000000', 'Spotify',   'Interviewing', 'Interested',     '2026-01-25T09:00:00Z'),
  ('aaaaaaaa-0014-0000-0000-000000000000', 'Amazon',    'Ghosted',      'Meh',            '2025-11-01T10:00:00Z'),
  ('aaaaaaaa-0015-0000-0000-000000000000', 'GitHub',    'Applied',      'Interested',     '2026-02-12T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Interview Roadmaps
-- ────────────────────────────────────────────────────────────

-- Google: Recruiter screen done, technical phone done, system design upcoming, onsite upcoming
INSERT INTO interviews_roadmap (id, company_id, stage_name, is_completed, scheduled_date, order_index) VALUES
  ('bbbbbbbb-0001-0001-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'Recruiter screen',        true,  '2026-01-12', 0),
  ('bbbbbbbb-0001-0002-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'Technical phone screen',  true,  '2026-01-19', 1),
  ('bbbbbbbb-0001-0003-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'System design interview', false, '2026-03-10', 2),
  ('bbbbbbbb-0001-0004-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'Onsite (5 rounds)',       false, null,         3)
ON CONFLICT (id) DO NOTHING;

-- Stripe: Recruiter call done, coding challenge done, technical interview upcoming
INSERT INTO interviews_roadmap (id, company_id, stage_name, is_completed, scheduled_date, order_index) VALUES
  ('bbbbbbbb-0002-0001-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'Recruiter call',          true,  '2026-01-16', 0),
  ('bbbbbbbb-0002-0002-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'Coding challenge',        true,  '2026-01-20', 1),
  ('bbbbbbbb-0002-0003-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'Technical interview',     false, '2026-03-08', 2),
  ('bbbbbbbb-0002-0004-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'Final round',             false, null,         3)
ON CONFLICT (id) DO NOTHING;

-- Netflix: All stages done
INSERT INTO interviews_roadmap (id, company_id, stage_name, is_completed, scheduled_date, order_index) VALUES
  ('bbbbbbbb-0003-0001-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'HR screen',               true, '2025-12-22', 0),
  ('bbbbbbbb-0003-0002-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'Technical screen',        true, '2026-01-05', 1),
  ('bbbbbbbb-0003-0003-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'Onsite (4 rounds)',       true, '2026-01-22', 2)
ON CONFLICT (id) DO NOTHING;

-- Meta: All done (rejected)
INSERT INTO interviews_roadmap (id, company_id, stage_name, is_completed, scheduled_date, order_index) VALUES
  ('bbbbbbbb-0004-0001-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'Recruiter screen',        true, '2025-12-08', 0),
  ('bbbbbbbb-0004-0002-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'Coding round',            true, '2025-12-15', 1),
  ('bbbbbbbb-0004-0003-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'Onsite loop',             true, '2025-12-29', 2)
ON CONFLICT (id) DO NOTHING;

-- Shopify: Recruiter screen done, technical assessment done, engineering interview upcoming
INSERT INTO interviews_roadmap (id, company_id, stage_name, is_completed, scheduled_date, order_index) VALUES
  ('bbbbbbbb-0010-0001-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000', 'Recruiter screen',        true,  '2026-01-22', 0),
  ('bbbbbbbb-0010-0002-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000', 'Technical assessment',    true,  '2026-01-29', 1),
  ('bbbbbbbb-0010-0003-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000', 'Engineering interview',   false, '2026-03-12', 2),
  ('bbbbbbbb-0010-0004-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000', 'Final panel',             false, null,         3)
ON CONFLICT (id) DO NOTHING;

-- Spotify: Recruiter call done, technical screen done, take-home upcoming
INSERT INTO interviews_roadmap (id, company_id, stage_name, is_completed, scheduled_date, order_index) VALUES
  ('bbbbbbbb-0013-0001-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000', 'Recruiter call',          true,  '2026-01-27', 0),
  ('bbbbbbbb-0013-0002-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000', 'Technical screen',        true,  '2026-02-05', 1),
  ('bbbbbbbb-0013-0003-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000', 'Take-home project',       false, '2026-03-15', 2),
  ('bbbbbbbb-0013-0004-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000', 'Final round',             false, null,         3)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Timeline Events
-- ────────────────────────────────────────────────────────────

-- Google timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0001-0001-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000',
   'status_change', 'Moved to Interviewing', null, null, null, null, null, null, '2026-01-12T12:00:00Z'),

  ('cccccccc-0001-0002-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000',
   'contact', null, 'Reached out to schedule the first technical screen.', 'Sarah Chen', 'Technical Recruiter', 'sarah.chen@google.com', null, null, '2026-01-12T12:30:00Z'),

  ('cccccccc-0001-0003-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000',
   'appointment', 'Recruiter screen', 'Went well. Asked about background, projects, motivation for Google.', null, null, null, '2026-01-12T15:00:00Z', null, '2026-01-12T16:00:00Z'),

  ('cccccccc-0001-0004-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-01-14T09:00:00Z'),

  ('cccccccc-0001-0005-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000',
   'appointment', 'Technical phone screen', 'Two LeetCode mediums. Solved both but the second one took longer than expected. Interviewer was friendly.', 'James Park', 'Software Engineer L5', null, '2026-01-19T14:00:00Z', null, '2026-01-19T16:00:00Z'),

  ('cccccccc-0001-0006-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-01-22T10:00:00Z'),

  ('cccccccc-0001-0007-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000',
   'note', 'System design prep', 'Reviewing distributed systems: consistent hashing, load balancing, CDN, database sharding. Focus on Google-scale problems.', null, null, null, null, null, '2026-02-10T20:00:00Z'),

  ('cccccccc-0001-0008-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-15T09:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- Stripe timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0002-0001-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2026-01-14T11:00:00Z'),

  ('cccccccc-0002-0002-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000',
   'contact', null, 'Connected on LinkedIn. She reached out about a senior SWE role on the payments infra team.', 'Maria Reyes', 'Engineering Recruiter', 'maria.reyes@stripe.com', null, null, '2026-01-15T14:00:00Z'),

  ('cccccccc-0002-0003-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000',
   'status_change', 'Moved to Interviewing', null, null, null, null, null, null, '2026-01-16T10:00:00Z'),

  ('cccccccc-0002-0004-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000',
   'appointment', 'Recruiter call', '30 min intro. Discussed role, team, comp range ($220-280k). Excited about the infra challenges.', null, null, null, '2026-01-16T11:00:00Z', null, '2026-01-16T11:30:00Z'),

  ('cccccccc-0002-0005-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000',
   'note', 'Coding challenge notes', 'Take-home: build a rate limiter. Used token bucket algorithm with Redis. Took about 4 hours.', null, null, null, null, null, '2026-01-21T09:00:00Z'),

  ('cccccccc-0002-0006-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-01-25T16:00:00Z'),

  ('cccccccc-0002-0007-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-20T09:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- Netflix timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0003-0001-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2025-12-20T10:00:00Z'),

  ('cccccccc-0003-0002-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   'status_change', 'Moved to Interviewing', null, null, null, null, null, null, '2025-12-22T14:00:00Z'),

  ('cccccccc-0003-0003-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   'appointment', 'HR screen', 'Netflix culture values discussion. Freedom and responsibility. Role is on the streaming infrastructure team.', 'Tom Bradley', 'Talent Acquisition', null, '2025-12-22T15:00:00Z', null, '2025-12-22T15:45:00Z'),

  ('cccccccc-0003-0004-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   'appointment', 'Technical screen', 'Algorithms + system design combo. Discussed designing a global CDN. Went really well.', null, null, null, '2026-01-05T16:00:00Z', null, '2026-01-05T18:00:00Z'),

  ('cccccccc-0003-0005-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   'appointment', 'Onsite day', 'Four back-to-back sessions: two coding, one system design (video streaming at scale), one culture/values. Felt strong overall.', null, null, null, '2026-01-22T09:00:00Z', null, '2026-01-22T17:00:00Z'),

  ('cccccccc-0003-0006-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   'status_change', 'Moved to Offer', null, null, null, null, null, null, '2026-01-28T15:00:00Z'),

  ('cccccccc-0003-0007-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   'note', 'Offer details', 'Base: $285k, sign-on: $50k, equity: $800k over 4 years. Strong offer. Comparing with Google.', null, null, null, null, null, '2026-01-28T16:00:00Z'),

  ('cccccccc-0003-0008-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Negotiating', '2026-01-30T10:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- Meta timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0004-0001-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2025-12-05T10:00:00Z'),

  ('cccccccc-0004-0002-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000',
   'status_change', 'Moved to Interviewing', null, null, null, null, null, null, '2025-12-08T13:00:00Z'),

  ('cccccccc-0004-0003-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000',
   'appointment', 'Recruiter screen', 'Standard intro. Role is on the Ads infrastructure team.', 'Alex Kim', 'Technical Recruiter', null, '2025-12-08T14:00:00Z', null, '2025-12-08T14:30:00Z'),

  ('cccccccc-0004-0004-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000',
   'appointment', 'Coding round', 'Two hard LeetCode problems. Did not finish the second one in time.', null, null, null, '2025-12-15T15:00:00Z', null, '2025-12-15T16:00:00Z'),

  ('cccccccc-0004-0005-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000',
   'appointment', 'Onsite loop', 'Five rounds in one day. Coding + system design + behavioral. Felt the system design round was weak.', null, null, null, '2025-12-29T09:00:00Z', null, '2025-12-29T16:00:00Z'),

  ('cccccccc-0004-0006-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000',
   'status_change', 'Moved to Rejected', null, null, null, null, null, null, '2026-01-06T11:00:00Z'),

  ('cccccccc-0004-0007-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000',
   'note', 'Rejection feedback', 'Recruiter said the system design round did not meet the bar for E5. Will focus on distributed systems practice before reapplying in 6 months.', null, null, null, null, null, '2026-01-06T12:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- OpenAI timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0006-0001-0000-000000000000', 'aaaaaaaa-0006-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2026-01-28T16:00:00Z'),

  ('cccccccc-0006-0002-0000-000000000000', 'aaaaaaaa-0006-0000-0000-000000000000',
   'note', 'Application submitted', 'Applied for Senior Software Engineer – Infrastructure. Referral from a former colleague on the team.', null, null, null, null, null, '2026-01-28T16:30:00Z'),

  ('cccccccc-0006-0003-0000-000000000000', 'aaaaaaaa-0006-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-01T09:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- Figma timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0007-0001-0000-000000000000', 'aaaaaaaa-0007-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2025-11-15T10:00:00Z'),

  ('cccccccc-0007-0002-0000-000000000000', 'aaaaaaaa-0007-0000-0000-000000000000',
   'status_change', 'Moved to Ghosted', null, null, null, null, null, null, '2025-12-20T09:00:00Z'),

  ('cccccccc-0007-0003-0000-000000000000', 'aaaaaaaa-0007-0000-0000-000000000000',
   'note', 'No response', 'Applied 5 weeks ago, no response. Sent a follow-up to the recruiter — still nothing.', null, null, null, null, null, '2025-12-20T09:30:00Z')

ON CONFLICT (id) DO NOTHING;

-- Vercel timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0008-0001-0000-000000000000', 'aaaaaaaa-0008-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2026-02-03T09:30:00Z'),

  ('cccccccc-0008-0002-0000-000000000000', 'aaaaaaaa-0008-0000-0000-000000000000',
   'note', 'Application submitted', 'Applied for Staff Engineer role. Love the product, use it daily.', null, null, null, null, null, '2026-02-03T10:00:00Z'),

  ('cccccccc-0008-0003-0000-000000000000', 'aaaaaaaa-0008-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-03T10:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- Shopify timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0010-0001-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000',
   'status_change', 'Moved to Interviewing', null, null, null, null, null, null, '2026-01-22T10:00:00Z'),

  ('cccccccc-0010-0002-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000',
   'contact', null, 'Reached out via LinkedIn about a senior backend role on the Checkout team.', 'David Lee', 'Talent Partner', 'david.lee@shopify.com', null, null, '2026-01-21T15:00:00Z'),

  ('cccccccc-0010-0003-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000',
   'appointment', 'Recruiter screen', 'Great call. Role is on the Checkout infra team. Remote-first, async culture. Discussed comp range ($200-250k).', null, null, null, '2026-01-22T11:00:00Z', null, '2026-01-22T11:45:00Z'),

  ('cccccccc-0010-0004-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-01-25T09:00:00Z'),

  ('cccccccc-0010-0005-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000',
   'note', 'Technical assessment notes', 'Take-home: refactor a Ruby on Rails service to improve throughput. Submitted Monday. Felt good about the solution.', null, null, null, null, null, '2026-01-30T20:00:00Z'),

  ('cccccccc-0010-0006-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-02-03T10:00:00Z'),

  ('cccccccc-0010-0007-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-25T09:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- Anthropic timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0011-0001-0000-000000000000', 'aaaaaaaa-0011-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2026-02-15T14:00:00Z'),

  ('cccccccc-0011-0002-0000-000000000000', 'aaaaaaaa-0011-0000-0000-000000000000',
   'note', 'Application submitted', 'Applied for Research Engineer – Infrastructure. Referral from a friend on the pretraining team. Very excited about the mission.', null, null, null, null, null, '2026-02-15T14:30:00Z'),

  ('cccccccc-0011-0003-0000-000000000000', 'aaaaaaaa-0011-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-16T09:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- Spotify timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0013-0001-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000',
   'status_change', 'Moved to Interviewing', null, null, null, null, null, null, '2026-01-27T09:00:00Z'),

  ('cccccccc-0013-0002-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000',
   'contact', null, 'Recruiter reached out cold. Role is on the Backend Platform team building developer tooling.', 'Emma Johansson', 'Engineering Recruiter', 'emma.j@spotify.com', null, null, '2026-01-26T16:00:00Z'),

  ('cccccccc-0013-0003-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000',
   'appointment', 'Recruiter call', 'Good intro. Remote-friendly, Stockholm or NYC. Discussed the platform engineering roadmap.', null, null, null, '2026-01-27T10:00:00Z', null, '2026-01-27T10:30:00Z'),

  ('cccccccc-0013-0004-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000',
   'appointment', 'Technical screen', 'System design + coding. Designed a distributed job scheduler. Went well overall.', 'Luca Moretti', 'Staff Engineer', null, '2026-02-05T14:00:00Z', null, '2026-02-05T16:00:00Z'),

  ('cccccccc-0013-0005-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-02-10T09:00:00Z'),

  ('cccccccc-0013-0006-0000-000000000000', 'aaaaaaaa-0013-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-28T09:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- Amazon timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0014-0001-0000-000000000000', 'aaaaaaaa-0014-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2025-11-01T10:00:00Z'),

  ('cccccccc-0014-0002-0000-000000000000', 'aaaaaaaa-0014-0000-0000-000000000000',
   'note', 'Application submitted', 'Applied for Senior SDE II on the AWS Lambda team. Not super excited but it''s a strong fallback option.', null, null, null, null, null, '2025-11-01T10:30:00Z'),

  ('cccccccc-0014-0003-0000-000000000000', 'aaaaaaaa-0014-0000-0000-000000000000',
   'status_change', 'Moved to Ghosted', null, null, null, null, null, null, '2025-12-15T09:00:00Z'),

  ('cccccccc-0014-0004-0000-000000000000', 'aaaaaaaa-0014-0000-0000-000000000000',
   'note', 'No response', 'Six weeks with zero contact. Followed up twice through the portal and on LinkedIn. Moving on.', null, null, null, null, null, '2025-12-15T09:30:00Z')

ON CONFLICT (id) DO NOTHING;

-- GitHub timeline
INSERT INTO timeline_events (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at) VALUES
  ('cccccccc-0015-0001-0000-000000000000', 'aaaaaaaa-0015-0000-0000-000000000000',
   'status_change', 'Moved to Applied', null, null, null, null, null, null, '2026-02-12T10:00:00Z'),

  ('cccccccc-0015-0002-0000-000000000000', 'aaaaaaaa-0015-0000-0000-000000000000',
   'note', 'Application submitted', 'Applied for Senior Engineer on the Developer Experience team. Would love to work on tooling at this scale.', null, null, null, null, null, '2026-02-12T10:30:00Z'),

  ('cccccccc-0015-0003-0000-000000000000', 'aaaaaaaa-0015-0000-0000-000000000000',
   'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-12T11:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Offer details (Netflix, Stripe, Shopify)
-- ────────────────────────────────────────────────────────────
INSERT INTO company_offers
  (id, company_id, base_salary, currency, signing_bonus, equity_value, equity_vesting,
   bonus_pct, pto_days, remote_policy, health_tier, retirement_match_pct, other_benefits, notes)
VALUES
  -- Netflix — high base, no cliff, unlimited PTO
  ('cccccccc-0003-0000-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000',
   230000, 'USD', 30000, 600000, 'No cliff, monthly vesting',
   null, null, 'Hybrid', 'Premium', 4,
   'Unlimited PTO, $500/mo home office stipend, top equipment budget',
   'Deadline to decide: March 20. No performance bonus — fully baked into base.'),

  -- Stripe — strong equity, remote, solid bonus
  ('cccccccc-0002-0000-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000',
   195000, 'USD', 50000, 400000, '4yr, 1yr cliff',
   10, 25, 'Remote', 'Premium', 4,
   'Remote-first, $1,000 learning budget/yr, annual company offsite',
   'Negotiation in progress — trying to bump base to $205k.'),

  -- Shopify — best bonus %, fully remote, lower base
  ('cccccccc-0010-0000-0000-000000000000', 'aaaaaaaa-0010-0000-0000-000000000000',
   175000, 'USD', 20000, 240000, '4yr, 1yr cliff',
   15, 20, 'Remote', 'Basic', 5,
   'Fully distributed team, $2,000/yr wellness credit, async culture',
   'Great culture fit but lowest base. Could negotiate equity upward.')

ON CONFLICT (id) DO NOTHING;
