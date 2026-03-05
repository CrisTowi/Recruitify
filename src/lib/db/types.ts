import type {
  Company,
  CompanyWithNextStep,
  ApplicationStatus,
  InterestLevel,
  TimelineEvent,
  CreateTimelineEventPayload,
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
    data: { status?: ApplicationStatus; interest_level?: InterestLevel | null },
  ): Promise<Company>;
  deleteCompany(id: string): Promise<void>;

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

  // ── Google Calendar tokens ────────────────────────────────────────────────
  getGoogleTokens(): Promise<GoogleTokens | null>;
  upsertGoogleTokens(tokens: GoogleTokens): Promise<void>;
}
