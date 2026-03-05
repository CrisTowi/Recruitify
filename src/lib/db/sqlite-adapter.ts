import Database from 'better-sqlite3';
import path from 'path';
import type {
  Company,
  CompanyWithNextStep,
  ApplicationStatus,
  InterestLevel,
  TimelineEvent,
  TimelineEventType,
  ProcessStatusValue,
  CreateTimelineEventPayload,
} from '@/types';
import type { DbAdapter, GoogleTokens } from './types';
import { DuplicateCalendarEventError } from './types';

// ── Singleton DB instance ──────────────────────────────────────────────────────

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = process.env.SQLITE_PATH
    ? path.resolve(process.env.SQLITE_PATH)
    : path.join(process.cwd(), 'recruitify.db');

  _db = new Database(dbPath);

  // Enable WAL mode and foreign keys
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);

  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      status TEXT NOT NULL DEFAULT 'Wishlist',
      interest_level TEXT,
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

    CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_event
      ON timeline_events(company_id, calendar_event_id)
      WHERE calendar_event_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS google_tokens (
      id INTEGER PRIMARY KEY DEFAULT 1,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);
}

// ── Raw row types returned by better-sqlite3 ──────────────────────────────────

interface CompanyRow {
  id: string;
  name: string;
  logo_url: string | null;
  status: string;
  interest_level: string | null;
  created_at: string;
}

interface InterviewsRoadmapRow {
  id: string;
  company_id: string;
  stage_name: string;
  is_completed: number;
  scheduled_date: string | null;
  order_index: number;
}

interface TimelineEventRow {
  id: string;
  company_id: string;
  event_type: string;
  created_at: string;
  title: string | null;
  body: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  scheduled_at: string | null;
  process_status: string | null;
  calendar_event_id: string | null;
}

interface GoogleTokensRow {
  id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// ── Row-to-domain mappers ─────────────────────────────────────────────────────

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    logo_url: row.logo_url,
    status: row.status as ApplicationStatus,
    interest_level: row.interest_level as InterestLevel | null,
    created_at: row.created_at,
  };
}

function mapTimelineEvent(row: TimelineEventRow): TimelineEvent {
  return {
    id: row.id,
    company_id: row.company_id,
    event_type: row.event_type as TimelineEventType,
    created_at: row.created_at,
    title: row.title,
    body: row.body,
    contact_name: row.contact_name,
    contact_role: row.contact_role,
    contact_email: row.contact_email,
    scheduled_at: row.scheduled_at,
    process_status: row.process_status as ProcessStatusValue | null,
  };
}

// ── SqliteAdapter ─────────────────────────────────────────────────────────────

export class SqliteAdapter implements DbAdapter {
  // ── Companies ───────────────────────────────────────────────────────────────

  getAllCompanies(): Promise<CompanyWithNextStep[]> {
    const db = getDb();

    const companies = db
      .prepare<[], CompanyRow>('SELECT * FROM companies ORDER BY created_at DESC')
      .all();

    const nextStepStmt = db.prepare<[string], InterviewsRoadmapRow>(
      `SELECT * FROM interviews_roadmap
       WHERE company_id = ? AND is_completed = 0
       ORDER BY order_index ASC
       LIMIT 1`,
    );

    const result: CompanyWithNextStep[] = companies.map((row) => {
      const nextStepRow = nextStepStmt.get(row.id);
      return {
        ...mapCompany(row),
        next_step: nextStepRow
          ? {
              stage_name: nextStepRow.stage_name,
              scheduled_date: nextStepRow.scheduled_date,
            }
          : null,
      };
    });

    return Promise.resolve(result);
  }

  createCompany(data: {
    name: string;
    logo_url?: string | null;
    status: ApplicationStatus;
  }): Promise<Company> {
    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO companies (id, name, logo_url, status)
       VALUES (?, ?, ?, ?)`,
    ).run(id, data.name, data.logo_url ?? null, data.status);

    const row = db
      .prepare<[string], CompanyRow>('SELECT * FROM companies WHERE id = ?')
      .get(id)!;

    return Promise.resolve(mapCompany(row));
  }

  updateCompany(
    id: string,
    data: { status?: ApplicationStatus; interest_level?: InterestLevel | null },
  ): Promise<Company> {
    const db = getDb();

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.status !== undefined) {
      setClauses.push('status = ?');
      values.push(data.status);
    }
    if ('interest_level' in data) {
      setClauses.push('interest_level = ?');
      values.push(data.interest_level ?? null);
    }

    if (setClauses.length > 0) {
      values.push(id);
      db.prepare(`UPDATE companies SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = db
      .prepare<[string], CompanyRow>('SELECT * FROM companies WHERE id = ?')
      .get(id)!;

    return Promise.resolve(mapCompany(row));
  }

