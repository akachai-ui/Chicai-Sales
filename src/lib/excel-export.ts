import * as XLSX from 'xlsx';
import { DailyPlan, VISIT_STATUS_CONFIG } from '@/types/planner';
import { formatThaiFullDate, formatChineseFullDate } from './planner-storage';
import { calculateRouteStats, formatDistanceThai, estimateDrivingTimeMinutes, formatDrivingTimeThai } from './geo-distance';

export type ReportLanguage = 'th' | 'zh' | 'bilingual';

const ZH_STATUS_MAP: Record<string, string> = {
  PLANNED: '計劃中 (待拜訪)',
  IN_PROGRESS: '進行中 (在途中)',
  COMPLETED: '已完成',
  RESCHEDULED: '已改期',
  CANCELLED: '已取消',
};

const BILINGUAL_STATUS_MAP: Record<string, string> = {
  PLANNED: 'รอดำเนินการ / 計劃中',
  IN_PROGRESS: 'กำลังดำเนินการ / 進行中',
  COMPLETED: 'เข้าพบเรียบร้อย / 已完成',
  RESCHEDULED: 'เลื่อนนัด / 已改期',
  CANCELLED: 'ยกเลิก / 已取消',
};

export function exportDailyPlanToExcel(
  plan: DailyPlan,
  executiveNote?: string,
  reportType: 'plan' | 'result' = 'plan',
  language: ReportLanguage = 'th'
): void {
  if (typeof window === 'undefined') return;

  const routeStats = calculateRouteStats(plan.stops);
  const thaiDate = formatThaiFullDate(plan.date);
  const zhDate = formatChineseFullDate(plan.date);
  const totalStops = plan.stops.length;
  const completedCount = plan.stops.filter((s) => s.status === 'COMPLETED').length;
  const completionRate = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;
  const estMins = estimateDrivingTimeMinutes(routeStats.totalKm) || 0;
  const hours = Math.floor(estMins / 60);
  const mins = estMins % 60;
  const zhDrivingTime = hours > 0 ? `約 ${hours} 小時 ${mins} 分鐘` : `約 ${mins} 分鐘`;

  const isPlanMode = reportType === 'plan';

  // 1. Company Name & Report Title by Language
  let companyNameHeader = 'บริษัท ชิไค อีเล็คทริค (ประเทศไทย) จำกัด / CHICAI ELECTRIC (THAILAND) CO., LTD.';
  let reportTitle = '';
  let dateLabel = 'วันที่:';
  let dateValue = thaiDate;
  let salesLabel = 'ผู้ปฏิบัติงาน:';
  let targetCountLabel = 'จำนวนเป้าหมายในแผน:';
  let targetCountValue = `${totalStops} โรงงาน`;
  let distanceLabel = 'ระยะทางวิ่งรถรวมทั้งสิ้น:';
  let distanceValue = routeStats.totalKm > 0 ? `~${routeStats.totalKm} กม. (${formatDrivingTimeThai(estMins)})` : '-';
  let completedLabel = 'เข้าพบสำเร็จ:';
  let completedValue = `${completedCount}/${totalStops} แห่ง (${completionRate}%)`;
  let noteLabel = 'หมายเหตุ / สรุปภาพรวมแผนงาน:';

  if (language === 'zh') {
    companyNameHeader = '啟凱電機 (泰國) 有限公司 / CHICAI ELECTRIC (THAILAND) CO., LTD.';
    reportTitle = isPlanMode
      ? '每日工作行程與客戶拜訪計劃表 (Daily Route & Visit Plan Report)'
      : '每日業務拜訪與工作成果報告表 (Daily Sales & Field Visit Summary Report)';
    dateLabel = '日期 (Date):';
    dateValue = zhDate;
    salesLabel = '業務人員 (Sales Rep):';
    targetCountLabel = '計劃拜訪客戶數:';
    targetCountValue = `${totalStops} 家工廠 / 客戶`;
    distanceLabel = '預估總行駛里程:';
    distanceValue = routeStats.totalKm > 0 ? `~${routeStats.totalKm} 公里 (${zhDrivingTime})` : '-';
    completedLabel = '拜訪完成率:';
    completedValue = `${completedCount}/${totalStops} 家 (${completionRate}%)`;
    noteLabel = '備註 / 重點摘要 (Summary Notes):';
  } else if (language === 'bilingual') {
    companyNameHeader = 'บริษัท ชิไค อีเล็คทริค (ประเทศไทย) จำกัด / 啟凱電機 (泰國) 有限公司 / CHICAI ELECTRIC';
    reportTitle = isPlanMode
      ? 'รายงานแผนการปฏิบัติงาน / 每日客戶拜訪計劃表 (Daily Route & Visit Plan Report)'
      : 'รายงานสรุปผลการปฏิบัติงาน / 每日工作成果報告表 (Daily Sales & Visit Summary)';
    dateLabel = 'วันที่ / 日期:';
    dateValue = `${thaiDate} (${zhDate})`;
    salesLabel = 'ผู้ปฏิบัติงาน / 業務人員:';
    targetCountLabel = 'เป้าหมายในแผน / 拜訪目標:';
    targetCountValue = `${totalStops} โรงงาน / 家`;
    distanceLabel = 'ระยะทางรวม / 預估總里程:';
    distanceValue = routeStats.totalKm > 0 ? `~${routeStats.totalKm} กม./公里 (${formatDrivingTimeThai(estMins)})` : '-';
    completedLabel = 'เข้าพบสำเร็จ / 拜訪完成:';
    completedValue = `${completedCount}/${totalStops} แห่ง/家 (${completionRate}%)`;
    noteLabel = 'หมายเหตุ / 備註摘要:';
  } else {
    reportTitle = isPlanMode
      ? 'รายงานแผนการปฏิบัติงานและเส้นทางการเข้าพบลูกค้าประจำวัน (Daily Route & Visit Plan Report)'
      : 'รายงานสรุปผลการปฏิบัติงานประจำวัน (Daily Sales & Field Visit Summary Report)';
  }

  // 2. Header Rows
  const headerData: (string | number)[][] = [
    [companyNameHeader],
    [reportTitle],
    [''],
    [dateLabel, dateValue, '', salesLabel, plan.salesPersonName || 'CHICAI ELECTRIC'],
    [targetCountLabel, targetCountValue, '', distanceLabel, distanceValue],
  ];

  if (!isPlanMode) {
    headerData.push([completedLabel, completedValue]);
  }

  if (executiveNote && executiveNote.trim()) {
    headerData.push([noteLabel, executiveNote.trim()]);
  }

  headerData.push(['']); // Blank row separator

  // 3. Table Column Headers
  let tableHeaders: string[] = [];

  if (language === 'zh') {
    tableHeaders = isPlanMode
      ? [
          '序號',
          '預約時間',
          '目標工廠 / 公司名稱',
          '聯絡人 (Contact)',
          '聯絡電話',
          '區域 / 縣 (District)',
          '省份 (Province)',
          '拜訪目的 (Objective)',
          '推廣產品 / 目標機種',
          'Google 地圖導航連結',
        ]
      : [
          '序號',
          '時間',
          '目標工廠 / 公司名稱',
          '聯絡人',
          '聯絡電話',
          '區域/縣',
          '省份',
          '拜訪目的',
          '推廣產品',
          '拜訪狀態 (Status)',
          '拜訪結果與現場紀錄 (Results/Notes)',
          'Google 地圖導航連結',
        ];
  } else if (language === 'bilingual') {
    tableHeaders = isPlanMode
      ? [
          'ลำดับ (序號)',
          'เวลานัดหมาย (時間)',
          'ชื่อโรงงาน / บริษัทเป้าหมาย (公司名稱)',
          'ผู้ติดต่อ (聯絡人)',
          'เบอร์โทรศัพท์ (電話)',
          'อำเภอ/เขต (區域)',
          'จังหวัด (省份)',
          'วัตถุประสงค์ (拜訪目的)',
          'สินค้าเป้าหมาย (推廣機種)',
          'ลิงก์แผนที่ Google Maps (地圖)',
        ]
      : [
          'ลำดับ (序號)',
          'เวลา (時間)',
          'ชื่อโรงงาน / บริษัทเป้าหมาย (公司名稱)',
          'ผู้ติดต่อ (聯絡人)',
          'เบอร์โทรศัพท์ (電話)',
          'อำเภอ/เขต (區域)',
          'จังหวัด (省份)',
          'วัตถุประสงค์ (拜訪目的)',
          'สินค้าเป้าหมาย (推廣機種)',
          'สถานะ (拜訪狀態)',
          'ผลการเข้าพบ / สรุป (現場紀錄)',
          'ลิงก์แผนที่ Google Maps (地圖)',
        ];
  } else {
    tableHeaders = isPlanMode
      ? [
          'ลำดับ',
          'เวลานัดหมาย',
          'ชื่อโรงงาน / บริษัทเป้าหมาย',
          'ผู้ติดต่อ (Contact Person)',
          'เบอร์โทรศัพท์',
          'อำเภอ/เขต',
          'จังหวัด',
          'วัตถุประสงค์การเข้าพบ',
          'สินค้าเป้าหมาย / ผลิตภัณฑ์นำเสนอ',
          'ลิงก์แผนที่นำทาง Google Maps',
        ]
      : [
          'ลำดับ',
          'เวลา',
          'ชื่อโรงงาน / บริษัทเป้าหมาย',
          'ผู้ติดต่อ',
          'เบอร์โทรศัพท์',
          'อำเภอ/เขต',
          'จังหวัด',
          'วัตถุประสงค์',
          'สินค้าเป้าหมาย',
          'สถานะการเข้าพบ',
          'ผลการเข้าพบ / ข้อสรุปหน้างาน',
          'ลิงก์แผนที่ Google Maps',
        ];
  }

  // 4. Table Rows
  const tableRows = plan.stops.map((stop, index) => {
    const directGpsUrl =
      stop.googleMapsUrl ||
      (stop.latitude && stop.longitude
        ? `https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`
        : '');

    let statusText = '';
    if (language === 'zh') {
      statusText = ZH_STATUS_MAP[stop.status] || '計劃中';
    } else if (language === 'bilingual') {
      statusText = BILINGUAL_STATUS_MAP[stop.status] || 'รอดำเนินการ / 計劃中';
    } else {
      const conf = VISIT_STATUS_CONFIG[stop.status] || VISIT_STATUS_CONFIG.PLANNED;
      statusText = conf.label;
    }

    const defaultCompletedNote =
      language === 'zh'
        ? '已順利完成拜訪'
        : language === 'bilingual'
        ? 'เข้าพบเรียบร้อย / 已完成'
        : 'เข้าพบเรียบร้อย';

    const contactPersonPrefix =
      language === 'zh' ? '' : language === 'bilingual' ? 'คุณ/' : 'คุณ';

    const timeDisplay = stop.plannedTime
      ? language === 'zh'
        ? `${stop.plannedTime}`
        : `${stop.plannedTime} น.`
      : '-';

    if (isPlanMode) {
      return [
        index + 1,
        timeDisplay,
        stop.companyName,
        stop.contactPerson ? `${contactPersonPrefix}${stop.contactPerson}` : '-',
        stop.phone || '-',
        stop.district || '-',
        stop.province || '-',
        stop.objective || '-',
        stop.targetProduct || '-',
        directGpsUrl,
      ];
    } else {
      return [
        index + 1,
        timeDisplay,
        stop.companyName,
        stop.contactPerson ? `${contactPersonPrefix}${stop.contactPerson}` : '-',
        stop.phone || '-',
        stop.district || '-',
        stop.province || '-',
        stop.objective || '-',
        stop.targetProduct || '-',
        statusText,
        stop.resultNote || (stop.status === 'COMPLETED' ? defaultCompletedNote : '-'),
        directGpsUrl,
      ];
    }
  });

  const fullSheetData = [...headerData, tableHeaders, ...tableRows];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Auto-fit column widths
  ws['!cols'] = isPlanMode
    ? [
        { wch: 8 },  // ลำดับ / 序號
        { wch: 16 }, // เวลานัดหมาย
        { wch: 40 }, // ชื่อโรงงาน
        { wch: 22 }, // ผู้ติดต่อ
        { wch: 16 }, // เบอร์โทร
        { wch: 20 }, // อำเภอ
        { wch: 18 }, // จังหวัด
        { wch: 40 }, // วัตถุประสงค์
        { wch: 30 }, // สินค้าเป้าหมาย
        { wch: 42 }, // Google Maps
      ]
    : [
        { wch: 8 },  // ลำดับ
        { wch: 14 }, // เวลา
        { wch: 40 }, // ชื่อโรงงาน
        { wch: 22 }, // ผู้ติดต่อ
        { wch: 16 }, // เบอร์โทร
        { wch: 20 }, // อำเภอ
        { wch: 18 }, // จังหวัด
        { wch: 38 }, // วัตถุประสงค์
        { wch: 25 }, // สินค้าเป้าหมาย
        { wch: 24 }, // สถานะ
        { wch: 48 }, // ผลการเข้าพบ
        { wch: 38 }, // Google Maps
      ];

  const wb = XLSX.utils.book_new();
  const sheetName =
    language === 'zh'
      ? isPlanMode
        ? '拜訪計劃表'
        : '拜訪成果表'
      : language === 'bilingual'
      ? isPlanMode
        ? 'แผนงาน_計劃表'
        : 'ผลงาน_成果表'
      : isPlanMode
      ? 'รายงานแผนงาน'
      : 'รายงานผลงาน';

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const prefix =
    language === 'zh'
      ? isPlanMode
        ? 'Chicai_客戶拜訪計劃表'
        : 'Chicai_業務成果報告'
      : isPlanMode
      ? 'Chicai_Work_Plan'
      : 'Chicai_Sales_Report';

  const fileName = `${prefix}_${plan.date}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

