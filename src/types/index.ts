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
  created_at: string;
}

export interface InterviewStage {
  id: string;
  company_id: string;
  stage_name: string;
  is_completed: boolean;
  scheduled_date: string | null;
  order_index: number;
}

export interface Offer {
  id: string;
  company_id: string;
  base_salary: number;
  sign_on_bonus: number | null;
  equity_value: number | null;
  notes: string | null;
  created_at: string;
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
