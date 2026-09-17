export type PipelineStage =
  | 'ยังไม่ได้ติดต่อ'
  | 'ติดต่อแล้ว / ติดตามงาน'
  | 'นัดหมาย Demo On-site'
  | 'เสนอราคาแล้ว'
  | 'ปิดการขาย (สำเร็จ)'
  | 'ไม่สนใจ / ปิดการขายไม่ได้';

export interface Customer {
  id: number;
  seq: number | null;
  name: string;
  phone: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  website: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  review_count: number | null;
  business_type: string | null;
  operating_status: string | null;
  place_id: string | null;
  pipeline_stage: PipelineStage | string;
  contact_person: string | null;
  target_product: string | null;
  contact_result: string | null;
  notes: string | null;
  email: string | null;
  source_type?: 'CUSTOMERS' | 'DBD' | string;
  source_id?: number | null;
  tax_id?: string | null;
  dbd_company_id?: number | null;
  registered_capital?: number | null;
  registered_name?: string | null;
  pin_type?: 'GOOGLE_BUSINESS' | 'DBD_ADDRESS' | string | null;
  activities_count?: number;
  latest_activity?: CustomerActivity | null;
  created_at?: string;
  updated_at?: string;
}

export interface MyCustomer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  google_maps_url: string | null;
  pipeline_stage: PipelineStage | string;
  contact_person: string | null;
  target_product: string | null;
  notes: string | null;
  tax_id?: string | null;
  registered_capital?: number | null;
  source_type: 'CUSTOMERS' | 'DBD' | string;
  source_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerActivity {
  id: number;
  customer_id: number;
  activity_type: string;
  activity_date: string;
  contact_person: string | null;
  details: string;
  next_action_date: string | null;
  next_action_note: string | null;
  created_at?: string;
}

export const ACTIVITY_TYPES = [
  { type: 'Send Email', icon: 'Mail', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { type: 'Phone Call', icon: 'Phone', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { type: 'Factory Visit', icon: 'Car', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { type: 'Machine Demo', icon: 'Sparkles', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { type: 'Quotation', icon: 'FileText', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { type: 'Follow-up', icon: 'Clock', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { type: 'Other', icon: 'MoreHorizontal', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
];

export const PIPELINE_STAGE_LABELS: Record<string, string> = {
  'ยังไม่ได้ติดต่อ': 'Uncontacted',
  'ติดต่อแล้ว / ติดตามงาน': 'Contacted / Follow-up',
  'นัดหมาย Demo On-site': 'Demo Scheduled',
  'เสนอราคาแล้ว': 'Quotation Sent',
  'ปิดการขาย (สำเร็จ)': 'Deal Won / Closed',
  'ไม่สนใจ / ปิดการขายไม่ได้': 'Lost / Not Interested',
  'ALL': 'All Stages',
};

export function getStageDisplayLabel(stage: string | null | undefined): string {
  if (!stage) return 'Uncontacted';
  return PIPELINE_STAGE_LABELS[stage] || stage;
}

export const PIPELINE_STAGES: { stage: PipelineStage; label: string; color: string; bg: string; dot: string; border: string }[] = [
  { stage: 'ยังไม่ได้ติดต่อ', label: 'Uncontacted', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400', border: 'border-slate-300' },
  { stage: 'ติดต่อแล้ว / ติดตามงาน', label: 'Contacted / In Progress', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500', border: 'border-amber-300' },
  { stage: 'นัดหมาย Demo On-site', label: 'Demo Scheduled', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-300' },
  { stage: 'เสนอราคาแล้ว', label: 'Quotation Sent', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500', border: 'border-purple-300' },
  { stage: 'ปิดการขาย (สำเร็จ)', label: 'Closed / Won', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', border: 'border-emerald-300' },
  { stage: 'ไม่สนใจ / ปิดการขายไม่ได้', label: 'Lost / Closed', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500', border: 'border-rose-300' },
];

export function getStageConfig(stage: string | null | undefined) {
  const found = PIPELINE_STAGES.find((s) => s.stage === stage);
  if (found) return found;
  return {
    stage: (stage || 'ยังไม่ได้ติดต่อ') as PipelineStage,
    label: getStageDisplayLabel(stage),
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    dot: 'bg-slate-400',
    border: 'border-slate-300',
  };
}

export interface DBDCompany {
  id: number;
  tax_id: string | null;
  name: string;
  registered_date: string | null;
  registered_capital: number | null;
  tsic_code: string | null;
  objective: string | null;
  address: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  zipcode: string | null;
  industry_group: string | null;
  batch_year: number | null;
  batch_month: number | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  email?: string | null;
  google_maps_url: string | null;
  place_id: string | null;
  pin_type?: 'GOOGLE_BUSINESS' | 'DBD_ADDRESS' | string | null;
  geocoded_at: string | null;
  // Computed in UI
  is_in_crm?: boolean;
  crm_customer_id?: number | null;
}
