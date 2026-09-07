'use client';

import React, { useState, useEffect } from 'react';
import { Customer, PIPELINE_STAGES } from '@/types/customer';
import { supabase } from '@/lib/supabase';
import {
  X,
  Building,
  Phone,
  Mail,
  Globe,
  MapPin,
  Save,
  Loader2,
  Crosshair,
  User,
  Package,
  FileText,
  CheckCircle2,
  Plus
} from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  customer?: Customer | null; // null for Create mode, object for Edit mode
  onClose: () => void;
  onSaved: (savedCustomer: Customer, mode: 'create' | 'edit') => void;
}

export default function CustomerFormModal({
  isOpen,
  customer,
  onClose,
  onSaved,
}: CustomerFormModalProps) {
  if (!isOpen) return null;

  const isEdit = !!customer;

  // Form states
  const [name, setName] = useState(customer?.name || '');
  const [seq, setSeq] = useState<string>(customer?.seq ? String(customer.seq) : '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [website, setWebsite] = useState(customer?.website || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [district, setDistrict] = useState(customer?.district || 'บางพลี');
  const [province, setProvince] = useState(customer?.province || 'สมุทรปราการ');
  const [latitude, setLatitude] = useState<string>(customer?.latitude ? String(customer.latitude) : '13.58');
  const [longitude, setLongitude] = useState<string>(customer?.longitude ? String(customer.longitude) : '100.70');
  const [pipelineStage, setPipelineStage] = useState(customer?.pipeline_stage || 'ยังไม่ได้ติดต่อ');
  const [contactPerson, setContactPerson] = useState(customer?.contact_person || '');
  const [targetProduct, setTargetProduct] = useState(customer?.target_product || 'เครื่องกรองน้ำมันไฮดรอลิก / เครื่องฟื้นฟูน้ำยาหล่อเย็น');
  const [businessType, setBusinessType] = useState(customer?.business_type || 'โรงงานอุตสาหกรรม');
  const [operatingStatus, setOperatingStatus] = useState(customer?.operating_status || 'เปิดดำเนินการ');
  const [notes, setNotes] = useState(customer?.notes || '');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setSeq(customer.seq ? String(customer.seq) : '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setWebsite(customer.website || '');
      setAddress(customer.address || '');
      setDistrict(customer.district || 'บางพลี');
      setProvince(customer.province || 'สมุทรปราการ');
      setLatitude(customer.latitude ? String(customer.latitude) : '');
      setLongitude(customer.longitude ? String(customer.longitude) : '');
      setPipelineStage(customer.pipeline_stage || 'ยังไม่ได้ติดต่อ');
      setContactPerson(customer.contact_person || '');
      setTargetProduct(customer.target_product || '');
      setBusinessType(customer.business_type || '');
      setOperatingStatus(customer.operating_status || 'เปิดดำเนินการ');
      setNotes(customer.notes || '');
    } else {
      setName('');
      setSeq('');
      setPhone('');
      setEmail('');
      setWebsite('');
      setAddress('');
      setDistrict('บางพลี');
      setProvince('สมุทรปราการ');
      setLatitude('13.5850');
      setLongitude('100.7050');
      setPipelineStage('ยังไม่ได้ติดต่อ');
      setContactPerson('');
      setTargetProduct('เครื่องกรองน้ำมันไฮดรอลิก / เครื่องฟื้นฟูน้ำยาหล่อเย็น');
      setBusinessType('โรงงานอุตสาหกรรม');
      setOperatingStatus('เปิดดำเนินการ');
      setNotes('');
    }
    setErrorMsg(null);
  }, [customer]);

  // Pull current GPS coordinates
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(7));
          setLongitude(pos.coords.longitude.toFixed(7));
        },
        (err) => {
          alert('ไม่สามารถดึงพิกัด GPS ได้: ' + err.message);
        }
      );
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('กรุณาระบุชื่อโรงงาน / บริษัท');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const latNum = latitude.trim() ? parseFloat(latitude.trim()) : null;
      const lngNum = longitude.trim() ? parseFloat(longitude.trim()) : null;

      const payload = {
        name: name.trim(),
        seq: seq.trim() ? parseInt(seq.trim()) : null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        district: district.trim() || null,
        province: province.trim() || null,
        latitude: latNum,
        longitude: lngNum,
        google_maps_url: latNum && lngNum ? `https://maps.google.com/?q=${latNum},${lngNum}` : null,
        pipeline_stage: pipelineStage,
        contact_person: contactPerson.trim() || null,
        target_product: targetProduct.trim() || null,
        business_type: businessType.trim() || null,
        operating_status: operatingStatus.trim() || 'เปิดดำเนินการ',
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && customer?.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customer.id)
          .select()
          .single();

        if (error) throw error;
        onSaved(data as Customer, 'edit');
      } else {
        // CREATE
        const { data, error } = await supabase
          .from('customers')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        onSaved(data as Customer, 'create');
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving customer:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[92vh] animate-slide-up sm:animate-in sm:fade-in sm:zoom-in-95 duration-200 border-t sm:border border-slate-200">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-slate-50/80">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {isEdit ? <Building className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {isEdit ? 'แก้ไขข้อมูลโรงงาน / ลูกค้า' : 'เพิ่มข้อมูลโรงงาน / ลูกค้าใหม่'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? `แก้ไขข้อมูลของ #${customer?.seq || customer?.id} • ${customer?.name}` : 'กรอกรายละเอียดเพื่อเพิ่มหมุดบนแผนที่และรายชื่อลูกค้า'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Section 1: ข้อมูลบริษัท / โรงงาน */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
              1. ข้อมูลทั่วไปของโรงงาน
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อโรงงาน / บริษัท <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น บริษัท สยามออโต้พาร์ท จำกัด"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ลำดับ / รหัส (#)
                </label>
                <input
                  type="number"
                  value={seq}
                  onChange={(e) => setSeq(e.target.value)}
                  placeholder="เช่น 1090"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 02 123 4567"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  อีเมลติดต่อ
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="เช่น contact@factory.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เว็บไซต์
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="เช่น https://www.example.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: ที่อยู่ & พิกัดแผนที่ */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
                2. ที่อยู่ & พิกัดบนแผนที่ (สำหรับสร้างหมุด)
              </h3>
              <button
                type="button"
                onClick={handleGetLocation}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-[11px]"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>ดึงพิกัดปัจจุบัน (GPS)</span>
              </button>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ที่อยู่เต็ม
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="เช่น 88/1 หมู่ 5 ถ. บางนา-ตราด ต. บางพลีใหญ่"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  อำเภอ / โซน
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="เช่น บางพลี"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  จังหวัด
                </label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="เช่น สมุทรปราการ"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ละติจูด (Lat)
                </label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="เช่น 13.5850"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ลองจิจูด (Lng)
                </label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="เช่น 100.7050"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: สถานะงานขาย (Sales Pipeline) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
              3. สถานะงานขาย & รายละเอียดการติดต่อ
            </h3>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                สถานะ Sales Pipeline
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PIPELINE_STAGES.map((s) => {
                  const isSelected = pipelineStage === s.stage;
                  return (
                    <button
                      key={s.stage}
                      type="button"
                      onClick={() => setPipelineStage(s.stage)}
                      className={`flex items-center space-x-2 p-2 rounded-xl border font-semibold text-left transition-all ${
                        isSelected
                          ? `${s.bg} ${s.color} ${s.border} ring-2 ring-blue-500 shadow-sm`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <span className="truncate">{s.stage}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ผู้ติดต่อ / ฝ่ายจัดซื้อ-ซ่อมบำรุง
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="เช่น คุณสมชาย (ผจก.ฝ่ายซ่อมบำรุง)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  สินค้าเป้าหมาย
                </label>
                <input
                  type="text"
                  value={targetProduct}
                  onChange={(e) => setTargetProduct(e.target.value)}
                  placeholder="เช่น เครื่องกรองน้ำมันไฮดรอลิก"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                หมายเหตุเพิ่มเติม
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="บันทึกรายละเอียดทั่วไปเกี่ยวกับลูกค้ารายนี้..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มโรงงานใหม่'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
