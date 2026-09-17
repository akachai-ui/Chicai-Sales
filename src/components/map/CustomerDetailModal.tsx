'use client';

import React, { useState, useEffect } from 'react';
import { Customer, PIPELINE_STAGES, getStageConfig } from '@/types/customer';
import { supabase, fetchVisitReportsByCustomer } from '@/lib/supabase';
import { getDbdSearchUrl } from '@/lib/utils';
import {
  getMyPortfolioIds,
  getLocalMyCustomers,
  addToPortfolio,
  removeFromPortfolio,
  togglePortfolio,
  isCustomerInPortfolio,
  subscribeToPortfolioChanges,
} from '@/lib/portfolio';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import EmailComposeModal from '@/components/common/EmailComposeModal';
import SalesVisitReportModal from '@/components/planner/SalesVisitReportModal';
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
  Calendar,
  Plus,
} from 'lucide-react';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated: (updatedCustomer: Customer) => void;
  onCustomerDeleted?: (deletedCustomerId: number) => void;
  hidePipelineSelector?: boolean;
  tableName?: 'customers' | 'my_customers';
}

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated,
  onCustomerDeleted,
  hidePipelineSelector = false,
  tableName = 'my_customers',
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
  const [portfolioList, setPortfolioList] = useState<any[]>([]);

  // Visit Reports State
  const [visitReports, setVisitReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [isNewReport, setIsNewReport] = useState(false);

  useEffect(() => {
    setPortfolioList(getLocalMyCustomers());
    const unsub = subscribeToPortfolioChanges((list) => {
      setPortfolioList(list);
    });
    return unsub;
  }, []);

  const loadVisitReports = async () => {
    if (!customer?.id) return;
    setLoadingReports(true);
    try {
      const list = await fetchVisitReportsByCustomer(customer.id);
      setVisitReports(list || []);
    } catch (e) {
      console.error('Failed to load visit reports', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (customer?.id && isOpen) {
      setPipelineStage(customer.pipeline_stage || 'ยังไม่ได้ติดต่อ');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setWebsite(customer.website || '');
      setContactPerson(customer.contact_person || '');
      setTargetProduct(customer.target_product || '');
      setNotes(customer.notes || '');
      
      loadVisitReports();
    }
  }, [customer?.id, isOpen]);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Visit Report Modal State
  const [showVisitReportModal, setShowVisitReportModal] = useState(false);

  // Delete Customer State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  const currentStageConfig = getStageConfig(pipelineStage);

  // Save Customer Basic Profile
  const handleSaveCustomer = async () => {
    setSavingCustomer(true);
    try {
      let data, error;
      const targetTable = tableName;

      if (!customer.id || customer.id === 0) {
        // Insert new record into my_customers
        const newRecord = {
          name: customer.name,
          address: customer.address,
          district: customer.district,
          province: customer.province || 'สมุทรปราการ',
          latitude: customer.latitude,
          longitude: customer.longitude,
          website: website.trim() || customer.website || null,
          google_maps_url: customer.google_maps_url,
          tax_id: customer.tax_id,
          registered_capital: customer.registered_capital,
          phone: phone.trim() || null,
          email: email.trim() || null,
          pipeline_stage: pipelineStage,
          contact_person: contactPerson.trim() || null,
          target_product: targetProduct.trim() || null,
          notes: notes.trim() || null,
          source_type: customer.dbd_company_id ? 'DBD' : 'CUSTOMERS',
          source_id: customer.dbd_company_id || customer.id || null,
        };

        const res = await supabase.from('my_customers').insert(newRecord).select().single();
        data = res.data;
        error = res.error;
        if (data) {
          addToPortfolio(data);
        }
      } else {
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

        const res = await supabase
          .from(targetTable)
          .update(updates)
          .eq('id', customer.id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) {
        alert('Error saving customer data: ' + error.message);
      } else if (data) {
        onCustomerUpdated(data as Customer);
        setSavedCustomerSuccess(true);
        setTimeout(() => setSavedCustomerSuccess(false), 2000);
      }
    } catch (err: any) {
      alert('An error occurred: ' + err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async () => {
    setDeletingCustomer(true);
    try {
      const targetTable = tableName;
      const { error } = await supabase
        .from(targetTable)
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      removeFromPortfolio(customer);

      if (onCustomerDeleted) {
        onCustomerDeleted(customer.id);
      }
      setShowDeleteModal(false);
      onClose();
    } catch (err: any) {
      alert('Error deleting factory: ' + err.message);
    } finally {
      setDeletingCustomer(false);
    }
  };

  const mapNavigationUrl =
    customer.google_maps_url ||
    (customer.latitude && customer.longitude
      ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.name + ' ' + (customer.address || 'Samut Prakan'))}`);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  {hidePipelineSelector ? (
                    (() => {
                      const inPort = isCustomerInPortfolio(customer, portfolioList);
                      return inPort ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          ⭐ In Portfolio
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#148277] border border-teal-200">
                          ⚪ Available
                        </span>
                      );
                    })()
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentStageConfig.bg} ${currentStageConfig.color} ${currentStageConfig.border}`}>
                      {currentStageConfig.label || pipelineStage}
                    </span>
                  )}
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
              <div className="flex items-center space-x-1.5 shrink-0">
                {(() => {
                  const inPort = isCustomerInPortfolio(customer, portfolioList);
                  return (
                    <button
                      type="button"
                      onClick={() => togglePortfolio(customer)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-all touch-press ${
                        inPort
                          ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                      title={inPort ? 'In Portfolio (Click to remove)' : 'Add to My Portfolio'}
                    >
                      <Star className={`w-4 h-4 ${inPort ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">{inPort ? 'In Portfolio' : 'Add to Portfolio'}</span>
                      <span className="sm:hidden">{inPort ? 'In Port' : '+ Port'}</span>
                    </button>
                  );
                })()}
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action Bar (Phone, Mail, Visit Report, Maps, DBD) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all active:scale-[0.98]"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Call {customer.phone}</span>
                </a>
              ) : (
                <div className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-slate-100 text-slate-400 text-xs">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>No Phone</span>
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
                <span className="truncate">{customer.email ? 'Send Email' : 'Compose Email'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedReportId(null);
                  setIsNewReport(true);
                  setShowVisitReportModal(true);
                }}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl font-bold text-xs bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 shrink-0 text-[#1b9b8e]" />
                <span className="truncate">Visit Report</span>
              </button>

              {customer.website ? (
                <a
                  href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-semibold text-xs transition-all active:scale-[0.98]"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Website</span>
                </a>
              ) : (
                <a
                  href={getDbdSearchUrl(customer)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-semibold text-xs transition-all active:scale-[0.98]"
                  title="View DBD DataWarehouse financial details"
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                  <span className="truncate">DBD Info</span>
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
              title="View DBD DataWarehouse Legal Entity & Financial Info"
            >
              <span className="flex items-center space-x-1.5 truncate">
                <span>🏛️</span>
                <span className="truncate">View Legal Entity Info on DBD DataWarehouse (Capital / Directors)</span>
              </span>
              <span className="flex items-center space-x-1 text-[11px] text-[#1b9b8e] font-semibold shrink-0 ml-1">
                <span>Open</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700">
            
            {/* Location & General Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Location & Address</h3>
              <div className="space-y-2">
                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-800 leading-relaxed">{customer.address || 'Unspecified address'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">District / Zone</span>
                    <span className="font-semibold text-slate-800">{customer.district || '-'}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">Province</span>
                    <span className="font-semibold text-slate-800">{customer.province || '-'}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">Rating</span>
                    <div className="flex items-center space-x-1 font-semibold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{customer.rating ? `${customer.rating} (${customer.review_count || 0})` : 'No rating'}</span>
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

            {/* Sales Pipeline Stage Selector (Hidden on Map view, shown in My Customers) */}
            {!hidePipelineSelector && (
              <div className="pt-5 border-t border-slate-100 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Current Sales Pipeline Stage
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
                        <span className="truncate">{s.label || s.stage}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Visit History Section */}
            <div className="pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4" />
                  <span>ประวัติการเข้าพบ (Visit History)</span>
                </h3>
                <button
                  onClick={() => {
                    setSelectedReportId(null);
                    setIsNewReport(true);
                    setShowVisitReportModal(true);
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition-colors border border-teal-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่ม Report ใหม่</span>
                </button>
              </div>

              {loadingReports ? (
                <div className="py-4 text-center text-xs text-slate-400 animate-pulse">Loading history...</div>
              ) : visitReports.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {visitReports.map((report, idx) => (
                    <button
                      key={report.id || idx}
                      onClick={() => {
                        setSelectedReportId(report.id);
                        setIsNewReport(false);
                        setShowVisitReportModal(true);
                      }}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-left group"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                          <Calendar className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                            <span>{new Date(report.visit_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {report.visit_type && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-[10px] text-slate-600 font-semibold">{report.visit_type}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {report.objective || 'ไม่มีระบุวัตถุประสงค์'}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-[#1b9b8e] transition-colors shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-6 px-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-xs font-semibold text-slate-600">ยังไม่มีประวัติการเข้าพบลูกค้ารายนี้</div>
                  <div className="text-[11px] text-slate-400">กดปุ่ม "เพิ่ม Report ใหม่" เพื่อบันทึกการเข้าพบ</div>
                </div>
              )}
            </div>

            {/* Sales Fields Editing */}
            <div className="pt-5 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Edit Factory Details</h3>
              
              {/* Phone & Email Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 02 123 4567, 081 234 5678"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@factory.com"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                  />
                </div>
              </div>

              {/* Website & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Website</span>
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="e.g. https://www.factory.com"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Person / Dept</span>
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Somchai (Maintenance Mgr.)"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span>Target Product</span>
                </label>
                <input
                  type="text"
                  value={targetProduct}
                  onChange={(e) => setTargetProduct(e.target.value)}
                  placeholder="e.g. Hydraulic Oil Filtration / Coolant Recycling System"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1b9b8e] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>General Notes</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional factory details, sales context..."
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
                  <span>Delete this factory</span>
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
                      <span>Saved Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{savingCustomer ? 'Saving...' : 'Save Factory Details'}</span>
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
              <span className="truncate">Updated: {customer.updated_at ? new Date(customer.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all active:scale-95 touch-press shrink-0"
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* Delete Customer Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title={`Confirm deletion of ${customer.name}?`}
        message="Are you sure you want to delete this factory from the system? This action cannot be undone."
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

      {/* Sales Visit Report Modal */}
      <SalesVisitReportModal
        isOpen={showVisitReportModal}
        customer={customer}
        reportId={selectedReportId}
        isNew={isNewReport}
        onClose={() => setShowVisitReportModal(false)}
        onReportSaved={() => {
          loadVisitReports();
        }}
      />
    </>
  );
}
