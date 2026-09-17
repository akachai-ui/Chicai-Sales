import { MyCustomer } from './customer';

export type PlanActivityType = 'VISIT' | 'DEMO' | 'CALL' | 'QUOTATION' | 'FOLLOWUP';

export interface PlanActivityConfig {
  type: PlanActivityType;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

export const PLAN_ACTIVITY_CONFIGS: Record<PlanActivityType, PlanActivityConfig> = {
  VISIT: {
    type: 'VISIT',
    label: 'On-site Visit',
    emoji: '🚗',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  DEMO: {
    type: 'DEMO',
    label: 'On-site Demo',
    emoji: '🔬',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  CALL: {
    type: 'CALL',
    label: 'Phone Call',
    emoji: '📞',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  QUOTATION: {
    type: 'QUOTATION',
    label: 'Quotation / Deal',
    emoji: '📄',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  FOLLOWUP: {
    type: 'FOLLOWUP',
    label: 'Follow-up',
    emoji: '🔄',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
};

export interface SalesPlanItem {
  id: number;
  plan_id: number;
  my_customer_id: number;
  sequence_order: number;
  scheduled_time: string | null;
  activity_type: PlanActivityType | string;
  objective: string | null;
  contact_person: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | string;
  created_at?: string;
  updated_at?: string;
  customer?: MyCustomer;
}

export interface SalesPlan {
  id: number;
  plan_date: string; // YYYY-MM-DD
  title: string | null;
  target_zone: string | null;
  daily_goal: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | string;
  created_at?: string;
  updated_at?: string;
  items?: SalesPlanItem[];
}
