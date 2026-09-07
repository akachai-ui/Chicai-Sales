import { createClient } from '@supabase/supabase-js';
import { Customer } from '@/types/customer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfgeuuweayziojpkcif.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch all customer records bypassing Supabase PostgREST default 1,000 limit
 */
export async function fetchAllCustomers(): Promise<Customer[]> {
  let all: Customer[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

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

