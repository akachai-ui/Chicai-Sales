'use client';

import React, { useState, useEffect } from 'react';
import { Customer, CustomerActivity, ACTIVITY_TYPES, PIPELINE_STAGES } from '@/types/customer';
import { supabase, fetchAllCustomers } from '@/lib/supabase';
import {
  X,
  Calendar,
  Save,
  Loader2,
  Sparkles,
  Building,
  User,
  CalendarDays,
  FileText,
  Search
} from 'lucide-react';

interface ActivityFormModalProps {
  isOpen: boolean;
  activity?: CustomerActivity | null; // null for Create, object for Edit
  defaultCustomerId?: number | null;
  onClose: () => void;
  onSaved: (savedActivity: CustomerActivity, mode: 'create' | 'edit') => void;
}

export default function ActivityFormModal({
  isOpen,
  activity,
  defaultCustomerId,
  onClose,
  onSaved,
}: ActivityFormModalProps) {
  if (!isOpen) return null;

  const isEdit = !!activity;

  // Customers list for dropdown
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    activity?.customer_id || defaultCustomerId || null
  );

  // Activity fields
  const [activityType, setActivityType] = useState(activity?.activity_type || 'เข้าพบโรงงาน');
  const [activityDate, setActivityDate] = useState(
    activity?.activity_date
      ? new Date(activity.activity_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [contactPerson, setContactPerson] = useState(activity?.contact_person || '');
  const [details, setDetails] = useState(activity?.details || '');
  const [nextActionDate, setNextActionDate] = useState(
    activity?.next_action_date || ''
  );
  const [nextActionNote, setNextActionNote] = useState(
    activity?.next_action_note || ''
  );
  const [updatePipelineStage, setUpdatePipelineStage] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load customer list
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllCustomers();
        setCustomers(data);
        if (!selectedCustomerId && data.length > 0 && !defaultCustomerId) {
          setSelectedCustomerId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (activity) {
      setSelectedCustomerId(activity.customer_id);
      setActivityType(activity.activity_type || 'เข้าพบโรงงาน');
      setActivityDate(
        activity.activity_date
          ? new Date(activity.activity_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setContactPerson(activity.contact_person || '');
      setDetails(activity.details || '');
      setNextActionDate(activity.next_action_date || '');
      setNextActionNote(activity.next_action_note || '');
    } else {
      setSelectedCustomerId(defaultCustomerId || (customers[0]?.id ?? null));
      setActivityType('เข้าพบโรงงาน');
      setActivityDate(new Date().toISOString().split('T')[0]);
      setContactPerson('');
      setDetails('');
      setNextActionDate('');
      setNextActionNote('');
      setUpdatePipelineStage('');
    }
    setErrorMsg(null);
  }, [activity, defaultCustomerId]);

  const filteredCustomersForSelect = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.district && c.district.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMsg('กรุณาเลือกลูกค้า / โรงงาน');
      return;
    }
    if (!details.trim()) {
      setErrorMsg('กรุณาระบุรายละเอียดการเข้าพบหรือการพูดคุย');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        customer_id: selectedCustomerId,
        activity_type: activityType,
        activity_date: new Date(activityDate).toISOString(),
        contact_person: contactPerson.trim() || null,
        details: details.trim(),
        next_action_date: nextActionDate || null,
        next_action_note: nextActionNote.trim() || null,
      };

      if (isEdit && activity?.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('customer_activities')
          .update(payload)
          .eq('id', activity.id)
          .select(`
            *,
            customer:customers(id, name, district, province, phone, google_maps_url)
          `)
          .single();

        if (error) throw error;
        onSaved(data as CustomerActivity, 'edit');
      } else {
        // CREATE
        const { data, error } = await supabase
          .from('customer_activities')
          .insert([payload])
          .select(`
            *,
            customer:customers(id, name, district, province, phone, google_maps_url)
          `)
          .single();

        if (error) throw error;

        // Optionally update customer's pipeline stage and contact info
        const customerUpdates: any = {
          updated_at: new Date().toISOString(),
        };
        if (contactPerson.trim()) {
          customerUpdates.contact_person = contactPerson.trim();
        }
        if (updatePipelineStage) {
          customerUpdates.pipeline_stage = updatePipelineStage;
        } else {
          const targetCust = customers.find((c) => c.id === selectedCustomerId);
          if (targetCust && (targetCust.pipeline_stage === 'ยังไม่ได้ติดต่อ' || !targetCust.pipeline_stage)) {
            customerUpdates.pipeline_stage = 'ติดต่อแล้ว / ติดตามงาน';
          }
        }

        await supabase
          .from('customers')
          .update(customerUpdates)
          .eq('id', selectedCustomerId);

        onSaved(data as CustomerActivity, 'create');
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving activity:', err);
      if (err.message?.includes('customer_activities') || err.code === '42P01') {
        setErrorMsg('กรุณารันคำสั่ง SQL สร้างตาราง customer_activities ใน Supabase SQL Editor ก่อนครับ');
      } else {
        setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center bg-slate-50/90">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {isEdit ? 'แก้ไขบันทึกประวัติการเข้าพบ' : 'เพิ่มบันทึกการเข้าพบ / กิจกรรมใหม่'}
              </h2>
              <p className="text-xs text-slate-500">
                บันทึกการโทร เข้าพบหน้างาน สาธิตเครื่อง และนัดหมายรอบถัดไป
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Customer Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>เลือกลูกค้า / โรงงาน</span> <span className="text-rose-500">*</span>
            </label>
            
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อโรงงาน..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white"
                />
              </div>

              <select
                required
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-medium"
              >
                <option value="" disabled>-- กรุณาเลือกโรงงาน --</option>
                {filteredCustomersForSelect.slice(0, 150).map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.seq || c.id} • {c.name} ({c.district || 'ไม่ระบุโซน'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Activity Type Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              ประเภทกิจกรรม
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {ACTIVITY_TYPES.map((act) => {
                const isSelected = activityType === act.type;
                return (
                  <button
                    key={act.type}
                    type="button"
                    onClick={() => setActivityType(act.type)}
                    className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate">{act.type}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                วันที่เข้าพบ / ติดต่อ
              </label>
              <input
                type="date"
                required
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ผู้ติดต่อ / ตำแหน่ง
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="เช่น คุณสมชาย (ผจก.ฝ่ายซ่อมบำรุง)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Discussion Details */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              รายละเอียดสิ่งที่พูดคุย / ผลการเข้าพบ <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="เช่น นำเครื่องกรองน้ำมันไฮดรอลิกไปทดสอบหน้างาน ลูกค้าสนใจรุ่น CF-200 ขอใบเสนอราคา..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Next Action */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
            <span className="font-semibold text-blue-900 flex items-center space-x-1.5 text-xs">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
              <span>การนัดหมายรอบถัดไป (Follow-up)</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none"
              />
              <input
                type="text"
                value={nextActionNote}
                onChange={(e) => setNextActionNote(e.target.value)}
                placeholder="สิ่งที่ต้องทำ (เช่น ส่งใบเสนอราคา)"
                className="text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Option to Update Pipeline Stage */}
          {!isEdit && (
            <div className="pt-2">
              <label className="block font-semibold text-slate-700 mb-1">
                อัปเดตสถานะ Sales Pipeline ของโรงงานนี้เป็น:
              </label>
              <select
                value={updatePipelineStage}
                onChange={(e) => setUpdatePipelineStage(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
              >
                <option value="">-- คงสถานะเดิม --</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.stage} value={s.stage}>
                    {s.stage}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 sm:pt-4 pb-[max(0.85rem,env(safe-area-inset-bottom,12px))] border-t border-slate-100 bg-white/95 backdrop-blur-md sticky bottom-0 -mx-6 -mb-6 px-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-11 px-4 sm:px-5 font-bold text-slate-700 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-xl transition-all active:scale-95"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-11 flex items-center space-x-1.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'บันทึกการแก้ไข' : 'บันทึกประวัติ'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
