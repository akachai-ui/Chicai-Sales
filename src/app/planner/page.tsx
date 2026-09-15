'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import AddStopModal from '@/components/planner/AddStopModal';
import { DailyPlan, PlannedStop, VISIT_STATUS_CONFIG, VisitStatus } from '@/types/planner';
import {
  getDailyPlan,
  saveDailyPlan,
  formatThaiFullDate,
  formatThaiShortDate,
  getUpcomingPlansSummary,
  generateMorningPlanSummaryText,
  generateEveningResultSummaryText,
  generateMultiStopGoogleMapsUrl,
  getSavedSalesPersonName,
  saveSalesPersonName,
} from '@/lib/planner-storage';
import { supabase } from '@/lib/supabase';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Share2,
  Navigation,
  CheckCircle2,
  Clock,
  Car,
  Phone,
  MapPin,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  Building2,
  User,
  Target,
  Sparkles,
  MessageSquare,
  FileText,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Save,
  Send,
  Eye,
  X,
  Compass,
} from 'lucide-react';
import PlannerRouteMap from '@/components/planner/PlannerRouteMap';
import {
  calculateRouteStats,
  formatDistanceThai,
  estimateDrivingTimeMinutes,
  formatDrivingTimeThai,
} from '@/lib/geo-distance';

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [plan, setPlan] = useState<DailyPlan>(() => getDailyPlan(new Date().toISOString().split('T')[0]));
  const [salesName, setSalesName] = useState<string>('');
  const [isEditingSalesName, setIsEditingSalesName] = useState(false);

  // Modal & Preview States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<'morning' | 'evening' | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  // Syncing to CRM State
  const [syncingStopId, setSyncingStopId] = useState<string | null>(null);
  const [syncedSuccessIds, setSyncedSuccessIds] = useState<string[]>([]);

  // Map View Toggle
  const [showMap, setShowMap] = useState<boolean>(true);

  // Load plan when date changes
  useEffect(() => {
    const loaded = getDailyPlan(selectedDate);
    setPlan(loaded);
    setSalesName(loaded.salesPersonName || getSavedSalesPersonName());
  }, [selectedDate]);

  // Persist plan changes
  const updateAndSavePlan = (updatedPlan: DailyPlan) => {
    setPlan(updatedPlan);
    saveDailyPlan(updatedPlan);
  };

  // Date Navigation Helpers
  const changeDateByDays = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const newDateStr = dateObj.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Save Sales Person Name
  const handleSaveSalesName = () => {
    saveSalesPersonName(salesName);
    const updated = { ...plan, salesPersonName: salesName };
    updateAndSavePlan(updated);
    setIsEditingSalesName(false);
  };

  // Add Stop
  const handleAddStop = (newStop: PlannedStop) => {
    const updatedStops = [...plan.stops, newStop];
    const updated = { ...plan, stops: updatedStops };
    updateAndSavePlan(updated);
  };

  // Remove Stop
  const handleRemoveStop = (stopId: string) => {
    if (!window.confirm('คุณต้องการลบจุดหมายนี้ออกจากแผนใช่หรือไม่?')) return;
    const updatedStops = plan.stops.filter((s) => s.id !== stopId);
    const updated = { ...plan, stops: updatedStops };
    updateAndSavePlan(updated);
  };

  // Move Stop Up / Down
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plan.stops.length) return;

    const newStops = [...plan.stops];
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;

    const updated = { ...plan, stops: newStops };
    updateAndSavePlan(updated);
  };

  // Update Stop Status
  const handleStatusChange = (stopId: string, newStatus: VisitStatus) => {
    const updatedStops = plan.stops.map((s) => (s.id === stopId ? { ...s, status: newStatus } : s));
    const updated = { ...plan, stops: updatedStops };
    updateAndSavePlan(updated);
  };

  // Update Stop Result Note
  const handleResultNoteChange = (stopId: string, note: string) => {
    const updatedStops = plan.stops.map((s) => (s.id === stopId ? { ...s, resultNote: note } : s));
    const updated = { ...plan, stops: updatedStops };
    updateAndSavePlan(updated);
  };

  // Copy or Share Summary to LINE/Supervisor
  const handleCopySummary = async (type: 'morning' | 'evening') => {
    const text =
      type === 'morning'
        ? generateMorningPlanSummaryText(plan)
        : generateEveningResultSummaryText(plan);

    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  // Native Mobile Share (LINE, WhatsApp, Notes)
  const handleNativeShare = async (type: 'morning' | 'evening') => {
    const text =
      type === 'morning'
        ? generateMorningPlanSummaryText(plan)
        : generateEveningResultSummaryText(plan);

    const title =
      type === 'morning'
        ? `แผนงานประจำวัน (${formatThaiFullDate(selectedDate)})`
        : `สรุปผลงานประจำวัน (${formatThaiFullDate(selectedDate)})`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
        });
      } catch (err) {
        // User dismissed or share failed
        handleCopySummary(type);
      }
    } else {
      handleCopySummary(type);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (type: 'morning' | 'evening') => {
    const text =
      type === 'morning'
        ? generateMorningPlanSummaryText(plan)
        : generateEveningResultSummaryText(plan);
    setPreviewTitle(
      type === 'morning' ? '📋 ข้อความสรุปแผนงานช่วงเช้า' : '📊 ข้อความสรุปผลงานช่วงเย็น'
    );
    setPreviewText(text);
  };

  // Sync to CRM Activities table in Supabase
  const handleSyncToCrm = async (stop: PlannedStop) => {
    if (!stop.customerId) {
      alert('จุดหมายนี้ยังไม่ได้ผูกกับรหัสลูกค้าใน CRM');
      return;
    }

    setSyncingStopId(stop.id);
    try {
      const details = [
        `เข้าพบตามแผนงานประจำวัน: ${stop.objective}`,
        stop.resultNote ? `ผลการเข้าพบ: ${stop.resultNote}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const { data, error } = await supabase.from('customer_activities').insert({
        customer_id: stop.customerId,
        activity_type: 'เข้าพบโรงงาน',
        activity_date: selectedDate,
        contact_person: stop.contactPerson || null,
        details: details,
      }).select();

      if (error) throw error;

      // Update stop status to COMPLETED
      handleStatusChange(stop.id, 'COMPLETED');
      setSyncedSuccessIds((prev) => [...prev, stop.id]);
      alert(`✅ บันทึกกิจกรรมเข้าพบของ ${stop.companyName} ลงใน CRM สำเร็จเรียบร้อยแล้ว`);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก CRM: ' + err.message);
    } finally {
      setSyncingStopId(null);
    }
  };

  // Computed Stats
  const stats = useMemo(() => {
    const total = plan.stops.length;
    const completed = plan.stops.filter((s) => s.status === 'COMPLETED').length;
    const inProgress = plan.stops.filter((s) => s.status === 'IN_PROGRESS').length;
    const pending = plan.stops.filter((s) => s.status === 'PLANNED').length;
    const rescheduled = plan.stops.filter((s) => s.status === 'RESCHEDULED' || s.status === 'CANCELLED').length;
    return { total, completed, inProgress, pending, rescheduled };
  }, [plan.stops]);

  // Route Distance & Driving Time Stats
  const routeStats = useMemo(() => {
    return calculateRouteStats(plan.stops);
  }, [plan.stops]);

  const multiStopMapUrl = useMemo(() => {
    return generateMultiStopGoogleMapsUrl(plan.stops);
  }, [plan.stops]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28 sm:pb-12">
      <Navbar />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 w-full flex-1 space-y-4 sm:space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Navigation className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                    แผนการทำงานประจำวัน
                  </h1>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Route Planner
                  </span>
                </div>
                {/* Sales person name editor */}
                <div className="flex items-center space-x-1.5 mt-0.5 text-xs text-slate-500">
                  <span>ผู้ปฏิบัติงาน:</span>
                  {isEditingSalesName ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={salesName}
                        onChange={(e) => setSalesName(e.target.value)}
                        className="px-2 py-0.5 rounded-lg border border-blue-400 text-xs font-bold text-slate-900 focus:outline-none"
                      />
                      <button
                        onClick={handleSaveSalesName}
                        className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                      >
                        บันทึก
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingSalesName(true)}
                      className="font-bold text-slate-800 hover:text-blue-600 flex items-center space-x-1 group"
                      title="คลิกเพื่อเปลี่ยนชื่อผู้ปฏิบัติงาน"
                    >
                      <span>{salesName}</span>
                      <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Date Navigator Bar & Advance Planning Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-auto">
              {/* Quick Presets */}
              <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setSelectedDate(todayStr);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isToday
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  📍 วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  ⏩ พรุ่งนี้
                </button>
              </div>

              {/* Date Stepper & Native Date Picker */}
              <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => changeDateByDays(-1)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs transition-all active:scale-95"
                  title="วันก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="relative px-3 flex items-center space-x-1.5 min-w-[170px] justify-center text-xs font-extrabold text-slate-800 group cursor-pointer">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{formatThaiFullDate(selectedDate)}</span>
                  
                  {/* Invisible native date picker over label */}
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="คลิกเพื่อเลือกวันที่ล่วงหน้าตามต้องการ"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => changeDateByDays(1)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs transition-all active:scale-95"
                  title="วันถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Advance Planning Context Badge */}
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            let badgeBg = 'bg-blue-50 text-blue-800 border-blue-200';
            let badgeIcon = '📍';
            let badgeText = 'กำลังดูแผนการปฏิบัติงานวันนี้';

            if (selectedDate === tomorrowStr) {
              badgeBg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
              badgeIcon = '⏩';
              badgeText = 'กำลังวางแผนการทำงานล่วงหน้าสำหรับ "วันพรุ่งนี้"';
            } else if (selectedDate > todayStr) {
              badgeBg = 'bg-purple-50 text-purple-800 border-purple-200';
              badgeIcon = '🗓️';
              badgeText = `กำลังวางแผนการทำงานล่วงหน้าสำหรับ "${formatThaiFullDate(selectedDate)}"`;
            } else if (selectedDate < todayStr) {
              badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
              badgeIcon = '📜';
              badgeText = `ประวัติการทำงานย้อนหลังของ "${formatThaiFullDate(selectedDate)}"`;
            }

            return (
              <div className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold border ${badgeBg}`}>
                <div className="flex items-center space-x-2">
                  <span>{badgeIcon}</span>
                  <span>{badgeText}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {plan.stops.length > 0 ? `${plan.stops.length} จุดหมาย` : 'ยังไม่มีรายการ'}
                </div>
              </div>
            );
          })()}

          {/* Upcoming Schedule Carousel / Shortcut Strip */}
          {(() => {
            const upcoming = getUpcomingPlansSummary(new Date().toISOString().split('T')[0], 14);
            if (upcoming.length === 0) return null;

            return (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-600">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    <span>แผนงานล่วงหน้าที่จัดไว้แล้วใน 14 วันนี้ ({upcoming.length} วัน):</span>
                  </span>
                  <span className="text-slate-400 font-medium">คลิกเพื่อสลับวัน</span>
                </div>
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
                  {upcoming.map((u) => {
                    const isCurrent = u.date === selectedDate;
                    const isTodayU = u.date === new Date().toISOString().split('T')[0];
                    const isTomorrowU = u.date === new Date(Date.now() + 86400000).toISOString().split('T')[0];
                    
                    let dayTitle = u.thaiLabel;
                    if (isTodayU) dayTitle = `วันนี้ (${u.thaiLabel})`;
                    else if (isTomorrowU) dayTitle = `พรุ่งนี้ (${u.thaiLabel})`;

                    return (
                      <button
                        key={u.date}
                        type="button"
                        onClick={() => setSelectedDate(u.date)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center space-x-1.5 border ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200'
                            : 'bg-white hover:bg-indigo-50/70 text-slate-800 border-slate-200'
                        }`}
                      >
                        <span>📅</span>
                        <span>{dayTitle}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            isCurrent
                              ? 'bg-white text-indigo-700'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {u.stopsCount} จุด
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Quick KPI Stats & Total Distance Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 pt-2 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
                {stats.total}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-extrabold text-slate-400">เป้าหมายทั้งหมด</p>
                <p className="text-xs font-bold text-slate-800 truncate">{stats.total} โรงงาน</p>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center space-x-3 col-span-2 sm:col-span-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                🚗
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-extrabold text-indigo-700">ระยะทางรวม</p>
                <p className="text-xs font-bold text-indigo-950 truncate">
                  {routeStats.totalKm > 0 ? `~${routeStats.totalKm} กม.` : '-'}
                  {routeStats.totalKm > 0 && (
                    <span className="text-[10px] text-indigo-600 font-medium ml-1">
                      ({formatDrivingTimeThai(estimateDrivingTimeMinutes(routeStats.totalKm))})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm shrink-0">
                {stats.completed}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-extrabold text-emerald-700">เข้าพบสำเร็จ</p>
                <p className="text-xs font-bold text-emerald-900 truncate">
                  {stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
                {stats.inProgress}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-extrabold text-blue-700">กำลังเข้าพบ</p>
                <p className="text-xs font-bold text-blue-900 truncate">{stats.inProgress} แห่ง</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm shrink-0">
                {stats.pending}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-extrabold text-amber-700">รอดำเนินการ</p>
                <p className="text-xs font-bold text-amber-900 truncate">{stats.pending} แห่ง</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Toolbar: Send to Boss (LINE) & Navigation */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-amber-400 font-extrabold text-xs sm:text-sm flex items-center space-x-1">
                  <Sparkles className="w-4 h-4" />
                  <span>ส่งสรุปรายงานให้หัวหน้า (1-Click)</span>
                </span>
                <span className="text-[9px] bg-white/15 text-slate-200 px-2 py-0.5 rounded-full font-bold">
                  LINE Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                คัดลอกข้อความจัดรูปแบบทางการพร้อมพิกัดและเบอร์โทร เพื่อส่งเข้ากลุ่ม LINE หรือรายงานหัวหน้า
              </p>
            </div>

            {/* Multi-stop Route Button & Map Toggle */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  showMap
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/15 text-slate-200 hover:bg-white/25'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{showMap ? 'ซ่อนแผนที่เส้นทาง' : '🗺️ ดูแผนที่เส้นทาง'}</span>
              </button>

              {multiStopMapUrl && (
                <a
                  href={multiStopMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>เปิด Google Maps รวม</span>
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* Morning Plan Summary Button */}
            <div className="flex items-center space-x-1.5 bg-white/10 p-2 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => handleNativeShare('morning')}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-xs active:scale-95"
              >
                {copiedType === 'morning' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>คัดลอกแผนช่วงเช้าแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>📋 ส่งสรุปแผนช่วงเช้า (LINE)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleOpenPreview('morning')}
                className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs transition-colors shrink-0"
                title="ดูตัวอย่างข้อความ"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Evening Result Summary Button */}
            <div className="flex items-center space-x-1.5 bg-white/10 p-2 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => handleNativeShare('evening')}
                className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-xs active:scale-95"
              >
                {copiedType === 'evening' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>คัดลอกสรุปผลแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>📊 ส่งสรุปผลช่วงเย็น (LINE)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleOpenPreview('evening')}
                className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs transition-colors shrink-0"
                title="ดูตัวอย่างข้อความ"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Route Map View (If enabled and has stops) */}
        {showMap && plan.stops.length > 0 && (
          <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                  แผนที่แสดงเส้นทางและระยะทางวิ่งรถ ({plan.stops.length} จุดหมาย)
                </h3>
              </div>
              {routeStats.totalKm > 0 && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ระยะทางรวม: ~{routeStats.totalKm} กม.
                </span>
              )}
            </div>

            <div className="h-72 sm:h-96 w-full">
              <PlannerRouteMap stops={plan.stops} />
            </div>
          </div>
        )}

        {/* Itinerary Stops List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center space-x-2">
              <Car className="w-4 h-4 text-blue-600" />
              <span>ลำดับการเข้าพบประจำวัน ({plan.stops.length} จุดหมาย)</span>
            </h2>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95 touch-press"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มจุดหมาย</span>
            </button>
          </div>

          {plan.stops.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                  ยังไม่มีรายการเข้าพบในวันที่ {formatThaiFullDate(selectedDate)}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  คลิกปุ่ม &quot;เพิ่มจุดหมาย&quot; เพื่อเลือกโรงงานจากฐานข้อมูล หรือเพิ่มเป้าหมายใหม่ได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มจุดหมายแรกของวัน</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {plan.stops.map((stop, index) => {
                const statusConf = VISIT_STATUS_CONFIG[stop.status] || VISIT_STATUS_CONFIG.PLANNED;
                const isFirst = index === 0;
                const isLast = index === plan.stops.length - 1;

                const directGpsUrl =
                  stop.googleMapsUrl ||
                  (stop.latitude && stop.longitude
                    ? `https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        stop.companyName + ' ' + (stop.province || '')
                      )}`);

                return (
                  <React.Fragment key={stop.id}>
                    <div
                      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                    >
                    {/* Stop Header Bar */}
                    <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                          {index + 1}
                        </div>
                        {stop.plannedTime && (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                            ⏰ {stop.plannedTime} น.
                          </span>
                        )}
                        <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {stop.companyName}
                        </h3>
                      </div>

                      {/* Reorder and Delete Actions */}
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveStop(index, 'up')}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                          title="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveStop(index, 'down')}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                          title="เลื่อนลง"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(stop.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors"
                          title="ลบจุดหมายนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stop Details */}
                    <div className="p-3.5 sm:p-4 space-y-3 text-xs">
                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600">
                        {(stop.district || stop.province) && (
                          <div className="flex items-center space-x-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>
                              {stop.district ? `${stop.district}, ` : ''}
                              <b>{stop.province}</b>
                            </span>
                          </div>
                        )}

                        {stop.contactPerson && (
                          <div className="flex items-center space-x-1 text-slate-700">
                            <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>คุณ{stop.contactPerson}</span>
                          </div>
                        )}

                        {stop.phone && (
                          <a
                            href={`tel:${stop.phone}`}
                            className="flex items-center space-x-1 text-emerald-700 font-bold hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{stop.phone}</span>
                          </a>
                        )}
                      </div>

                      {/* Objective */}
                      <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start space-x-2">
                        <Target className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-blue-900 block text-[11px]">
                            วัตถุประสงค์การเข้าพบ:
                          </span>
                          <span className="text-blue-950 font-medium">{stop.objective}</span>
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                          สถานะการเข้าพบ
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED'] as VisitStatus[]).map(
                            (st) => {
                              const conf = VISIT_STATUS_CONFIG[st];
                              const isSelected = stop.status === st;

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(stop.id, st)}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                                    isSelected
                                      ? `${conf.bg} ${conf.color} ${conf.border} shadow-xs ring-1 ring-current`
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {st === 'PLANNED' && <Clock className="w-3.5 h-3.5" />}
                                  {st === 'IN_PROGRESS' && <Car className="w-3.5 h-3.5" />}
                                  {st === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {st === 'RESCHEDULED' && <RotateCcw className="w-3.5 h-3.5" />}
                                  <span>{conf.label}</span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Result Note Area */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                          สรุปผลการเข้าพบ / ข้อสรุปหน้างาน (Result Note)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="พิมพ์สรุปผลการเข้าพบ เช่น ลูกค้าสนใจเครื่องกรอง LYJ-001-D ขอนัดส่งใบเสนอราคา..."
                          value={stop.resultNote || ''}
                          onChange={(e) => handleResultNoteChange(stop.id, e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs font-sans text-slate-800 transition-all leading-relaxed"
                        />
                      </div>

                      {/* Action Bar per stop */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        {/* Google Maps GPS Button */}
                        <a
                          href={directGpsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          <span>เปิดนำทาง GPS</span>
                        </a>

                        {/* Sync to CRM Activity Button */}
                        {stop.customerId && (
                          <button
                            type="button"
                            disabled={syncingStopId === stop.id || syncedSuccessIds.includes(stop.id)}
                            onClick={() => handleSyncToCrm(stop)}
                            className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                              syncedSuccessIds.includes(stop.id)
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 active:scale-95'
                            }`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>
                              {syncedSuccessIds.includes(stop.id)
                                ? 'บันทึก CRM แล้ว ✅'
                                : 'บันทึกลง CRM (Timeline)'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Distance Connector to Next Stop */}
                  {!isLast && (
                    <div className="flex items-center justify-center my-1.5">
                      <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-200/80 border border-slate-300/80 text-[10.5px] font-extrabold text-slate-700 shadow-2xs">
                        <Car className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>
                          ระยะทางไปจุดที่ {index + 2}:{' '}
                          <b className="text-blue-700">
                            {formatDistanceThai(routeStats.legDistances[index]) || 'ตามเส้นทาง'}
                          </b>
                        </span>
                        {routeStats.legDistances[index] !== null && (
                          <span className="text-slate-500 font-medium">
                            ({formatDrivingTimeThai(estimateDrivingTimeMinutes(routeStats.legDistances[index]))})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          )}
        </div>
      </main>

      {/* Add Stop Modal */}
      <AddStopModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStop={handleAddStop}
        existingCustomerIds={plan.stops.map((s) => s.customerId).filter(Boolean) as number[]}
      />

      {/* Preview Message Modal */}
      {previewText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>{previewTitle}</span>
              </h3>
              <button
                onClick={() => setPreviewText(null)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50 text-xs sm:text-sm font-mono whitespace-pre-wrap text-slate-800 leading-relaxed border-b border-slate-200 select-all">
              {previewText}
            </div>
            <div className="p-3 bg-white flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPreviewText(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(previewText);
                  alert('คัดลอกข้อความสำหรับส่ง LINE เรียบร้อยแล้ว');
                  setPreviewText(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/30"
              >
                <Copy className="w-4 h-4" />
                <span>คัดลอกข้อความ (LINE)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
