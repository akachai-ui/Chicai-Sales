export interface CompetitorItem {
  brand: string;
  price: string;
  condition: string;
}

export interface NextActionItem {
  description: string;
  responsibility: string;
  action_plan: string;
}

export interface SalesVisitReport {
  id?: number;
  customer_id: number | null;
  plan_item_id?: number | null;

  // 1. Visit Info
  visit_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  sales_name: string;
  company_name: string;
  location: string | null;
  contact_person: string | null;
  position: string | null;
  phone: string | null;
  email_line: string | null;
  visit_type: string;

  // 2. Objective
  objective: string | null;

  // 3. Project / Product Description
  project_name: string | null;
  project_type: string | null;
  project_start_date: string | null;
  project_place: string | null;
  brand_interest: string | null;
  project_budget: number | null;
  project_note: string | null;

  // 4. Summary & Customer Needs
  customer_needs_summary: string | null;

  // 5. Competitors
  competitors: CompetitorItem[];

  // 6. Next Action
  next_actions: NextActionItem[];

  // 7. Next Follow-up
  next_followup_date: string | null;
  next_followup_time: string | null;
  next_followup_note: string | null;

  // Signatures
  sales_signature_name: string | null;
  manager_signature_name: string | null;
  review_date: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | string;

  created_at?: string;
  updated_at?: string;
}
