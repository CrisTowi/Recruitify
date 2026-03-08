// ─── Domain Types ────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'Wishlist'
  | 'Applied'
  | 'Interviewing'
  | 'Offer'
  | 'Rejected'
  | 'Ghosted';

export type InterestLevel = 'Excited' | 'Interested' | 'Meh' | 'Not interested';

export const INTEREST_LEVELS: { value: InterestLevel; emoji: string }[] = [
  { value: 'Excited',      emoji: '🔥' },
  { value: 'Interested',   emoji: '⭐' },
  { value: 'Meh',          emoji: '😐' },
  { value: 'Not interested', emoji: '👎' },
];

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  status: ApplicationStatus;
  interest_level: InterestLevel | null;
  prep_notes: string | null;
  created_at: string;
}

export interface InterviewStage {
  id: string;
  company_id: string;
  stage_name: string;
  is_completed: boolean;
  scheduled_date: string | null;
  order_index: number;
  notes: string | null;
}

export type RemotePolicy = 'Remote' | 'Hybrid' | 'On-site';
export type HealthTier = 'None' | 'Basic' | 'Premium';
export const REMOTE_POLICIES: RemotePolicy[] = ['Remote', 'Hybrid', 'On-site'];
export const HEALTH_TIERS: HealthTier[] = ['None', 'Basic', 'Premium'];

// Ordinal rank for comparison (higher = better)
export const REMOTE_RANK: Record<RemotePolicy, number> = { 'Remote': 3, 'Hybrid': 2, 'On-site': 1 };
export const HEALTH_RANK: Record<HealthTier, number> = { 'Premium': 3, 'Basic': 2, 'None': 1 };

export interface OfferExpectations {
  base_salary: number | null;
  currency: string;
  signing_bonus: number | null;
  equity_value: number | null;
  bonus_pct: number | null;
  pto_days: number | null;
  remote_policy: RemotePolicy | null;
  health_tier: HealthTier | null;
  retirement_match_pct: number | null;
}

export interface CompanyOffer {
  id: string;
  company_id: string;
  base_salary: number | null;
  currency: string;
  signing_bonus: number | null;
  equity_value: number | null;
  equity_vesting: string | null;
  bonus_pct: number | null;
  pto_days: number | null;
  remote_policy: RemotePolicy | null;
  health_tier: HealthTier | null;
  retirement_match_pct: number | null;
  other_benefits: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

/** Company with its next pending interview stage, returned by GET /api/companies */
export interface CompanyWithNextStep extends Company {
  next_step: Pick<InterviewStage, 'stage_name' | 'scheduled_date'> | null;
}

/** Kanban columns keyed by status */
export type KanbanBoard = Record<ApplicationStatus, CompanyWithNextStep[]>;

// ─── Drag-and-Drop Data Types ─────────────────────────────────────────────────

export interface DraggableCardData {
  type: 'card';
  company: CompanyWithNextStep;
}

export interface DroppableColumnData {
  type: 'column';
  status: ApplicationStatus;
}

// ─── Timeline Types ───────────────────────────────────────────────────────────

export type TimelineEventType = 'note' | 'contact' | 'appointment' | 'process_status' | 'status_change';

export type ProcessStatusValue =
  | 'Waiting for update'
  | 'Invited to next step'
  | 'Idle'
  | 'Offer pending'
  | 'Negotiating'
  | 'Background check'
  | 'References requested';

export const PROCESS_STATUS_VALUES: ProcessStatusValue[] = [
  'Waiting for update',
  'Invited to next step',
  'Idle',
  'Offer pending',
  'Negotiating',
  'Background check',
  'References requested',
];

export interface TimelineEvent {
  id: string;
  company_id: string;
  event_type: TimelineEventType;
  created_at: string;
  title: string | null;
  body: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  scheduled_at: string | null;
  process_status: ProcessStatusValue | null;
}

export interface CreateTimelineEventPayload {
  event_type: TimelineEventType;
  title?: string;
  body?: string;
  contact_name?: string;
  contact_role?: string;
  contact_email?: string;
  scheduled_at?: string;
  process_status?: ProcessStatusValue;
}

// ─── Calendar Types ───────────────────────────────────────────────────────────

export interface CalendarMatch {
  calendar_event_id: string;
  title: string;
  scheduled_at: string | null;
  description: string | null;
}