  deleteCompany(id: string): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM companies WHERE id = ?').run(id);
    return Promise.resolve();
  }

  // ── Timeline ─────────────────────────────────────────────────────────────────

  getTimeline(companyId: string): Promise<TimelineEvent[]> {
    const db = getDb();

    const rows = db
      .prepare<[string], TimelineEventRow>(
        `SELECT * FROM timeline_events WHERE company_id = ? ORDER BY created_at DESC`,
      )
      .all(companyId);

    return Promise.resolve(rows.map(mapTimelineEvent));
  }

  createTimelineEvent(
    companyId: string,
    payload: CreateTimelineEventPayload & { calendar_event_id?: string },
  ): Promise<TimelineEvent> {
    const db = getDb();

    // Check for duplicate calendar_event_id for this company
    if (payload.calendar_event_id) {
      const existing = db
        .prepare<[string, string], { id: string }>(
          `SELECT id FROM timeline_events WHERE company_id = ? AND calendar_event_id = ?`,
        )
        .get(companyId, payload.calendar_event_id);

      if (existing) {
        throw new DuplicateCalendarEventError();
      }
    }

    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO timeline_events (
        id, company_id, event_type, title, body,
        contact_name, contact_role, contact_email,
        scheduled_at, process_status, calendar_event_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      companyId,
      payload.event_type,
      payload.title ?? null,
      payload.body ?? null,
      payload.contact_name ?? null,
      payload.contact_role ?? null,
      payload.contact_email ?? null,
      payload.scheduled_at ?? null,
      payload.process_status ?? null,
      payload.calendar_event_id ?? null,
    );

    const row = db
      .prepare<[string], TimelineEventRow>('SELECT * FROM timeline_events WHERE id = ?')
      .get(id)!;

    return Promise.resolve(mapTimelineEvent(row));
  }

  updateTimelineEvent(
    companyId: string,
    eventId: string,
    data: Record<string, unknown>,
  ): Promise<TimelineEvent> {
    const db = getDb();

    const allowedFields = [
      'event_type',
      'title',
      'body',
      'contact_name',
      'contact_role',
      'contact_email',
      'scheduled_at',
      'process_status',
      'calendar_event_id',
    ];

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const key of allowedFields) {
      if (key in data) {
        setClauses.push(`${key} = ?`);
        values.push(data[key] ?? null);
      }
    }

    if (setClauses.length > 0) {
      values.push(eventId, companyId);
      db.prepare(
        `UPDATE timeline_events SET ${setClauses.join(', ')} WHERE id = ? AND company_id = ?`,
      ).run(...values);
    }

    const row = db
      .prepare<[string, string], TimelineEventRow>(
        'SELECT * FROM timeline_events WHERE id = ? AND company_id = ?',
      )
      .get(eventId, companyId)!;

    return Promise.resolve(mapTimelineEvent(row));
  }

  // ── Google Calendar tokens ───────────────────────────────────────────────────

  getGoogleTokens(): Promise<GoogleTokens | null> {
    const db = getDb();

    const row = db
      .prepare<[], GoogleTokensRow>('SELECT * FROM google_tokens WHERE id = 1')
      .get();

    if (!row) return Promise.resolve(null);

    return Promise.resolve({
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      expires_at: row.expires_at,
    });
  }

  upsertGoogleTokens(tokens: GoogleTokens): Promise<void> {
    const db = getDb();

    db.prepare(
      `INSERT OR REPLACE INTO google_tokens (id, access_token, refresh_token, expires_at)
       VALUES (1, ?, ?, ?)`,
    ).run(tokens.access_token, tokens.refresh_token, tokens.expires_at);

    return Promise.resolve();
  }
}
