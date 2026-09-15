'use client';

import React, { useState, useMemo, useRef } from 'react';
import { DailyPlan, PlannedStop, VISIT_STATUS_CONFIG } from '@/types/planner';
import {
  formatThaiFullDate,
  formatChineseFullDate,
  generateMorningPlanSummaryText,
  generateEveningResultSummaryText,
  generateChinesePlanSummaryText,
  generateBilingualPlanSummaryText,
  generateChineseResultSummaryText,
  generateBilingualResultSummaryText,
} from '@/lib/planner-storage';
import { exportDailyPlanToExcel, ReportLanguage } from '@/lib/excel-export';
import {
  calculateRouteStats,
  formatDistanceThai,
  estimateDrivingTimeMinutes,
  formatDrivingTimeThai,
} from '@/lib/geo-distance';
import {
  X,
  FileText,
  Share2,
  Copy,
  Printer,
  Check,
  Building2,
  MapPin,
  Calendar,
  User,
  Car,
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Mail,
  Send,
  Download,
  Globe,
} from 'lucide-react';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: DailyPlan;
  selectedDate: string;
}

export default function DailyReportModal({
  isOpen,
  onClose,
  plan,
  selectedDate,
}: DailyReportModalProps) {
  const [reportType, setReportType] = useState<'morning' | 'evening' | 'official'>('morning');
  const [reportLang, setReportLang] = useState<ReportLanguage>('th');
  const [copied, setCopied] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [executiveNote, setExecutiveNote] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportExcel = () => {
    setDownloadingExcel(true);
    try {
      exportDailyPlanToExcel(
        plan,
        executiveNote,
        reportType === 'morning' ? 'plan' : 'result',
        reportLang
      );
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel: ' + err.message);
    } finally {
      setTimeout(() => setDownloadingExcel(false), 1200);
    }
  };

  // Compute Route Stats
  const routeStats = useMemo(() => {
    return calculateRouteStats(plan.stops);
  }, [plan.stops]);

  const estMins = useMemo(() => {
    return estimateDrivingTimeMinutes(routeStats.totalKm);
  }, [routeStats.totalKm]);

  const zhDrivingTime = useMemo(() => {
    if (!estMins) return '';
    const hours = Math.floor(estMins / 60);
    const mins = estMins % 60;
    return hours > 0 ? `約 ${hours} 小時 ${mins} 分鐘` : `約 ${mins} 分鐘`;
  }, [estMins]);

  // Compute Completion Stats
  const stats = useMemo(() => {
    const total = plan.stops.length;
    const completed = plan.stops.filter((s) => s.status === 'COMPLETED').length;
    const inProgress = plan.stops.filter((s) => s.status === 'IN_PROGRESS').length;
    const pending = plan.stops.filter((s) => s.status === 'PLANNED').length;
    const rescheduled = plan.stops.filter(
      (s) => s.status === 'RESCHEDULED' || s.status === 'CANCELLED'
    ).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, rescheduled, rate };
  }, [plan.stops]);

  // Generate plain text report based on selected tab, language and notes
  const reportText = useMemo(() => {
    let base = '';
    if (reportType === 'morning') {
      if (reportLang === 'zh') {
        base = generateChinesePlanSummaryText(plan);
      } else if (reportLang === 'bilingual') {
        base = generateBilingualPlanSummaryText(plan);
      } else {
        base = generateMorningPlanSummaryText(plan);
      }
    } else {
      if (reportLang === 'zh') {
        base = generateChineseResultSummaryText(plan);
      } else if (reportLang === 'bilingual') {
        base = generateBilingualResultSummaryText(plan);
      } else {
        base = generateEveningResultSummaryText(plan);
      }
    }

    if (executiveNote.trim()) {
      const noteHeader =
        reportLang === 'zh'
          ? '📝 備註 / 重點摘要 (Executive Notes):'
          : reportLang === 'bilingual'
          ? '📝 หมายเหตุ / 備註摘要 (Executive Summary):'
          : '📝 หมายเหตุ / สรุปภาพรวมแผนงาน:';

      base = base.replace(
        '------------------------------------\nCHICAI ELECTRIC',
        `${noteHeader}\n${executiveNote.trim()}\n\n------------------------------------\nCHICAI ELECTRIC`
      );
      base = base.replace(
        '------------------------------------\nบันทึกเข้าระบบ CRM เรียบร้อยแล้วครับ',
        `${noteHeader}\n${executiveNote.trim()}\n\n------------------------------------\nบันทึกเข้าระบบ CRM เรียบร้อยแล้วครับ`
      );
      base = base.replace(
        '------------------------------------\n已同步記錄至 CRM 系統。',
        `${noteHeader}\n${executiveNote.trim()}\n\n------------------------------------\n已同步記錄至 CRM 系統。`
      );
    }
    return base;
  }, [plan, reportType, reportLang, executiveNote]);

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // Handle Native Mobile Share (LINE, WhatsApp, Notes)
  const handleShare = async () => {
    const title =
      reportLang === 'zh'
        ? reportType === 'morning'
          ? `每日工作行程拜訪表 (${formatChineseFullDate(selectedDate)})`
          : `每日業務工作成果表 (${formatChineseFullDate(selectedDate)})`
        : reportType === 'morning'
        ? `รายงานแผนการปฏิบัติงาน (${formatThaiFullDate(selectedDate)})`
        : `รายงานสรุปผลการปฏิบัติงาน (${formatThaiFullDate(selectedDate)})`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: reportText,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  // Handle Print / PDF Export
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="pt-4 pb-3 px-4 sm:px-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                    {reportLang === 'zh'
                      ? '業務行程與拜訪報告中心'
                      : reportLang === 'bilingual'
                      ? 'ศูนย์ออกรายงานแผนงาน / 拜訪報告中心'
                      : 'ศูนย์ออกรายงานแผนงาน & สรุปผล'}
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Plan & Report Hub
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {reportLang === 'zh' ? (
                    <>日期: <b>{formatChineseFullDate(selectedDate)}</b> • 業務員: {plan.salesPersonName || 'CHICAI'}</>
                  ) : reportLang === 'bilingual' ? (
                    <>ประจำ: <b>{formatThaiFullDate(selectedDate)}</b> ({formatChineseFullDate(selectedDate)})</>
                  ) : (
                    <>ประจำ: <b>{formatThaiFullDate(selectedDate)}</b> • ผู้ปฏิบัติงาน: {plan.salesPersonName}</>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Language Switcher Bar */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center space-x-1 text-xs text-amber-300 font-bold">
              <Globe className="w-3.5 h-3.5" />
              <span>ภาษาของรายงาน (Language):</span>
            </div>
            <div className="flex bg-black/30 p-0.5 rounded-lg text-[11px] font-bold gap-1 border border-white/10">
              <button
                type="button"
                onClick={() => setReportLang('th')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  reportLang === 'th'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇹🇭</span>
                <span>ไทย</span>
              </button>
              <button
                type="button"
                onClick={() => setReportLang('zh')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  reportLang === 'zh'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇹🇼</span>
                <span>繁體中文</span>
              </button>
              <button
                type="button"
                onClick={() => setReportLang('bilingual')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  reportLang === 'bilingual'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇹🇭/🇹🇼</span>
                <span>ไทย-จีน</span>
              </button>
            </div>
          </div>

          {/* Report Type Tabs */}
          <div className="flex bg-white/10 p-1 rounded-xl mt-2 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setReportType('morning')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                reportType === 'morning'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>
                {reportLang === 'zh'
                  ? '拜訪計劃表 (Work Plan)'
                  : reportLang === 'bilingual'
                  ? 'แผนงาน / 計劃表'
                  : 'รายงานแผนงาน (Work Plan)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setReportType('evening')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                reportType === 'evening'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📊</span>
              <span>
                {reportLang === 'zh'
                  ? '工作成果表 (End of Day)'
                  : reportLang === 'bilingual'
                  ? 'สรุปผล / 成果表'
                  : 'รายงานสรุปผล (End of Day)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setReportType('official')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                reportType === 'official'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📑</span>
              <span>
                {reportLang === 'zh'
                  ? '正式表單 (PDF/列印)'
                  : reportLang === 'bilingual'
                  ? 'ฟอร์มทางการ / 正式表單'
                  : 'ฟอร์มแผนงานทางการ (PDF/พิมพ์)'}
              </span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs sm:text-sm bg-slate-50">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 block">
                {reportLang === 'zh' ? '目標工廠數' : reportLang === 'bilingual' ? 'เป้าหมาย / 目標' : 'เป้าหมายทั้งหมด'}
              </span>
              <span className="text-base font-black text-slate-900">
                {stats.total} {reportLang === 'zh' ? '家' : 'โรงงาน'}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] uppercase font-extrabold text-emerald-700 block">
                {reportLang === 'zh' ? '拜訪完成率' : reportLang === 'bilingual' ? 'สำเร็จ / 完成率' : 'เข้าพบสำเร็จ'}
              </span>
              <span className="text-base font-black text-emerald-950">
                {stats.completed} ({stats.rate}%)
              </span>
            </div>
            <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 shadow-2xs">
              <span className="text-[10px] uppercase font-extrabold text-indigo-700 block">
                {reportLang === 'zh' ? '預估總里程' : reportLang === 'bilingual' ? 'ระยะทาง / 總里程' : 'ระยะทางวิ่งรถรวม'}
              </span>
              <span className="text-base font-black text-indigo-950">
                {routeStats.totalKm > 0 ? `~${routeStats.totalKm} ${reportLang === 'zh' ? '公里' : 'กม.'}` : '-'}
              </span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] uppercase font-extrabold text-amber-700 block">
                {reportLang === 'zh' ? '待跟進 / 改期' : reportLang === 'bilingual' ? 'รอติดตาม / 待跟進' : 'เลื่อน / รอติดตาม'}
              </span>
              <span className="text-base font-black text-amber-950">
                {stats.rescheduled + stats.pending} {reportLang === 'zh' ? '家' : 'แห่ง'}
              </span>
            </div>
          </div>

          {/* Optional Executive Note Input */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <span>
                {reportLang === 'zh'
                  ? '✍️ 重點摘要與主管呈報 (Executive Summary / Notes)'
                  : reportLang === 'bilingual'
                  ? '✍️ สรุปภาพรวมสำหรับหัวหน้า / 重點呈報 (Executive Summary)'
                  : '✍️ สรุปภาพรวม / ข้อเสนอแนะเพิ่มเติมสำหรับหัวหน้า (Executive Summary)'}
              </span>
            </label>
            <textarea
              rows={2}
              placeholder={
                reportLang === 'zh'
                  ? '輸入拜訪行程重點，例如：今日拜訪3家工廠對濾油機 LYJ-001-D 高度感興趣，預計明日提供報價單...'
                  : 'พิมพ์ข้อความสรุปภาพรวมหน้างาน เช่น ลูกค้า 3 แห่งให้ความสนใจเครื่องกรองน้ำมันรุ่น LYJ-001-D มาก นัดส่งใบเสนอราคาพรุ่งนี้...'
              }
              value={executiveNote}
              onChange={(e) => setExecutiveNote(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-800 leading-relaxed"
            />
          </div>

          {/* Report Preview Mode */}
          {reportType === 'official' ? (
            /* Printable Official Document Layout */
            <div
              ref={printRef}
              className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none"
            >
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                    {reportLang === 'zh'
                      ? '啟凱電機 (泰國) 有限公司'
                      : reportLang === 'bilingual'
                      ? 'CHICAI ELECTRIC (THAILAND) CO., LTD. / 啟凱電機'
                      : 'CHICAI ELECTRIC (THAILAND) CO., LTD.'}
                  </h2>
                  <p className="text-[11px] text-slate-600 font-bold">
                    {reportLang === 'zh'
                      ? '每日工作行程與客戶拜訪計劃表 (Daily Route & Visit Plan Report)'
                      : reportLang === 'bilingual'
                      ? 'รายงานแผนการปฏิบัติงาน / 每日客戶拜訪計劃表 (Daily Route & Visit Plan Report)'
                      : 'รายงานแผนการปฏิบัติงานและเส้นทางการเข้าพบลูกค้าประจำวัน (Daily Route & Visit Plan Report)'}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-extrabold text-slate-900">
                    {reportLang === 'zh' ? (
                      <>日期: <b>{formatChineseFullDate(selectedDate)}</b></>
                    ) : reportLang === 'bilingual' ? (
                      <>วันที่ / 日期: <b>{formatThaiFullDate(selectedDate)}</b></>
                    ) : (
                      <>วันที่: <b>{formatThaiFullDate(selectedDate)}</b></>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {reportLang === 'zh'
                      ? `業務代表: ${plan.salesPersonName || 'CHICAI'}`
                      : `ผู้ปฏิบัติงาน: ${plan.salesPersonName}`}
                  </p>
                </div>
              </div>

              {/* Stops Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-extrabold text-slate-700">
                      <th className="py-2 px-2.5 w-8 text-center">
                        {reportLang === 'zh' ? '序號' : '#'}
                      </th>
                      <th className="py-2 px-2.5">
                        {reportLang === 'zh' ? '目標工廠 / 公司名稱' : reportLang === 'bilingual' ? 'โรงงาน / 公司名稱' : 'โรงงาน / บริษัท'}
                      </th>
                      <th className="py-2 px-2.5">
                        {reportLang === 'zh' ? '區域 / 省份' : reportLang === 'bilingual' ? 'พื้นที่ / 區域' : 'พื้นที่'}
                      </th>
                      <th className="py-2 px-2.5">
                        {reportLang === 'zh' ? '拜訪目的' : reportLang === 'bilingual' ? 'วัตถุประสงค์ / 目的' : 'วัตถุประสงค์'}
                      </th>
                      <th className="py-2 px-2.5 text-center">
                        {reportLang === 'zh' ? '狀態' : reportLang === 'bilingual' ? 'สถานะ / 狀態' : 'สถานะ'}
                      </th>
                      <th className="py-2 px-2.5">
                        {reportLang === 'zh' ? '現場紀錄 / 結果' : reportLang === 'bilingual' ? 'ผลสรุป / 紀錄' : 'ผลการเข้าพบ / สรุป'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {plan.stops.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          {reportLang === 'zh' ? '今日無排定拜訪行程' : 'ไม่มีรายการเข้าพบในวันที่ระบุ'}
                        </td>
                      </tr>
                    ) : (
                      plan.stops.map((s, idx) => {
                        const conf = VISIT_STATUS_CONFIG[s.status] || VISIT_STATUS_CONFIG.PLANNED;
                        const statusLabel =
                          reportLang === 'zh'
                            ? s.status === 'COMPLETED'
                              ? '已完成'
                              : s.status === 'IN_PROGRESS'
                              ? '進行中'
                              : s.status === 'RESCHEDULED'
                              ? '已改期'
                              : s.status === 'CANCELLED'
                              ? '已取消'
                              : '計劃中'
                            : conf.label;

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-2.5 font-bold text-center text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5 font-extrabold text-slate-900">
                              {s.companyName}
                              {s.contactPerson && (
                                <span className="block text-[10px] font-normal text-slate-500">
                                  {reportLang === 'zh' ? '聯絡人: ' : 'คุณ'}{s.contactPerson} {s.phone ? `(${s.phone})` : ''}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                              {s.district ? `${s.district}, ` : ''}{s.province || '-'}
                            </td>
                            <td className="py-2 px-2.5 text-slate-800 font-medium">
                              {s.objective}
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${conf.bg} ${conf.color}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-slate-700 text-[11px]">
                              {s.resultNote || (s.status === 'COMPLETED' ? (reportLang === 'zh' ? '已順利完成' : 'เข้าพบเรียบร้อย') : '-')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Driving distance summary */}
              {routeStats.totalKm > 0 && (
                <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    {reportLang === 'zh'
                      ? '🚗 預估全日行駛總里程:'
                      : reportLang === 'bilingual'
                      ? '🚗 ระยะทางรวม / 預估總里程:'
                      : '🚗 ระยะทางวิ่งรถรวมทั้งสิ้น:'}
                  </span>
                  <span className="text-blue-700 font-black">
                    ~{routeStats.totalKm} {reportLang === 'zh' ? `公里 (${zhDrivingTime})` : `กิโลเมตร (${formatDrivingTimeThai(estMins)})`}
                  </span>
                </div>
              )}

              {/* Executive Note Section */}
              {executiveNote.trim() && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                  <span className="font-extrabold text-blue-900 text-xs block">
                    {reportLang === 'zh'
                      ? '重點摘要與說明 (Executive Summary):'
                      : 'ข้อสรุปภาพรวมและประเด็นสำคัญ (Executive Summary):'}
                  </span>
                  <p className="text-xs text-blue-950 whitespace-pre-wrap leading-relaxed">
                    {executiveNote.trim()}
                  </p>
                </div>
              )}

              {/* Signature Bar */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 border-t border-slate-200">
                <div className="space-y-6">
                  <p className="font-bold">
                    {reportLang === 'zh'
                      ? '填表人 / 業務代表簽名 ......................................................'
                      : reportLang === 'bilingual'
                      ? 'ลงชื่อผู้วางแผน / 業務代表簽名 ......................................................'
                      : 'ลงชื่อ ......................................................'}
                  </p>
                  <p>
                    ({plan.salesPersonName})<br />
                    {reportLang === 'zh' ? '業務與技術代表 (Sales & Technical Engineer)' : 'เจ้าหน้าที่ฝ่ายขายและวิศวกรรม'}
                  </p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">
                    {reportLang === 'zh'
                      ? '業務主管 / 經理簽核 ......................................................'
                      : reportLang === 'bilingual'
                      ? 'ลงชื่อผู้จัดการ / 業務主管簽核 ......................................................'
                      : 'ลงชื่อ ......................................................'}
                  </p>
                  <p>
                    (..........................................................)<br />
                    {reportLang === 'zh' ? '業務主管 / 總經理 (Sales Manager / Managing Director)' : 'ผู้จัดการฝ่ายขาย / ผู้บังคับบัญชา'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* LINE-Formatted Plain Text Preview */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>
                  {reportLang === 'zh'
                    ? '即時通訊格式預覽 (LINE / WeChat / 訊息):'
                    : 'ตัวอย่างข้อความจัดรูปแบบสำหรับส่ง LINE / Chat:'}
                </span>
                <span className="text-emerald-700 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {reportLang === 'zh' ? '已自動附加導航地圖與聯絡資訊' : 'จัดรูปแบบข้อความพร้อมลิงก์และพิกัด'}
                  </span>
                </span>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto border border-slate-800 select-all">
                {reportText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={downloadingExcel}
              className="py-2 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300 flex items-center space-x-1.5 transition-all active:scale-95 shadow-2xs"
              title="ดาวน์โหลดรายงานสรุปเป็นไฟล์ Excel (.xlsx)"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>
                {downloadingExcel
                  ? 'กำลังสร้างไฟล์...'
                  : reportLang === 'zh'
                  ? '📥 下載 Excel 報表 (.xlsx)'
                  : reportLang === 'bilingual'
                  ? '📥 โหลด Excel (.xlsx) 2 ภาษา'
                  : '📥 ดาวน์โหลด Excel (.xlsx)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-colors"
              title="พิมพ์เอกสาร หรือบันทึกเป็น PDF"
            >
              <Printer className="w-4 h-4" />
              <span>{reportLang === 'zh' ? '列印 / 存為 PDF' : 'พิมพ์ / Save PDF'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors"
            >
              {reportLang === 'zh' ? '關閉' : 'ปิด'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 flex items-center space-x-1.5 transition-all active:scale-95 touch-press"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{reportLang === 'zh' ? '已複製內容！' : 'คัดลอกข้อความแล้ว!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>
                    {reportLang === 'zh' ? '🟢 發送報告 (LINE / 複製)' : '🟢 ส่งรายงาน (LINE / Share)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

