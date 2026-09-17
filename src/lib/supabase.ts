import { createClient } from '@supabase/supabase-js';
import { Customer } from '@/types/customer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfgeuuweayziojpkcif.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch all customer records bypassing Supabase PostgREST default 1,000 limit
 * and attaches customer activity metadata (count and latest activity)
 */
export async function fetchAllCustomers(): Promise<Customer[]> {
  let all: Customer[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  // Fetch customers
  while (hasMore) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      all = all.concat(data as Customer[]);
      if (data.length < batchSize) {
        hasMore = false;
      } else {
        from += batchSize;
      }
    } else {
      hasMore = false;
    }
  }

  return all;
}

/**
 * Realtime subscription for Supabase tables
 */
export function subscribeToRealtimeChanges(
  tables: ('customers' | 'my_customers' | 'sales_plans' | 'sales_plan_items' | string)[],
  callback: (payload: { table: string; eventType: string; new: any; old: any }) => void
) {
  const channelName = `realtime-changes-${Math.random().toString(36).substring(2, 9)}`;
  let channel = supabase.channel(channelName);

  tables.forEach((table) => {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      (payload) => {
        callback({
          table,
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      }
    );
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[Supabase Realtime] Subscribed to ${tables.join(', ')}`);
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch all DBD companies with valid coordinates in Samut Prakan
 */
export async function fetchAllDbdCompanies(): Promise<any[]> {
  let all: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('dbd_companies')
      .select('*')
      .eq('province', 'สมุทรปราการ')
      .eq('industry_group', 'โรงงานอุตสาหกรรมการผลิต')
      .not('latitude', 'is', null)
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('Error fetching DBD companies for map:', error);
      break;
    }

    if (data && data.length > 0) {
      all = all.concat(data);
      if (data.length < batchSize) {
        hasMore = false;
      } else {
        from += batchSize;
      }
    } else {
      hasMore = false;
    }
  }

  return all;
}

/**
 * Fetch all records from my_customers table
 */
export async function fetchMyCustomers(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('my_customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my_customers:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('fetchMyCustomers exception:', err);
    return [];
  }
}

/**
 * Fetch a sales plan for a specific date including its items and customer data
 */
export async function fetchSalesPlanByDate(dateStr: string): Promise<any | null> {
  try {
    const { data: plan, error: planErr } = await supabase
      .from('sales_plans')
      .select('*')
      .eq('plan_date', dateStr)
      .maybeSingle();

    if (planErr && planErr.code !== 'PGRST116') {
      console.error('Error fetching sales plan:', planErr);
      return null;
    }

    if (!plan) return null;

    // Fetch items with joined my_customers
    const { data: items, error: itemsErr } = await supabase
      .from('sales_plan_items')
      .select('*, customer:my_customers(*)')
      .eq('plan_id', plan.id)
      .order('sequence_order', { ascending: true });

    if (itemsErr) {
      console.error('Error fetching sales plan items:', itemsErr);
    }

    return {
      ...plan,
      items: items || [],
    };
  } catch (err) {
    console.error('fetchSalesPlanByDate exception:', err);
    return null;
  }
}

/**
 * Fetch counts of planned items grouped by date for a date range (for calendar badge display)
 */
export async function fetchPlansInRange(startDate: string, endDate: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('sales_plans')
      .select('plan_date, items:sales_plan_items(count)')
      .gte('plan_date', startDate)
      .lte('plan_date', endDate);

    if (error) {
      console.error('Error fetching plans in range:', error);
      return {};
    }

    const map: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const count = row.items?.[0]?.count || 0;
      map[row.plan_date] = count;
    });
    return map;
  } catch (err) {
    console.error('fetchPlansInRange exception:', err);
    return {};
  }
}

/**
 * Fetch full sales plans with items and customer details for a date range (for Multi-Day / Weekly A4 reports)
 */
export async function fetchFullSalesPlansInRange(startDate: string, endDate: string): Promise<any[]> {
  try {
    const { data: plans, error: plansErr } = await supabase
      .from('sales_plans')
      .select('*')
      .gte('plan_date', startDate)
      .lte('plan_date', endDate)
      .order('plan_date', { ascending: true });

    if (plansErr) {
      console.error('Error fetching plans in range:', plansErr);
      return [];
    }

    if (!plans || plans.length === 0) return [];

    const planIds = plans.map((p) => p.id);
    const { data: items, error: itemsErr } = await supabase
      .from('sales_plan_items')
      .select('*, customer:my_customers(*)')
      .in('plan_id', planIds)
      .order('sequence_order', { ascending: true });

    if (itemsErr) {
      console.error('Error fetching items for multi-day plans:', itemsErr);
    }

    // Group items by plan_id
    const itemsByPlanId: Record<number, any[]> = {};
    (items || []).forEach((it) => {
      if (!itemsByPlanId[it.plan_id]) itemsByPlanId[it.plan_id] = [];
      itemsByPlanId[it.plan_id].push(it);
    });

    return plans.map((p) => ({
      ...p,
      items: itemsByPlanId[p.id] || [],
    }));
  } catch (err) {
    console.error('fetchFullSalesPlansInRange exception:', err);
    return [];
  }
}

/**
 * Fetch all planned customer IDs with their scheduled plan dates
 * Returns Record<my_customer_id, string[]> e.g. { 1: ['2026-09-21'], 2: ['2026-09-22'] }
 */
export async function fetchPlannedCustomerDates(): Promise<Record<number, string[]>> {
  try {
    const { data, error } = await supabase
      .from('sales_plan_items')
      .select('my_customer_id, plan:sales_plans(plan_date)')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching planned customer dates:', error);
      return {};
    }

    const map: Record<number, string[]> = {};
    (data || []).forEach((row: any) => {
      const custId = row.my_customer_id;
      const planDate = row.plan?.plan_date;
      if (custId && planDate) {
        if (!map[custId]) map[custId] = [];
        if (!map[custId].includes(planDate)) {
          map[custId].push(planDate);
        }
      }
    });
    return map;
  } catch (err) {
    console.error('fetchPlannedCustomerDates exception:', err);
    return {};
  }
}

/**
 * Upsert or create a sales plan header
 */
export async function upsertSalesPlan(planData: {
  plan_date: string;
  title?: string | null;
  target_zone?: string | null;
  daily_goal?: string | null;
  status?: string;
}): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('sales_plans')
      .upsert(
        {
          ...planData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'plan_date' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting sales plan:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('upsertSalesPlan exception:', err);
    return null;
  }
}

/**
 * Add an item to a sales plan
 */
export async function addSalesPlanItem(itemData: {
  plan_id: number;
  my_customer_id: number;
  sequence_order?: number;
  scheduled_time?: string | null;
  activity_type?: string;
  objective?: string | null;
  contact_person?: string | null;
}): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('sales_plan_items')
      .insert({
        ...itemData,
        sequence_order: itemData.sequence_order || 1,
        activity_type: itemData.activity_type || 'VISIT',
        status: 'PENDING',
      })
      .select('*, customer:my_customers(*)')
      .single();

    if (error) {
      console.error('Error adding sales plan item:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('addSalesPlanItem exception:', err);
    return null;
  }
}

/**
 * Update an item in a sales plan
 */
export async function updateSalesPlanItem(
  itemId: number,
  updates: Partial<{
    sequence_order: number;
    scheduled_time: string | null;
    activity_type: string;
    objective: string | null;
    contact_person: string | null;
    status: string;
  }>
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('sales_plan_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select('*, customer:my_customers(*)')
      .single();

    if (error) {
      console.error('Error updating sales plan item:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('updateSalesPlanItem exception:', err);
    return null;
  }
}

/**
 * Delete an item from a sales plan
 */
export async function deleteSalesPlanItem(itemId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sales_plan_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting sales plan item:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteSalesPlanItem exception:', err);
    return false;
  }
}

// ----------------------------------------------------
// Sales Visit Reports CRUD
// ----------------------------------------------------

/**
 * Fetch a visit report linked to a specific plan item
 */
export async function fetchVisitReportByPlanItem(planItemId: number): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('sales_visit_reports')
      .select('*')
      .eq('plan_item_id', planItemId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching visit report by plan item:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('fetchVisitReportByPlanItem exception:', err);
    return null;
  }
}

/**
 * Fetch all visit reports for a customer in portfolio
 */
export async function fetchVisitReportsByCustomer(customerId: number): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('sales_visit_reports')
      .select('*')
      .eq('customer_id', customerId)
      .order('visit_date', { ascending: false });

    if (error) {
      console.error('Error fetching visit reports by customer:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('fetchVisitReportsByCustomer exception:', err);
    return [];
  }
}

/**
 * Helper to sanitize time input (e.g. '09.00' -> '09:00:00', '09:00' -> '09:00:00' or null if invalid)
 */
function sanitizeTime(timeStr: any): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim().replace('.', ':');
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(:(\d{2}))?$/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    const ss = match[4] || '00';
    return `${hh}:${mm}:${ss}`;
  }
  return null;
}

/**
 * Upsert (Create or Update) a sales visit report
 */
export async function upsertVisitReport(report: any): Promise<any | null> {
  try {
    const isEdit = Boolean(report.id);
    let query = supabase.from('sales_visit_reports');

    // Sanitize time and date fields
    const sanitizedPayload = {
      ...report,
      start_time: sanitizeTime(report.start_time),
      end_time: sanitizeTime(report.end_time),
      next_followup_time: sanitizeTime(report.next_followup_time),
      project_start_date: report.project_start_date || null,
      next_followup_date: report.next_followup_date || null,
      review_date: report.review_date || null,
    };

    let res;
    if (isEdit) {
      res = await query
        .update({
          ...sanitizedPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id)
        .select()
        .single();
    } else {
      res = await query
        .insert({
          ...sanitizedPayload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (res.error) {
      console.error('Error upserting visit report:', res.error);
      throw new Error(res.error.message || 'Database error while saving visit report.');
    }

    // If plan_item_id is present, automatically mark plan item status as COMPLETED
    if (report.plan_item_id) {
      await supabase
        .from('sales_plan_items')
        .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
        .eq('id', report.plan_item_id);
    }

    // Auto-sync new contact details back to the master customer profile
    if (report.customer_id) {
      const updates: any = {};
      if (sanitizedPayload.contact_person) updates.contact_person = sanitizedPayload.contact_person;
      if (sanitizedPayload.phone) updates.phone = sanitizedPayload.phone;
      if (sanitizedPayload.email_line) updates.email = sanitizedPayload.email_line;
      if (sanitizedPayload.brand_interest) updates.target_product = sanitizedPayload.brand_interest;

      // Ensure at least one field to update
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const syncRes = await supabase
          .from('my_customers')
          .update(updates)
          .eq('id', report.customer_id);

        if (syncRes.error) {
          console.warn('Auto-sync to my_customers failed:', syncRes.error);
        }
      }
    }

    return res.data;
  } catch (err: any) {
    console.error('upsertVisitReport exception:', err);
    throw err;
  }
}

/**
 * Fetch a specific visit report by ID
 */
export async function fetchVisitReportById(reportId: number): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('sales_visit_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching visit report by ID:', error);
    }
    return data || null;
  } catch (err: any) {
    console.error('fetchVisitReportById exception:', err);
    return null;
  }
}

/**
 * Update the weekly objective (stored in Monday's plan)
 */
