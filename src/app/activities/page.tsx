'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import ActivityFormModal from '@/components/activities/ActivityFormModal';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import { supabase } from '@/lib/supabase';
import { CustomerActivity, Customer } from '@/types/customer';
import {
  History,
  Calendar,
  Phone,
  Car,
  Sparkles,
  FileText,
  Clock,
  MapPin,
  Search,
  Filter,
  Loader2,
  CalendarDays,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  User,
  Building
} from 'lucide-react';
import Link from 'next/link';

interface ActivityWithCustomer extends CustomerActivity {
  customer?: Customer;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<CustomerActivity | null>(null);

  // Delete State
  const [activityToDelete, setActivityToDelete] = useState<ActivityWithCustomer | null>(null);
  const [deleting, setDeleting] = useState(false);


  const loadActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_activities')
        .select(`
          *,
          customer:customers(id, name, district, province, phone, google_maps_url)
        `)
        .order('activity_date', { ascending: false })
        .limit(200);

      if (!error && data) {
        setActivities(data as ActivityWithCustomer[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const filtered = useMemo(() => {
    return activities.filter((act) => {
      if (selectedType !== 'ALL' && act.activity_type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCust = act.customer?.name?.toLowerCase().includes(q);
        const matchDetails = act.details?.toLowerCase().includes(q);
        const matchPerson = act.contact_person?.toLowerCase().includes(q);
        if (!matchCust && !matchDetails && !matchPerson) return false;
      }
      return true;
    });
  }, [activities, selectedType, searchQuery]);

  const handleActivitySaved = (saved: CustomerActivity, mode: 'create' | 'edit') => {
    if (mode === 'create') {
      setActivities((prev) => [saved as ActivityWithCustomer, ...prev]);
    } else {
      setActivities((prev) => prev.map((a) => (a.id === saved.id ? (saved as ActivityWithCustomer) : a)));
    }
  };

  const handleConfirmDelete = async () => {
    if (!activityToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('customer_activities')
        .delete()
        .eq('id', activityToDelete.id);

      if (error) throw error;
      setActivities((prev) => prev.filter((a) => a.id !== activityToDelete.id));
      setActivityToDelete(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบประวัติ: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 sm:pb-8">
      <Navbar />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full flex-1 space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <span>ประวัติการเข้าพบ (Activity Timeline)</span>
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5">
              บันทึกและจัดการประวัติการเข้าพบโรงงาน โทรศัพท์ สาธิตเครื่อง และติดตามงานขาย
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setActivityToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/30 transition-all touch-press"
            >
              <Plus className="w-4 h-4" />
              <span>+ บันทึกกิจกรรมใหม่</span>
            </button>
            <Link
              href="/map"
              className="flex items-center space-x-1.5 px-3 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-all touch-press"
            >
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">เปิดแผนที่</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโรงงาน, ผู้ติดต่อ, หรือรายละเอียด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="sm:w-64">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none cursor-pointer"
            >
              <option value="ALL">ทุกประเภทกิจกรรม</option>
              <option value="เข้าพบโรงงาน">เข้าพบโรงงาน</option>
              <option value="โทรศัพท์">โทรศัพท์</option>
              <option value="สาธิตเครื่อง (Demo)">สาธิตเครื่อง (Demo)</option>
              <option value="ส่งใบเสนอราคา">ส่งใบเสนอราคา</option>
              <option value="ติดตามผล">ติดตามผล</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>
        </div>

        {/* Timeline Content */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-600">กำลังโหลดประวัติการเข้าพบ...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">ยังไม่มีบันทึกประวัติการเข้าพบ</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              กดปุ่ม <b>"+ บันทึกกิจกรรมใหม่"</b> เพื่อเริ่มบันทึกประวัติการโทรหรือเข้าพบโรงงาน
            </p>
            <button
              onClick={() => {
                setActivityToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm touch-press"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มบันทึกกิจกรรมแรก</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filtered.map((act) => (
              <div
                key={act.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-2.5 sm:space-y-3 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                        {act.activity_type}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {new Date(act.activity_date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug pt-1">
                      {act.customer?.name || `โรงงาน #${act.customer_id}`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                      {act.customer?.district && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{act.customer.district}, {act.customer.province}</span>
                        </span>
                      )}
                      {act.contact_person && (
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>ผู้ติดต่อ: <b className="text-slate-700">{act.contact_person}</b></span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete & Google Maps */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {act.customer?.google_maps_url && (
                      <a
                        href={act.customer.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors touch-press"
                        title="เปิด Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setActivityToEdit(act);
                        setIsFormModalOpen(true);
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors touch-press"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">แก้ไข</span>
                    </button>
                    <button
                      onClick={() => setActivityToDelete(act)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors touch-press"
                      title="ลบประวัตินี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {act.details}
                </p>

                {act.next_action_date && (
                  <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl flex items-center space-x-2 text-xs text-amber-900">
                    <CalendarDays className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] sm:text-xs">
                      <b>นัดหมายรอบถัดไป:</b> {new Date(act.next_action_date).toLocaleDateString('th-TH')}
                      {act.next_action_note ? ` — ${act.next_action_note}` : ''}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Floating Action Button (FAB) on Mobile */}
      <button
        onClick={() => {
          setActivityToEdit(null);
          setIsFormModalOpen(true);
        }}
        className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/40 flex items-center justify-center touch-press"
        title="เพิ่มบันทึกกิจกรรม"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Activity Create / Edit Modal */}
      <ActivityFormModal
        isOpen={isFormModalOpen}
        activity={activityToEdit}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={handleActivitySaved}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!activityToDelete}
        title="ยืนยันการลบประวัติกิจกรรม?"
        message={`คุณต้องการลบบันทึกประวัติของ "${activityToDelete?.customer?.name || 'โรงงาน'}" ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้`}
        isDeleting={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setActivityToDelete(null)}
      />
    </div>
  );
}
