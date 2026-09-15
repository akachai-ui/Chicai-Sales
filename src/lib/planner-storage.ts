import { DailyPlan, PlannedStop } from '@/types/planner';
import { Customer } from '@/types/customer';

const STORAGE_PREFIX = 'CHICAI_DAILY_PLAN_';
const SALES_PERSON_KEY = 'CHICAI_SALES_PERSON_NAME';

export function getSavedSalesPersonName(): string {
  if (typeof window === 'undefined') return 'อัครชัย (Chicai Sales)';
  return localStorage.getItem(SALES_PERSON_KEY) || 'อัครชัย (Chicai Sales)';
}

export function saveSalesPersonName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SALES_PERSON_KEY, name.trim());
}

export function getDailyPlan(dateStr: string): DailyPlan {
  if (typeof window === 'undefined') {
    return {
      date: dateStr,
      salesPersonName: 'อัครชัย (Chicai Sales)',
      stops: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateStr}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing daily plan:', e);
    }
  }

  return {
    date: dateStr,
    salesPersonName: getSavedSalesPersonName(),
    stops: [],
    updatedAt: new Date().toISOString(),
  };
}

export function saveDailyPlan(plan: DailyPlan): void {
  if (typeof window === 'undefined') return;
  const updatedPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(`${STORAGE_PREFIX}${plan.date}`, JSON.stringify(updatedPlan));
}

// Add a customer to today's plan
export function addCustomerToDailyPlan(
  customer: Customer,
  dateStr: string = new Date().toISOString().split('T')[0],
  objective: string = 'สาธิตเครื่องกรองน้ำมัน (Demo On-site)'
): { success: boolean; isDuplicate: boolean; plan: DailyPlan } {
  const plan = getDailyPlan(dateStr);

  const isExisting = plan.stops.some((s) => s.customerId === customer.id || s.companyName === customer.name);
  if (isExisting) {
    return { success: false, isDuplicate: true, plan };
  }

  const newStop: PlannedStop = {
    id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    customerId: customer.id,
    companyName: customer.name,
    contactPerson: customer.contact_person,
    phone: customer.phone,
    province: customer.province,
    district: customer.district,
    address: customer.address,
    googleMapsUrl: customer.google_maps_url,
    latitude: customer.latitude,
    longitude: customer.longitude,
    plannedTime: '',
    objective: objective || customer.target_product || 'เข้าพบเพื่อนำเสนอสินค้าและประเมินหน้างาน',
    targetProduct: customer.target_product,
    status: 'PLANNED',
    resultNote: '',
    createdAt: new Date().toISOString(),
  };

  plan.stops.push(newStop);
  saveDailyPlan(plan);
  return { success: true, isDuplicate: false, plan };
}

// Format Thai Date string, e.g. "วันอังคารที่ 15 กันยายน 2569"
export function formatThaiFullDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const monthNames = [
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
    ];

    const dayName = dayNames[d.getDay()];
    const thaiYear = year + (year < 2400 ? 543 : 0);
    return `${dayName}ที่ ${day} ${monthNames[month - 1]} ${thaiYear}`;
  } catch {
    return dateStr;
  }
}

