#!/usr/bin/env node
// Populates a local SQLite database with demo data.
// Usage: npm run seed-demo
//
// The database path follows the same logic as the app:
//   - SQLITE_PATH env var if set
//   - Otherwise ./recruitify.db in the project root

const path = require('path');
const fs = require('fs');

// ── Parse .env.local ──────────────────────────────────────────
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

// ── Open DB ───────────────────────────────────────────────────
const Database = require('better-sqlite3');

const dbPath = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.join(process.cwd(), 'recruitify.db');

console.log(`Database: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Ensure schema exists ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'Wishlist',
    interest_level TEXT,
    prep_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS interviews_roadmap (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    scheduled_date TEXT,
    order_index INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    title TEXT,
    body TEXT,
    contact_name TEXT,
    contact_role TEXT,
    contact_email TEXT,
    scheduled_at TEXT,
    process_status TEXT,
    calendar_event_id TEXT
  );

  CREATE TABLE IF NOT EXISTS google_tokens (
    id INTEGER PRIMARY KEY DEFAULT 1,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// Column migrations for existing databases
try { db.exec(`ALTER TABLE companies ADD COLUMN prep_notes TEXT`); } catch { /* already exists */ }

// ── Seed data ─────────────────────────────────────────────────
const seed = db.transaction(() => {

  // Companies
  const insertCompany = db.prepare(`
    INSERT OR IGNORE INTO companies (id, name, status, interest_level, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const companies = [
    ['aaaaaaaa-0001-0000-0000-000000000000', 'Google',   'Interviewing', 'Excited',      '2026-01-10T09:00:00Z'],
    ['aaaaaaaa-0002-0000-0000-000000000000', 'Stripe',   'Interviewing', 'Excited',      '2026-01-14T11:00:00Z'],
    ['aaaaaaaa-0003-0000-0000-000000000000', 'Netflix',  'Offer',        'Excited',      '2025-12-20T10:00:00Z'],
    ['aaaaaaaa-0004-0000-0000-000000000000', 'Meta',     'Rejected',     'Interested',   '2025-12-05T10:00:00Z'],
    ['aaaaaaaa-0005-0000-0000-000000000000', 'Airbnb',   'Wishlist',     'Interested',   '2026-02-01T14:00:00Z'],
    ['aaaaaaaa-0006-0000-0000-000000000000', 'OpenAI',   'Applied',      'Excited',      '2026-01-28T16:00:00Z'],
    ['aaaaaaaa-0007-0000-0000-000000000000', 'Figma',    'Ghosted',      'Meh',          '2025-11-15T10:00:00Z'],
    ['aaaaaaaa-0008-0000-0000-000000000000', 'Vercel',   'Applied',      'Interested',   '2026-02-03T09:30:00Z'],
    ['aaaaaaaa-0009-0000-0000-000000000000', 'Linear',   'Wishlist',     'Excited',      '2026-02-10T10:00:00Z'],
  ];
  for (const c of companies) insertCompany.run(...c);

  // Interview roadmaps
  const insertStage = db.prepare(`
    INSERT OR IGNORE INTO interviews_roadmap (id, company_id, stage_name, is_completed, scheduled_date, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const stages = [
    // Google
    ['bbbbbbbb-0001-0001-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'Recruiter screen',        1, '2026-01-12', 0],
    ['bbbbbbbb-0001-0002-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'Technical phone screen',  1, '2026-01-19', 1],
    ['bbbbbbbb-0001-0003-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'System design interview', 0, '2026-03-10', 2],
    ['bbbbbbbb-0001-0004-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'Onsite (5 rounds)',       0, null,         3],
    // Stripe
    ['bbbbbbbb-0002-0001-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'Recruiter call',          1, '2026-01-16', 0],
    ['bbbbbbbb-0002-0002-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'Coding challenge',        1, '2026-01-20', 1],
    ['bbbbbbbb-0002-0003-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'Technical interview',     0, '2026-03-08', 2],
    ['bbbbbbbb-0002-0004-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'Final round',             0, null,         3],
    // Netflix
    ['bbbbbbbb-0003-0001-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'HR screen',               1, '2025-12-22', 0],
    ['bbbbbbbb-0003-0002-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'Technical screen',        1, '2026-01-05', 1],
    ['bbbbbbbb-0003-0003-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'Onsite (4 rounds)',       1, '2026-01-22', 2],
    // Meta
    ['bbbbbbbb-0004-0001-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'Recruiter screen',        1, '2025-12-08', 0],
    ['bbbbbbbb-0004-0002-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'Coding round',            1, '2025-12-15', 1],
    ['bbbbbbbb-0004-0003-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'Onsite loop',             1, '2025-12-29', 2],
  ];
  for (const s of stages) insertStage.run(...s);

  // Timeline events
  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO timeline_events
      (id, company_id, event_type, title, body, contact_name, contact_role, contact_email, scheduled_at, process_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const events = [
    // Google
    ['cccccccc-0001-0001-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'status_change',  'Moved to Interviewing', null, null, null, null, null, null, '2026-01-12T12:00:00Z'],
    ['cccccccc-0001-0002-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'contact',        null, 'Reached out to schedule the first technical screen.', 'Sarah Chen', 'Technical Recruiter', 'sarah.chen@google.com', null, null, '2026-01-12T12:30:00Z'],
    ['cccccccc-0001-0003-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'appointment',    'Recruiter screen', 'Went well. Asked about background, projects, motivation for Google.', null, null, null, '2026-01-12T15:00:00Z', null, '2026-01-12T16:00:00Z'],
    ['cccccccc-0001-0004-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-01-14T09:00:00Z'],
    ['cccccccc-0001-0005-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'appointment',    'Technical phone screen', 'Two LeetCode mediums. Solved both but the second took longer. Interviewer was friendly.', 'James Park', 'Software Engineer L5', null, '2026-01-19T14:00:00Z', null, '2026-01-19T16:00:00Z'],
    ['cccccccc-0001-0006-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-01-22T10:00:00Z'],
    ['cccccccc-0001-0007-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'note',           'System design prep', 'Reviewing distributed systems: consistent hashing, load balancing, CDN, database sharding.', null, null, null, null, null, '2026-02-10T20:00:00Z'],
    ['cccccccc-0001-0008-0000-000000000000', 'aaaaaaaa-0001-0000-0000-000000000000', 'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-15T09:00:00Z'],
    // Stripe
    ['cccccccc-0002-0001-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'status_change',  'Moved to Applied', null, null, null, null, null, null, '2026-01-14T11:00:00Z'],
    ['cccccccc-0002-0002-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'contact',        null, 'Connected on LinkedIn. She reached out about a senior SWE role on the payments infra team.', 'Maria Reyes', 'Engineering Recruiter', 'maria.reyes@stripe.com', null, null, '2026-01-15T14:00:00Z'],
    ['cccccccc-0002-0003-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'status_change',  'Moved to Interviewing', null, null, null, null, null, null, '2026-01-16T10:00:00Z'],
    ['cccccccc-0002-0004-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'appointment',    'Recruiter call', '30 min intro. Discussed role, team, comp range ($220-280k).', null, null, null, '2026-01-16T11:00:00Z', null, '2026-01-16T11:30:00Z'],
    ['cccccccc-0002-0005-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'note',           'Coding challenge notes', 'Take-home: build a rate limiter. Used token bucket algorithm with Redis. Took about 4 hours.', null, null, null, null, null, '2026-01-21T09:00:00Z'],
    ['cccccccc-0002-0006-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'process_status', null, null, null, null, null, null, 'Invited to next step', '2026-01-25T16:00:00Z'],
    ['cccccccc-0002-0007-0000-000000000000', 'aaaaaaaa-0002-0000-0000-000000000000', 'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-20T09:00:00Z'],
    // Netflix
    ['cccccccc-0003-0001-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'status_change',  'Moved to Applied', null, null, null, null, null, null, '2025-12-20T10:00:00Z'],
    ['cccccccc-0003-0002-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'status_change',  'Moved to Interviewing', null, null, null, null, null, null, '2025-12-22T14:00:00Z'],
    ['cccccccc-0003-0003-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'appointment',    'HR screen', 'Netflix culture values discussion. Role is on the streaming infrastructure team.', 'Tom Bradley', 'Talent Acquisition', null, '2025-12-22T15:00:00Z', null, '2025-12-22T15:45:00Z'],
    ['cccccccc-0003-0004-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'appointment',    'Technical screen', 'Algorithms + system design. Discussed designing a global CDN. Went really well.', null, null, null, '2026-01-05T16:00:00Z', null, '2026-01-05T18:00:00Z'],
    ['cccccccc-0003-0005-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'appointment',    'Onsite day', 'Four back-to-back sessions: two coding, system design (video streaming at scale), culture.', null, null, null, '2026-01-22T09:00:00Z', null, '2026-01-22T17:00:00Z'],
    ['cccccccc-0003-0006-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'status_change',  'Moved to Offer', null, null, null, null, null, null, '2026-01-28T15:00:00Z'],
    ['cccccccc-0003-0007-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'note',           'Offer details', 'Base: $285k, sign-on: $50k, equity: $800k over 4 years. Comparing with Google.', null, null, null, null, null, '2026-01-28T16:00:00Z'],
    ['cccccccc-0003-0008-0000-000000000000', 'aaaaaaaa-0003-0000-0000-000000000000', 'process_status', null, null, null, null, null, null, 'Negotiating', '2026-01-30T10:00:00Z'],
    // Meta
    ['cccccccc-0004-0001-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'status_change',  'Moved to Applied', null, null, null, null, null, null, '2025-12-05T10:00:00Z'],
    ['cccccccc-0004-0002-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'status_change',  'Moved to Interviewing', null, null, null, null, null, null, '2025-12-08T13:00:00Z'],
    ['cccccccc-0004-0003-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'appointment',    'Recruiter screen', 'Standard intro. Role is on the Ads infrastructure team.', 'Alex Kim', 'Technical Recruiter', null, '2025-12-08T14:00:00Z', null, '2025-12-08T14:30:00Z'],
    ['cccccccc-0004-0004-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'appointment',    'Coding round', 'Two hard LeetCode problems. Did not finish the second one in time.', null, null, null, '2025-12-15T15:00:00Z', null, '2025-12-15T16:00:00Z'],
    ['cccccccc-0004-0005-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'appointment',    'Onsite loop', 'Five rounds in one day. Felt the system design round was weak.', null, null, null, '2025-12-29T09:00:00Z', null, '2025-12-29T16:00:00Z'],
    ['cccccccc-0004-0006-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'status_change',  'Moved to Rejected', null, null, null, null, null, null, '2026-01-06T11:00:00Z'],
    ['cccccccc-0004-0007-0000-000000000000', 'aaaaaaaa-0004-0000-0000-000000000000', 'note',           'Rejection feedback', 'System design round did not meet the bar for E5. Will reapply in 6 months.', null, null, null, null, null, '2026-01-06T12:00:00Z'],
    // OpenAI
    ['cccccccc-0006-0001-0000-000000000000', 'aaaaaaaa-0006-0000-0000-000000000000', 'status_change',  'Moved to Applied', null, null, null, null, null, null, '2026-01-28T16:00:00Z'],
    ['cccccccc-0006-0002-0000-000000000000', 'aaaaaaaa-0006-0000-0000-000000000000', 'note',           'Application submitted', 'Applied for Senior SWE – Infrastructure. Referral from a former colleague.', null, null, null, null, null, '2026-01-28T16:30:00Z'],
    ['cccccccc-0006-0003-0000-000000000000', 'aaaaaaaa-0006-0000-0000-000000000000', 'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-01T09:00:00Z'],
    // Figma
    ['cccccccc-0007-0001-0000-000000000000', 'aaaaaaaa-0007-0000-0000-000000000000', 'status_change',  'Moved to Applied', null, null, null, null, null, null, '2025-11-15T10:00:00Z'],
    ['cccccccc-0007-0002-0000-000000000000', 'aaaaaaaa-0007-0000-0000-000000000000', 'status_change',  'Moved to Ghosted', null, null, null, null, null, null, '2025-12-20T09:00:00Z'],
    ['cccccccc-0007-0003-0000-000000000000', 'aaaaaaaa-0007-0000-0000-000000000000', 'note',           'No response', 'Applied 5 weeks ago. Sent a follow-up to the recruiter — still nothing.', null, null, null, null, null, '2025-12-20T09:30:00Z'],
    // Vercel
    ['cccccccc-0008-0001-0000-000000000000', 'aaaaaaaa-0008-0000-0000-000000000000', 'status_change',  'Moved to Applied', null, null, null, null, null, null, '2026-02-03T09:30:00Z'],
    ['cccccccc-0008-0002-0000-000000000000', 'aaaaaaaa-0008-0000-0000-000000000000', 'note',           'Application submitted', 'Applied for Staff Engineer role. Love the product, use it daily.', null, null, null, null, null, '2026-02-03T10:00:00Z'],
    ['cccccccc-0008-0003-0000-000000000000', 'aaaaaaaa-0008-0000-0000-000000000000', 'process_status', null, null, null, null, null, null, 'Waiting for update', '2026-02-03T10:00:00Z'],
  ];
  for (const e of events) insertEvent.run(...e);
});

seed();
db.close();

const companyCount = 9;
const stageCount = 15;
const eventCount = 41;
console.log(`Seeded: ${companyCount} companies, ${stageCount} interview stages, ${eventCount} timeline events`);
console.log('Run "npm run dev" to start the app.');
