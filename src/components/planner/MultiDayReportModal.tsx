'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SalesPlan, SalesPlanItem, PLAN_ACTIVITY_CONFIGS, PlanActivityType } from '@/types/planner';
import { fetchFullSalesPlansInRange } from '@/lib/supabase';
import {
  X,
  Printer,
  Calendar,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface MultiDayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate?: string; // YYYY-MM-DD
  defaultEndDate?: string; // YYYY-MM-DD
}

const ENG_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ENG_MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ENG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateYMD(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatEngDateFull(dateStr: string): string {
  const dateObj = parseDateYMD(dateStr);
  const dayName = ENG_DAYS[dateObj.getDay()];
  const monthName = ENG_MONTHS_SHORT[dateObj.getMonth()];
  return `${dayName}, ${monthName} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
}

function formatEngDateShort(dateStr: string): string {
  const dateObj = parseDateYMD(dateStr);
  const monthName = ENG_MONTHS_SHORT[dateObj.getMonth()];
  return `${monthName} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
}

// Get Monday of a given date
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
}

// Get Friday from Monday
function getFriday(monday: Date): Date {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return new Date(friday.getFullYear(), friday.getMonth(), friday.getDate(), 12, 0, 0);
}

// Calculate week index in month (1 to 5)
function getWeekIndexInMonth(monday: Date): number {
  const firstDayOfMonth = new Date(monday.getFullYear(), monday.getMonth(), 1, 12, 0, 0);
  const firstMonday = getMonday(firstDayOfMonth);
  const diffTime = monday.getTime() - firstMonday.getTime();
  const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diffWeeks + 1);
}

// Interface for Week Data in Monthly View
interface WeekGroup {
  weekNum: number;
  startDate: string;
  endDate: string;
  plans: SalesPlan[];
}

