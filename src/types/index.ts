// ─── Domain Types ────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'Wishlist'
  | 'Applied'
  | 'Interviewing'
  | 'Offer'
  | 'Rejected'
  | 'Ghosted';

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  status: ApplicationStatus;
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
