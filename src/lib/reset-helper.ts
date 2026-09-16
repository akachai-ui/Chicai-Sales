import { supabase } from '@/lib/supabase';
import { clearAllPortfolioCustomerIds } from '@/lib/portfolio-storage';
import { clearAllDailyPlans } from '@/lib/planner-storage';

export async function resetAllCrmAndPlannerData(): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Clear LocalStorage
    clearAllPortfolioCustomerIds();
    clearAllDailyPlans();
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
      } catch (e) {
        console.error('LocalStorage clear error:', e);
      }
    }

    // 2. Delete all customer_activities from Supabase
    const { error: actError } = await supabase
      .from('customer_activities')
      .delete()
      .neq('id', 0);

    if (actError) {
      console.warn('Note on deleting customer_activities:', actError.message);
    }

    // 3. Reset customers table pipeline stages
    const { data: changedCustomers } = await supabase
      .from('customers')
      .select('id')
      .neq('pipeline_stage', 'ยังไม่ได้ติดต่อ');

    if (changedCustomers && changedCustomers.length > 0) {
      for (const cust of changedCustomers) {
        await supabase
          .from('customers')
          .update({
            pipeline_stage: 'ยังไม่ได้ติดต่อ',
            contact_person: null,
            target_product: null,
            notes: null,
          })
          .eq('id', cust.id);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Reset error:', err);
    return { success: false, error: err.message };
  }
}
