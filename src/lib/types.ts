export type PipelineStage = 
  | 'lead_in'
  | 'contacted'
  | 'proposal_sent'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export interface StageInfo {
  id: PipelineStage;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const STAGES: StageInfo[] = [
  {
    id: 'lead_in',
    label: 'Lead เข้าใหม่ (Lead In)',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'ผู้สนใจใหม่ที่ยังไม่ได้เริ่มติดต่อพูดคุย'
  },
  {
    id: 'contacted',
    label: 'ติดต่อแล้ว (Contacted)',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'ติดต่อพูดคุยสอบถามความต้องการเบื้องต้นแล้ว'
  },
  {
    id: 'proposal_sent',
    label: 'เสนอราคา (Proposal Sent)',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'ส่งใบเสนอราคาหรือข้อเสนอให้ลูกค้าพิจารณา'
  },
  {
    id: 'negotiation',
    label: 'เจรจาต่อรอง (Negotiation)',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'อยู่ในขั้นตอนสรุปเงื่อนไขและเจรจาราคา'
  },
  {
    id: 'closed_won',
    label: 'ปิดการขายสำเร็จ (Closed Won)',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'ลูกค้าตกลงซื้อและทำสัญญาเรียบร้อย 🎉'
  },
  {
    id: 'closed_lost',
    label: 'ปิดการขายไม่สำเร็จ (Closed Lost)',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'ลูกค้ายกเลิกหรือไม่ตกลงซื้อ'
  }
];

export interface Customer {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  tags: string[];
  type: 'individual' | 'company';
  createdAt: string;
  avatarColor?: string;
}

export interface Deal {
  id: string;
  title: string;
  customerId: string;
  value: number;
  stage: PipelineStage;
  probability: number; // 0 - 100%
  expectedCloseDate: string;
  assignedTo: string;
  notes?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  unit: string;
  category: string;
  stock?: number;
}

export interface QuotationItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number; // percentage or fixed
  amount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  date: string;
  validUntil: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerAddress?: string;
  customerTaxId?: string;
  customerPhone?: string;
  customerEmail?: string;
  dealId?: string;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  vatRate: number; // e.g. 7
  vatAmount: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  notes?: string;
  terms?: string;
  salesPerson: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'task' | 'note';
  title: string;
  description?: string;
  customerId?: string;
  dealId?: string;
  dueDate?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}
