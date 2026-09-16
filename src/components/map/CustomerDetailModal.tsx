'use client';

import React, { useState, useEffect } from 'react';
import { Customer, PIPELINE_STAGES, getStageConfig } from '@/types/customer';
import { supabase } from '@/lib/supabase';
import { getDbdSearchUrl } from '@/lib/utils';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import EmailComposeModal from '@/components/common/EmailComposeModal';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Globe,
  ExternalLink,
  Star,
  Building2,
  Save,
  CheckCircle2,
  Clock,
  User,
  Package,
  FileText,
  Trash2,
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

  // Customer Base Fields
  const [pipelineStage, setPipelineStage] = useState(customer.pipeline_stage || 'ยังไม่ได้ติดต่อ');
  const [phone, setPhone] = useState(customer.phone || '');
  const [email, setEmail] = useState(customer.email || '');
  const [website, setWebsite] = useState(customer.website || '');
  const [contactPerson, setContactPerson] = useState(customer.contact_person || '');
  const [targetProduct, setTargetProduct] = useState(customer.target_product || '');
  const [notes, setNotes] = useState(customer.notes || '');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savedCustomerSuccess, setSavedCustomerSuccess] = useState(false);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Delete Customer State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  useEffect(() => {
    if (customer?.id) {
      setPipelineStage(customer.pipeline_stage || 'ยังไม่ได้ติดต่อ');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setWebsite(customer.website || '');
      setContactPerson(customer.contact_person || '');
      setTargetProduct(customer.target_product || '');
      setNotes(customer.notes || '');
    }
  }, [customer?.id]);

  const currentStageConfig = getStageConfig(pipelineStage);

  // Save Customer Basic Profile
  const handleSaveCustomer = async () => {
    setSavingCustomer(true);
    try {
      const updates = {
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        pipeline_stage: pipelineStage,
        contact_person: contactPerson.trim() || null,
        target_product: targetProduct.trim() || null,
        notes: notes.trim() || null,
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

  const mapNavigationUrl =
    customer.google_maps_url ||
    (customer.latitude && customer.longitude
      ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.name + ' ' + (customer.address || 'สมุทรปราการ'))}`);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentStageConfig.bg} ${currentStageConfig.color} ${currentStageConfig.border}`}>
                    {pipelineStage}
                  </span>
                  {customer.district && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {customer.district}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-snug truncate">
                  {customer.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Bar (Phone, Mail, Maps, DBD) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all active:scale-[0.98]"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">โทร {customer.phone}</span>
                </a>
              ) : (
                <div className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-slate-100 text-slate-400 text-xs">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>ไม่มีเบอร์โทร</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl font-semibold text-xs transition-all active:scale-[0.98] ${
                  customer.email
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{customer.email ? 'ส่งอีเมล' : 'เขียนอีเมล'}</span>
              </button>

              {customer.website ? (
                <a
                  href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-semibold text-xs transition-all active:scale-[0.98]"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">เว็บไซต์</span>
                </a>
              ) : (
                <a
                  href={getDbdSearchUrl(customer)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-semibold text-xs transition-all active:scale-[0.98]"
                  title="ดูข้อมูลงบการเงิน DBD DataWarehouse"
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                  <span className="truncate">DBD ข้อมูล</span>
                </a>
              )}

              <a
                href={mapNavigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-semibold text-xs shadow-sm shadow-[#1b9b8e]/20 transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Google Maps</span>
              </a>
            </div>

            {/* DBD Quick Link */}
            <a
              href={getDbdSearchUrl(customer)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
              title="ดูข้อมูลนิติบุคคล DBD DataWarehouse / งบการเงิน"
            >
              <span className="flex items-center space-x-1.5 truncate">
                <span>🏛️</span>
                <span className="truncate">ดูข้อมูลนิติบุคคล DBD DataWarehouse (ทุนจดทะเบียน / กรรมการ)</span>
              </span>
              <span className="flex items-center space-x-1 text-[11px] text-[#1b9b8e] font-semibold shrink-0 ml-1">
                <span>เปิดดู</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700">
            
            {/* Location & General Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">ข้อมูลสถานที่ & ที่อยู่</h3>
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
                    <Globe className="w-4 h-4 text-[#1b9b8e] shrink-0" />
                    <a
                      href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#148277] hover:underline truncate"
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
            <div className="pt-5 border-t border-slate-100 space-y-3">
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
                          ? `${s.bg} ${s.color} ${s.border} ring-2 ring-offset-1 ring-[#1b9b8e] shadow-sm`
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
            <div className="pt-5 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">บันทึก & แก้ไขข้อมูลโรงงาน</h3>
              
              {/* Phone & Email Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>เบอร์โทรศัพท์</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 02 123 4567, 081 234 5678"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>อีเมล (Email)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="เช่น contact@factory.com"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                  />
                </div>
              </div>

              {/* Website & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>เว็บไซต์ (Website)</span>
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="เช่น https://www.factory.com"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                  />
                </div>

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
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                  />
                </div>
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
                  placeholder="เช่น เครื่องกรองน้ำมันไฮดรอลิก / เครื่องฟื้นฟูน้ำยาหล่อเย็น"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                />
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
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
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
                  className={`flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                    savedCustomerSuccess
                      ? 'bg-emerald-600'
                      : 'bg-[#1b9b8e] hover:bg-[#148277] active:scale-95'
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
                      <span>{savingCustomer ? 'กำลังบันทึก...' : 'บันทึกข้อมูลโรงงาน'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 pb-[max(0.85rem,env(safe-area-inset-bottom,12px))] border-t border-slate-100 bg-slate-50/95 backdrop-blur-md flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center space-x-1 truncate max-w-[200px] sm:max-w-none text-[11px] sm:text-xs">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">อัปเดต: {customer.updated_at ? new Date(customer.updated_at).toLocaleString('th-TH') : '-'}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all active:scale-95 touch-press shrink-0"
            >
              ปิด
            </button>
          </div>

        </div>
      </div>

      {/* Delete Customer Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title={`ยืนยันการลบ ${customer.name}?`}
        message="คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลโรงงานนี้ออกจากระบบ? ข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้"
        isDeleting={deletingCustomer}
        onConfirm={handleDeleteCustomer}
        onClose={() => setShowDeleteModal(false)}
      />

      {/* Email Compose & Templates Modal */}
      <EmailComposeModal
        isOpen={showEmailModal}
        customer={customer}
        onClose={() => setShowEmailModal(false)}
      />
    </>
  );
}
