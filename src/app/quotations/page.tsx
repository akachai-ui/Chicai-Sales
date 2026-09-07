'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Plus, 
  Eye, 
  Printer, 
  Trash2, 
  Building2, 
  User, 
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck
} from 'lucide-react';
import { useSalesStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Quotation } from '@/lib/types';

export default function QuotationsPage() {
  const { isLoaded, quotations, deleteQuotation, updateQuotation } = useSalesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleDelete = (id: string, number: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบเสนอราคา ${number}?`)) {
      deleteQuotation(id);
    }
  };

  const handleUpdateStatus = (id: string, status: Quotation['status']) => {
    updateQuotation(id, { status });
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const filteredQuotations = quotations.filter(q => {
    const matchSearch = 
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.customerCompany && q.customerCompany.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus = statusFilter === 'all' || q.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalValue = filteredQuotations.reduce((sum, q) => sum + q.grandTotal, 0);

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" /> ส่งแล้ว (รอตอบรับ)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full">
            <XCircle className="w-3 h-3" /> ไม่อนุมัติ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full">
            <FileText className="w-3 h-3" /> ฉบับร่าง (Draft)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">ใบเสนอราคา (Quotations)</h1>
            <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
              {filteredQuotations.length} รายการ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            มูลค่ารวมทั้งหมด: <span className="font-bold text-slate-900">{formatCurrency(totalValue)}</span>
          </p>
        </div>

        <Link
          href="/quotations/new"
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างใบเสนอราคาใหม่</span>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า, บริษัท..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="all">ทุกสถานะ (All Status)</option>
            <option value="draft">ฉบับร่าง (Draft)</option>
            <option value="sent">ส่งแล้ว (Sent)</option>
            <option value="approved">อนุมัติแล้ว (Approved)</option>
            <option value="rejected">ไม่อนุมัติ (Rejected)</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">เลขที่เอกสาร</th>
                <th className="py-3.5 px-4">ลูกค้า / บริษัท</th>
                <th className="py-3.5 px-4">วันที่ออก / ยื่นยัน</th>
                <th className="py-3.5 px-4 text-right">ยอดสุทธิ (รวม VAT)</th>
                <th className="py-3.5 px-4 text-center">สถานะ</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ไม่พบใบเสนอราคาตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredQuotations.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-bold text-brand-700">
                      <Link href={`/quotations/${q.id}`} className="hover:underline flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{q.quotationNumber}</span>
                      </Link>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{q.customerName}</div>
                      {q.customerCompany && (
                        <div className="text-[11px] text-slate-400">{q.customerCompany}</div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <div>ออก: {formatDate(q.date)}</div>
                      <div className="text-[11px] text-slate-400">หมดอายุ: {formatDate(q.validUntil)}</div>
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-slate-900 text-sm">
                      {formatCurrency(q.grandTotal)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(q.status)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/quotations/${q.id}`}
                          title="ดูและพิมพ์เอกสาร"
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(q.id, q.quotationNumber)}
                          title="ลบเอกสาร"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
