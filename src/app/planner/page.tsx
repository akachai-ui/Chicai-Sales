'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import PlanCalendarBar from '@/components/planner/PlanCalendarBar';
import PlanItemCard from '@/components/planner/PlanItemCard';
import PlanRouteMap from '@/components/planner/PlanRouteMap';
import AddCustomerToPlanModal from '@/components/planner/AddCustomerToPlanModal';
import MultiDayReportModal from '@/components/planner/MultiDayReportModal';
import SalesVisitReportModal from '@/components/planner/SalesVisitReportModal';
import { SalesPlan, SalesPlanItem, PlanActivityType, PLAN_ACTIVITY_CONFIGS } from '@/types/planner';
import { MyCustomer } from '@/types/customer';
import {
  fetchMyCustomers,
  fetchSalesPlanByDate,
  fetchPlansInRange,
  fetchPlannedCustomerDates,
  upsertSalesPlan,
  addSalesPlanItem,
  updateSalesPlanItem,
  deleteSalesPlanItem,
  subscribeToRealtimeChanges,
} from '@/lib/supabase';
import { getLocalMyCustomers, syncMyCustomersFromSupabase } from '@/lib/portfolio';
import {
  Calendar as CalendarIcon,
  Plus,
  MapPin,
  Target,
  Clock,
  Sparkles,
  CheckCircle2,
  Building2,
  Navigation,
  ArrowRight,
  ListOrdered,
  FileText,
  Loader2,
  Save,
  Printer,
} from 'lucide-react';
import Link from 'next/link';

const ENG_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

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

