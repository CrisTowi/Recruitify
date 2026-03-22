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
import { encrypt, decrypt } from '@/lib/crypto';

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

  // ── Single-record lookups ────────────────────────────────────────────────────

  async getCompany(id: string): Promise<Company | null> {
    const { client } = await this.getClient();
    const { data } = await client.from('companies').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return data as Company;
  }

  async getStage(stageId: string): Promise<InterviewStage | null> {
    const { client } = await this.getClient();
    const { data } = await client.from('interviews_roadmap').select('*').eq('id', stageId).maybeSingle();
    if (!data) return null;
    return data as InterviewStage;
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

  // ── Interview Sessions ───────────────────────────────────────────────────────

  private parseJsonArray(value: unknown): string[] {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') { try { return JSON.parse(value) as string[]; } catch { return []; } }
    return [];
  }

  private mapSessionRow(row: Record<string, unknown>): InterviewSession {
    return {
      id: row.id as string,
      user_id: (row.user_id as string | null) ?? null,
      company_id: row.company_id as string,
      stage_id: row.stage_id as string,
      status: row.status as SessionStatus,
      feedback_mode: row.feedback_mode as FeedbackMode,
      num_questions: row.num_questions as number,
      interviewer_persona: (row.interviewer_persona as string | null) ?? null,
      difficulty: row.difficulty as Difficulty,
      focus_areas: this.parseJsonArray(row.focus_areas),
      overall_score: (row.overall_score as number | null) ?? null,
      debrief_summary: (row.debrief_summary as string | null) ?? null,
      debrief_strengths: this.parseJsonArray(row.debrief_strengths),
      debrief_improvements: this.parseJsonArray(row.debrief_improvements),
      debrief_resources: this.parseJsonArray(row.debrief_resources),
      started_at: (row.started_at as string | null) ?? null,
      completed_at: (row.completed_at as string | null) ?? null,
      created_at: row.created_at as string,
    };
  }

  private mapQuestionRow(row: Record<string, unknown>): SessionQuestion {
    return {
      id: row.id as string,
      session_id: row.session_id as string,
      question_number: row.question_number as number,
      question_text: row.question_text as string,
      answer_transcript: (row.answer_transcript as string | null) ?? null,
      score: (row.score as number | null) ?? null,
      feedback_strengths: (row.feedback_strengths as string | null) ?? null,
      feedback_improvements: (row.feedback_improvements as string | null) ?? null,
      feedback_suggested_answer: (row.feedback_suggested_answer as string | null) ?? null,
      duration_seconds: (row.duration_seconds as number | null) ?? null,
      created_at: row.created_at as string,
    };
  }

  async createSession(input: CreateSessionInput): Promise<InterviewSession> {
    const { client, userId } = await this.getClient();
    const row: Record<string, unknown> = {
      company_id: input.company_id,
      stage_id: input.stage_id,
      feedback_mode: input.feedback_mode,
      num_questions: input.num_questions,
      interviewer_persona: input.interviewer_persona ?? null,
      difficulty: input.difficulty,
      focus_areas: JSON.stringify(input.focus_areas ?? []),
    };
    if (getAuthEnabled() && userId) row.user_id = userId;

    const { data, error } = await client.from('interview_sessions').insert(row).select().single();
    if (error) throw new Error(error.message);
    return this.mapSessionRow(data as Record<string, unknown>);
  }

  async getSession(sessionId: string): Promise<InterviewSession | null> {
    const { client } = await this.getClient();
    const { data } = await client.from('interview_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (!data) return null;
    return this.mapSessionRow(data as Record<string, unknown>);
  }

  async getSessionWithQuestions(sessionId: string): Promise<InterviewSessionFull | null> {
    const { client } = await this.getClient();
    const { data: sessionData } = await client.from('interview_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (!sessionData) return null;
    const { data: questionData } = await client
      .from('session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_number', { ascending: true });
    const session = this.mapSessionRow(sessionData as Record<string, unknown>);
    const questions = (questionData ?? []).map((question) => this.mapQuestionRow(question as Record<string, unknown>));
    return { ...session, questions };
  }

  async listSessions(filters: SessionFilters): Promise<{ sessions: InterviewSession[]; total: number }> {
    const { client } = await this.getClient();
    let query = client.from('interview_sessions').select('*', { count: 'exact' });

    if (filters.company_id) query = query.eq('company_id', filters.company_id);
    if (filters.stage_id) query = query.eq('stage_id', filters.stage_id);
    if (filters.status) query = query.eq('status', filters.status);

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    return {
      sessions: (data ?? []).map((session) => this.mapSessionRow(session as Record<string, unknown>)),
      total: count ?? 0,
    };
  }

  async updateSession(sessionId: string, updates: Partial<InterviewSession>): Promise<InterviewSession> {
    const { client } = await this.getClient();
    const jsonFields = ['focus_areas', 'debrief_strengths', 'debrief_improvements', 'debrief_resources'] as const;
    const row: Record<string, unknown> = { ...updates };

    for (const field of jsonFields) {
      if (field in updates) {
        row[field] = JSON.stringify(updates[field] ?? []);
      }
    }

    const { data, error } = await client.from('interview_sessions').update(row).eq('id', sessionId).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Session not found');
    return this.mapSessionRow(data as Record<string, unknown>);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { client } = await this.getClient();
    const { error } = await client.from('interview_sessions').delete().eq('id', sessionId);
    if (error) throw new Error(error.message);
  }

  // ── Session Questions ────────────────────────────────────────────────────────

  async createQuestion(input: { session_id: string; question_number: number; question_text: string }): Promise<SessionQuestion> {
    const { client } = await this.getClient();
    const { data, error } = await client.from('session_questions').insert(input).select().single();
    if (error) throw new Error(error.message);
    return this.mapQuestionRow(data as Record<string, unknown>);
  }

  async updateQuestion(questionId: string, updates: Partial<SessionQuestion>): Promise<SessionQuestion> {
    const { client } = await this.getClient();
    const { data, error } = await client.from('session_questions').update(updates as Record<string, unknown>).eq('id', questionId).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Question not found');
    return this.mapQuestionRow(data as Record<string, unknown>);
  }

  async getSessionQuestions(sessionId: string): Promise<SessionQuestion[]> {
    const { client } = await this.getClient();
    const { data, error } = await client
      .from('session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_number', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((question) => this.mapQuestionRow(question as Record<string, unknown>));
  }

  // ── AI Settings ─────────────────────────────────────────────────────────────

  async getAISettings(userId?: string): Promise<AISettings | null> {
    const { client, userId: sessionUserId } = await this.getClient();
    const resolvedUserId = userId ?? sessionUserId;

    let query = client.from('ai_settings').select('*');

    if (getAuthEnabled() && resolvedUserId) {
      query = query.eq('user_id', resolvedUserId);
    } else {
      query = query.eq('id', 1);
    }

    const { data } = await query.maybeSingle();
    if (!data) return null;

    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      llm_provider: row.llm_provider as LLMProvider,
      llm_model: row.llm_model as string,
      has_llm_key: row.llm_api_key_encrypted !== null,
      tts_provider: (row.tts_provider as TTSProvider | null) ?? null,
      has_tts_key: row.tts_api_key_encrypted !== null,
      tts_voice_id: (row.tts_voice_id as string | null) ?? null,
      stt_provider: (row.stt_provider as STTProvider | null) ?? null,
      has_stt_key: row.stt_api_key_encrypted !== null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  async upsertAISettings(userId: string | null, settings: AISettingsInput): Promise<AISettings> {
    const { client, userId: sessionUserId } = await this.getClient();
    const resolvedUserId = userId ?? sessionUserId;

    // Fetch existing to preserve keys when not provided
    const existing = await this.getAISettings(resolvedUserId ?? undefined);

    const row: Record<string, unknown> = {
      llm_provider: settings.llm_provider,
      llm_model: settings.llm_model,
      tts_provider: settings.tts_provider ?? null,
      tts_voice_id: settings.tts_voice_id ?? null,
      stt_provider: settings.stt_provider ?? null,
      updated_at: new Date().toISOString(),
    };

    if (settings.llm_api_key != null) {
      row.llm_api_key_encrypted = encrypt(settings.llm_api_key);
    } else if (existing) {
      // Preserve existing key — don't overwrite with null
    }

    if (settings.tts_api_key != null) {
      row.tts_api_key_encrypted = encrypt(settings.tts_api_key);
    }

    if (settings.stt_api_key != null) {
      row.stt_api_key_encrypted = encrypt(settings.stt_api_key);
    }

    if (getAuthEnabled() && resolvedUserId) {
      row.user_id = resolvedUserId;
    } else {
      row.id = 1;
    }

    const { data: result, error } = await client
      .from('ai_settings')
      .upsert(row, { onConflict: getAuthEnabled() && resolvedUserId ? 'user_id' : 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const saved = result as Record<string, unknown>;
    return {
      id: String(saved.id),
      llm_provider: saved.llm_provider as LLMProvider,
      llm_model: saved.llm_model as string,
      has_llm_key: saved.llm_api_key_encrypted !== null,
      tts_provider: (saved.tts_provider as TTSProvider | null) ?? null,
      has_tts_key: saved.tts_api_key_encrypted !== null,
      tts_voice_id: (saved.tts_voice_id as string | null) ?? null,
      stt_provider: (saved.stt_provider as STTProvider | null) ?? null,
      has_stt_key: saved.stt_api_key_encrypted !== null,
      created_at: saved.created_at as string,
      updated_at: saved.updated_at as string,
    };
  }

  /** Decrypt API keys for server-side use only. Never send to client. */
  async getDecryptedAIKeys(userId?: string): Promise<{ llm_api_key: string | null; tts_api_key: string | null; stt_api_key: string | null } | null> {
    const { client, userId: sessionUserId } = await this.getClient();
    const resolvedUserId = userId ?? sessionUserId;

    let query = client.from('ai_settings').select('llm_api_key_encrypted, tts_api_key_encrypted, stt_api_key_encrypted');

    if (getAuthEnabled() && resolvedUserId) {
      query = query.eq('user_id', resolvedUserId);
    } else {
      query = query.eq('id', 1);
    }

    const { data } = await query.maybeSingle();
    if (!data) return null;

    const row = data as Record<string, string | null>;
    return {
      llm_api_key: row.llm_api_key_encrypted ? decrypt(row.llm_api_key_encrypted) : null,
      tts_api_key: row.tts_api_key_encrypted ? decrypt(row.tts_api_key_encrypted) : null,
      stt_api_key: row.stt_api_key_encrypted ? decrypt(row.stt_api_key_encrypted) : null,
    };
  }
}
