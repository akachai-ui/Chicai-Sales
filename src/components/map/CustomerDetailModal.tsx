'use client';

import React, { useState, useEffect } from 'react';
import { Customer, CustomerActivity, PIPELINE_STAGES, ACTIVITY_TYPES, getStageConfig } from '@/types/customer';
import { supabase } from '@/lib/supabase';
import { getDbdSearchUrl, getGoogleDbdSearchUrl } from '@/lib/utils';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Globe,
  ExternalLink,
  Star,
  Building2,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  User,
  Package,
  FileText,
  Plus,
  Car,
  Sparkles,
  History,
  Send,
  Loader2,
  CalendarDays,
  ArrowRight,
  Edit,
  Trash2,
  ShieldCheck
} from 'lucide-react';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated: (updatedCustomer: Customer) => void;
  onCustomerDeleted?: (deletedCustomerId: number) => void;
}

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated,
  onCustomerDeleted,
}: CustomerDetailModalProps) {
  if (!isOpen || !customer) return null;

  const [activeTab, setActiveTab] = useState<'timeline' | 'info'>('timeline');

  // Customer Base Fields
  const [pipelineStage, setPipelineStage] = useState(customer.pipeline_stage || 'ยังไม่ได้ติดต่อ');
  const [contactPerson, setContactPerson] = useState(customer.contact_person || '');
  const [targetProduct, setTargetProduct] = useState(customer.target_product || '');
  const [taxId, setTaxId] = useState(customer.tax_id || '');
  const [registeredName, setRegisteredName] = useState(customer.registered_name || '');
  const [notes, setNotes] = useState(customer.notes || '');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savedCustomerSuccess, setSavedCustomerSuccess] = useState(false);

  // Full Edit Modal State
  const [showFullEditModal, setShowFullEditModal] = useState(false);

  // Delete Customer State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Activities State
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Delete Activity State
  const [activityToDelete, setActivityToDelete] = useState<CustomerActivity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState(false);

  // New Activity Form State
  const [newActivityType, setNewActivityType] = useState('เข้าพบโรงงาน');
  const [newActivityDate, setNewActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [newContactPerson, setNewContactPerson] = useState(customer.contact_person || '');
  const [newDetails, setNewDetails] = useState('');
  const [newNextDate, setNewNextDate] = useState('');
  const [newNextNote, setNewNextNote] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);

  // Load activities for this customer
  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('customer_activities')
        .select('*')
        .eq('customer_id', customer.id)
        .order('activity_date', { ascending: false });

      if (!error && data) {
        setActivities(data as CustomerActivity[]);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (customer?.id) {
      setPipelineStage(customer.pipeline_stage || 'ยังไม่ได้ติดต่อ');
      setContactPerson(customer.contact_person || '');
      setTargetProduct(customer.target_product || '');
      setTaxId(customer.tax_id || '');
      setRegisteredName(customer.registered_name || '');
      setNotes(customer.notes || '');
      setNewContactPerson(customer.contact_person || '');
      loadActivities();
    }
  }, [customer?.id]);

  const currentStageConfig = getStageConfig(pipelineStage);

  // Save Customer Basic Profile
  const handleSaveCustomer = async () => {
    setSavingCustomer(true);
    try {
      const updates = {
        pipeline_stage: pipelineStage,
        contact_person: contactPerson,
        target_product: targetProduct,
        tax_id: taxId.trim() || null,
        registered_name: registeredName.trim() || null,
        notes: notes,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customer.id)
        .select()
        .single();

      if (error) {
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
      } else if (data) {
        onCustomerUpdated(data as Customer);
        setSavedCustomerSuccess(true);
        setTimeout(() => setSavedCustomerSuccess(false), 2000);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async () => {
    setDeletingCustomer(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      if (onCustomerDeleted) {
        onCustomerDeleted(customer.id);
      }
      setShowDeleteModal(false);
      onClose();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message);
    } finally {
      setDeletingCustomer(false);
    }
  };

  // Add New Activity Log
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDetails.trim()) {
      alert('กรุณาระบุรายละเอียดสิ่งที่ได้เข้าพบหรือคุยกับลูกค้า');
      return;
    }

    setSavingActivity(true);
    try {
      const newAct = {
        customer_id: customer.id,
        activity_type: newActivityType,
        activity_date: new Date(newActivityDate).toISOString(),
        contact_person: newContactPerson || null,
        details: newDetails.trim(),
        next_action_date: newNextDate || null,
        next_action_note: newNextNote.trim() || null,
      };

      const { data, error } = await supabase
        .from('customer_activities')
        .insert([newAct])
        .select()
        .single();

      if (error) {
        if (error.message.includes('customer_activities') || error.code === '42P01') {
          alert('กรุณารันคำสั่ง SQL สร้างตาราง customer_activities ใน Supabase SQL Editor ก่อนครับ');
        } else {
          alert('เกิดข้อผิดพลาดในการบันทึกกิจกรรม: ' + error.message);
        }
      } else if (data) {
        setActivities((prev) => [data as CustomerActivity, ...prev]);
        setNewDetails('');
        setNewNextNote('');
        setNewNextDate('');
        setShowAddForm(false);

        const newStage =
          customer.pipeline_stage === 'ยังไม่ได้ติดต่อ' || !customer.pipeline_stage
            ? 'ติดต่อแล้ว / ติดตามงาน'
            : customer.pipeline_stage;

        await supabase
          .from('customers')
          .update({
            contact_person: newContactPerson || customer.contact_person,
            pipeline_stage: newStage,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.id);

        if (onCustomerUpdated) {
          onCustomerUpdated({
            ...customer,
            contact_person: newContactPerson || customer.contact_person,
            pipeline_stage: newStage,
            activities_count: (customer.activities_count || 0) + 1,
            latest_activity: data as CustomerActivity,
          });
        }
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSavingActivity(false);
    }
  };

  // Delete an Activity Log
  const handleDeleteActivity = async () => {
    if (!activityToDelete) return;
    setDeletingActivity(true);
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
      setDeletingActivity(false);
    }
  };

  const mapNavigationUrl =
    customer.google_maps_url ||
    (customer.latitude && customer.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.name + ' ' + (customer.address || ''))}`);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[92vh] animate-slide-up sm:animate-in sm:fade-in sm:zoom-in-95 duration-200 border-t sm:border border-slate-200">
          
          {/* Mobile Drag Handle */}
          <div className="sm:hidden pt-2.5 pb-0 flex justify-center bg-slate-50/80">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 pr-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono">
                    #{customer.seq || customer.id}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentStageConfig.bg} ${currentStageConfig.color} ${currentStageConfig.border}`}>
                    {pipelineStage}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {customer.name}
                </h2>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowFullEditModal(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="แก้ไขข้อมูลทั้งหมด (Full Edit)"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="ลบข้อมูลโรงงานนี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className={`grid ${customer.email ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-4`}>
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all active:scale-[0.98]"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">โทรออก</span>
                </a>
              ) : (
                <button disabled className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs cursor-not-allowed">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>ไม่มีเบอร์โทร</span>
                </button>
              )}

              {customer.email && (
                <a
                  href={`mailto:${customer.email.trim()}`}
                  className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/20 transition-all active:scale-[0.98]"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">ส่งอีเมล</span>
                </a>
              )}

              <a
                href={mapNavigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-600/20 transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Google Maps</span>
              </a>
            </div>

            {/* DBD Quick Link */}
            <div className="mt-2.5 flex items-center space-x-2">
              <a
                href={getDbdSearchUrl({ name: customer.name, tax_id: taxId || customer.tax_id, registered_name: registeredName || customer.registered_name })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-between p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
                title="ดูข้อมูลนิติบุคคล ทุนจดทะเบียน และงบการเงิน บน Creden Data"
              >
                <span className="flex items-center space-x-1.5 truncate">
                  <span>🏛️</span>
                  <span className="truncate">DBD / Creden {customer.tax_id ? `(${customer.tax_id})` : ''}</span>
                </span>
                <span className="flex items-center space-x-1 text-[11px] text-blue-600 font-semibold shrink-0 ml-1">
                  <span>เปิดดู</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>

              <a
                href={getGoogleDbdSearchUrl({ name: customer.name, tax_id: taxId || customer.tax_id, registered_name: registeredName || customer.registered_name })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-bold text-slate-700 transition-colors shrink-0"
                title="ค้นหาบน Google DBD DataWarehouse"
              >
                <span>🔍</span>
                <span>Google DBD</span>
                <ExternalLink className="w-3 h-3 text-slate-500 ml-0.5" />
              </a>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 mt-4 -mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'timeline'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <History className="w-4 h-4" />
                <span>ประวัติการเข้าพบ ({activities.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>ข้อมูลโรงงาน & สถานะงานขาย</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700">

            {/* TAB 1: Activity Log Timeline */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                
                {/* Header & Add Button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">บันทึกการติดตาม & เข้าพบโรงงาน</h3>
                    <p className="text-xs text-slate-500">บันทึกการโทร เข้าพบหน้างาน สาธิตเครื่อง และนัดหมายรอบถัดไป</p>
                  </div>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ บันทึกกิจกรรมใหม่</span>
                    </button>
                  )}
                </div>

                {/* Add Activity Form Card */}
                {showAddForm && (
                  <form onSubmit={handleAddActivity} className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                      <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>บันทึกการเข้าพบ / ติดตามงานรอบใหม่</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Activity Type Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        ประเภทกิจกรรม
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {ACTIVITY_TYPES.map((act) => {
                          const isSelected = newActivityType === act.type;
                          return (
                            <button
                              key={act.type}
                              type="button"
                              onClick={() => setNewActivityType(act.type)}
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
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          วันที่เข้าพบ / ติดต่อ
                        </label>
                        <input
                          type="date"
                          value={newActivityDate}
                          onChange={(e) => setNewActivityDate(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          ผู้ติดต่อ / ตำแหน่ง
                        </label>
                        <input
                          type="text"
                          value={newContactPerson}
                          onChange={(e) => setNewContactPerson(e.target.value)}
                          placeholder="เช่น คุณสมชาย (ผจก.โรงงาน)"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Discussion Details */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        รายละเอียดการพูดคุย / ผลการเข้าพบ <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={newDetails}
                        onChange={(e) => setNewDetails(e.target.value)}
                        placeholder="เช่น นำเครื่องกรองน้ำมันไฮดรอลิกไปสาธิตที่ไลน์ผลิตที่ 2 วิศวกรสนใจมาก ขอใบเสนอราคา 1 เครื่อง..."
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Next Action */}
                    <div className="p-3 bg-white rounded-xl border border-blue-100 space-y-2">
                      <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                        <span>นัดหมายรอบถัดไป (Follow-up)</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={newNextDate}
                          onChange={(e) => setNewNextDate(e.target.value)}
                          className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                        />
                        <input
                          type="text"
                          value={newNextNote}
                          onChange={(e) => setNewNextNote(e.target.value)}
                          placeholder="สิ่งที่ต้องทำ (เช่น ส่งใบเสนอราคา)"
                          className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={savingActivity}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingActivity ? 'กำลังบันทึก...' : 'บันทึกประวัติการเข้าพบ'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Timeline List */}
                <div className="space-y-4">
                  {loadingActivities ? (
                    <div className="py-8 text-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                      <p className="text-xs text-slate-500">กำลังโหลดประวัติการเข้าพบ...</p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <History className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">ยังไม่มีประวัติการเข้าพบสำหรับโรงงานนี้</p>
                      <p className="text-[11px] text-slate-400">
                        กดปุ่ม <b>"+ บันทึกกิจกรรมใหม่"</b> เพื่อเริ่มบันทึกประวัติการโทรหรือเข้าพบครั้งแรก
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-blue-200 space-y-6">
                      {activities.map((act, index) => {
                        const dateFormatted = new Date(act.activity_date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <div key={act.id || index} className="relative group">
                            {/* Dot on Timeline */}
                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />

                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-blue-300 transition-colors">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <div className="flex items-center space-x-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    {act.activity_type}
                                  </span>
                                  {act.contact_person && (
                                    <span className="text-xs text-slate-600 font-medium">
                                      👤 {act.contact_person}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {dateFormatted}
                                  </span>
                                  <button
                                    onClick={() => setActivityToDelete(act)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                                    title="ลบประวัตินี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                                {act.details}
                              </p>

                              {act.next_action_date && (
                                <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 text-[11px] text-indigo-700 bg-indigo-50/50 p-2 rounded-lg">
                                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    <b>นัดหมายรอบถัดไป:</b> {new Date(act.next_action_date).toLocaleDateString('th-TH')}
                                    {act.next_action_note ? ` — ${act.next_action_note}` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: General Info & Pipeline Stage */}
            {activeTab === 'info' && (
              <div className="space-y-6 divide-y divide-slate-100">
                
                {/* Location & General Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">ข้อมูลสถานที่</h3>
                    <button
                      type="button"
                      onClick={() => setShowFullEditModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>แก้ไขที่อยู่ / พิกัด</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-slate-800 leading-relaxed">{customer.address || 'ไม่ระบุที่อยู่'}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block">อำเภอ / โซน</span>
                        <span className="font-semibold text-slate-800">{customer.district || '-'}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block">จังหวัด</span>
                        <span className="font-semibold text-slate-800">{customer.province || '-'}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block">คะแนนรีวิว</span>
                        <div className="flex items-center space-x-1 font-semibold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{customer.rating ? `${customer.rating} (${customer.review_count || 0})` : 'ไม่มีรีวิว'}</span>
                        </div>
                      </div>
                    </div>
                    {customer.website && (
                      <div className="flex items-center space-x-2 text-xs pt-1">
                        <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                        <a
                          href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          {customer.website}
                        </a>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center space-x-2 text-xs pt-1">
                        <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                        <a
                          href={`mailto:${customer.email.trim()}`}
                          className="text-indigo-600 hover:underline font-medium truncate"
                        >
                          {customer.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sales Pipeline Stage Selector */}
                <div className="pt-5 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    สถานะ Sales Pipeline ปัจจุบัน
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PIPELINE_STAGES.map((s) => {
                      const isSelected = pipelineStage === s.stage;
                      return (
                        <button
                          key={s.stage}
                          type="button"
                          onClick={() => setPipelineStage(s.stage)}
                          className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                            isSelected
                              ? `${s.bg} ${s.color} ${s.border} ring-2 ring-offset-1 ring-blue-500 shadow-sm`
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                          <span className="truncate">{s.stage}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sales Fields Editing */}
                <div className="pt-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">บันทึกข้อมูลหลัก</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>ผู้ติดต่อ / ฝ่ายจัดซื้อ-ซ่อมบำรุง</span>
                      </label>
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="เช่น คุณสมชาย (ผจก. ซ่อมบำรุง)"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>สินค้าเป้าหมาย</span>
                      </label>
                      <input
                        type="text"
                        value={targetProduct}
                        onChange={(e) => setTargetProduct(e.target.value)}
                        placeholder="เช่น เครื่องกรองน้ำมันไฮดรอลิก"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* DBD & Legal Info */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>ข้อมูลนิติบุคคล DBD / ข้อมูลทางการ</span>
                      </span>
                      <span className="text-[11px] text-slate-500">สำหรับผูกบัญชี DBD แม่นยำ 100%</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          ชื่อจดทะเบียน DBD (ถ้าต่างจากชื่อบนแผนที่)
                        </label>
                        <input
                          type="text"
                          value={registeredName}
                          onChange={(e) => setRegisteredName(e.target.value)}
                          placeholder="เช่น บริษัท สหะเจริญ โลหะพลาสติกภัณฑ์ จำกัด"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          เลขนิติบุคคล 13 หลัก (Tax ID)
                        </label>
                        <input
                          type="text"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="เช่น 0105548012345"
                          maxLength={13}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>หมายเหตุทั่วไป</span>
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="รายละเอียดเพิ่มเติมของโรงงาน..."
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบโรงงานนี้</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveCustomer}
                      disabled={savingCustomer}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                        savedCustomerSuccess
                          ? 'bg-emerald-600'
                          : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                      } disabled:opacity-50`}
                    >
                      {savedCustomerSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>บันทึกเรียบร้อย!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{savingCustomer ? 'กำลังบันทึก...' : 'บันทึกข้อมูลหลัก'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>อัปเดตล่าสุด: {customer.updated_at ? new Date(customer.updated_at).toLocaleString('th-TH') : '-'}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              ปิด
            </button>
          </div>

        </div>
      </div>

      {/* Full Edit Modal */}
      <CustomerFormModal
        isOpen={showFullEditModal}
        customer={customer}
        onClose={() => setShowFullEditModal(false)}
        onSaved={(updated) => {
          onCustomerUpdated(updated);
          setShowFullEditModal(false);
        }}
      />

      {/* Delete Customer Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title={`ยืนยันการลบ ${customer.name}?`}
        message="คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลโรงงานนี้ออกจากระบบ? ข้อมูลและประวัติการเข้าพบทั้งหมดจะถูกลบถาวรและไม่สามารถกู้คืนได้"
        isDeleting={deletingCustomer}
        onConfirm={handleDeleteCustomer}
        onClose={() => setShowDeleteModal(false)}
      />

      {/* Delete Activity Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!activityToDelete}
        title="ยืนยันการลบประวัติการเข้าพบ?"
        message="คุณต้องการลบบันทึกประวัติกิจกรรมนี้ใช่หรือไม่?"
        isDeleting={deletingActivity}
        onConfirm={handleDeleteActivity}
        onClose={() => setActivityToDelete(null)}
      />
    </>
  );
}