export default function MultiDayReportModal({
  isOpen,
  onClose,
  defaultStartDate,
}: MultiDayReportModalProps) {
  // Current Active Reference Date
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (defaultStartDate) return parseDateYMD(defaultStartDate);
    return new Date();
  });

  const [reportMode, setReportMode] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [salesName] = useState('Akachai Habantan (Sales Executive)');
  const [allPlans, setAllPlans] = useState<SalesPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Monday and Friday for Weekly View
  const currentMonday = useMemo(() => getMonday(currentDate), [currentDate]);
  const currentFriday = useMemo(() => getFriday(currentMonday), [currentMonday]);

  const activeStartStr = useMemo(() => formatDateYMD(currentMonday), [currentMonday]);
  const activeEndStr = useMemo(() => formatDateYMD(currentFriday), [currentFriday]);
  const activeWeekNum = useMemo(() => getWeekIndexInMonth(currentMonday), [currentMonday]);

  // Active Month Range for Monthly View
  const monthStartStr = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 12, 0, 0);
    return formatDateYMD(firstDay);
  }, [currentDate]);

  const monthEndStr = useMemo(() => {
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 12, 0, 0);
    return formatDateYMD(lastDay);
  }, [currentDate]);

  // Fetch Data based on Mode
  const loadData = async () => {
    setLoading(true);
    try {
      if (reportMode === 'WEEKLY') {
        const data = await fetchFullSalesPlansInRange(activeStartStr, activeEndStr);
        setAllPlans(data || []);
      } else {
        const data = await fetchFullSalesPlansInRange(monthStartStr, monthEndStr);
        setAllPlans(data || []);
      }
    } catch (e) {
      console.error('Error fetching plans for report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, reportMode, activeStartStr, activeEndStr, monthStartStr, monthEndStr]);

  // Navigate Week
  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleThisWeek = () => {
    setCurrentDate(new Date());
  };

  // Navigate Month
  const handlePrevMonth = () => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1, 12, 0, 0);
    setCurrentDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 12, 0, 0);
    setCurrentDate(next);
  };

  // Build Monthly Week Groups (Mondays to Fridays in the active month)
  const monthlyWeeksData = useMemo<WeekGroup[]>(() => {
    if (reportMode !== 'MONTHLY') return [];

    const weeks: WeekGroup[] = [];
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 12, 0, 0);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 12, 0, 0);

    let walker = getMonday(firstDayOfMonth);
    let weekCounter = 1;

    while (walker <= lastDayOfMonth || walker.getMonth() === currentDate.getMonth()) {
      const wMon = new Date(walker);
      const wFri = getFriday(wMon);
      const startStr = formatDateYMD(wMon);
      const endStr = formatDateYMD(wFri);

      // Filter plans belonging to this week
      const weekPlans = allPlans.filter((p) => p.plan_date >= startStr && p.plan_date <= endStr);

      weeks.push({
        weekNum: weekCounter,
        startDate: startStr,
        endDate: endStr,
        plans: weekPlans,
      });

      weekCounter++;
      walker.setDate(walker.getDate() + 7);

      if (walker.getMonth() !== currentDate.getMonth() && walker > lastDayOfMonth) {
        break;
      }
    }

    return weeks;
  }, [reportMode, currentDate, allPlans]);

  // Calculate Metrics for a given list of plans
  const computeWeekMetrics = (plans: SalesPlan[]) => {
    let totalItems = 0;
    let visits = 0;
    let demos = 0;
    let calls = 0;
    let quotations = 0;
    let plannedDaysCount = 0;

    plans.forEach((p) => {
      const items = p.items || [];
      if (items.length > 0) plannedDaysCount++;
      totalItems += items.length;

      items.forEach((it) => {
        if (it.activity_type === 'VISIT') visits++;
        else if (it.activity_type === 'DEMO') demos++;
        else if (it.activity_type === 'CALL') calls++;
        else if (it.activity_type === 'QUOTATION') quotations++;
      });
    });

    return { totalItems, visits, demos, calls, quotations, plannedDaysCount };
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Single A4 Sheet Renderer for 1 Week
  const renderWeekSheet = (
    weekNum: number,
    startStr: string,
    endStr: string,
    weekPlans: SalesPlan[],
    isMonthly: boolean = false
  ) => {
    const metrics = computeWeekMetrics(weekPlans);

    return (
      <div
        key={`${startStr}-${endStr}`}
        className="a4-sheet-container bg-white text-slate-900 w-full max-w-[210mm] p-6 rounded-2xl shadow-xl border border-slate-300 font-sans relative flex flex-col justify-between space-y-2.5 text-xs mb-8 box-border"
      >
        <div className="space-y-2 flex-1 flex flex-col">
          {/* 1. Official Corporate Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-2 space-y-2 avoid-break">
            {/* Company Brand & Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <img src="/images/logo.png" alt="Logo" className="h-8 sm:h-9 w-auto object-contain" />
                <div>
                  <h1 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase leading-none">
                    CHICAI ELECTRIC (THAILAND) CO., LTD.
                  </h1>
                </div>
              </div>

              <div className="text-right text-[9.5px] text-slate-500 font-mono hidden sm:block">
                <p className="font-bold text-slate-700">SALES ACTIVITY REPORT</p>
                <p>Executive Weekly Plan</p>
              </div>
            </div>

            {/* Formal Document Title Banner */}
            <div className="bg-slate-900 text-white rounded-lg py-1 px-3 flex items-center justify-between shadow-2xs border border-slate-900">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black tracking-wide uppercase">
                  WEEKLY SALES ACTION PLAN & SCHEDULE
                </span>
              </div>
              <span className="bg-teal-400 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded shadow-2xs">
                Week {weekNum}
              </span>
            </div>

            {/* 4-Column Balanced Proportional Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-[1.3fr_1.7fr_1fr_1fr] gap-2 bg-slate-50 border border-slate-300 rounded-lg p-2 text-[10px]">
              <div className="sm:border-r border-slate-300 sm:pr-2 min-w-0">
                <span className="text-slate-500 block text-[9px] font-medium">Plan Period</span>
                <span className="font-bold text-teal-800 whitespace-nowrap block">{formatEngDateShort(startStr)} - {formatEngDateShort(endStr)}</span>
              </div>
              <div className="sm:border-r border-slate-300 sm:pr-2 min-w-0">
                <span className="text-slate-500 block text-[9px] font-medium">Prepared By</span>
                <span className="font-bold text-slate-800 whitespace-nowrap block">{salesName}</span>
              </div>
              <div className="sm:border-r border-slate-300 sm:pr-2 min-w-0">
                <span className="text-slate-500 block text-[9px] font-medium">Report Date</span>
                <span className="font-semibold text-slate-700 whitespace-nowrap block">{formatEngDateShort(formatDateYMD(new Date()))}</span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-500 block text-[9px] font-medium">Document Status</span>
                <span className="font-bold text-teal-700 whitespace-nowrap block">Pending Approval</span>
              </div>
            </div>
          </div>



          {/* 2. Executive Weekly KPI Strip */}
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-300 avoid-break">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <span>📊 Weekly Executive Summary</span>
              </span>
              <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                {metrics.plannedDaysCount} Working Days / {metrics.totalItems} Target Factories
              </span>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5 text-center">
              <div className="bg-white py-1 px-1 rounded border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 block font-medium whitespace-nowrap">Working Days</span>
                <span className="text-xs font-black text-slate-900 whitespace-nowrap">{metrics.plannedDaysCount} Days</span>
              </div>
              <div className="bg-white py-1 px-1 rounded border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 block font-medium whitespace-nowrap">Total Factories</span>
                <span className="text-xs font-black text-teal-700 whitespace-nowrap">{metrics.totalItems} Sites</span>
              </div>
              <div className="bg-white py-1 px-1 rounded border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 block font-medium whitespace-nowrap">On-site Visits</span>
                <span className="text-xs font-black text-blue-700 whitespace-nowrap">{metrics.visits} Sites</span>
              </div>
              <div className="bg-white py-1 px-1 rounded border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 block font-medium whitespace-nowrap">Product Demos</span>
                <span className="text-xs font-black text-amber-700 whitespace-nowrap">{metrics.demos} Sites</span>
              </div>
              <div className="bg-white py-1 px-1 rounded border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 block font-medium whitespace-nowrap">Calls & Quotations</span>
                <span className="text-xs font-black text-emerald-700 whitespace-nowrap">{metrics.calls + metrics.quotations} Tasks</span>
              </div>
            </div>
          </div>

          {/* 3. Detailed Day-by-Day Unified Table */}
          <div className="space-y-1 flex-1">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block avoid-break">
              📋 Weekly Schedule & Action Items
            </span>

            {weekPlans.length === 0 || metrics.totalItems === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                No scheduled activities for this week ({formatEngDateShort(startStr)} - {formatEngDateShort(endStr)})
              </div>
            ) : (
              <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs avoid-break">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-1 px-1.5 text-center w-7 whitespace-nowrap">#</th>
                      <th className="py-1 px-1.5 w-12 text-center whitespace-nowrap">Time</th>
                      <th className="py-1 px-2 w-[36%]">Factory Name & Location</th>
                      <th className="py-1 px-1.5 w-[22%]">Contact Person / Phone</th>
                      <th className="py-1 px-1.5 w-24 whitespace-nowrap">Activity Type</th>
                      <th className="py-1 px-1.5">Objective / Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {weekPlans.map((p) => {
                      const items = p.items || [];
                      if (items.length === 0) return null;

                      return (
                        <React.Fragment key={p.id}>
                          {/* Daily Section Header Row */}
                          <tr className="bg-slate-800 text-white font-bold text-[9.5px] border-t border-slate-300">
                            <td colSpan={6} className="py-1 px-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="whitespace-nowrap">📅 {formatEngDateFull(p.plan_date)}</span>
                                  <span className="bg-slate-700 text-slate-200 text-[8.5px] font-normal px-1.5 py-0.2 rounded">
                                    {items.length} Activities
                                  </span>
                                </div>
                                {p.daily_goal && (
                                  <span className="text-[8.5px] text-slate-300 font-normal truncate max-w-xs">
                                    Goal: {p.daily_goal}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Customer Action Items */}
                          {items.map((it, idx) => {
                            const conf =
                              PLAN_ACTIVITY_CONFIGS[it.activity_type as PlanActivityType] ||
                              PLAN_ACTIVITY_CONFIGS.VISIT;

                            return (
                              <tr key={it.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-1 px-1.5 text-center font-bold text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-1 px-1.5 whitespace-nowrap font-medium text-slate-600 text-center">
                                  {it.scheduled_time || '-'}
                                </td>
                                <td className="py-1 px-2">
                                  <span className="font-bold text-slate-900 block leading-tight text-[10.5px]">{it.customer?.name}</span>
                                  <span className="text-[9px] text-slate-500 leading-none">
                                    📍 {it.customer?.district || it.customer?.address || 'Samut Prakan'}
                                  </span>
                                </td>
                                <td className="py-1 px-1.5">
                                  <span className="font-medium text-slate-800 block leading-tight text-[9.5px]">
                                    {it.contact_person || it.customer?.contact_person || '-'}
                                  </span>
                                  {it.customer?.phone && (
                                    <span className="text-[9px] text-slate-500 block leading-none whitespace-nowrap">
                                      📞 {it.customer.phone}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1 px-1.5 whitespace-nowrap">
                                  <span className="font-semibold text-slate-800 text-[9.5px] whitespace-nowrap">
                                    {conf.emoji} {conf.label}
                                  </span>
                                </td>
                                <td className="py-1 px-1.5 text-slate-700 leading-tight text-[9.5px]">
                                  {it.objective || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 4. Official Balanced Sign-off Footer */}
        <div className="pt-2 border-t-2 border-slate-300 grid grid-cols-2 gap-4 avoid-break shrink-0">
          {/* Left: Sales Rep Signature */}
          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-300 flex flex-col items-center justify-between text-center text-[9.5px] text-slate-700 min-h-[90px]">
            <p className="font-bold text-slate-800">Prepared By (Sales Representative)</p>
            
            <div className="w-full max-w-[200px] my-0.5 flex flex-col items-center">
              {/* Signature Line */}
              <div className="w-full border-b border-dashed border-slate-400 h-10 mb-2" />
              <p className="font-bold text-slate-900 text-[10.5px] min-h-[14px]">
                Akachai Habantan
              </p>
              <p className="text-[9px] text-slate-600 font-semibold">Position: Sales Executive</p>
            </div>

            <p className="text-[9px] text-slate-500">
              Date: ...... / ...... / .........
            </p>
          </div>

          {/* Right: Management Approval Signature */}
          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-300 flex flex-col items-center justify-between text-center text-[9.5px] text-slate-700 min-h-[90px]">
            <p className="font-bold text-slate-800">Management Approval</p>
            
            <div className="w-full max-w-[200px] my-0.5 flex flex-col items-center">
              {/* Signature Line */}
              <div className="w-full border-b border-dashed border-slate-400 h-10 mb-2" />
              <p className="font-medium text-slate-600 text-[10px] min-h-[14px]">
                ( .................................................. )
              </p>
              <p className="text-[9px] text-slate-600 font-semibold mt-0.5">Position: Sales Manager / Director</p>
            </div>

            <p className="text-[9px] text-slate-500">
              Date: ...... / ...... / .........
            </p>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Print Style Injector with Exact A4 Fit */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 6mm;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-report-wrapper, #printable-report-wrapper * {
            visibility: visible !important;
          }
          #printable-report-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .a4-sheet-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            box-sizing: border-box !important;
          }
          .a4-sheet-container:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl h-[92vh] max-h-[92vh] bg-slate-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        
        {/* Top Controls Header (Hidden on Print) */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0 no-print z-10 shadow-xs">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#148277] flex items-center justify-center border border-teal-100 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Executive Sales Action Report (A4 / PDF)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Standard format: 1 Week = 1 A4 Page or download full monthly report
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher & Date Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            
            {/* View Mode Toggle: WEEKLY vs MONTHLY */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setReportMode('WEEKLY')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reportMode === 'WEEKLY'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>📄 Weekly Plan (1 A4 Page)</span>
              </button>

              <button
                onClick={() => setReportMode('MONTHLY')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reportMode === 'MONTHLY'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>📚 Full Month ({monthlyWeeksData.length} A4 Pages)</span>
              </button>
            </div>

            {/* Navigation & Period Indicator */}
            {reportMode === 'WEEKLY' ? (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePrevWeek}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleThisWeek}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 hover:bg-teal-100 text-[#148277] transition-colors"
                >
                  Current Week
                </button>

                <button
                  onClick={handleNextWeek}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-slate-800 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                  Week {activeWeekNum}: {formatEngDateShort(activeStartStr)} - {formatEngDateShort(activeEndStr)}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-slate-800 px-3 py-1 bg-teal-50 border border-teal-200 rounded-lg text-teal-800">
                  📅 {ENG_MONTHS_FULL[currentDate.getMonth()]} {currentDate.getFullYear()} ({monthlyWeeksData.length} Weeks)
                </span>

                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs shadow-md transition-all touch-press active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {reportMode === 'WEEKLY' ? '🖨️ Print / PDF (1 A4 Page)' : `🖨️ Print Month (${monthlyWeeksData.length} A4 Pages)`}
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* Modal Scrollable Workspace containing the A4 Paper Sheets */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 flex flex-col items-center">
          
          {loading ? (
            <div className="bg-white rounded-2xl p-16 shadow-lg text-center space-y-3 my-auto">
              <Loader2 className="w-8 h-8 animate-spin text-[#1b9b8e] mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Preparing A4 report...</p>
            </div>
          ) : (
            <div id="printable-report-wrapper" className="w-full max-w-[210mm] flex flex-col items-center">
              {reportMode === 'WEEKLY' ? (
                /* Single Weekly Sheet */
                renderWeekSheet(activeWeekNum, activeStartStr, activeEndStr, allPlans, false)
              ) : (
                /* Multi-Week Monthly Sheets */
                monthlyWeeksData.map((w) =>
                  renderWeekSheet(w.weekNum, w.startDate, w.endDate, w.plans, true)
                )
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
