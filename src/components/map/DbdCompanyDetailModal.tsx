'use client';

import React, { useState } from 'react';
import { DBDCompany, Customer } from '@/types/customer';
import { supabase } from '@/lib/supabase';
import { getDbdSearchUrl } from '@/lib/utils';
import {
  X,
  Building2,
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  Plus,
  CheckCircle2,
  Copy,
  Check,
  Navigation,
  ShieldCheck,
  Coins,
  Loader2,
  Layers,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface DbdCompanyDetailModalProps {
  company: DBDCompany | null;
  isOpen: boolean;
  isInCrm?: boolean;
  crmCustomerId?: number | null;
  onClose: () => void;
  onImportSuccess?: (importedCustomer: Customer) => void;
  onNavigateToCustomer?: (customerId: number) => void;
}

export default function DbdCompanyDetailModal({
  company,
  isOpen,
  isInCrm = false,
  crmCustomerId = null,
  onClose,
  onImportSuccess,
  onNavigateToCustomer,
}: DbdCompanyDetailModalProps) {
  const [copiedTaxId, setCopiedTaxId] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen || !company) return null;

  const isGoogleBusiness = company.pin_type === 'GOOGLE_BUSINESS';

  const handleCopyTaxId = (taxId: string) => {
    navigator.clipboard.writeText(taxId);
    setCopiedTaxId(true);
    setTimeout(() => setCopiedTaxId(false), 2000);
  };

  const handleImportToCrm = async () => {
    if (!company) return;
    setIsImporting(true);
    try {
      const noteParts = [
        isGoogleBusiness ? '📍 หมุดสถานที่จริง (Google Business Profile)' : '📍 พิกัดที่อยู่ DBD (ยังไม่ได้ลงทะเบียน Google)',
        company.registered_capital ? `💰 ทุนจดทะเบียน: ${company.registered_capital.toLocaleString()} บาท` : null,
        company.tsic_code ? `TSIC: ${company.tsic_code}` : null,
      ].filter(Boolean);

      const newCustomerPayload: any = {
        name: company.name,
        address: company.address
          ? `${company.address} ต.${company.subdistrict || ''} อ.${company.district || ''} จ.${company.province || ''} ${company.zipcode || ''}`.trim()
          : null,
        district: company.district || null,
        province: company.province || 'สมุทรปราการ',
        phone: company.phone || null,
        website: company.website || null,
        google_maps_url: company.google_maps_url || null,
        latitude: company.latitude || null,
        longitude: company.longitude || null,
        business_type: company.objective || company.industry_group || 'โรงงานอุตสาหกรรม',
        pipeline_stage: 'ยังไม่ได้ติดต่อ',
        tax_id: company.tax_id || null,
        dbd_company_id: company.id,
        place_id: isGoogleBusiness ? company.place_id : null,
        pin_type: isGoogleBusiness ? 'GOOGLE_BUSINESS' : 'DBD_ADDRESS',
        notes: noteParts.join(' | '),
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomerPayload])
        .select()
        .single();

      if (error) throw error;

      setImportSuccess(true);
      if (onImportSuccess && data) {
        onImportSuccess(data);
      }
    } catch (err: any) {
      console.error('Failed to import customer from DBD modal:', err);
      alert('เกิดข้อผิดพลาดในการนำเข้า: ' + (err.message || ''));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-50/40 to-white flex items-start justify-between">
          <div className="space-y-1.5 min-w-0 flex-1 pr-3">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300/80 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                <span>คลังโรงงาน DBD</span>
              </span>

              {isGoogleBusiness ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                  <span>🟢</span>
                  <span>ธุรกิจลงทะเบียน Google</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                  <span>📍</span>
                  <span>พิกัดที่อยู่ DBD</span>
                </span>
              )}

              {(isInCrm || importSuccess) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>อยู่ใน Sales CRM</span>
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {company.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* 1. Registration Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>ข้อมูลการจดทะเบียนนิติบุคคล</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Tax ID */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                <div className="text-[11px] font-semibold text-slate-400">เลขนิติบุคคล / Tax ID</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                    {company.tax_id || '-'}
                  </span>
                  {company.tax_id && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleCopyTaxId(company.tax_id!)}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                        title="คัดลอกเลขทะเบียน"
                      >
                        {copiedTaxId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={getDbdSearchUrl(company)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                        title="เปิดดูบน DBD DataWarehouse"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Registered Capital */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                <div className="text-[11px] font-semibold text-slate-400">ทุนจดทะเบียน</div>
                <div className="mt-1 flex items-baseline">
                  <span className="font-black text-amber-700 text-base sm:text-lg">
                    {company.registered_capital ? company.registered_capital.toLocaleString() : '-'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 ml-1">บาท</span>
                </div>
              </div>

              {/* TSIC Code */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                <div className="text-[11px] font-semibold text-slate-400">รหัส TSIC (หมวดหมู่ธุรกิจ)</div>
                <div className="mt-1 font-bold text-indigo-700 text-xs sm:text-sm">
                  {company.tsic_code ? `TSIC ${company.tsic_code}` : '-'}
                  <span className="text-slate-600 font-normal ml-1.5">
                    ({company.industry_group || 'การผลิต'})
                  </span>
                </div>
              </div>

              {/* Registered Date */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                <div className="text-[11px] font-semibold text-slate-400">วันที่จดทะเบียนจัดตั้ง</div>
                <div className="mt-1 font-bold text-slate-800 text-xs sm:text-sm">
                  {company.registered_date || (company.batch_year ? `ปี พ.ศ. ${company.batch_year}` : '-')}
                </div>
              </div>
            </div>

            {/* Objective */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/60">
              <div className="text-[11px] font-semibold text-slate-400 mb-1">วัตถุประสงค์ / สินค้าที่ผลิต</div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {company.objective || company.industry_group || 'ไม่ระบุรายละเอียดวัตถุประสงค์'}
              </p>
            </div>
          </div>

          {/* 2. Location & Map Information */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>ที่ตั้งโรงงาน & ข้อมูลพิกัดแผนที่</span>
            </h3>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 space-y-2">
              <div className="text-xs text-slate-700 leading-relaxed">
                <strong>ที่อยู่จดทะเบียน:</strong> {company.address || '-'} ต.{company.subdistrict || '-'} อ.{company.district || '-'} จ.{company.province || 'สมุทรปราการ'} {company.zipcode || ''}
              </div>

              {company.latitude && company.longitude ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="font-mono text-xs text-slate-500">
                    GPS: {company.latitude.toFixed(6)}, {company.longitude.toFixed(6)}
                  </div>
                  <a
                    href={company.google_maps_url || `https://www.google.com/maps?q=${company.latitude},${company.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>เปิดนำทางใน Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : null}
            </div>

            {/* Contact Phone & Website */}
            {(company.phone || company.website) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    className="flex items-center space-x-2 p-3 rounded-xl bg-white border border-slate-200/60 text-blue-700 font-bold hover:bg-blue-50 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>{company.phone}</span>
                  </a>
                )}
                {company.website && (
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-2 p-3 rounded-xl bg-white border border-slate-200/60 text-indigo-700 font-bold hover:bg-indigo-50 transition-colors truncate"
                  >
                    <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{company.website}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href={getDbdSearchUrl(company)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-blue-700 font-bold"
          >
            <span>🏛️ ตรวจสอบงบการเงินบน DBD DataWarehouse+</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div>
            {isInCrm || importSuccess ? (
              <div className="flex items-center space-x-2">
                {crmCustomerId && onNavigateToCustomer && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToCustomer(crmCustomerId);
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs sm:text-sm hover:bg-blue-100 transition-colors"
                  >
                    <span>ดูหมุดใน CRM</span>
                  </button>
                )}
                <div className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>อยู่ใน Sales CRM แล้ว</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleImportToCrm}
                disabled={isImporting}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-500/25 transition-all hover:scale-102 active:scale-98"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังเพิ่มเข้า CRM...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>+ เพิ่มเข้า Sales CRM (1-Click)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
