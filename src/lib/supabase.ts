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
  tables: ('customers')[],
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

