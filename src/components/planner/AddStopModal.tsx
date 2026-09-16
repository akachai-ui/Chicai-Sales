'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Customer } from '@/types/customer';
import { PlannedStop, COMMON_OBJECTIVES } from '@/types/planner';
import { supabase } from '@/lib/supabase';
import {
  X,
  Search,
  Building2,
  MapPin,
  Clock,
  Target,
  Plus,
  Loader2,
  Check,
  User,
  Phone,
  Sparkles,
  Star,
} from 'lucide-react';
import { getPortfolioCustomerIds, isCustomerInPortfolio } from '@/lib/portfolio-storage';

interface AddStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStop: (stop: PlannedStop) => void;
  existingCustomerIds?: number[];
}

export default function AddStopModal({
  isOpen,
  onClose,
  onAddStop,
  existingCustomerIds = [],
}: AddStopModalProps) {
  const [activeTab, setActiveTab] = useState<'crm' | 'custom'>('crm');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [portfolioIds, setPortfolioIds] = useState<number[]>([]);
  const [portfolioOnly, setPortfolioOnly] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [plannedTime, setPlannedTime] = useState('');
  const [objective, setObjective] = useState(COMMON_OBJECTIVES[0]);
  const [customObjective, setCustomObjective] = useState('');

  // Load portfolio IDs on mount
  useEffect(() => {
    setPortfolioIds(getPortfolioCustomerIds());
  }, [isOpen]);

  // Load CRM Customers
  useEffect(() => {
    if (!isOpen) return;

    const loadCustomers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, address, district, province, google_maps_url, latitude, longitude, contact_person, target_product, pipeline_stage, activities_count')
          .order('name', { ascending: true })
          .limit(500);

        if (!error && data) {
          setCustomers(data as Customer[]);
        }
      } catch (err) {
        console.error('Error loading customers for planner:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [isOpen]);

  // Handle select customer from CRM list
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCompanyName(c.name);
    setContactPerson(c.contact_person || '');
    setPhone(c.phone || '');
    setProvince(c.province || '');
    setDistrict(c.district || '');
    setAddress(c.address || '');
    if (c.target_product) {
      setObjective(`นำเสนอ/สาธิต ${c.target_product}`);
    }
  };

  const portfolioCustomerCount = useMemo(() => {
    return customers.filter((c) => isCustomerInPortfolio(c, portfolioIds)).length;
  }, [customers, portfolioIds]);

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (portfolioOnly) {
      list = list.filter((c) => isCustomerInPortfolio(c, portfolioIds));
    }

    if (!searchQuery.trim()) return list.slice(0, 60);
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.province && c.province.toLowerCase().includes(q)) ||
        (c.district && c.district.toLowerCase().includes(q)) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(q))
    );
  }, [customers, portfolioOnly, portfolioIds, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = companyName.trim();
    if (!finalName) {
      alert('กรุณาระบุชื่อโรงงาน / บริษัท');
      return;
    }

    const finalObjective = (objective === 'อื่นๆ' ? customObjective : objective) || 'เข้าพบนำเสนอผลิตภัณฑ์';

    const newStop: PlannedStop = {
      id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      customerId: selectedCustomer ? selectedCustomer.id : null,
      companyName: finalName,
      contactPerson: contactPerson.trim() || null,
      phone: phone.trim() || null,
      province: province.trim() || null,
      district: district.trim() || null,
      address: address.trim() || null,
      googleMapsUrl: selectedCustomer ? selectedCustomer.google_maps_url : null,
      latitude: selectedCustomer ? selectedCustomer.latitude : null,
      longitude: selectedCustomer ? selectedCustomer.longitude : null,
      plannedTime: plannedTime.trim() || null,
      objective: finalObjective,
      targetProduct: selectedCustomer?.target_product || null,
      status: 'PLANNED',
      resultNote: '',
      createdAt: new Date().toISOString(),
    };

    onAddStop(newStop);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="pt-3 pb-3.5 px-4 sm:px-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shrink-0">
          <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-2.5 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white tracking-tight">
                  เพิ่มจุดหมายในแผนงาน
                </h3>
                <p className="text-xs text-blue-100">
                  เลือกโรงงานจากฐานข้อมูล หรือเพิ่มเป้าหมายใหม่
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/15 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-blue-900/50 p-1 rounded-xl mt-3 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('crm')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'crm' ? 'bg-white text-blue-900 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>เลือกจากฐานลูกค้า ({customers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('custom');
                setSelectedCustomer(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'custom' ? 'bg-white text-blue-900 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>พิมพ์ระบุเอง</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs sm:text-sm">
          {activeTab === 'crm' && (
            <div className="space-y-3">
              {/* Portfolio Segment Filter Pills */}
              <div className="flex items-center space-x-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPortfolioOnly(true)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 touch-press ${
                    portfolioOnly
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200/70 hover:bg-amber-100'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${portfolioOnly ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'}`} />
                  <span>ลูกค้าในพอร์ต ({portfolioCustomerCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortfolioOnly(false)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 touch-press ${
                    !portfolioOnly
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>โรงงานทั้งหมด ({customers.length})</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อโรงงาน, จังหวัด, หรือผู้ติดต่อ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm transition-all font-medium"
                />
              </div>

              {/* Customer List Container */}
              <div className="border border-slate-200 rounded-2xl max-h-52 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                {loading ? (
                  <div className="p-6 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-xs">กำลังโหลดรายชื่อลูกค้า...</span>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    ไม่พบรายชื่อที่ตรงกับเงื่อนไขที่เลือก
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    const isAlreadyInPlan = existingCustomerIds.includes(c.id);
                    const inPort = isCustomerInPortfolio(c, portfolioIds);

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className={`w-full text-left p-3 transition-colors flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-50/90 text-blue-900 font-bold'
                            : 'hover:bg-white text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                            <span className="font-extrabold text-xs sm:text-sm truncate">
                              {c.name}
                            </span>
                            {inPort && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold flex items-center gap-0.5 shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                <span>ในพอร์ต</span>
                              </span>
                            )}
                            {isAlreadyInPlan && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold shrink-0">
                                อยู่ในแผนแล้ว
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                            {c.province && <span>📍 {c.district ? `${c.district}, ` : ''}{c.province}</span>}
                            {c.contact_person && <span>• 👤 {c.contact_person}</span>}
                            {c.phone && <span>• 📞 {c.phone}</span>}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Form details */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  ชื่อโรงงาน / บริษัทเป้าหมาย *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น บริษัท สยาม คอมเพรสเซอร์ จำกัด"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  เวลานัดหมาย / ช่วงเวลา
                </label>
                <div className="flex space-x-1.5">
                  <input
                    type="time"
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-medium"
                  />
                  <div className="flex space-x-1 shrink-0">
                    {['09:30', '13:30', '15:00'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPlannedTime(t)}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  จังหวัด / พื้นที่
                </label>
                <input
                  type="text"
                  placeholder="เช่น สมุทรปราการ, ชลบุรี"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  ผู้ติดต่อ (Contact Person)
                </label>
                <input
                  type="text"
                  placeholder="เช่น คุณสมชาย (ฝ่ายจัดซื้อ)"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  placeholder="เช่น 081-234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            {/* Objective */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                🎯 วัตถุประสงค์การเข้าพบ
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_OBJECTIVES.map((obj) => (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => setObjective(obj)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                      objective === obj
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {obj}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setObjective('อื่นๆ')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                    objective === 'อื่นๆ'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  กำหนดเอง...
                </button>
              </div>

              {objective === 'อื่นๆ' && (
                <input
                  type="text"
                  placeholder="ระบุวัตถุประสงค์ เช่น ส่งมอบใบเสร็จ, ประเมินการติดตั้ง..."
                  value={customObjective}
                  onChange={(e) => setCustomObjective(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-medium"
                />
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!companyName.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มลงแผนงาน</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
