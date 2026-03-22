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
  AISettings,
  AISettingsInput,
  LLMProvider,
  TTSProvider,
  STTProvider,
  InterviewSession,
  InterviewSessionFull,
  SessionQuestion,
  CreateSessionInput,
  SessionFilters,
  SessionStatus,
  FeedbackMode,
  Difficulty,
} from '@/types';
import type { DbAdapter, GoogleTokens } from './types';
import { DuplicateCalendarEventError } from './types';
import { encrypt, decrypt } from '@/lib/crypto';

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

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      stage_id TEXT NOT NULL REFERENCES interviews_roadmap(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'configuring',
      feedback_mode TEXT NOT NULL DEFAULT 'immediate',
      num_questions INTEGER NOT NULL DEFAULT 5,
      interviewer_persona TEXT,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      focus_areas TEXT NOT NULL DEFAULT '[]',
      overall_score REAL,
      debrief_summary TEXT,
      debrief_strengths TEXT NOT NULL DEFAULT '[]',
      debrief_improvements TEXT NOT NULL DEFAULT '[]',
      debrief_resources TEXT NOT NULL DEFAULT '[]',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS session_questions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      answer_transcript TEXT,
      score REAL,
      feedback_strengths TEXT,
      feedback_improvements TEXT,
      feedback_suggested_answer TEXT,
      duration_seconds INTEGER,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      llm_provider TEXT NOT NULL DEFAULT 'openai',
      llm_model TEXT NOT NULL DEFAULT 'gpt-4o',
      llm_api_key_encrypted TEXT,
      tts_provider TEXT,
      tts_api_key_encrypted TEXT,
      tts_voice_id TEXT,
      stt_provider TEXT,
      stt_api_key_encrypted TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
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

interface AISettingsRow {
  id: number;
  llm_provider: string;
  llm_model: string;
  llm_api_key_encrypted: string | null;
  tts_provider: string | null;
  tts_api_key_encrypted: string | null;
  tts_voice_id: string | null;
  stt_provider: string | null;
  stt_api_key_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

interface InterviewSessionRow {
  id: string;
  user_id: string | null;
  company_id: string;
  stage_id: string;
  status: string;
  feedback_mode: string;
  num_questions: number;
  interviewer_persona: string | null;
  difficulty: string;
  focus_areas: string;
  overall_score: number | null;
  debrief_summary: string | null;
  debrief_strengths: string;
  debrief_improvements: string;
  debrief_resources: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface SessionQuestionRow {
  id: string;
  session_id: string;
  question_number: number;
  question_text: string;
  answer_transcript: string | null;
  score: number | null;
  feedback_strengths: string | null;
  feedback_improvements: string | null;
  feedback_suggested_answer: string | null;
  duration_seconds: number | null;
  created_at: string;
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

function parseJsonArray(value: string): string[] {
  try { return JSON.parse(value) as string[]; } catch { return []; }
}

function mapSession(row: InterviewSessionRow): InterviewSession {
  return {
    id: row.id,
    user_id: row.user_id,
    company_id: row.company_id,
    stage_id: row.stage_id,
    status: row.status as SessionStatus,
    feedback_mode: row.feedback_mode as FeedbackMode,
    num_questions: row.num_questions,
    interviewer_persona: row.interviewer_persona,
    difficulty: row.difficulty as Difficulty,
    focus_areas: parseJsonArray(row.focus_areas),
    overall_score: row.overall_score,
    debrief_summary: row.debrief_summary,
    debrief_strengths: parseJsonArray(row.debrief_strengths),
    debrief_improvements: parseJsonArray(row.debrief_improvements),
    debrief_resources: parseJsonArray(row.debrief_resources),
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
  };
}

function mapQuestion(row: SessionQuestionRow): SessionQuestion {
  return {
    id: row.id,
    session_id: row.session_id,
    question_number: row.question_number,
    question_text: row.question_text,
    answer_transcript: row.answer_transcript,
    score: row.score,
    feedback_strengths: row.feedback_strengths,
    feedback_improvements: row.feedback_improvements,
    feedback_suggested_answer: row.feedback_suggested_answer,
    duration_seconds: row.duration_seconds,
    created_at: row.created_at,
  };
}

function mapAISettings(row: AISettingsRow): AISettings {
  return {
    id: String(row.id),
    llm_provider: row.llm_provider as LLMProvider,
    llm_model: row.llm_model,
    has_llm_key: row.llm_api_key_encrypted !== null,
    tts_provider: row.tts_provider as TTSProvider | null,
    has_tts_key: row.tts_api_key_encrypted !== null,
    tts_voice_id: row.tts_voice_id,
    stt_provider: row.stt_provider as STTProvider | null,
    has_stt_key: row.stt_api_key_encrypted !== null,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
        const setClauses = fields.map((field) => `${field} = ?`);
        setClauses.push('updated_at = ?');
        const values = [...fields.map((field) => data[field] ?? null), new Date().toISOString(), existing.id, companyId];
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
      const setClauses = fields.filter((field) => field in data).map((field) => `${field} = ?`);
      setClauses.push('updated_at = ?');
      const values = [...fields.filter((field) => field in data).map((field) => (data as Record<string, unknown>)[field] ?? null), new Date().toISOString()];
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

  // ── Interview Sessions ────────────────────────────────────────────────────────

  createSession(input: CreateSessionInput): Promise<InterviewSession> {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO interview_sessions (
         id, company_id, stage_id, feedback_mode, num_questions,
         interviewer_persona, difficulty, focus_areas
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.company_id,
      input.stage_id,
      input.feedback_mode,
      input.num_questions,
      input.interviewer_persona ?? null,
      input.difficulty,
      JSON.stringify(input.focus_areas ?? []),
    );
    const row = db.prepare<[string], InterviewSessionRow>('SELECT * FROM interview_sessions WHERE id = ?').get(id)!;
    return Promise.resolve(mapSession(row));
  }

  getSession(sessionId: string): Promise<InterviewSession | null> {
    const db = getDb();
    const row = db.prepare<[string], InterviewSessionRow>('SELECT * FROM interview_sessions WHERE id = ?').get(sessionId);
    return Promise.resolve(row ? mapSession(row) : null);
  }

  getSessionWithQuestions(sessionId: string): Promise<InterviewSessionFull | null> {
    const db = getDb();
    const sessionRow = db.prepare<[string], InterviewSessionRow>('SELECT * FROM interview_sessions WHERE id = ?').get(sessionId);
    if (!sessionRow) return Promise.resolve(null);
    const questionRows = db.prepare<[string], SessionQuestionRow>(
      'SELECT * FROM session_questions WHERE session_id = ? ORDER BY question_number ASC',
    ).all(sessionId);
    return Promise.resolve({ ...mapSession(sessionRow), questions: questionRows.map(mapQuestion) });
  }

  listSessions(filters: SessionFilters): Promise<{ sessions: InterviewSession[]; total: number }> {
    const db = getDb();
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.company_id) { conditions.push('company_id = ?'); values.push(filters.company_id); }
    if (filters.stage_id) { conditions.push('stage_id = ?'); values.push(filters.stage_id); }
    if (filters.status) { conditions.push('status = ?'); values.push(filters.status); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = (db.prepare(`SELECT COUNT(*) as count FROM interview_sessions ${where}`).get(...values) as { count: number }).count;

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    const rows = db.prepare<unknown[], InterviewSessionRow>(
      `SELECT * FROM interview_sessions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...values, limit, offset);

    return Promise.resolve({ sessions: rows.map(mapSession), total });
  }

  updateSession(sessionId: string, updates: Partial<InterviewSession>): Promise<InterviewSession> {
    const db = getDb();
    const allowed = [
      'status', 'feedback_mode', 'num_questions', 'interviewer_persona', 'difficulty',
      'overall_score', 'debrief_summary', 'started_at', 'completed_at',
    ] as const;
    const jsonFields = ['focus_areas', 'debrief_strengths', 'debrief_improvements', 'debrief_resources'] as const;

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const field of allowed) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push((updates as Record<string, unknown>)[field] ?? null);
      }
    }
    for (const field of jsonFields) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push(JSON.stringify((updates as Record<string, unknown>)[field] ?? []));
      }
    }

    if (setClauses.length > 0) {
      db.prepare(`UPDATE interview_sessions SET ${setClauses.join(', ')} WHERE id = ?`).run(...values, sessionId);
    }

    const row = db.prepare<[string], InterviewSessionRow>('SELECT * FROM interview_sessions WHERE id = ?').get(sessionId);
    if (!row) throw new Error('Session not found');
    return Promise.resolve(mapSession(row));
  }

  deleteSession(sessionId: string): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM interview_sessions WHERE id = ?').run(sessionId);
    return Promise.resolve();
  }

  // ── Session Questions ─────────────────────────────────────────────────────────

  createQuestion(input: { session_id: string; question_number: number; question_text: string }): Promise<SessionQuestion> {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO session_questions (id, session_id, question_number, question_text) VALUES (?, ?, ?, ?)`,
    ).run(id, input.session_id, input.question_number, input.question_text);
    const row = db.prepare<[string], SessionQuestionRow>('SELECT * FROM session_questions WHERE id = ?').get(id)!;
    return Promise.resolve(mapQuestion(row));
  }

  updateQuestion(questionId: string, updates: Partial<SessionQuestion>): Promise<SessionQuestion> {
    const db = getDb();
    const allowed = [
      'answer_transcript', 'score', 'feedback_strengths', 'feedback_improvements',
      'feedback_suggested_answer', 'duration_seconds',
    ] as const;

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const field of allowed) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push((updates as Record<string, unknown>)[field] ?? null);
      }
    }

    if (setClauses.length > 0) {
      db.prepare(`UPDATE session_questions SET ${setClauses.join(', ')} WHERE id = ?`).run(...values, questionId);
    }

    const row = db.prepare<[string], SessionQuestionRow>('SELECT * FROM session_questions WHERE id = ?').get(questionId);
    if (!row) throw new Error('Question not found');
    return Promise.resolve(mapQuestion(row));
  }

  getSessionQuestions(sessionId: string): Promise<SessionQuestion[]> {
    const db = getDb();
    const rows = db.prepare<[string], SessionQuestionRow>(
      'SELECT * FROM session_questions WHERE session_id = ? ORDER BY question_number ASC',
    ).all(sessionId);
    return Promise.resolve(rows.map(mapQuestion));
  }

  // ── AI Settings ──────────────────────────────────────────────────────────────

  getAISettings(_userId?: string): Promise<AISettings | null> {
    const db = getDb();
    const row = db.prepare<[], AISettingsRow>('SELECT * FROM ai_settings WHERE id = 1').get();
    if (!row) return Promise.resolve(null);
    return Promise.resolve(mapAISettings(row));
  }

  upsertAISettings(_userId: string | null, settings: AISettingsInput): Promise<AISettings> {
    const db = getDb();
    const existing = db.prepare<[], AISettingsRow>('SELECT * FROM ai_settings WHERE id = 1').get();

    const now = new Date().toISOString();

    if (existing) {
      const setClauses: string[] = [
        'llm_provider = ?',
        'llm_model = ?',
        'tts_provider = ?',
        'tts_voice_id = ?',
        'stt_provider = ?',
        'updated_at = ?',
      ];
      const values: unknown[] = [
        settings.llm_provider,
        settings.llm_model,
        settings.tts_provider ?? null,
        settings.tts_voice_id ?? null,
        settings.stt_provider ?? null,
        now,
      ];

      if (settings.llm_api_key != null) {
        setClauses.push('llm_api_key_encrypted = ?');
        values.push(encrypt(settings.llm_api_key));
      }
      if (settings.tts_api_key != null) {
        setClauses.push('tts_api_key_encrypted = ?');
        values.push(encrypt(settings.tts_api_key));
      }
      if (settings.stt_api_key != null) {
        setClauses.push('stt_api_key_encrypted = ?');
        values.push(encrypt(settings.stt_api_key));
      }

      db.prepare(`UPDATE ai_settings SET ${setClauses.join(', ')} WHERE id = 1`).run(...values);
    } else {
      db.prepare(
        `INSERT INTO ai_settings (id, llm_provider, llm_model, llm_api_key_encrypted,
           tts_provider, tts_api_key_encrypted, tts_voice_id, stt_provider, stt_api_key_encrypted)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        settings.llm_provider,
        settings.llm_model,
        settings.llm_api_key ? encrypt(settings.llm_api_key) : null,
        settings.tts_provider ?? null,
        settings.tts_api_key ? encrypt(settings.tts_api_key) : null,
        settings.tts_voice_id ?? null,
        settings.stt_provider ?? null,
        settings.stt_api_key ? encrypt(settings.stt_api_key) : null,
      );
    }

    const row = db.prepare<[], AISettingsRow>('SELECT * FROM ai_settings WHERE id = 1').get()!;
    return Promise.resolve(mapAISettings(row));
  }

  getDecryptedAIKeys(_userId?: string): Promise<{ llm_api_key: string | null; tts_api_key: string | null; stt_api_key: string | null } | null> {
    const db = getDb();
    const row = db.prepare<[], AISettingsRow>('SELECT * FROM ai_settings WHERE id = 1').get();
    if (!row) return Promise.resolve(null);
    return Promise.resolve({
      llm_api_key: row.llm_api_key_encrypted ? decrypt(row.llm_api_key_encrypted) : null,
      tts_api_key: row.tts_api_key_encrypted ? decrypt(row.tts_api_key_encrypted) : null,
      stt_api_key: row.stt_api_key_encrypted ? decrypt(row.stt_api_key_encrypted) : null,
    });
  }
}
