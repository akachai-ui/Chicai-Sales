'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  MoreVertical, 
  DollarSign, 
  Calendar, 
  User, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Trash2,
  Edit2,
  X,
  Sparkles
} from 'lucide-react';
import { useSalesStore } from '@/lib/store';
import { Deal, PipelineStage, STAGES } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

function PipelineContent() {
  const searchParams = useSearchParams();
  const { 
    isLoaded, 
    deals, 
    customers, 
    addDeal, 
    updateDeal, 
    updateDealStage, 
    deleteDeal 
  } = useSalesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [value, setValue] = useState(0);
  const [stage, setStage] = useState<PipelineStage>('lead_in');
  const [probability, setProbability] = useState(20);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('อัครชัย (เซลส์มาสเตอร์)');
  const [notes, setNotes] = useState('');

  // Auto open modal if ?action=new in URL
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleOpenCreate();
    }
  }, [searchParams]);

  const handleOpenCreate = () => {
    setEditingDeal(null);
    setTitle('');
    setCustomerId(customers[0]?.id || '');
    setValue(10000);
    setStage('lead_in');
    setProbability(20);
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    setExpectedCloseDate(inTwoWeeks.toISOString().split('T')[0]);
    setAssignedTo('อัครชัย (เซลส์มาสเตอร์)');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setTitle(deal.title);
    setCustomerId(deal.customerId);
    setValue(deal.value);
    setStage(deal.stage);
    setProbability(deal.probability);
    setExpectedCloseDate(deal.expectedCloseDate);
    setAssignedTo(deal.assignedTo);
    setNotes(deal.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerId) {
      alert('กรุณากรอกชื่อดีลและเลือกลูกค้า');
      return;
    }

    if (editingDeal) {
      updateDeal(editingDeal.id, {
        title,
        customerId,
        value: Number(value),
        stage,
        probability: Number(probability),
        expectedCloseDate,
        assignedTo,
        notes,
      });
    } else {
      addDeal({
        title,
        customerId,
        value: Number(value),
        stage,
        probability: Number(probability),
        expectedCloseDate,
        assignedTo,
        notes,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบดีลนี้?')) {
      deleteDeal(id);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // Filtered Deals
  const filteredDeals = deals.filter(deal => {
    const customer = customers.find(c => c.id === deal.customerId);
    const matchSearch = 
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer?.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchStage = selectedStageFilter === 'all' || deal.stage === selectedStageFilter;

    return matchSearch && matchStage;
  });

  const totalFilteredValue = filteredDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">กระดานติดตามงานขาย (Sales Pipeline)</h1>
            <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
              {filteredDeals.length} ดีล
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            มูลค่ารวมในมุมมองนี้: <span className="font-bold text-slate-800">{formatCurrency(totalFilteredValue)}</span>
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มดีลใหม่</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อดีล หรือชื่อลูกค้า/บริษัท..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="all">ทุกสถานะ (All Stages)</option>
            {STAGES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-flow-col auto-cols-[300px] gap-4 min-w-[1850px]">
          {STAGES.map(stageInfo => {
            const stageDeals = filteredDeals.filter(d => d.stage === stageInfo.id);
            const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div
                key={stageInfo.id}
                className="bg-slate-100/70 rounded-2xl p-3.5 border border-slate-200/60 flex flex-col min-h-[580px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${stageInfo.color}`}>
                      {stageInfo.label.split(' ')[0]}
                    </span>
                    <span className="text-[11px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">
                    {formatCurrency(stageTotal)}
                  </span>
                </div>

                {/* Deal Cards in this Stage */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {stageDeals.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                      ไม่มีดีลในขั้นตอนนี้
                    </div>
                  ) : (
                    stageDeals.map(deal => {
                      const customer = customers.find(c => c.id === deal.customerId);

                      return (
                        <div
                          key={deal.id}
                          className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all group relative"
                        >
                          {/* Top Row: Title and Actions */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-900 leading-snug hover:text-brand-600 transition-colors">
                              {deal.title}
                            </h3>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                              <button
                                onClick={() => handleOpenEdit(deal)}
                                title="แก้ไขดีล"
                                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(deal.id)}
                                title="ลบดีล"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Customer & Company Info */}
                          {customer && (
                            <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                              <div className="flex items-center gap-1.5 font-medium">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="truncate">{customer.name}</span>
                              </div>
                              {customer.company && (
                                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                  <Building2 className="w-3 h-3 text-slate-400" />
                                  <span className="truncate">{customer.company}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Value & Probability */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">มูลค่า</span>
                              <span className="text-sm font-extrabold text-brand-700">
                                {formatCurrency(deal.value)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">โอกาสปิด</span>
                              <span className="text-xs font-bold text-slate-700">
                                {deal.probability}%
                              </span>
                            </div>
                          </div>

                          {/* Expected Close Date & Stage Switcher */}
                          <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatDate(deal.expectedCloseDate)}</span>
                            </div>

                            {/* Quick Stage Change Dropdown */}
                            <select
                              value={deal.stage}
                              onChange={(e) => updateDealStage(deal.id, e.target.value as PipelineStage)}
                              className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 hover:border-brand-400 focus:outline-none"
                            >
                              {STAGES.map(s => (
                                <option key={s.id} value={s.id}>
                                  ย้ายไป: {s.label.split(' ')[0]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Column Quick Add */}
                <button
                  onClick={() => {
                    handleOpenCreate();
                    setStage(stageInfo.id);
                  }}
                  className="mt-3 py-2 px-3 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white hover:border-brand-500 hover:text-brand-600 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มในหมวดนี้</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Deal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingDeal ? 'แก้ไขดีลการขาย' : 'สร้างดีลใหม่ (New Deal)'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="space-y-4 mt-4 text-xs">
              {/* Deal Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อดีล / โครงการ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ติดตั้งระบบ CRM & ERP ประจำปี 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Customer Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ลูกค้า / ผู้ติดต่อ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                >
                  <option value="">-- เลือกลูกค้า --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-right">
                  <Link href="/customers?action=new" className="text-[11px] text-brand-600 hover:underline">
                    + เพิ่มลูกค้าใหม่
                  </Link>
                </div>
              </div>

              {/* Value & Probability */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    มูลค่าดีล (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    โอกาสปิดการขาย (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={probability}
                    onChange={(e) => setProbability(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Stage & Close Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ขั้นตอนปัจจุบัน (Stage)
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as PipelineStage)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    วันที่คาดว่าจะปิด
                  </label>
                  <input
                    type="date"
                    value={expectedCloseDate}
                    onChange={(e) => setExpectedCloseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ผู้รับผิดชอบดีล
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  บันทึกข้อความ / รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={3}
                  placeholder="เช่น ข้อเสนอพิเศษ หรือเงื่อนไขที่ลูกค้าต้องการ..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl font-bold shadow-sm transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    }>
      <PipelineContent />
    </Suspense>
  );
}
