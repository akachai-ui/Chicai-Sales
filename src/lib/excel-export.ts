import * as XLSX from 'xlsx';
import { DailyPlan, VISIT_STATUS_CONFIG } from '@/types/planner';
import { formatThaiFullDate } from './planner-storage';
import { calculateRouteStats, formatDistanceThai, estimateDrivingTimeMinutes, formatDrivingTimeThai } from './geo-distance';

export function exportDailyPlanToExcel(plan: DailyPlan, executiveNote?: string): void {
  if (typeof window === 'undefined') return;

  const routeStats = calculateRouteStats(plan.stops);
  const thaiDate = formatThaiFullDate(plan.date);
  const completedCount = plan.stops.filter((s) => s.status === 'COMPLETED').length;
  const rescheduledCount = plan.stops.filter((s) => s.status === 'RESCHEDULED' || s.status === 'CANCELLED').length;
  const inProgressCount = plan.stops.filter((s) => s.status === 'IN_PROGRESS').length;
  const pendingCount = plan.stops.filter((s) => s.status === 'PLANNED').length;

  // 1. Header Information Rows
  const headerData: (string | number)[][] = [
    ['บริษัท ชิไค อีเล็คทริค (ประเทศไทย) จำกัด / CHICAI ELECTRIC (THAILAND) CO., LTD.'],
    ['รายงานการปฏิบัติงานและบันทึกการเข้าพบลูกค้าประจำวัน (Daily Sales & Field Visit Report)'],
    [''],
    ['วันที่:', thaiDate, '', 'ผู้ปฏิบัติงาน:', plan.salesPersonName || 'ฝ่ายขาย CHICAI ELECTRIC'],
    [
      'จำนวนเป้าหมาย:',
      `${plan.stops.length} โรงงาน`,
      '',
      'ระยะทางวิ่งรถรวม:',
      routeStats.totalKm > 0 ? `~${routeStats.totalKm} กม. (${formatDrivingTimeThai(estimateDrivingTimeMinutes(routeStats.totalKm))})` : '-',
    ],
    [
      'เข้าพบสำเร็จ:',
      `${completedCount} แห่ง (${plan.stops.length > 0 ? Math.round((completedCount / plan.stops.length) * 100) : 0}%)`,
      '',
      'สถานะอื่นๆ:',
      `กำลังเข้าพบ ${inProgressCount} | รอดำเนินการ ${pendingCount} | เลื่อน ${rescheduledCount}`,
    ],
  ];

  if (executiveNote && executiveNote.trim()) {
    headerData.push(['ข้อสรุปภาพรวม:', executiveNote.trim()]);
  }

  headerData.push(['']); // Blank row separator

  // 2. Table Column Headers
  const tableHeaders = [
    'ลำดับ',
    'เวลา',
    'ชื่อโรงงาน / บริษัทเป้าหมาย',
    'ผู้ติดต่อ (Contact Person)',
    'เบอร์โทรศัพท์',
    'อำเภอ/เขต',
    'จังหวัด',
    'วัตถุประสงค์การเข้าพบ',
    'สินค้าเป้าหมาย',
    'สถานะการเข้าพบ',
    'ผลการเข้าพบ / ข้อสรุปหน้างาน',
    'ลิงก์แผนที่ Google Maps',
  ];

  // 3. Table Rows
  const tableRows = plan.stops.map((stop, index) => {
    const conf = VISIT_STATUS_CONFIG[stop.status] || VISIT_STATUS_CONFIG.PLANNED;
    const directGpsUrl =
      stop.googleMapsUrl ||
      (stop.latitude && stop.longitude
        ? `https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`
        : '');

    return [
      index + 1,
      stop.plannedTime ? `${stop.plannedTime} น.` : '-',
      stop.companyName,
      stop.contactPerson ? `คุณ${stop.contactPerson}` : '-',
      stop.phone || '-',
      stop.district || '-',
      stop.province || '-',
      stop.objective || '-',
      stop.targetProduct || '-',
      conf.label,
      stop.resultNote || (stop.status === 'COMPLETED' ? 'เข้าพบเรียบร้อย' : '-'),
      directGpsUrl,
    ];
  });

  const fullSheetData = [...headerData, tableHeaders, ...tableRows];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Auto-fit column widths
  ws['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 12 }, // เวลา
    { wch: 38 }, // ชื่อโรงงาน
    { wch: 20 }, // ผู้ติดต่อ
    { wch: 16 }, // เบอร์โทร
    { wch: 18 }, // อำเภอ
    { wch: 18 }, // จังหวัด
    { wch: 35 }, // วัตถุประสงค์
    { wch: 22 }, // สินค้าเป้าหมาย
    { wch: 18 }, // สถานะ
    { wch: 45 }, // ผลการเข้าพบ
    { wch: 35 }, // Google Maps
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'รายงานการเข้าพบ');

  const fileName = `Chicai_Sales_Report_${plan.date}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
