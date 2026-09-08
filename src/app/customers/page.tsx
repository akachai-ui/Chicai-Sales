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
  Trash2
} from 'lucide-react';
import Link from 'next/link';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
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
      console.error('Error:', err);
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone && c.phone.toLowerCase().includes(q);
        const matchEmail = c.email && c.email.toLowerCase().includes(q);
        const matchProduct = c.target_product && c.target_product.toLowerCase().includes(q);
        const matchAddress = c.address && c.address.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchProduct && !matchAddress) return false;
      }
      return true;
    });
  }, [customers, selectedDistrict, selectedStage, searchQuery]);

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
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-8">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full flex-1">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">รายชื่อลูกค้า & โรงงาน</h1>
            <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5">
              จัดการข้อมูลโรงงานทั้งหมด {customers.length} แห่ง (เพิ่ม ลบ แก้ไข ได้ทันที)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setCustomerToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 transition-all touch-press"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มโรงงานใหม่</span>
            </button>
            <Link
              href="/map"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/30 transition-all touch-press"
            >
              <MapPin className="w-4 h-4" />
              <span>ดูบนแผนที่</span>
            </Link>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโรงงาน, เบอร์โทร, อีเมล, สินค้า..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* District */}
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="ALL">ทุกอำเภอ / โซน ({districts.length})</option>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Pipeline Stage */}
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedStage}
                onChange={(e) => {
                  setSelectedStage(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="ALL">ทุกสถานะ Pipeline</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.stage} value={s.stage}>{s.stage}</option>
                ))}
              </select>
            </div>

          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] sm:text-xs text-slate-500">
            <span>พบทั้งหมด <b>{filtered.length}</b> รายการ (หน้า {currentPage}/{totalPages})</span>
            {(searchQuery || selectedDistrict !== 'ALL' || selectedStage !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDistrict('ALL');
                  setSelectedStage('ALL');
                  setCurrentPage(1);
                }}
                className="text-blue-600 hover:underline font-bold"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* Table / Cards List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-600">กำลังโหลดข้อมูลลูกค้า...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center space-y-2">
            <p className="text-sm sm:text-base font-bold text-slate-800">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
            <p className="text-xs text-slate-400">กรุณาลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* 1. Mobile Cards Feed (< md screens) */}
            <div className="md:hidden space-y-3">
              {paginatedCustomers.map((c) => {
                const stageConf = getStageConfig(c.pipeline_stage);
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                            #{c.seq || c.id}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {c.district || 'สมุทรปราการ'}
                          </span>
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

                    {/* Activity Note Snippet or Target Product */}
                    {c.latest_activity?.details ? (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-xl border border-emerald-100 flex items-start space-x-1.5">
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
                          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold touch-press"
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
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                            : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}
                        title="ส่งอีเมล / Gmail พร้อมแม่แบบข้อความ"
                      >
                        <Mail className={`w-3.5 h-3.5 mb-0.5 ${c.email ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span>{c.email ? 'ส่งเมล' : 'เขียนเมล'}</span>
                      </button>

                      {c.google_maps_url ? (
                        <a
                          href={c.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 text-[10px] font-bold touch-press"
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
                        className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-600 text-white shadow-xs text-[10px] font-bold touch-press"
                      >
                        <Edit className="w-3.5 h-3.5 mb-0.5" />
                        <span>บันทึก</span>
                      </button>
                    </div>

                    {/* DBD Quick Link */}
                    <a
                      href={getDbdSearchUrl(c)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 transition-colors touch-press"
                    >
                      <span className="flex items-center space-x-1.5">
                        <span>🏛️</span>
                        <span>ดูข้อมูลนิติบุคคล DBD / ทุนจดทะเบียน</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop Table (>= md screens) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 w-16">ลำดับ</th>
                      <th className="py-3.5 px-4">ชื่อโรงงาน / บริษัท</th>
                      <th className="py-3.5 px-4">อำเภอ/โซน</th>
                      <th className="py-3.5 px-4">สถานะการขาย</th>
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
                            <div className="font-bold text-slate-900 leading-snug">{c.name}</div>
                            {c.address && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                {c.address}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-800">{c.district || '-'}</span>
                            <span className="text-[11px] text-slate-400 block">{c.province || ''}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stageConf.dot}`} />
                              <span>{c.pipeline_stage || 'ยังไม่ได้ติดต่อ'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {c.phone ? (
                              <a
                                href={`tel:${c.phone.replace(/\s+/g, '')}`}
                                className="font-medium text-emerald-600 hover:underline flex items-center space-x-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{c.phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-[220px] truncate">
                            {c.email ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEmailCustomer(c);
                                  setIsEmailModalOpen(true);
                                }}
                                className="font-medium text-blue-600 hover:underline flex items-center space-x-1 truncate text-left"
                                title="ส่งอีเมล / Gmail พร้อมแม่แบบ"
                              >
                                <Mail className="w-3 h-3 shrink-0 text-blue-500" />
                                <span className="truncate">{c.email}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                            {c.target_product || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <a
                                href={getDbdSearchUrl(c)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors text-[11px] flex items-center space-x-1"
                                title="ค้นหาข้อมูลนิติบุคคล DBD / ทุนจดทะเบียน / งบการเงิน"
                              >
                                <span>🏛️ DBD</span>
                              </a>
                              {c.google_maps_url && (
                                <a
                                  href={c.google_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                                  title="เปิด Google Maps"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setIsDetailModalOpen(true);
                                }}
                                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>ดู & บันทึก</span>
                              </button>
                              <button
                                onClick={() => setCustomerToDelete(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

            {/* Pagination Controls */}
            <div className="p-3 sm:p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between text-xs text-slate-600 shadow-xs">
              <div className="text-[11px] sm:text-xs">
                {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filtered.length)} จาก {filtered.length}
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed touch-press"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold px-1.5 sm:px-2 text-xs">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed touch-press"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

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
