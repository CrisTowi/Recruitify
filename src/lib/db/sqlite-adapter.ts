import Database from 'better-sqlite3';
import path from 'path';
import type {
  Company,
  CompanyWithNextStep,
  ApplicationStatus,
  InterestLevel,
  InterviewStage,
  TimelineEvent,
  TimelineEventType,
  ProcessStatusValue,
  CreateTimelineEventPayload,
  CompanyOffer,
  OfferExpectations,
  RemotePolicy,
  HealthTier,
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
      prep_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS interviews_roadmap (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      stage_name TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      scheduled_date TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      notes TEXT
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

    CREATE TABLE IF NOT EXISTS company_offers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
      base_salary INTEGER,
      currency TEXT NOT NULL DEFAULT 'USD',
      signing_bonus INTEGER,
      equity_value INTEGER,
      equity_vesting TEXT,
      bonus_pct REAL,
      pto_days INTEGER,
      remote_policy TEXT,
      health_tier TEXT,
      retirement_match_pct REAL,
      other_benefits TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS offer_expectations (
      id INTEGER PRIMARY KEY DEFAULT 1,
      base_salary INTEGER,
      currency TEXT NOT NULL DEFAULT 'USD',
      signing_bonus INTEGER,
      equity_value INTEGER,
      bonus_pct REAL,
      pto_days INTEGER,
      remote_policy TEXT,
      health_tier TEXT,
      retirement_match_pct REAL,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS google_tokens (
      id INTEGER PRIMARY KEY DEFAULT 1,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);

  // Column migrations for existing databases
  // ALTER TABLE ... ADD COLUMN is idempotent via try/catch (SQLite has no IF NOT EXISTS for columns)
  try { db.exec(`ALTER TABLE companies ADD COLUMN prep_notes TEXT`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE interviews_roadmap ADD COLUMN notes TEXT`); } catch { /* already exists */ }
}

// ── Raw row types returned by better-sqlite3 ──────────────────────────────────

interface CompanyRow {
  id: string;
  name: string;
  logo_url: string | null;
  status: string;
  interest_level: string | null;
  prep_notes: string | null;
  created_at: string;
}

interface InterviewsRoadmapRow {
  id: string;
  company_id: string;
  stage_name: string;
  is_completed: number;
  scheduled_date: string | null;
  order_index: number;
  notes: string | null;
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

interface OfferRow {
  id: string;
  company_id: string;
  base_salary: number | null;
  currency: string;
  signing_bonus: number | null;
  equity_value: number | null;
  equity_vesting: string | null;
  bonus_pct: number | null;
  pto_days: number | null;
  remote_policy: string | null;
  health_tier: string | null;
  retirement_match_pct: number | null;
  other_benefits: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface GoogleTokensRow {
  id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// ── Row-to-domain mappers ─────────────────────────────────────────────────────

function mapOffer(row: OfferRow): CompanyOffer {
  return {
    id: row.id,
    company_id: row.company_id,
    base_salary: row.base_salary,
    currency: row.currency,
    signing_bonus: row.signing_bonus,
    equity_value: row.equity_value,
    equity_vesting: row.equity_vesting,
    bonus_pct: row.bonus_pct,
    pto_days: row.pto_days,
    remote_policy: row.remote_policy as RemotePolicy | null,
    health_tier: row.health_tier as HealthTier | null,
    retirement_match_pct: row.retirement_match_pct,
    other_benefits: row.other_benefits,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    logo_url: row.logo_url,
    status: row.status as ApplicationStatus,
    interest_level: row.interest_level as InterestLevel | null,
    prep_notes: row.prep_notes,
    created_at: row.created_at,
  };
}

function mapStage(row: InterviewsRoadmapRow): InterviewStage {
  return {
    id: row.id,
    company_id: row.company_id,
    stage_name: row.stage_name,
    is_completed: row.is_completed === 1,
    scheduled_date: row.scheduled_date,
    order_index: row.order_index,
    notes: row.notes,
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
    data: { status?: ApplicationStatus; interest_level?: InterestLevel | null; prep_notes?: string | null },
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
    if ('prep_notes' in data) {
      setClauses.push('prep_notes = ?');
      values.push(data.prep_notes ?? null);
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

  // ── Interview Roadmap ─────────────────────────────────────────────────────────

  getRoadmap(companyId: string): Promise<InterviewStage[]> {
    const db = getDb();

    const rows = db
      .prepare<[string], InterviewsRoadmapRow>(
        `SELECT * FROM interviews_roadmap WHERE company_id = ? ORDER BY order_index ASC`,
      )
      .all(companyId);

    return Promise.resolve(rows.map(mapStage));
  }

  createStage(companyId: string, data: { stage_name: string; scheduled_date?: string | null }): Promise<InterviewStage> {
    const db = getDb();
    const id = crypto.randomUUID();

    const maxRow = db
      .prepare<[string], { max_order: number | null }>(
        `SELECT MAX(order_index) as max_order FROM interviews_roadmap WHERE company_id = ?`,
      )
      .get(companyId);

    const order_index = (maxRow?.max_order ?? -1) + 1;

    db.prepare(
      `INSERT INTO interviews_roadmap (id, company_id, stage_name, scheduled_date, order_index)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, companyId, data.stage_name, data.scheduled_date ?? null, order_index);

    const row = db
      .prepare<[string], InterviewsRoadmapRow>('SELECT * FROM interviews_roadmap WHERE id = ?')
      .get(id)!;

    return Promise.resolve(mapStage(row));
  }

  updateStage(
    companyId: string,
    stageId: string,
    data: { is_completed?: boolean; stage_name?: string; scheduled_date?: string | null; notes?: string | null },
  ): Promise<InterviewStage> {
    const db = getDb();
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.is_completed !== undefined) { setClauses.push('is_completed = ?'); values.push(data.is_completed ? 1 : 0); }
    if (data.stage_name !== undefined)   { setClauses.push('stage_name = ?');   values.push(data.stage_name); }
    if ('scheduled_date' in data)        { setClauses.push('scheduled_date = ?'); values.push(data.scheduled_date ?? null); }
    if ('notes' in data)                 { setClauses.push('notes = ?');          values.push(data.notes ?? null); }

    if (setClauses.length > 0) {
      values.push(stageId, companyId);
      db.prepare(
        `UPDATE interviews_roadmap SET ${setClauses.join(', ')} WHERE id = ? AND company_id = ?`,
      ).run(...values);
    }

    const row = db
      .prepare<[string, string], InterviewsRoadmapRow>(
        'SELECT * FROM interviews_roadmap WHERE id = ? AND company_id = ?',
      )
      .get(stageId, companyId)!;

    return Promise.resolve(mapStage(row));
  }

  deleteStage(companyId: string, stageId: string): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM interviews_roadmap WHERE id = ? AND company_id = ?').run(stageId, companyId);
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

  // ── Offers ───────────────────────────────────────────────────────────────────

  getOffer(companyId: string): Promise<CompanyOffer | null> {
    const db = getDb();
    const row = db
      .prepare<[string], OfferRow>('SELECT * FROM company_offers WHERE company_id = ?')
      .get(companyId);
    return Promise.resolve(row ? mapOffer(row) : null);
  }

  upsertOffer(
    companyId: string,
    data: Partial<Omit<CompanyOffer, 'id' | 'company_id' | 'created_at' | 'updated_at'>>,
  ): Promise<CompanyOffer> {
    const db = getDb();

    const existing = db
      .prepare<[string], OfferRow>('SELECT * FROM company_offers WHERE company_id = ?')
      .get(companyId);

    if (existing) {
      const fields = Object.keys(data) as (keyof typeof data)[];
      if (fields.length > 0) {
        const setClauses = fields.map((f) => `${f} = ?`);
        setClauses.push('updated_at = ?');
        const values = [...fields.map((f) => data[f] ?? null), new Date().toISOString(), existing.id, companyId];
        db.prepare(
          `UPDATE company_offers SET ${setClauses.join(', ')} WHERE id = ? AND company_id = ?`,
        ).run(...values);
      }
    } else {
      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO company_offers (
          id, company_id, base_salary, currency, signing_bonus, equity_value, equity_vesting,
          bonus_pct, pto_days, remote_policy, health_tier, retirement_match_pct, other_benefits, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id, companyId,
        data.base_salary ?? null,
        data.currency ?? 'USD',
        data.signing_bonus ?? null,
        data.equity_value ?? null,
        data.equity_vesting ?? null,
        data.bonus_pct ?? null,
        data.pto_days ?? null,
        data.remote_policy ?? null,
        data.health_tier ?? null,
        data.retirement_match_pct ?? null,
        data.other_benefits ?? null,
        data.notes ?? null,
      );
    }

    const row = db
      .prepare<[string], OfferRow>('SELECT * FROM company_offers WHERE company_id = ?')
      .get(companyId)!;

    return Promise.resolve(mapOffer(row));
  }

  // ── Offer expectations ────────────────────────────────────────────────────────

  getExpectations(): Promise<OfferExpectations | null> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM offer_expectations WHERE id = 1').get() as Record<string, unknown> | undefined;
    if (!row) return Promise.resolve(null);
    return Promise.resolve({
      base_salary: row.base_salary as number | null,
      currency: (row.currency as string) ?? 'USD',
      signing_bonus: row.signing_bonus as number | null,
      equity_value: row.equity_value as number | null,
      bonus_pct: row.bonus_pct as number | null,
      pto_days: row.pto_days as number | null,
      remote_policy: (row.remote_policy as RemotePolicy | null) ?? null,
      health_tier: (row.health_tier as HealthTier | null) ?? null,
      retirement_match_pct: row.retirement_match_pct as number | null,
    });
  }

  upsertExpectations(data: Partial<OfferExpectations>): Promise<OfferExpectations> {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM offer_expectations WHERE id = 1').get();

    const fields = ['base_salary', 'currency', 'signing_bonus', 'equity_value',
      'bonus_pct', 'pto_days', 'remote_policy', 'health_tier', 'retirement_match_pct'] as const;

    if (existing) {
      const setClauses = fields.filter((f) => f in data).map((f) => `${f} = ?`);
      setClauses.push('updated_at = ?');
      const values = [...fields.filter((f) => f in data).map((f) => (data as Record<string, unknown>)[f] ?? null), new Date().toISOString()];
      if (setClauses.length > 1) {
        db.prepare(`UPDATE offer_expectations SET ${setClauses.join(', ')} WHERE id = 1`).run(...values);
      }
    } else {
      db.prepare(
        `INSERT INTO offer_expectations (id, base_salary, currency, signing_bonus, equity_value,
           bonus_pct, pto_days, remote_policy, health_tier, retirement_match_pct)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        data.base_salary ?? null, data.currency ?? 'USD', data.signing_bonus ?? null,
        data.equity_value ?? null, data.bonus_pct ?? null, data.pto_days ?? null,
        data.remote_policy ?? null, data.health_tier ?? null, data.retirement_match_pct ?? null,
      );
    }

    return this.getExpectations() as Promise<OfferExpectations>;
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
