import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { CompanyWithNextStep, KanbanBoard, ApplicationStatus } from '@/types';

const STATUSES: ApplicationStatus[] = [
  'Wishlist',
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Ghosted',
];

export async function GET() {
  // Fetch all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (companiesError) {
    return NextResponse.json({ error: companiesError.message }, { status: 500 });
  }

  if (!companies || companies.length === 0) {
    const empty = Object.fromEntries(STATUSES.map((s) => [s, []])) as KanbanBoard;
    return NextResponse.json(empty);
  }

  // Fetch the next pending stage for each company in a single query:
  // For each company, pick the first stage where is_completed = false, ordered by order_index.
  const companyIds = companies.map((c) => c.id);

  const { data: nextSteps, error: stagesError } = await supabase
    .from('interviews_roadmap')
    .select('company_id, stage_name, scheduled_date, order_index')
    .in('company_id', companyIds)
    .eq('is_completed', false)
    .order('order_index', { ascending: true });

  if (stagesError) {
    return NextResponse.json({ error: stagesError.message }, { status: 500 });
  }

  // Build a map: company_id → next pending stage (first one by order_index)
  const nextStepMap = new Map<string, { stage_name: string; scheduled_date: string | null }>();
  for (const stage of nextSteps ?? []) {
    if (!nextStepMap.has(stage.company_id)) {
      nextStepMap.set(stage.company_id, {
        stage_name: stage.stage_name,
        scheduled_date: stage.scheduled_date,
      });
    }
  }

  // Assemble enriched companies
  const enriched: CompanyWithNextStep[] = companies.map((company) => ({
    ...company,
    next_step: nextStepMap.get(company.id) ?? null,
  }));

  // Group by status into kanban columns
  const board = Object.fromEntries(STATUSES.map((s) => [s, []])) as KanbanBoard;
  for (const company of enriched) {
    board[company.status].push(company);
  }

  return NextResponse.json(board);
}
