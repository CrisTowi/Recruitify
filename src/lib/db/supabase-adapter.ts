import type { SupabaseClient } from '@supabase/supabase-js';
import type { DbAdapter, GoogleTokens } from './types';
import { DuplicateCalendarEventError } from './types';
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
} from '@/types';

function getAuthEnabled(): boolean {
  return process.env.SUPABASE_AUTH === 'true';
}

async function buildClient(req?: Request): Promise<{ client: SupabaseClient; userId: string | null }> {
  if (getAuthEnabled() && req) {
    const { createServerClient } = await import('@supabase/ssr');

    const cookieHeader = req.headers.get('cookie') ?? '';

    // Parse cookie string into a map
    const cookieMap = new Map<string, string>();
    for (const part of cookieHeader.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k) cookieMap.set(k.trim(), decodeURIComponent(rest.join('=')));
    }

    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value }));
          },
          setAll() {
            // No-op: we cannot set cookies from a server-side adapter with no response object
          },
        },
      },
    );

    const { data: { user } } = await client.auth.getUser();
    return { client, userId: user?.id ?? null };
  }

  // No-auth mode: use the shared anon client
  const { supabase } = await import('@/lib/supabase');
  return { client: supabase, userId: null };
}

export class SupabaseAdapter implements DbAdapter {
  private clientPromise: Promise<{ client: SupabaseClient; userId: string | null }>;

  constructor(req?: Request) {
    this.clientPromise = buildClient(req);
  }

  private async getClient(): Promise<{ client: SupabaseClient; userId: string | null }> {
    return this.clientPromise;
  }

  // ── Companies ───────────────────────────────────────────────────────────────

  async getAllCompanies(): Promise<CompanyWithNextStep[]> {
    const { client } = await this.getClient();

    const { data: companies, error: companiesError } = await client
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (companiesError) {
      throw new Error(companiesError.message);
    }

    if (!companies || companies.length === 0) {
      return [];
    }

    const companyIds = companies.map((c: Company) => c.id);

    const { data: nextSteps, error: stagesError } = await client
      .from('interviews_roadmap')
      .select('company_id, stage_name, scheduled_date, order_index')
      .in('company_id', companyIds)
      .eq('is_completed', false)
      .order('order_index', { ascending: true });

    if (stagesError) {
      throw new Error(stagesError.message);
    }

    // Build a map: company_id → first pending stage (by order_index)
    const nextStepMap = new Map<string, { stage_name: string; scheduled_date: string | null }>();
    for (const stage of nextSteps ?? []) {
      if (!nextStepMap.has(stage.company_id)) {
        nextStepMap.set(stage.company_id, {
          stage_name: stage.stage_name,
          scheduled_date: stage.scheduled_date,
        });
      }
    }

    const enriched: CompanyWithNextStep[] = companies.map((company: Company) => ({
      ...company,
      next_step: nextStepMap.get(company.id) ?? null,
    }));

    return enriched;
  }

  async createCompany(data: {
    name: string;
    logo_url?: string | null;
    status: ApplicationStatus;
  }): Promise<Company> {
    const { client, userId } = await this.getClient();

    const row: Record<string, unknown> = {
      name: data.name,
      logo_url: data.logo_url ?? null,
      status: data.status,
    };

    if (getAuthEnabled() && userId) {
      row.user_id = userId;
    }

    const { data: created, error } = await client
      .from('companies')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as Company;
  }

  async updateCompany(
    id: string,
    data: { status?: ApplicationStatus; interest_level?: InterestLevel | null; prep_notes?: string | null },
  ): Promise<Company> {
    const { client } = await this.getClient();

    const { data: updated, error } = await client
      .from('companies')
      .update(data as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!updated) throw new Error('Not found');
    return updated as Company;
  }

