export type VisitStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';

export interface PlannedStop {
  id: string; // unique uuid or timestamp
  customerId?: number | null;
  companyName: string;
  contactPerson?: string | null;
  phone?: string | null;
  province?: string | null;
  district?: string | null;
  address?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  plannedTime?: string | null; // e.g. "09:30"
  objective: string; // e.g. "สาธิตเครื่องกรองน้ำมัน LYJ-001-D", "นำเสนอแคตตาล็อก", "ส่งใบเสนอราคา"
  targetProduct?: string | null;
  status: VisitStatus;
  resultNote?: string | null; // summary after visit
  syncedActivityId?: number | null;
  createdAt: string;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  salesPersonName: string;
  notes?: string;
  stops: PlannedStop[];
  updatedAt: string;
}

export const VISIT_STATUS_CONFIG: Record<
  VisitStatus,
  { label: string; icon: string; color: string; bg: string; border: string; badgeBg: string }
> = {
  PLANNED: {
    label: 'รอดำเนินการ',
    icon: 'Clock',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  IN_PROGRESS: {
    label: 'กำลังเข้าพบ',
    icon: 'Car',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
  },
  COMPLETED: {
    label: 'เข้าพบเรียบร้อย',
    icon: 'CheckCircle2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  RESCHEDULED: {
    label: 'เลื่อนนัด',
    icon: 'CalendarClock',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    icon: 'XCircle',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

export const COMMON_OBJECTIVES = [
  'สาธิตเครื่องกรองน้ำมัน (Demo On-site)',
  'นำเสนอแคตตาล็อก & สำรวจหน้างาน',
  'ส่งมอบใบเสนอราคา & ปิดการขาย',
  'ตรวจเช็คเครื่องจักร & ติดตามผล',
  'ส่งมอบสินค้า & ฝึกอบรมการใช้งาน',
  'เข้าพบฝ่ายจัดซื้อ / ซ่อมบำรุง',
];