// Format short Thai date, e.g. "อ. 15 ก.ย."
export function formatThaiShortDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const shortDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${shortDays[d.getDay()]} ${day} ${shortMonths[month - 1]}`;
  } catch {
    return dateStr;
  }
}

export interface UpcomingDayPlanSummary {
  date: string;
  thaiLabel: string;
  stopsCount: number;
  completedCount: number;
  provinces: string[];
}

// Get overview of all scheduled plans in upcoming days (e.g. next 14 days)
export function getUpcomingPlansSummary(startDateStr?: string, daysCount: number = 14): UpcomingDayPlanSummary[] {
  if (typeof window === 'undefined') return [];
  const base = startDateStr ? new Date(startDateStr) : new Date();
  const result: UpcomingDayPlanSummary[] = [];

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const plan = getDailyPlan(dateStr);

    if (plan.stops && plan.stops.length > 0) {
      const provinces = Array.from(new Set(plan.stops.map((s) => s.province).filter(Boolean))) as string[];
      const completedCount = plan.stops.filter((s) => s.status === 'COMPLETED').length;

      result.push({
        date: dateStr,
        thaiLabel: formatThaiShortDate(dateStr),
        stopsCount: plan.stops.length,
        completedCount,
        provinces,
      });
    }
  }

  return result;
}

// Generate Google Maps Multi-Stop Directions URL
export function generateMultiStopGoogleMapsUrl(stops: PlannedStop[]): string | null {
  if (!stops || stops.length === 0) return null;

  const validLocations = stops
    .map((s) => {
      if (s.latitude && s.longitude) {
        return `${s.latitude},${s.longitude}`;
      }
      if (s.googleMapsUrl) {
        return s.googleMapsUrl;
      }
      if (s.companyName) {
        return encodeURIComponent(`${s.companyName} ${s.district || ''} ${s.province || ''}`.trim());
      }
      return null;
    })
    .filter(Boolean);

  if (validLocations.length === 0) return null;
  if (validLocations.length === 1) {
    const s = stops[0];
    if (s.googleMapsUrl) return s.googleMapsUrl;
    if (s.latitude && s.longitude) return `https://www.google.com/maps?q=${s.latitude},${s.longitude}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.companyName + ' ' + (s.province || ''))}`;
  }

  // Google Maps dir URL with multiple waypoints
  const destination = validLocations[validLocations.length - 1];
  const waypoints = validLocations.slice(0, validLocations.length - 1).join('|');
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}`;
}

// Generate Morning Plan Summary for LINE / Chat to Supervisor
export function generateMorningPlanSummaryText(plan: DailyPlan): string {
  const thaiDate = formatThaiFullDate(plan.date);
  const totalStops = plan.stops.length;

  let text = `📋 แผนการปฏิบัติงานและเข้าพบลูกค้าประจำวัน\n`;
  text += `👤 ผู้ปฏิบัติงาน: ${plan.salesPersonName || 'ทีมขาย CHICAI ELECTRIC'}\n`;
  text += `📆 ประจำ: ${thaiDate}\n`;
  text += `📍 จำนวนเป้าหมาย: ${totalStops} โรงงาน\n`;
  text += `------------------------------------\n\n`;

  if (totalStops === 0) {
    text += `(ยังไม่มีรายการเข้าพบที่ระบุในวันนี้)\n`;
  } else {
    plan.stops.forEach((stop, index) => {
      const num = index + 1;
      const timeStr = stop.plannedTime ? ` [เวลา ${stop.plannedTime} น.]` : '';
      text += `${num}️⃣${timeStr} ${stop.companyName}\n`;

      const loc = [stop.district, stop.province].filter(Boolean).join(', ');
      if (loc) text += `   📍 พิกัด: ${loc}\n`;

      if (stop.contactPerson || stop.phone) {
        const contactInfo = [
          stop.contactPerson ? `คุณ${stop.contactPerson}` : '',
          stop.phone ? `📞 ${stop.phone}` : '',
        ]
          .filter(Boolean)
          .join(' ');
        text += `   👤 ติดต่อ: ${contactInfo}\n`;
      }

      text += `   🎯 วัตถุประสงค์: ${stop.objective || 'เข้าพบนำเสนอผลิตภัณฑ์'}\n`;

      if (stop.googleMapsUrl || (stop.latitude && stop.longitude)) {
        const mapLink =
          stop.googleMapsUrl || `https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`;
        text += `   🗺️ แผนที่: ${mapLink}\n`;
      }
      text += `\n`;
    });
  }

  const multiMap = generateMultiStopGoogleMapsUrl(plan.stops);
  if (multiMap && totalStops > 1) {
    text += `🚗 เส้นทางนำทางรวม (${totalStops} จุด):\n${multiMap}\n\n`;
  }

  text += `------------------------------------\n`;
  text += `CHICAI ELECTRIC (THAILAND) CO., LTD.`;
  return text;
}

// Generate Evening Result Summary for LINE / Chat to Supervisor
export function generateEveningResultSummaryText(plan: DailyPlan): string {
  const thaiDate = formatThaiFullDate(plan.date);
  const totalStops = plan.stops.length;
  const completedStops = plan.stops.filter((s) => s.status === 'COMPLETED').length;
  const inProgressStops = plan.stops.filter((s) => s.status === 'IN_PROGRESS').length;
  const rescheduledStops = plan.stops.filter((s) => s.status === 'RESCHEDULED' || s.status === 'CANCELLED').length;

  let text = `📊 สรุปผลการปฏิบัติงานประจำวัน (End of Day Report)\n`;
  text += `👤 ผู้รายงาน: ${plan.salesPersonName || 'ทีมขาย CHICAI ELECTRIC'}\n`;
  text += `📆 ประจำ: ${thaiDate}\n`;
  text += `🎯 ผลลัพธ์: เข้าพบสำเร็จ ${completedStops}/${totalStops} จุด`;
  if (rescheduledStops > 0) text += ` (เลื่อน/ยกเลิก ${rescheduledStops} จุด)`;
  text += `\n------------------------------------\n\n`;

  if (totalStops === 0) {
    text += `(ไม่มีรายการเข้าพบในวันนี้)\n`;
  } else {
    plan.stops.forEach((stop, index) => {
      const num = index + 1;
      let statusEmoji = '⏳';
      let statusLabel = 'รอดำเนินการ';
      if (stop.status === 'COMPLETED') {
        statusEmoji = '✅';
        statusLabel = 'เข้าพบเรียบร้อย';
      } else if (stop.status === 'IN_PROGRESS') {
        statusEmoji = '🚗';
        statusLabel = 'กำลังดำเนินการ';
      } else if (stop.status === 'RESCHEDULED') {
        statusEmoji = '⚠️';
        statusLabel = 'เลื่อนนัด';
      } else if (stop.status === 'CANCELLED') {
        statusEmoji = '❌';
        statusLabel = 'ยกเลิก';
      }

      text += `${num}️⃣ ${statusEmoji} ${stop.companyName} (${statusLabel})\n`;
      text += `   🎯 งานที่ทำ: ${stop.objective || 'นำเสนอสินค้า'}\n`;

      if (stop.resultNote && stop.resultNote.trim()) {
        text += `   💬 ผลการเข้าพบ/ข้อสรุป: ${stop.resultNote.trim()}\n`;
      } else if (stop.status === 'COMPLETED') {
        text += `   💬 ผลการเข้าพบ: เข้าพบและนำเสนอข้อมูลเรียบร้อย กำลังติดตามผล\n`;
      }
      text += `\n`;
    });
  }

  text += `------------------------------------\n`;
  text += `บันทึกเข้าระบบ CRM เรียบร้อยแล้วครับ`;
  return text;
}
