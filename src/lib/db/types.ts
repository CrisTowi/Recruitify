import type {
  Company,
  CompanyWithNextStep,
  ApplicationStatus,
  InterestLevel,
  InterviewStage,
  TimelineEvent,
  CreateTimelineEventPayload,
  CompanyOffer,
  OfferExpectations,
  AISettings,
  AISettingsInput,
  InterviewSession,
  InterviewSessionFull,
  SessionQuestion,
  CreateSessionInput,
  SessionFilters,
} from '@/types';

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export class DuplicateCalendarEventError extends Error {
  constructor() {
    super('This calendar event is already in the timeline.');
    this.name = 'DuplicateCalendarEventError';
  }
}

export interface DbAdapter {
  // ── Companies ─────────────────────────────────────────────────────────────
  getAllCompanies(): Promise<CompanyWithNextStep[]>;
  createCompany(data: {
    name: string;
    logo_url?: string | null;
    status: ApplicationStatus;
  }): Promise<Company>;
  updateCompany(
    id: string,
    data: { status?: ApplicationStatus; interest_level?: InterestLevel | null; prep_notes?: string | null },
  ): Promise<Company>;
  deleteCompany(id: string): Promise<void>;

  // ── Interview Roadmap ─────────────────────────────────────────────────────
  getRoadmap(companyId: string): Promise<InterviewStage[]>;
  createStage(companyId: string, data: { stage_name: string; scheduled_date?: string | null }): Promise<InterviewStage>;
  updateStage(companyId: string, stageId: string, data: { is_completed?: boolean; stage_name?: string; scheduled_date?: string | null; notes?: string | null }): Promise<InterviewStage>;
  deleteStage(companyId: string, stageId: string): Promise<void>;

  // ── Timeline ──────────────────────────────────────────────────────────────
  getTimeline(companyId: string): Promise<TimelineEvent[]>;
  /** Throws DuplicateCalendarEventError if calendar_event_id already exists for this company. */
  createTimelineEvent(
    companyId: string,
    payload: CreateTimelineEventPayload & { calendar_event_id?: string },
  ): Promise<TimelineEvent>;
  updateTimelineEvent(
    companyId: string,
    eventId: string,
    data: Record<string, unknown>,
  ): Promise<TimelineEvent>;

  // ── Offers ────────────────────────────────────────────────────────────────
  getOffer(companyId: string): Promise<CompanyOffer | null>;
  upsertOffer(companyId: string, data: Partial<Omit<CompanyOffer, 'id' | 'company_id' | 'created_at' | 'updated_at'>>): Promise<CompanyOffer>;

  // ── Offer expectations ────────────────────────────────────────────────────
  getExpectations(): Promise<OfferExpectations | null>;
  upsertExpectations(data: Partial<OfferExpectations>): Promise<OfferExpectations>;

  // ── Google Calendar tokens ────────────────────────────────────────────────
  getGoogleTokens(): Promise<GoogleTokens | null>;
  upsertGoogleTokens(tokens: GoogleTokens): Promise<void>;

  // ── Interview Sessions ────────────────────────────────────────────────────
  createSession(session: CreateSessionInput): Promise<InterviewSession>;
  getSession(sessionId: string): Promise<InterviewSession | null>;
  getSessionWithQuestions(sessionId: string): Promise<InterviewSessionFull | null>;
  listSessions(filters: SessionFilters): Promise<{ sessions: InterviewSession[]; total: number }>;
  updateSession(sessionId: string, updates: Partial<InterviewSession>): Promise<InterviewSession>;
  deleteSession(sessionId: string): Promise<void>;

  // ── Session Questions ─────────────────────────────────────────────────────
  createQuestion(question: { session_id: string; question_number: number; question_text: string }): Promise<SessionQuestion>;
  updateQuestion(questionId: string, updates: Partial<SessionQuestion>): Promise<SessionQuestion>;
  getSessionQuestions(sessionId: string): Promise<SessionQuestion[]>;

  // ── AI Settings ───────────────────────────────────────────────────────────
  getAISettings(userId?: string): Promise<AISettings | null>;
  upsertAISettings(userId: string | null, settings: AISettingsInput): Promise<AISettings>;
  /** Returns decrypted API keys for server-side use only. Never expose to client. */
  getDecryptedAIKeys(userId?: string): Promise<{ llm_api_key: string | null; tts_api_key: string | null; stt_api_key: string | null } | null>;
}