  async deleteCompany(id: string): Promise<void> {
    const { client } = await this.getClient();

    const { error } = await client
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // ── Interview Roadmap ────────────────────────────────────────────────────────

  async getRoadmap(companyId: string): Promise<InterviewStage[]> {
    const { client } = await this.getClient();

    const { data, error } = await client
      .from('interviews_roadmap')
      .select('*')
      .eq('company_id', companyId)
      .order('order_index', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as InterviewStage[];
  }

  async createStage(companyId: string, data: { stage_name: string; scheduled_date?: string | null }): Promise<InterviewStage> {
    const { client } = await this.getClient();

    const { data: maxData } = await client
      .from('interviews_roadmap')
      .select('order_index')
      .eq('company_id', companyId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const order_index = (maxData?.order_index ?? -1) + 1;

    const { data: created, error } = await client
      .from('interviews_roadmap')
      .insert({ company_id: companyId, stage_name: data.stage_name, scheduled_date: data.scheduled_date ?? null, order_index })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as InterviewStage;
  }

  async updateStage(
    companyId: string,
    stageId: string,
    data: { is_completed?: boolean; stage_name?: string; scheduled_date?: string | null; notes?: string | null },
  ): Promise<InterviewStage> {
    const { client } = await this.getClient();

    const { data: updated, error } = await client
      .from('interviews_roadmap')
      .update(data as Record<string, unknown>)
      .eq('id', stageId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!updated) throw new Error('Not found');
    return updated as InterviewStage;
  }

  async deleteStage(companyId: string, stageId: string): Promise<void> {
    const { client } = await this.getClient();

    const { error } = await client
      .from('interviews_roadmap')
      .delete()
      .eq('id', stageId)
      .eq('company_id', companyId);

    if (error) throw new Error(error.message);
  }

  // ── Timeline ────────────────────────────────────────────────────────────────

  async getTimeline(companyId: string): Promise<TimelineEvent[]> {
    const { client } = await this.getClient();

    const { data, error } = await client
      .from('timeline_events')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as TimelineEvent[];
  }

  async createTimelineEvent(
    companyId: string,
    payload: CreateTimelineEventPayload & { calendar_event_id?: string },
  ): Promise<TimelineEvent> {
    const { client, userId } = await this.getClient();

    // Deduplicate by calendar_event_id (per company)
    if (payload.calendar_event_id) {
      const { data: existing } = await client
        .from('timeline_events')
        .select('id')
        .eq('company_id', companyId)
        .eq('calendar_event_id', payload.calendar_event_id)
        .maybeSingle();

      if (existing) {
        throw new DuplicateCalendarEventError();
      }
    }

    const row: Record<string, unknown> = {
      company_id: companyId,
      event_type: payload.event_type,
    };

    if (getAuthEnabled() && userId) {
      row.user_id = userId;
    }

    if (payload.calendar_event_id) row.calendar_event_id = payload.calendar_event_id;
    if (payload.title !== undefined) row.title = payload.title ?? null;
    if (payload.body !== undefined) row.body = payload.body ?? null;
    if (payload.contact_name !== undefined) row.contact_name = payload.contact_name ?? null;
    if (payload.contact_role !== undefined) row.contact_role = payload.contact_role ?? null;
    if (payload.contact_email !== undefined) row.contact_email = payload.contact_email ?? null;
    if (payload.scheduled_at !== undefined) row.scheduled_at = payload.scheduled_at ?? null;
    if (payload.process_status !== undefined) row.process_status = payload.process_status ?? null;

    const { data, error } = await client
      .from('timeline_events')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as TimelineEvent;
  }

  async updateTimelineEvent(
    companyId: string,
    eventId: string,
    data: Record<string, unknown>,
  ): Promise<TimelineEvent> {
    const { client } = await this.getClient();

    const { data: updated, error } = await client
      .from('timeline_events')
      .update(data)
      .eq('id', eventId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!updated) throw new Error('Not found');
    return updated as TimelineEvent;
  }

  // ── Offers ──────────────────────────────────────────────────────────────────

  async getOffer(companyId: string): Promise<CompanyOffer | null> {
    const { client } = await this.getClient();
    const { data } = await client
      .from('company_offers')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();
    return (data as CompanyOffer | null) ?? null;
  }

  async upsertOffer(
    companyId: string,
    data: Partial<Omit<CompanyOffer, 'id' | 'company_id' | 'created_at' | 'updated_at'>>,
  ): Promise<CompanyOffer> {
    const { client } = await this.getClient();
    const row = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
    const { data: result, error } = await client
      .from('company_offers')
      .upsert(row, { onConflict: 'company_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as CompanyOffer;
  }

  // ── Offer expectations ───────────────────────────────────────────────────────

  async getExpectations(): Promise<OfferExpectations | null> {
    const { client, userId } = await this.getClient();
    let query = client.from('offer_expectations').select('*');
    if (getAuthEnabled() && userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('id', 1);
    }
    const { data } = await query.maybeSingle();
    return (data as OfferExpectations | null) ?? null;
  }

  async upsertExpectations(data: Partial<OfferExpectations>): Promise<OfferExpectations> {
    const { client, userId } = await this.getClient();
    const row: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
    if (getAuthEnabled() && userId) {
      row.user_id = userId;
    } else {
      row.id = 1;
    }
    const { data: result, error } = await client
      .from('offer_expectations')
      .upsert(row, { onConflict: getAuthEnabled() && userId ? 'user_id' : 'id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as OfferExpectations;
  }

  // ── Google Calendar tokens ──────────────────────────────────────────────────

  async getGoogleTokens(): Promise<GoogleTokens | null> {
    const { client, userId } = await this.getClient();

    let query = client
      .from('google_tokens')
      .select('access_token, refresh_token, expires_at');

    if (getAuthEnabled() && userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('id', 1);
    }

    const { data } = await query.single();
    return data ?? null;
  }

  async upsertGoogleTokens(tokens: GoogleTokens): Promise<void> {
    const { client, userId } = await this.getClient();

    const row: Record<string, unknown> = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
    };

    if (getAuthEnabled() && userId) {
      row.user_id = userId;
    } else {
      row.id = 1;
    }

    await client.from('google_tokens').upsert(row);
  }
}
