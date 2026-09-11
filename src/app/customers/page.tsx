'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import CustomerDetailModal from '@/components/map/CustomerDetailModal';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import EmailComposeModal from '@/components/common/EmailComposeModal';
import { supabase, fetchAllCustomers, subscribeToRealtimeChanges } from '@/lib/supabase';
import { Customer, PIPELINE_STAGES, getStageConfig } from '@/types/customer';
import { getDbdSearchUrl } from '@/lib/utils';
import {
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Star,
  Globe,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Compass,
  FileSpreadsheet,
  MessageSquare,
  Flame,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  // Quick Delete State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Email State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailCustomer, setEmailCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchAllCustomers();
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(true);

    const unsubscribe = subscribeToRealtimeChanges(['customers', 'customer_activities'], () => {
      fetchCustomers(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Compute live pipeline metrics
  const stats = useMemo(() => {
    let uncontacted = 0;
    let inProgress = 0;
    let quotationWon = 0;
    let withEmail = 0;

    customers.forEach((c) => {
      if (c.email) withEmail++;
      const stage = c.pipeline_stage;
      if (!stage || stage === 'ยังไม่ได้ติดต่อ') {
        uncontacted++;
      } else if (stage === 'ติดต่อแล้ว / ติดตามงาน' || stage === 'เข้าพบ / นำเสนอสินค้า') {
        inProgress++;
      } else if (stage === 'ส่งใบเสนอราคา' || stage === 'ปิดการขายสำเร็จ') {
        quotationWon++;
      }
    });

    return {
      total: customers.length,
      uncontacted,
      inProgress,
      quotationWon,
      withEmail
    };
  }, [customers]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.district && c.district.trim()) set.add(c.district.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (selectedDistrict !== 'ALL' && c.district !== selectedDistrict) return false;
      if (selectedStage !== 'ALL' && c.pipeline_stage !== selectedStage) return false;
      if (onlyWithEmail && (!c.email || !c.email.trim())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone && c.phone.toLowerCase().includes(q);
        const matchEmail = c.email && c.email.toLowerCase().includes(q);
        const matchProduct = c.target_product && c.target_product.toLowerCase().includes(q);
        const matchAddress = c.address && c.address.toLowerCase().includes(q);
        const matchTax = c.tax_id && c.tax_id.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchProduct && !matchAddress && !matchTax) return false;
      }
      return true;
    });
  }, [customers, selectedDistrict, selectedStage, onlyWithEmail, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const handleCustomerUpdated = (updated: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCustomerDeleted = (deletedId: number) => {
    setCustomers((prev) => prev.filter((c) => c.id !== deletedId));
  };

  const handleCustomerSaved = (savedCustomer: Customer, mode: 'create' | 'edit') => {
    if (mode === 'create') {
      setCustomers((prev) => [savedCustomer, ...prev]);
    } else {
      handleCustomerUpdated(savedCustomer);
    }
  };

  const confirmQuickDelete = async () => {
    if (!customerToDelete) return;
    setDeletingCustomer(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);

      if (error) throw error;
      handleCustomerDeleted(customerToDelete.id);
      setCustomerToDelete(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message);
    } finally {
      setDeletingCustomer(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col pb-20 sm:pb-8">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        
        {/* Header Title & Live Stats Matching DBD Design */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  ฐานข้อมูลลูกค้า & โรงงานใน CRM
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                    Sales Pipeline
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                  จัดการรายชื่อลูกค้า บันทึกการเข้าพบ ส่งอีเมลใบเสนอราคา และติดตามสถานะงานขาย
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="px-3 py-1.5 border-r border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400">ลูกค้าทั้งหมดใน CRM</div>
              <div className="text-base sm:text-lg font-black text-slate-900">
                {stats.total.toLocaleString()} <span className="text-xs font-normal text-slate-400">ราย</span>
              </div>
            </div>
            <div className="px-3 py-1.5 border-r border-slate-100">
              <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>ยังไม่ได้ติดต่อ</span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-700">
                {stats.uncontacted.toLocaleString()} <span className="text-xs font-normal text-slate-400">แห่ง</span>
              </div>
            </div>
            <div className="px-3 py-1.5 border-r border-slate-100">
              <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span>กำลังติดตาม / เข้าพบ</span>
              </div>
              <div className="text-base sm:text-lg font-black text-blue-700">
                {stats.inProgress.toLocaleString()} <span className="text-xs font-normal text-slate-400">ราย</span>
              </div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>เสนอราคา / ปิดการขาย</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-700">
                {stats.quotationWon.toLocaleString()} <span className="text-xs font-normal text-slate-400">ราย</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action & Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโรงงาน, เบอร์โทร, อีเมล, สินค้า..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* 2. District Filter */}
            <div>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">📍 ทุกอำเภอ / โซน ({districts.length} โซน)</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    อ. {d}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Pipeline Stage Filter */}
            <div>
              <select
                value={selectedStage}
                onChange={(e) => {
                  setSelectedStage(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">🏷️ ทุกสถานะ Pipeline</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.stage} value={s.stage}>
                    {s.stage}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setCustomerToEdit(null);
                  setIsFormModalOpen(true);
                }}
                className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all touch-press"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มโรงงานใหม่</span>
              </button>
              <Link
                href="/map"
                className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all"
                title="เปิดดูบนแผนที่ Smart Map"
              >
                <Compass className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">แผนที่</span>
              </Link>
            </div>
          </div>

          {/* Quick Active Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-2 text-slate-500">
              <span>พบทั้งหมด <strong className="text-slate-900 font-bold">{filtered.length.toLocaleString()}</strong> โรงงาน</span>
              {selectedDistrict !== 'ALL' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                  อ.{selectedDistrict}
                </span>
              )}
              {selectedStage !== 'ALL' && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/60">
                  สถานะ: {selectedStage}
                </span>
              )}
              <button
                onClick={() => {
                  setOnlyWithEmail(!onlyWithEmail);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-0.5 rounded-full font-bold border transition-all flex items-center space-x-1 touch-press ${
                  onlyWithEmail
                    ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-300'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <span>✉️ มีอีเมล ({stats.withEmail})</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {(searchQuery || selectedDistrict !== 'ALL' || selectedStage !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDistrict('ALL');
                    setSelectedStage('ALL');
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-semibold transition-colors"
                >
                  ล้างตัวกรอง
                </button>
              )}
              <button
                onClick={() => fetchCustomers(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results List / Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลลูกค้า CRM...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-800">ไม่พบข้อมูลลูกค้าตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูข้อมูลทั้งหมด</p>
            </div>
          ) : (
            <div>
              {/* 1. Mobile Cards Feed (< md screens) */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedCustomers.map((c) => {
                  const stageConf = getStageConfig(c.pipeline_stage);
                  return (
                    <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                              #{c.seq || c.id}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                              {c.district || 'สมุทรปราการ'}
                            </span>
                            {c.place_id || c.pin_type === 'GOOGLE_BUSINESS' ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🟢 Google
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                📍 DBD
                              </span>
                            )}
                          </div>
                          <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                            {c.name}
                          </h3>
                          {c.address && (
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {c.address}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1 shrink-0">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stageConf.dot}`} />
                            <span>{c.pipeline_stage || 'ยังไม่ได้ติดต่อ'}</span>
                          </span>
                          {(c.activities_count !== undefined && c.activities_count > 0) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ {c.activities_count} กิจกรรม
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Latest Activity Snippet or Target Product */}
                      {c.latest_activity?.details ? (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100 flex items-start space-x-1.5">
                          <span className="shrink-0">💬</span>
                          <span className="line-clamp-2 leading-relaxed">
                            <b>{c.latest_activity.activity_type} ({c.latest_activity.activity_date?.split('T')[0]}):</b> {c.latest_activity.details}
                          </span>
                        </div>
                      ) : c.target_product ? (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-1">
                          📦 <span className="font-medium">{c.target_product}</span>
                        </div>
                      ) : null}

                      {/* Mobile Quick Action Buttons Toolbar */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone.replace(/\s+/g, '')}`}
                            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold touch-press"
                          >
                            <Phone className="w-3.5 h-3.5 mb-0.5 text-emerald-600" />
                            <span>โทร</span>
                          </a>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 text-slate-300 text-[10px]">
                            <Phone className="w-3.5 h-3.5 mb-0.5" />
                            <span>ไม่มีเบอร์</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setEmailCustomer(c);
                            setIsEmailModalOpen(true);
                          }}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-bold touch-press ${
                            c.email
                              ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}
                          title="ส่งอีเมล / Gmail พร้อมแม่แบบข้อความ"
                        >
                          <Mail className={`w-3.5 h-3.5 mb-0.5 ${c.email ? 'text-purple-600' : 'text-slate-400'}`} />
                          <span>{c.email ? 'ส่งอีเมล' : 'เขียนเมล'}</span>
                        </button>

                        {c.google_maps_url ? (
                          <a
                            href={c.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-[10px] font-bold touch-press"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mb-0.5 text-blue-600" />
                            <span>นำทาง</span>
                          </a>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 text-slate-300 text-[10px]">
                            <ExternalLink className="w-3.5 h-3.5 mb-0.5" />
                            <span>ไม่มีพิกัด</span>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsDetailModalOpen(true);
                          }}
                          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-[10px] font-bold touch-press"
                        >
                          <Edit className="w-3.5 h-3.5 mb-0.5" />
                          <span>บันทึกงาน</span>
                        </button>
                      </div>

                      {/* DBD Quick Link */}
                      <a
                        href={getDbdSearchUrl(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 transition-colors touch-press"
                      >
                        <span className="flex items-center space-x-1.5">
                          <span>🏛️</span>
                          <span>ดูข้อมูลงบการเงิน & ทุนจดทะเบียน DBD</span>
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  );
                })}
              </div>

              {/* 2. Desktop Table (>= md screens) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 w-16">ลำดับ</th>
                      <th className="py-3.5 px-4">ชื่อโรงงาน / บริษัท</th>
                      <th className="py-3.5 px-4">อำเภอ/โซน</th>
                      <th className="py-3.5 px-4">สถานะ Pipeline</th>
                      <th className="py-3.5 px-4">เบอร์โทรศัพท์</th>
                      <th className="py-3.5 px-4">อีเมล (Email)</th>
                      <th className="py-3.5 px-4">สินค้าเป้าหมาย</th>
                      <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedCustomers.map((c) => {
                      const stageConf = getStageConfig(c.pipeline_stage);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                            #{c.seq || c.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-extrabold text-slate-900 leading-snug">{c.name}</span>
                              {c.place_id || c.pin_type === 'GOOGLE_BUSINESS' ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="หมุดสถานที่จริง Google">
                                  🟢 Google
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="พิกัดที่อยู่ DBD">
                                  📍 DBD
                                </span>
                              )}
                            </div>
                            {c.address && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                {c.address}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">{c.district || '-'}</span>
                            <span className="text-[10px] text-slate-400 block">{c.province || 'สมุทรปราการ'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stageConf.dot}`} />
                              <span>{c.pipeline_stage || 'ยังไม่ได้ติดต่อ'}</span>
                            </span>
                            {(c.activities_count !== undefined && c.activities_count > 0) && (
                              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {c.activities_count} กิจกรรม
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {c.phone ? (
                              <a
                                href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1"
                              >
                                <Phone className="w-3 h-3 text-emerald-500" />
                                <span>{c.phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-[200px] truncate">
                            {c.email ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEmailCustomer(c);
                                  setIsEmailModalOpen(true);
                                }}
                                className="font-bold text-purple-600 hover:text-purple-800 hover:underline flex items-center space-x-1 truncate text-left"
                                title="ส่งอีเมล / Gmail พร้อมแม่แบบ"
                              >
                                <Mail className="w-3 h-3 shrink-0 text-purple-500" />
                                <span className="truncate">{c.email}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 font-medium">
                            {c.target_product || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <a
                                href={getDbdSearchUrl(c)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors text-[11px] flex items-center space-x-1"
                                title="ค้นหาข้อมูลนิติบุคคล DBD / ทุนจดทะเบียน / งบการเงิน"
                              >
                                <span>🏛️ DBD</span>
                              </a>
                              {c.google_maps_url && (
                                <a
                                  href={c.google_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                                  title="เปิด Google Maps นำทาง"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setIsDetailModalOpen(true);
                                }}
                                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5 text-emerald-600" />
                                <span>บันทึกงาน</span>
                              </button>
                              <button
                                onClick={() => setCustomerToDelete(c)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="ลบโรงงานนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Controls Matching DBD Design */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="font-medium">
                แสดงผล <strong>{((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filtered.length)}</strong> จากทั้งหมด <strong>{filtered.length.toLocaleString()}</strong> โรงงาน
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center space-x-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ก่อนหน้า</span>
                </button>
                <div className="px-3 py-1.5 font-bold bg-white border border-slate-200 rounded-xl text-slate-800">
                  หน้า {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center space-x-1 transition-colors"
                >
                  <span>ถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Customer Detail & Update Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onCustomerUpdated={handleCustomerUpdated}
        onCustomerDeleted={handleCustomerDeleted}
      />

      {/* Create / Edit Form Modal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        customer={customerToEdit}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={handleCustomerSaved}
      />

      {/* Quick Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!customerToDelete}
        title={`ยืนยันการลบ ${customerToDelete?.name}?`}
        message="คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลโรงงานนี้ออกจากระบบ? ข้อมูลและประวัติการเข้าพบทั้งหมดจะถูกลบถาวรและไม่สามารถกู้คืนได้"
        isDeleting={deletingCustomer}
        onConfirm={confirmQuickDelete}
        onClose={() => setCustomerToDelete(null)}
      />

      {/* Email Compose & Templates Modal */}
      <EmailComposeModal
        isOpen={isEmailModalOpen}
        customer={emailCustomer}
        onClose={() => setIsEmailModalOpen(false)}
        onEmailSent={() => {
          if (emailCustomer) {
            const updatedCust: Customer = {
              ...emailCustomer,
              pipeline_stage: 'ติดต่อแล้ว / ติดตามงาน',
              activities_count: (emailCustomer.activities_count || 0) + 1,
              latest_activity: {
                id: Date.now(),
                customer_id: emailCustomer.id,
                activity_type: 'ส่งอีเมล',
                activity_date: new Date().toISOString(),
                contact_person: emailCustomer.contact_person || null,
                details: `ส่งอีเมล E-Catalog CHICAI ELECTRIC (ลดต้นทุน 70% + On-site Demo)`,
                next_action_date: null,
                next_action_note: null,
              },
            };
            handleCustomerUpdated(updatedCust);
          }
        }}
      />
    </div>
  );
}