export default function PlannerPage() {
  const todayStr = formatDateYMD(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [currentPlan, setCurrentPlan] = useState<SalesPlan | null>(null);
  const [planItems, setPlanItems] = useState<SalesPlanItem[]>([]);
  const [myCustomers, setMyCustomers] = useState<MyCustomer[]>([]);
  const [plansCountMap, setPlansCountMap] = useState<Record<string, number>>({});
  const [customerPlannedDatesMap, setCustomerPlannedDatesMap] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Daily goal & target zone fields
  const [targetZone, setTargetZone] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMultiDayReportOpen, setIsMultiDayReportOpen] = useState(false);
  const [reportPlanItem, setReportPlanItem] = useState<SalesPlanItem | null>(null);

  // Format date in English
  const dateFormatted = useMemo(() => {
    const dateObj = parseDateYMD(selectedDate);
    return `${ENG_MONTHS_SHORT[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
  }, [selectedDate]);

  // Load customer portfolio
  const loadPortfolio = async () => {
    const local = getLocalMyCustomers();
    if (local.length > 0) setMyCustomers(local);
    const data = await syncMyCustomersFromSupabase();
    if (data) setMyCustomers(data);
  };

  // Load plan for selected date
  const loadPlanForDate = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const plan = await fetchSalesPlanByDate(dateStr);
      if (plan) {
        setCurrentPlan(plan);
        setPlanItems(plan.items || []);
        setTargetZone(plan.target_zone || '');
        setDailyGoal(plan.daily_goal || '');
      } else {
        setCurrentPlan(null);
        setPlanItems([]);
        setTargetZone('');
        setDailyGoal('');
      }
    } catch (e) {
      console.error('Error loading plan for date:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load counts for calendar strip & planned dates map
  const loadCounts = useCallback(async () => {
    try {
      const start = new Date();
      start.setDate(start.getDate() - 15);
      const end = new Date();
      end.setDate(end.getDate() + 30);
      const [map, datesMap] = await Promise.all([
        fetchPlansInRange(formatDateYMD(start), formatDateYMD(end)),
        fetchPlannedCustomerDates(),
      ]);
      setPlansCountMap(map);
      if (datesMap) setCustomerPlannedDatesMap(datesMap);
    } catch (e) {
      console.error('Error loading counts map:', e);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadPlanForDate(selectedDate);
  }, [selectedDate, loadPlanForDate]);

  // Realtime subscription for plans
  useEffect(() => {
    const unsub = subscribeToRealtimeChanges(['sales_plans', 'sales_plan_items'], () => {
      loadPlanForDate(selectedDate);
      loadCounts();
    });
    return () => unsub();
  }, [selectedDate, loadPlanForDate, loadCounts]);

  // Save Goal & Target Zone
  const handleSaveGoal = async () => {
    setIsSavingGoal(true);
    try {
      const updated = await upsertSalesPlan({
        plan_date: selectedDate,
        target_zone: targetZone.trim() || null,
        daily_goal: dailyGoal.trim() || null,
      });
      if (updated) {
        setCurrentPlan((prev) => ({
          ...(prev || { id: updated.id, plan_date: selectedDate, status: 'PLANNED' }),
          ...updated,
        }));
      }
    } catch (e) {
      console.error('Error saving goal:', e);
    } finally {
      setIsSavingGoal(false);
    }
  };

  // Add Customer into Plan
  const handleAddCustomerToPlan = async (payload: {
    my_customer_id: number;
    activity_type: PlanActivityType;
    scheduled_time: string | null;
    objective: string | null;
    contact_person: string | null;
  }) => {
    let planId = currentPlan?.id;

    // Create plan header if it doesn't exist yet
    if (!planId) {
      const newPlan = await upsertSalesPlan({
        plan_date: selectedDate,
        target_zone: targetZone.trim() || null,
        daily_goal: dailyGoal.trim() || null,
        status: 'PLANNED',
      });
      if (newPlan) {
        planId = newPlan.id;
        setCurrentPlan(newPlan);
      }
    }

    if (!planId) {
      alert('Unable to create plan. Please try again.');
      return;
    }

    const nextOrder = planItems.length + 1;
    const newItem = await addSalesPlanItem({
      plan_id: planId,
      my_customer_id: payload.my_customer_id,
      sequence_order: nextOrder,
      activity_type: payload.activity_type,
      scheduled_time: payload.scheduled_time,
      objective: payload.objective,
      contact_person: payload.contact_person,
    });

    if (newItem) {
      setPlanItems((prev) => [...prev, newItem]);
      loadCounts();
    }
  };

  // Reorder Item (Move Up / Down)
  const handleReorder = async (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= planItems.length) return;

    const newItems = [...planItems];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    // Update sequence orders locally
    const updatedWithOrder = newItems.map((it, idx) => ({
      ...it,
      sequence_order: idx + 1,
    }));
    setPlanItems(updatedWithOrder);

    // Persist to Supabase
    try {
      await Promise.all(
        updatedWithOrder.map((it) =>
          updateSalesPlanItem(it.id, { sequence_order: it.sequence_order })
        )
      );
    } catch (e) {
      console.error('Failed to update orders:', e);
    }
  };

  // Update Item Status
  const handleUpdateItemStatus = async (itemId: number, newStatus: string) => {
    setPlanItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: newStatus } : it))
    );
    try {
      await updateSalesPlanItem(itemId, { status: newStatus });
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  // Delete Item from Plan
  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to remove this factory from today\'s plan?')) return;
    setPlanItems((prev) => prev.filter((it) => it.id !== itemId));
    try {
      await deleteSalesPlanItem(itemId);
      loadCounts();
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  };

  // Planned Customer IDs for check
  const plannedCustomerIds = useMemo(() => {
    return planItems.map((it) => it.my_customer_id);
  }, [planItems]);

  // Activity Stats Breakdown for the day
  const dailyStats = useMemo(() => {
    let visits = 0;
    let demos = 0;
    let calls = 0;
    let quotations = 0;
    let completed = 0;

    planItems.forEach((it) => {
      if (it.activity_type === 'VISIT') visits++;
      else if (it.activity_type === 'DEMO') demos++;
      else if (it.activity_type === 'CALL') calls++;
      else if (it.activity_type === 'QUOTATION') quotations++;

      if (it.status === 'COMPLETED') completed++;
    });

    return { total: planItems.length, visits, demos, calls, quotations, completed };
  }, [planItems]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-8">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 w-full flex-1 space-y-4 sm:space-y-6">
        
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1b9b8e] via-teal-800 to-slate-900 text-white p-5 sm:p-8 shadow-lg shadow-teal-900/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-[11px] sm:text-xs font-semibold text-teal-200">
                <CalendarIcon className="w-3.5 h-3.5 text-teal-300" />
                <span>Field Sales Planner & Route Management</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                Sales Action Planner
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 max-w-xl leading-relaxed">
                Set daily goals, organize visit routes for portfolio factories, and generate executive reports
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-[#148277] font-bold text-xs sm:text-sm shadow-md hover:bg-teal-50 transition-all touch-press active:scale-95"
              >
                <Plus className="w-4 h-4 text-[#1b9b8e]" />
                <span>+ Add Factory to Plan</span>
              </button>

              <button
                onClick={() => setIsMultiDayReportOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-md border border-slate-700/80 transition-all touch-press active:scale-95"
              >
                <FileText className="w-4 h-4 text-teal-300" />
                <span>📑 Executive Report (A4 / PDF)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector & Week Strip */}
        <PlanCalendarBar
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d)}
          plansCountMap={plansCountMap}
        />

        {/* Goal & Target Zone Banner */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#1b9b8e]" />
              <span>Daily Key Objectives & Target Area</span>
            </span>
            <button
              onClick={handleSaveGoal}
              disabled={isSavingGoal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingGoal ? 'Saving...' : 'Save Objectives'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Target Zone / Area:
              </label>
              <input
                type="text"
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                placeholder="e.g. Bangpoo Industrial Estate, Kingkaew"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 font-medium focus:bg-white focus:ring-2 focus:ring-[#1b9b8e] outline-none"
              />
            </div>
            <div className="sm:col-span-8">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Primary Goal / Objective:
              </label>
              <input
                type="text"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                placeholder="e.g. Conduct 1 Machine Demo, send 2 quotations, follow up pipeline"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 font-medium focus:bg-white focus:ring-2 focus:ring-[#1b9b8e] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Left Column: Plan Items List (7 cols) */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4">
            
            {/* List Header & KPI Summary */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">
                  Scheduled Factories
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-[#148277] text-xs font-bold">
                  {dailyStats.total} Factories
                </span>
              </div>

              {/* Activity breakdown tags */}
              <div className="flex items-center space-x-1.5 text-[11px] font-bold flex-wrap gap-y-1">
                {dailyStats.visits > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    🚗 Visit {dailyStats.visits}
                  </span>
                )}
                {dailyStats.demos > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                    🔬 Demo {dailyStats.demos}
                  </span>
                )}
                {dailyStats.calls > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    📞 Call {dailyStats.calls}
                  </span>
                )}
                {dailyStats.quotations > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                    📄 Quote {dailyStats.quotations}
                  </span>
                )}
              </div>
            </div>

            {/* Plan Items List */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#1b9b8e] mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Loading plan items...</p>
              </div>
            ) : planItems.length === 0 ? (
              /* Empty Plan State */
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#1b9b8e] flex items-center justify-center mx-auto">
                  <CalendarIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    No activities scheduled for {dateFormatted}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select factories from your portfolio ({myCustomers.length} factories) to schedule visit times and objectives.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs shadow-md transition-all touch-press active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Factory to Daily Plan</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {planItems.map((item, idx) => (
                  <PlanItemCard
                    key={item.id}
                    item={item}
                    index={idx}
                    totalItems={planItems.length}
                    onMoveUp={() => handleReorder(idx, 'UP')}
                    onMoveDown={() => handleReorder(idx, 'DOWN')}
                    onDelete={() => handleDeleteItem(item.id)}
                    onUpdateStatus={(st) => handleUpdateItemStatus(item.id, st)}
                    onLogReport={() => setReportPlanItem(item)}
                  />
                ))}

                {/* Bottom Add Button */}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 text-slate-600 hover:text-[#148277] font-bold text-xs flex items-center justify-center gap-2 transition-all touch-press"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Another Factory to Today&apos;s Plan</span>
                </button>
              </div>
            )}

          </div>

          {/* Right Column: Route Map & Share Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Route Map */}
            <PlanRouteMap items={planItems} />

            {/* Executive Report Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl sm:rounded-3xl p-5 shadow-lg space-y-3 border border-slate-700">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Executive Sales Report (A4 / PDF)</h4>
                  <p className="text-[11px] text-slate-300">
                    Generate weekly & monthly official A4 reports with signature blocks
                  </p>
                </div>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  onClick={() => setIsMultiDayReportOpen(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs shadow-md transition-all touch-press active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>📑 เปิดเอกสารรายงานสำหรับพิมพ์ / บันทึก PDF</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Add Customer Modal */}
      <AddCustomerToPlanModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        myCustomers={myCustomers}
        plannedCustomerIds={plannedCustomerIds}
        selectedDate={selectedDate}
        customerPlannedDatesMap={customerPlannedDatesMap}
        onAddCustomer={handleAddCustomerToPlan}
        referenceCustomer={planItems.length > 0 ? planItems[planItems.length - 1].customer : null}
      />

      {/* Multi-Day Executive A4 Report Modal */}
      <MultiDayReportModal
        isOpen={isMultiDayReportOpen}
        onClose={() => setIsMultiDayReportOpen(false)}
      />

      {/* Individual Sales Visit Report Modal (A4 & Log) */}
      <SalesVisitReportModal
        isOpen={Boolean(reportPlanItem)}
        onClose={() => setReportPlanItem(null)}
        customer={reportPlanItem?.customer || null}
        planItem={reportPlanItem}
        onReportSaved={() => {
          loadPlanForDate(selectedDate);
        }}
      />
    </div>
  );
}
