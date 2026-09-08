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

  // Fetch all activities to compute activity counts & latest activity for each customer
  try {
    const { data: activities, error: actError } = await supabase
      .from('customer_activities')
      .select('*')
      .order('activity_date', { ascending: false });

    if (!actError && activities && activities.length > 0) {
      const activityMap = new Map<number, { count: number; latest: any }>();
      for (const act of activities) {
        if (!activityMap.has(act.customer_id)) {
          activityMap.set(act.customer_id, { count: 1, latest: act });
        } else {
          const entry = activityMap.get(act.customer_id)!;
          entry.count += 1;
        }
      }

      all = all.map((c) => {
        const entry = activityMap.get(c.id);
        if (entry) {
          return {
            ...c,
            activities_count: entry.count,
            latest_activity: entry.latest,
            // If stage is default 'ยังไม่ได้ติดต่อ' but has activity, display as 'ติดต่อแล้ว / ติดตามงาน'
            pipeline_stage:
              c.pipeline_stage === 'ยังไม่ได้ติดต่อ' || !c.pipeline_stage
                ? 'ติดต่อแล้ว / ติดตามงาน'
                : c.pipeline_stage,
          };
        }
        return {
          ...c,
          activities_count: 0,
          latest_activity: null,
        };
      });
    }
  } catch (err) {
    console.warn('Could not fetch activities for customer summary:', err);
  }

  return all;
}

/**
 * Realtime subscription for Supabase tables
 */
export function subscribeToRealtimeChanges(
  tables: ('customers' | 'customer_activities')[],
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

