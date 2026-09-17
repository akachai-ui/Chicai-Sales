'use client';

import React, { useState, useMemo } from 'react';
import { MyCustomer } from '@/types/customer';
import { PlanActivityType, PLAN_ACTIVITY_CONFIGS } from '@/types/planner';
import {
  X,
  Search,
  Building2,
  MapPin,
  Clock,
  Target,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { calculateDistanceKm } from '@/lib/geo-distance';

interface AddCustomerToPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  myCustomers: MyCustomer[];
  plannedCustomerIds: number[];
  selectedDate: string; // YYYY-MM-DD
  customerPlannedDatesMap?: Record<number, string[]>;
  referenceCustomer?: MyCustomer | null;
  onAddCustomer: (payload: {
    my_customer_id: number;
    activity_type: PlanActivityType;
    scheduled_time: string | null;
    objective: string | null;
    contact_person: string | null;
  }) => Promise<void>;
}

const ENG_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatShortDateEng(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${ENG_MONTHS_SHORT[m - 1]} ${d}`;
}

export default function AddCustomerToPlanModal({
  isOpen,
  onClose,
  myCustomers,
  plannedCustomerIds,
  selectedDate,
  customerPlannedDatesMap = {},
  referenceCustomer,
  onAddCustomer,
}: AddCustomerToPlanModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'UNPLANNED' | 'NOT_TODAY'>('NOT_TODAY');
  const [selectedCustomer, setSelectedCustomer] = useState<MyCustomer | null>(null);

  // Form inputs for planned item
  const [activityType, setActivityType] = useState<PlanActivityType>('VISIT');
  const [scheduledTime, setScheduledTime] = useState('');
  const [objective, setObjective] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unique districts
  const districts = useMemo(() => {
    const set = new Set<string>();
    myCustomers.forEach((c) => {
      if (c.district) set.add(c.district);
    });
    return Array.from(set).sort();
  }, [myCustomers]);

  // Filter candidates
  const filteredCustomers = useMemo(() => {
    return myCustomers.filter((c) => {
      const plannedDates = customerPlannedDatesMap[c.id] || [];
      const isPlannedToday = plannedCustomerIds.includes(c.id) || plannedDates.includes(selectedDate);
      const isPlannedAnyday = plannedDates.length > 0 || isPlannedToday;

      // Filter by schedule status
      if (scheduleFilter === 'UNPLANNED' && isPlannedAnyday) return false;
      if (scheduleFilter === 'NOT_TODAY' && isPlannedToday) return false;

      if (selectedDistrict !== 'ALL' && c.district !== selectedDistrict) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchDistrict = c.district?.toLowerCase().includes(q);
        const matchContact = c.contact_person?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        if (!matchName && !matchDistrict && !matchContact && !matchPhone) return false;
      }
      return true;
    }).map((c) => {
      // Calculate distance if referenceCustomer is available
      let distanceKm = null;
      if (referenceCustomer?.latitude && referenceCustomer?.longitude && c.latitude && c.longitude) {
        distanceKm = calculateDistanceKm(referenceCustomer.latitude, referenceCustomer.longitude, c.latitude, c.longitude);
      }
      return { ...c, distanceKm };
    }).sort((a, b) => {
      // Sort: If we have distances, sort closest first. If one is missing distance, put it later.
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      // Default fallback: alphabet
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [myCustomers, selectedDistrict, searchQuery, scheduleFilter, customerPlannedDatesMap, plannedCustomerIds, selectedDate, referenceCustomer]);

  const handleSelectCustomer = (cust: MyCustomer) => {
    setSelectedCustomer(cust);
    setContactPerson(cust.contact_person || '');
    if (cust.target_product) {
      setObjective(`Present / Follow-up ${cust.target_product}`);
    } else {
      setObjective('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      await onAddCustomer({
        my_customer_id: selectedCustomer.id,
        activity_type: activityType,
        scheduled_time: scheduledTime.trim() || null,
        objective: objective.trim() || null,
        contact_person: contactPerson.trim() || null,
      });
      // Reset form
      setSelectedCustomer(null);
      setScheduledTime('');
      setObjective('');
      setContactPerson('');
      onClose();
    } catch (e) {
      console.error('Error adding customer to plan:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Selected customer's planned other dates
  const selectedPlannedDates = selectedCustomer ? (customerPlannedDatesMap[selectedCustomer.id] || []) : [];
  const otherPlannedDates = selectedPlannedDates.filter((d) => d !== selectedDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>+ Add Factory to Daily Plan</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-[#148277] font-bold">
                {formatShortDateEng(selectedDate)}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select customer from portfolio to schedule meeting time, activity, and objectives
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns on desktop */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Left Column: Customer Selector */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden">
            
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search factories in portfolio..."
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b9b8e] focus:bg-white"
                  />
                </div>

                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none shrink-0"
                >
                  <option value="ALL">All Districts ({districts.length})</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule Status Filter Pills */}
              <div className="flex items-center space-x-1.5 text-[11px] font-bold">
                <span className="text-slate-400 mr-1">Filter:</span>
                <button
                  type="button"
                  onClick={() => setScheduleFilter('NOT_TODAY')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    scheduleFilter === 'NOT_TODAY'
                      ? 'bg-[#1b9b8e] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Not in Today&apos;s Plan
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter('UNPLANNED')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    scheduleFilter === 'UNPLANNED'
                      ? 'bg-[#1b9b8e] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ✨ Unscheduled
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    scheduleFilter === 'ALL'
                      ? 'bg-[#1b9b8e] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
            {/* Distance Reference Banner */}
            {referenceCustomer && (
              <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px] text-indigo-700 font-medium">
                  ระยะทางอ้างอิงจากคิวล่าสุด: <strong className="font-bold">{referenceCustomer.name}</strong>
                </span>
              </div>
            )}

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-3 space-y-1">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No factories found matching criteria</p>
                  <p className="text-[11px]">Try changing the filter to &quot;All&quot; or clearing your search</p>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const plannedDates = customerPlannedDatesMap[cust.id] || [];
                  const isPlannedToday = plannedCustomerIds.includes(cust.id) || plannedDates.includes(selectedDate);
                  const isSelected = selectedCustomer?.id === cust.id;
                  const otherDates = plannedDates.filter((d) => d !== selectedDate);

                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 border-2 border-[#1b9b8e] shadow-xs'
                          : isPlannedToday
                          ? 'bg-slate-50/80 border border-slate-200/80 opacity-60'
                          : otherDates.length > 0
                          ? 'bg-amber-50/40 border border-amber-200/70 hover:bg-amber-50/80'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                            📍 {cust.district || 'Samut Prakan'}
                          </span>

                          {isPlannedToday ? (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                              ✓ Already in today&apos;s plan
                            </span>
                          ) : otherDates.length > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              🗓️ Scheduled on {otherDates.map(formatShortDateEng).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-teal-50 text-[#148277]">
                              ✨ Available
                            </span>
                          )}
                          
                          {/* Distance Badge */}
                          {cust.distanceKm !== null && cust.distanceKm !== undefined && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              🚗 ห่าง {cust.distanceKm.toFixed(1)} km
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {cust.name}
                        </h4>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 truncate">
                          {cust.contact_person && <span>👤 {cust.contact_person}</span>}
                          {cust.phone && <span>📞 {cust.phone}</span>}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-[#1b9b8e] text-white flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-[#1b9b8e] px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100">
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Goal & Schedule Form */}
          <div className="md:col-span-5 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto bg-slate-50/40">
            {selectedCustomer ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-white border border-teal-200 shadow-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                    Selected Factory
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                    {selectedCustomer.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    📍 {selectedCustomer.district || selectedCustomer.address || 'Samut Prakan'}
                  </p>
                </div>

                {/* Notice if planned on other dates */}
                {otherPlannedDates.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Scheduled on another date:</span>
                      <span>{otherPlannedDates.map(formatShortDateEng).join(', ')} (You can still add to today if needed)</span>
                    </div>
                  </div>
                )}

                {/* Activity Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Planned Activity Type:
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(Object.keys(PLAN_ACTIVITY_CONFIGS) as PlanActivityType[]).map((typeKey) => {
                      const conf = PLAN_ACTIVITY_CONFIGS[typeKey];
                      const isChosen = activityType === typeKey;

                      return (
                        <button
                          key={typeKey}
                          type="button"
                          onClick={() => setActivityType(typeKey)}
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                            isChosen
                              ? `${conf.bg} ${conf.color} ${conf.border} ring-2 ring-teal-500/20 shadow-xs`
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base">{conf.emoji}</span>
                          <span className="truncate">{conf.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scheduled Time */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Scheduled Time / Period:</span>
                  </label>
                  <input
                    type="text"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="e.g. 10:30 AM or Morning"
                    className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-[#1b9b8e] focus:outline-none"
                  />
                </div>

                {/* Contact Person */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Contact Person:</span>
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Plant Manager / Engineer"
                    className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-[#1b9b8e] focus:outline-none"
                  />
                </div>

                {/* Objective / Discussion Topic */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-slate-500" />
                    <span>Objective & Discussion Topic:</span>
                  </label>
                  <textarea
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    rows={2}
                    placeholder="e.g. Introduce oil filtration unit and inspect workshop"
                    className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-[#1b9b8e] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                <Building2 className="w-10 h-10 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">Please select a factory on the left</p>
                <p className="text-[11px]">to set schedule time, activity type, and target goals</p>
              </div>
            )}

            {/* Submit button in bottom right */}
            <div className="pt-4 mt-auto border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedCustomer || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs shadow-md disabled:opacity-40 transition-all touch-press active:scale-95"
              >
                {isSubmitting ? 'Saving...' : 'Add to Schedule'}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
