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
  tax_id?: string | null;
  dbd_company_id?: number | null;
  registered_capital?: number | null;
  registered_name?: string | null;
  activities_count?: number;
  latest_activity?: CustomerActivity | null;
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
  { type: 'ส่งอีเมล', icon: 'Mail', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { type: 'โทรศัพท์', icon: 'Phone', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { type: 'เข้าพบโรงงาน', icon: 'Car', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { type: 'สาธิตเครื่อง (Demo)', icon: 'Sparkles', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { type: 'ส่งใบเสนอราคา', icon: 'FileText', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { type: 'ติดตามผล', icon: 'Clock', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { type: 'อื่นๆ', icon: 'MoreHorizontal', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
];

export const PIPELINE_STAGES: { stage: PipelineStage; color: string; bg: string; dot: string; border: string }[] = [
  { stage: 'ยังไม่ได้ติดต่อ', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400', border: 'border-slate-300' },
  { stage: 'ติดต่อแล้ว / ติดตามงาน', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500', border: 'border-amber-300' },
  { stage: 'นัดหมาย Demo On-site', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-300' },
  { stage: 'เสนอราคาแล้ว', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500', border: 'border-purple-300' },
  { stage: 'ปิดการขาย (สำเร็จ)', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', border: 'border-emerald-300' },
  { stage: 'ไม่สนใจ / ปิดการขายไม่ได้', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500', border: 'border-rose-300' },
];

export function getStageConfig(stage: string | null | undefined) {
  const found = PIPELINE_STAGES.find((s) => s.stage === stage);
  if (found) return found;
  return {
    stage: (stage || 'ยังไม่ได้ติดต่อ') as PipelineStage,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    dot: 'bg-slate-400',
    border: 'border-slate-300',
  };
}

