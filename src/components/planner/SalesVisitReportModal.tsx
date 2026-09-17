'use client';

import React, { useState, useEffect } from 'react';
import { SalesVisitReport, CompetitorItem, NextActionItem } from '@/types/visit-report';
import { SalesPlanItem } from '@/types/planner';
import { Customer, MyCustomer } from '@/types/customer';
import { fetchVisitReportByPlanItem, fetchVisitReportsByCustomer, upsertVisitReport } from '@/lib/supabase';
import {
  X,
  Printer,
  Save,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Target,
  Briefcase,
  Layers,
  FileText,
  Loader2,
  CheckCircle2,
  Eye,
  Edit3,
  Sparkles,
  Copy,
} from 'lucide-react';

interface SalesVisitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | MyCustomer | null;
  planItem?: SalesPlanItem | null;
  reportId?: number | null; // Pass specific report ID to edit
  isNew?: boolean; // Force create new
  onReportSaved?: (report: SalesVisitReport) => void;
}

export default function SalesVisitReportModal({
  isOpen,
  onClose,
  customer,
  planItem,
  reportId,
  isNew,
  onReportSaved,
}: SalesVisitReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form States
  const [reportFormId, setReportFormId] = useState<number | undefined>(undefined);
  const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [salesName, setSalesName] = useState<string>('Akachai Habantan (Sales Executive)');
  const [companyName, setCompanyName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [emailLine, setEmailLine] = useState<string>('');
  const [visitType, setVisitType] = useState<string>('On-site Visit');

  const [objective, setObjective] = useState<string>('');

  const [projectName, setProjectName] = useState<string>('');
  const [projectType, setProjectType] = useState<string>('');
  const [projectStartDate, setProjectStartDate] = useState<string>('');
  const [projectPlace, setProjectPlace] = useState<string>('');
  const [brandInterest, setBrandInterest] = useState<string>('');
  const [projectBudget, setProjectBudget] = useState<string>('');
  const [projectNote, setProjectNote] = useState<string>('');

  const [customerNeedsSummary, setCustomerNeedsSummary] = useState<string>('');

  const [competitors, setCompetitors] = useState<CompetitorItem[]>([
    { brand: '', price: '', condition: '' },
  ]);

  const [nextActions, setNextActions] = useState<NextActionItem[]>([
    { description: '', responsibility: 'Akachai Habantan', action_plan: '' },
  ]);

  const [nextFollowupDate, setNextFollowupDate] = useState<string>('');
  const [nextFollowupTime, setNextFollowupTime] = useState<string>('');
  const [nextFollowupNote, setNextFollowupNote] = useState<string>('');

  const [salesSignatureName, setSalesSignatureName] = useState<string>('Akachai Habantan');
  const [managerSignatureName, setManagerSignatureName] = useState<string>('');
  const [reviewDate, setReviewDate] = useState<string>('');

  // Load existing report
  useEffect(() => {
    if (!isOpen) return;

    const initForm = async () => {
      setLoading(true);
      setSaveSuccess(false);

      try {
        let existingReport: SalesVisitReport | null = null;
        if (!isNew) {
          if (reportId) {
            // Import dynamically to avoid breaking current imports if not already imported
            const { fetchVisitReportById } = await import('@/lib/supabase');
            existingReport = await fetchVisitReportById(reportId);
          } else if (planItem?.id) {
            existingReport = await fetchVisitReportByPlanItem(planItem.id);
          } else if (customer?.id) {
            const list = await fetchVisitReportsByCustomer(customer.id);
            if (list && list.length > 0) {
              existingReport = list[0];
            }
          }
        }

        if (existingReport) {
          setReportFormId(existingReport.id);
          setVisitDate(existingReport.visit_date || new Date().toISOString().split('T')[0]);
          setStartTime(existingReport.start_time || '');
          setEndTime(existingReport.end_time || '');
          setSalesName(existingReport.sales_name || 'Akachai Habantan (Sales Executive)');
          setCompanyName(existingReport.company_name || customer?.name || '');
          setLocation(existingReport.location || customer?.address || customer?.district || '');
          setContactPerson(existingReport.contact_person || customer?.contact_person || '');
          setPosition(existingReport.position || '');
          setPhone(existingReport.phone || customer?.phone || '');
          setEmailLine(existingReport.email_line || customer?.email || '');
          setVisitType(existingReport.visit_type || 'On-site Visit');

          setObjective(existingReport.objective || planItem?.objective || '');

          setProjectName(existingReport.project_name || '');
          setProjectType(existingReport.project_type || '');
          setProjectStartDate(existingReport.project_start_date || '');
          setProjectPlace(existingReport.project_place || '');
          setBrandInterest(existingReport.brand_interest || customer?.target_product || '');
          setProjectBudget(existingReport.project_budget ? String(existingReport.project_budget) : '');
          setProjectNote(existingReport.project_note || '');

          setCustomerNeedsSummary(existingReport.customer_needs_summary || '');

          setCompetitors(
            existingReport.competitors && existingReport.competitors.length > 0
              ? existingReport.competitors
              : [{ brand: '', price: '', condition: '' }]
          );

          setNextActions(
            existingReport.next_actions && existingReport.next_actions.length > 0
              ? existingReport.next_actions
              : [{ description: '', responsibility: 'Akachai Habantan', action_plan: '' }]
          );

          setNextFollowupDate(existingReport.next_followup_date || '');
          setNextFollowupTime(existingReport.next_followup_time || '');
          setNextFollowupNote(existingReport.next_followup_note || '');

          setSalesSignatureName(existingReport.sales_signature_name || 'Akachai Habantan');
          setManagerSignatureName(existingReport.manager_signature_name || '');
          setReviewDate(existingReport.review_date || '');
        } else {
          // Pre-populate with defaults
          setReportFormId(undefined);
          setVisitDate(new Date().toISOString().split('T')[0]);
          setStartTime(planItem?.scheduled_time || '');
          setEndTime('');
          setSalesName('Akachai Habantan (Sales Executive)');
          setCompanyName(customer?.name || '');
          setLocation(customer?.address || customer?.district || 'Samut Prakan');
          setContactPerson(planItem?.contact_person || customer?.contact_person || '');
          setPosition('');
          setPhone(customer?.phone || '');
          setEmailLine(customer?.email || '');
          setVisitType(planItem?.activity_type ? String(planItem.activity_type) : 'On-site Visit');

          setObjective(planItem?.objective || '');

          setProjectName('');
          setProjectType('');
          setProjectStartDate('');
          setProjectPlace(customer?.district || '');
          setBrandInterest(customer?.target_product || '');
          setProjectBudget('');
          setProjectNote('');

          setCustomerNeedsSummary('');

          setCompetitors([{ brand: '', price: '', condition: '' }]);
          setNextActions([{ description: '', responsibility: 'Akachai Habantan', action_plan: '' }]);

          setNextFollowupDate('');
          setNextFollowupTime('');
          setNextFollowupNote('');

          setSalesSignatureName('Akachai Habantan');
          setManagerSignatureName('');
          setReviewDate('');
        }
      } catch (err) {
        console.error('Error initializing visit report modal:', err);
      } finally {
        setLoading(false);
      }
    };

    initForm();
  }, [isOpen, customer, planItem]);

  if (!isOpen) return null;

  // Competitor Handlers
  const handleAddCompetitor = () => {
    setCompetitors([...competitors, { brand: '', price: '', condition: '' }]);
  };

  const handleRemoveCompetitor = (index: number) => {
    if (competitors.length === 1) return;
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const handleCompetitorChange = (index: number, field: keyof CompetitorItem, val: string) => {
    const updated = [...competitors];
    updated[index][field] = val;
    setCompetitors(updated);
  };

  // Next Action Handlers
  const handleAddNextAction = () => {
    setNextActions([...nextActions, { description: '', responsibility: 'Akachai Habantan', action_plan: '' }]);
  };

  const handleRemoveNextAction = (index: number) => {
    if (nextActions.length === 1) return;
    setNextActions(nextActions.filter((_, i) => i !== index));
  };

  const handleNextActionChange = (index: number, field: keyof NextActionItem, val: string) => {
    const updated = [...nextActions];
    updated[index][field] = val;
    setNextActions(updated);
  };

  // 1-Click Copy formatted report content for Company Form
  const handleCopyAllForCorporateForm = () => {
    const activeCompetitors = competitors.filter((c) => c.brand || c.price || c.condition);
    const activeActions = nextActions.filter((a) => a.description || a.action_plan);

    const text = `
CHI CAI ELECTRIC (THAILAND) CO., LTD.
SALES VISIT REPORT / รายงานการเข้าพบลูกค้า

1. ข้อมูลการเข้าพบ (Sales Visit Report)
• วันที่ (Date): ${visitDate || '-'} | เวลา (Time): ${startTime || '-'} - ${endTime || '-'}
• ชื่อบริษัท (Company): ${companyName || '-'}
• ผู้ติดต่อ (Customer): ${contactPerson || '-'} | ตำแหน่ง (Position): ${position || '-'}
• เบอร์โทรศัพท์ (Tel): ${phone || '-'} | Email/Line: ${emailLine || '-'}
• ที่อยู่ / สถานที่ (Location): ${location || '-'}
• พนักงานขาย (Sales): ${salesName || '-'}
• ประเภทการเข้าพบ: ${visitType || 'On-site Visit'}

2. วัตถุประสงค์ในการเข้าพบ (Objective)
${objective || '-'}

3. รายละเอียดสินค้า / โครงการ (Description)
• ชื่อโครงการ (Project Name): ${projectName || '-'}
• ประเภทงาน (Type): ${projectType || '-'}
• สถานที่โครงการ (Place): ${projectPlace || '-'}
• สินค้าที่สนใจ (Brand Interest): ${brandInterest || '-'}
• เริ่มโครงการ (Start Date): ${projectStartDate || '-'}
• งบประมาณ (Budget): ${projectBudget ? `${Number(projectBudget).toLocaleString()} THB` : '-'}
• Note: ${projectNote || '-'}

4. สรุปผลการเข้าพบ ความต้องการ / ข้อมูลที่ได้รับจากลูกค้า (Summary apply to customer needs)
${customerNeedsSummary || '-'}

5. คู่แข่ง / Brand ที่ลูกค้าใช้อยู่ (Competitors)
${
  activeCompetitors.length > 0
    ? activeCompetitors.map((c, i) => `${i + 1}. แบรนด์: ${c.brand || '-'} | ราคา: ${c.price || '-'} | เงื่อนไข: ${c.condition || '-'}`).join('\n')
    : '- ไม่มี'
}

6. งานที่ต้องดำเนินการต่อ (Next Action)
${
  activeActions.length > 0
    ? activeActions.map((a, i) => `${i + 1}. รายการ: ${a.description || '-'} | ผู้รับผิดชอบ: ${a.responsibility || '-'} | แผนดำเนินงาน: ${a.action_plan || '-'}`).join('\n')
    : '- ไม่มี'
}

7. กำหนดการติดตามครั้งถัดไป (Next Follow-up Schedule)
• วันที่ (Date): ${nextFollowupDate || '-'} | เวลา (Time): ${nextFollowupTime || '-'}
• Note: ${nextFollowupNote || '-'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Save to Database
  const handleSave = async (andSwitchToPreview: boolean = false) => {
    if (!companyName.trim()) {
      alert('Please specify the company name.');
      return;
    }

    setSaving(true);
    try {
      const payload: SalesVisitReport = {
        id: reportFormId,
        customer_id: customer?.id || null,
        plan_item_id: planItem?.id || null,
        visit_date: visitDate,
        start_time: startTime || null,
        end_time: endTime || null,
        sales_name: salesName,
        company_name: companyName,
        location: location || null,
        contact_person: contactPerson || null,
        position: position || null,
        phone: phone || null,
        email_line: emailLine || null,
        visit_type: visitType,
        objective: objective || null,
        project_name: projectName || null,
        project_type: projectType || null,
        project_start_date: projectStartDate || null,
        project_place: projectPlace || null,
        brand_interest: brandInterest || null,
        project_budget: projectBudget ? parseFloat(projectBudget) : null,
        project_note: projectNote || null,
        customer_needs_summary: customerNeedsSummary || null,
        competitors: competitors.filter((c) => c.brand || c.price || c.condition),
        next_actions: nextActions.filter((a) => a.description || a.action_plan),
        next_followup_date: nextFollowupDate || null,
        next_followup_time: nextFollowupTime || null,
        next_followup_note: nextFollowupNote || null,
        sales_signature_name: salesSignatureName || 'Akachai Habantan',
        manager_signature_name: managerSignatureName || null,
        review_date: reviewDate || null,
        status: 'SUBMITTED',
      };

      const result = await upsertVisitReport(payload);
      if (result) {
        setReportFormId(result.id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (onReportSaved) onReportSaved(result);
      } else {
        alert('Failed to save visit report.');
      }
    } catch (e: any) {
      console.error('Error saving visit report:', e);
      alert('Error saving report: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[94vh] max-h-[94vh] bg-slate-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        {/* Top Control Bar with Tabs */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 z-10 shadow-xs">
          
          {/* Title & Customer Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#148277] flex items-center justify-center border border-teal-100 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Sales Visit Report
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                {companyName || customer?.name || 'Customer Negotiation Report'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">

            {/* 1-Click Copy Data for Company Form */}
            <button
              onClick={handleCopyAllForCorporateForm}
              type="button"
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
              title="คัดลอกข้อมูลทั้งหมดเพื่อนำไปวางในแบบฟอร์มบริษัท (Copy all for Company Form)"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : '📋 คัดลอกข้อมูลใส่ฟอร์มบริษัท'}</span>
            </button>

            {/* Save Button */}
            <button
              onClick={() => handleSave(false)}
              disabled={saving || loading}
              type="button"
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all active:scale-95 ${
                saveSuccess
                  ? 'bg-emerald-600'
                  : 'bg-[#1b9b8e] hover:bg-[#148277]'
              } disabled:opacity-50`}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'บันทึกข้อมูล'}</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* ======================================================== */}
        {/* DATA ENTRY FORM                     */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50">
          
          {/* Quick Banner info */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>บันทึกข้อมูลเข้าฐานข้อมูล <b>sales_visit_reports</b> และสามารถคัดลอกข้อมูลไปใส่ในไฟล์ฟอร์มบริษัท (PDF/Excel) ได้</span>
            </div>
          </div>

            {/* Section 1: ข้อมูลการเข้าพบ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#148277] font-black text-xs flex items-center justify-center">1</span>
                <h4 className="font-bold text-sm">ข้อมูลการเข้าพบ (Sales Visit Info)</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่เข้าพบ (Date)</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เวลาเริ่ม (Start Time)</label>
                  <input
                    type="text"
                    placeholder="เช่น 09:30"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เวลาสิ้นสุด (End Time)</label>
                  <input
                    type="text"
                    placeholder="เช่น 11:30"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อบริษัท (Company Name)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                    placeholder="ชื่อโรงงานหรือบริษัทลูกค้า"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">พนักงานขาย (Sales Name)</label>
                  <input
                    type="text"
                    value={salesName}
                    onChange={(e) => setSalesName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้ติดต่อ (Customer Name)</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    placeholder="เช่น คุณสมชาย"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง (Position)</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    placeholder="เช่น ผู้จัดการฝ่ายซ่อมบำรุง"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เบอร์โทรศัพท์ (Tel.)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    placeholder="02-xxx-xxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ที่อยู่ / สถานที่ (Location)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    placeholder="อำเภอเมือง สมุทรปราการ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail / Line</label>
                  <input
                    type="text"
                    value={emailLine}
                    onChange={(e) => setEmailLine(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    placeholder="contact@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">ประเภทการเข้าพบ (Visit Type)</label>
                <div className="flex flex-wrap gap-2">
                  {['On-site Visit', 'Demo On-site', 'Phone Call', 'Online Meeting'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setVisitType(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        visitType === t
                          ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-900'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: วัตถุประสงค์ในการเข้าพบ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#148277] font-black text-xs flex items-center justify-center">2</span>
                <h4 className="font-bold text-sm">วัตถุประสงค์ในการเข้าพบ (Objective)</h4>
              </div>
              <textarea
                rows={2}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="เช่น นำเสนอผลิตภัณฑ์เครื่องกรองน้ำมันรุ่นใหม่, ติดตามผลการทดสอบ Demo, นำส่งใบเสนอราคาและต่อรองเงื่อนไข..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Section 3: รายละเอียดสินค้า / โครงการ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#148277] font-black text-xs flex items-center justify-center">3</span>
                <h4 className="font-bold text-sm">รายละเอียดสินค้า / โครงการ (Description)</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อโครงการ (Project Name)</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="เช่น โครงการเปลี่ยนชุดกรองน้ำมัน Line A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทงาน (Project Type)</label>
                  <input
                    type="text"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    placeholder="เช่น งานระบบกรองน้ำมันไฮดรอลิก"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">สถานที่โครงการ (Project Place)</label>
                  <input
                    type="text"
                    value={projectPlace}
                    onChange={(e) => setProjectPlace(e.target.value)}
                    placeholder="เช่น โรงงาน 2 อาคารผลิต"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">สินค้าที่สนใจ (Brand Interest)</label>
                  <input
                    type="text"
                    value={brandInterest}
                    onChange={(e) => setBrandInterest(e.target.value)}
                    placeholder="เช่น Oil Filtration System CC-500"
                    className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-teal-50/40 text-xs font-bold text-teal-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เริ่มโครงการ (Start Date)</label>
                  <input
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">งบประมาณ (Budget - บาท)</label>
                  <input
                    type="number"
                    value={projectBudget}
                    onChange={(e) => setProjectBudget(e.target.value)}
                    placeholder="เช่น 150000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Note (บันทึกเพิ่มเติม)</label>
                <input
                  type="text"
                  value={projectNote}
                  onChange={(e) => setProjectNote(e.target.value)}
                  placeholder="ข้อมูลเพิ่มเติมของโครงการ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700"
                />
              </div>
            </div>

            {/* Section 4: สรุปผลการเข้าพบ & ข้อมูลที่ได้รับจากลูกค้า */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#148277] font-black text-xs flex items-center justify-center">4</span>
                <h4 className="font-bold text-sm">สรุปผลการเข้าพบ ความต้องการ / ข้อมูลที่ได้รับจากลูกค้า (Customer Needs)</h4>
              </div>
              <textarea
                rows={3}
                value={customerNeedsSummary}
                onChange={(e) => setCustomerNeedsSummary(e.target.value)}
                placeholder="สรุปผลการพูดคุย ปัญหาหน้างานที่ลูกค้าพบ เช่น เครื่องจักรร้อน น้ำมันมีตะกอนสูง ต้องการลด Downtime และขอใบเสนอราคาด่วน..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Section 5: คู่แข่ง / Brand ที่ลูกค้าใช้อยู่ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#148277] font-black text-xs flex items-center justify-center">5</span>
                  <h4 className="font-bold text-sm">คู่แข่ง / Brand ที่ลูกค้าใช้อยู่ (Competitors)</h4>
                </div>
                <button
                  type="button"
                  onClick={handleAddCompetitor}
                  className="px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#148277] text-xs font-bold border border-teal-200 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มคู่แข่ง</span>
                </button>
              </div>

              <div className="space-y-2">
                {competitors.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={c.brand}
                        onChange={(e) => handleCompetitorChange(idx, 'brand', e.target.value)}
                        placeholder="ชื่อแบรนด์คู่แข่ง"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                      <input
                        type="text"
                        value={c.price}
                        onChange={(e) => handleCompetitorChange(idx, 'price', e.target.value)}
                        placeholder="ราคาคู่แข่ง (ถ้าทราบ)"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                      <input
                        type="text"
                        value={c.condition}
                        onChange={(e) => handleCompetitorChange(idx, 'condition', e.target.value)}
                        placeholder="เงื่อนไข / เครดิต / การรับประกัน"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCompetitor(idx)}
                      disabled={competitors.length === 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 6: งานที่ต้องดำเนินการต่อ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#148277] font-black text-xs flex items-center justify-center">6</span>
                  <h4 className="font-bold text-sm">งานที่ต้องดำเนินการต่อ (Next Action)</h4>
                </div>
                <button
                  type="button"
                  onClick={handleAddNextAction}
                  className="px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#148277] text-xs font-bold border border-teal-200 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มรายการ</span>
                </button>
              </div>

              <div className="space-y-2">
                {nextActions.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={a.description}
                        onChange={(e) => handleNextActionChange(idx, 'description', e.target.value)}
                        placeholder="รายการงาน เช่น ส่งใบเสนอราคา"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                      <input
                        type="text"
                        value={a.responsibility}
                        onChange={(e) => handleNextActionChange(idx, 'responsibility', e.target.value)}
                        placeholder="ผู้รับผิดชอบ"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                      <input
                        type="text"
                        value={a.action_plan}
                        onChange={(e) => handleNextActionChange(idx, 'action_plan', e.target.value)}
                        placeholder="แผนดำเนินการ เช่น ส่งภายในวันศุกร์"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNextAction(idx)}
                      disabled={nextActions.length === 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 7: กำหนดการติดตามครั้งถัดไป */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#148277] font-black text-xs flex items-center justify-center">7</span>
                <h4 className="font-bold text-sm">กำหนดการติดตามครั้งถัดไป (Next Follow-up Schedule)</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่นัดถัดไป (Date)</label>
                  <input
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => setNextFollowupDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เวลานัดถัดไป (Time)</label>
                  <input
                    type="text"
                    placeholder="เช่น 10:00"
                    value={nextFollowupTime}
                    onChange={(e) => setNextFollowupTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Note การติดตาม</label>
                <input
                  type="text"
                  value={nextFollowupNote}
                  onChange={(e) => setNextFollowupNote(e.target.value)}
                  placeholder="เช่น นำเครื่องตัวอย่างเข้าไปทดสอบกับชิ้นงานจริง"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700"
                />
              </div>
            </div>

            {/* Bottom Floating Save Button */}
            <div className="pt-2 pb-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving || loading}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>บันทึกข้อมูล (Save)</span>
              </button>
            </div>

          </div>

      </div>
    </div>
  );
}
