'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileText, 
  Building2, 
  Share2, 
  Download,
  Phone,
  Mail,
  MapPin,
  Check
} from 'lucide-react';
import { useSalesStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Quotation } from '@/lib/types';

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { isLoaded, quotations, updateQuotation } = useSalesStore();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const quotation = quotations.find(q => q.id === id);

  if (!quotation) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold text-slate-800">ไม่พบเอกสารใบเสนอราคานี้</h2>
        <Link href="/quotations" className="text-brand-600 text-xs mt-2 inline-block font-semibold hover:underline">
          กลับหน้ารายการใบเสนอราคา
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = (status: Quotation['status']) => {
    updateQuotation(quotation.id, { status });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <Link
          href="/quotations"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้ารายการใบเสนอราคา</span>
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Changer */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => handleStatusChange('draft')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                quotation.status === 'draft' ? 'bg-white font-bold text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ร่าง
            </button>
            <button
              onClick={() => handleStatusChange('sent')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                quotation.status === 'sent' ? 'bg-blue-600 font-bold text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ส่งแล้ว
            </button>
            <button
              onClick={() => handleStatusChange('approved')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                quotation.status === 'approved' ? 'bg-emerald-600 font-bold text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              อนุมัติ
            </button>
            <button
              onClick={() => handleStatusChange('rejected')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                quotation.status === 'rejected' ? 'bg-rose-600 font-bold text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ไม่อนุมัติ
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ / บันทึกเป็น PDF</span>
          </button>
        </div>
      </div>

      {/* Official Quotation Document Paper */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-lg text-slate-900 print:shadow-none print:border-none print:p-0">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xl">
                C
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">บริษัท ชิไค เซลส์ โซลูชั่น จำกัด</h1>
                <p className="text-xs text-slate-500 font-medium">CHICAI SALES SOLUTIONS CO., LTD.</p>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5 mt-2">
              <p>เลขที่ 123 อาคารสาทรสแควร์ ชั้น 18 ถนนสาทรเหนือ</p>
              <p>แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500</p>
              <p>เลขประจำตัวผู้เสียภาษี: 0105562098765 (สำนักงานใหญ่)</p>
              <p>โทรศัพท์: 02-123-4567 | อีเมล: sales@chicai.com</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <h2 className="text-2xl font-black text-brand-700 tracking-wide uppercase">ใบเสนอราคา</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">QUOTATION</p>
            
            <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-xs sm:text-right">
              <p>
                <span className="font-bold text-slate-500">เลขที่เอกสาร / No:</span>{' '}
                <span className="font-extrabold text-slate-900">{quotation.quotationNumber}</span>
              </p>
              <p>
                <span className="font-bold text-slate-500">วันที่ / Date:</span>{' '}
                <span className="font-semibold text-slate-900">{formatDate(quotation.date)}</span>
              </p>
              <p>
                <span className="font-bold text-slate-500">ใช้ได้ถึง / Valid Until:</span>{' '}
                <span className="font-semibold text-slate-900">{formatDate(quotation.validUntil)}</span>
              </p>
              <p>
                <span className="font-bold text-slate-500">พนักงานขาย / Sales:</span>{' '}
                <span className="font-semibold text-slate-900">{quotation.salesPerson}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Customer Information Block */}
        <div className="my-6 p-4 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            ข้อมูลลูกค้า / Bill To:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="font-bold text-sm text-slate-900">{quotation.customerName}</p>
              {quotation.customerCompany && (
                <p className="font-semibold text-slate-700">{quotation.customerCompany}</p>
              )}
              <p className="text-slate-600 mt-1">{quotation.customerAddress || 'ไม่ระบุที่อยู่'}</p>
            </div>
            <div className="space-y-0.5 sm:text-right text-slate-600">
              <p><span className="font-semibold">เบอร์โทรศัพท์:</span> {quotation.customerPhone || '-'}</p>
              <p><span className="font-semibold">อีเมล:</span> {quotation.customerEmail || '-'}</p>
              {quotation.customerTaxId && (
                <p className="font-mono"><span className="font-semibold">เลขประจำตัวผู้เสียภาษี:</span> {quotation.customerTaxId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="my-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 font-bold text-slate-700 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-10">ลำดับ</th>
                <th className="py-3 px-4 text-left">รายการสินค้า / บริการ</th>
                <th className="py-3 px-3 text-center w-16">จำนวน</th>
                <th className="py-3 px-3 text-center w-16">หน่วย</th>
                <th className="py-3 px-3 text-right w-28">ราคา/หน่วย</th>
                <th className="py-3 px-3 text-right w-24">ส่วนลด</th>
                <th className="py-3 px-4 text-right w-32">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
              {quotation.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-center text-slate-400 font-semibold">{index + 1}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">{item.quantity}</td>
                  <td className="py-3 px-3 text-center text-slate-500">{item.unit}</td>
                  <td className="py-3 px-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-3 text-right text-rose-600">
                    {item.discount > 0 ? formatCurrency(item.discount) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation & Terms Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-6">
          {/* Terms & Notes */}
          <div className="text-xs space-y-4">
            {quotation.terms && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-700 block mb-1">เงื่อนไขการชำระเงิน / Payment Terms:</span>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{quotation.terms}</p>
              </div>
            )}
            {quotation.notes && (
              <div className="text-slate-500">
                <span className="font-bold text-slate-600 block mb-0.5">หมายเหตุ:</span>
                <p className="whitespace-pre-line">{quotation.notes}</p>
              </div>
            )}
          </div>

          {/* Pricing Totals */}
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1">
              <span>รวมเป็นเงิน (Subtotal):</span>
              <span className="font-bold text-slate-800">{formatCurrency(quotation.subtotal)}</span>
            </div>
            {quotation.discountTotal > 0 && (
              <div className="flex justify-between py-1 text-rose-600">
                <span>ส่วนลดรวม (Discount):</span>
                <span className="font-bold">- {formatCurrency(quotation.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span>ภาษีมูลค่าเพิ่ม VAT {quotation.vatRate}%:</span>
              <span className="font-bold text-slate-800">{formatCurrency(quotation.vatAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-slate-900 text-slate-900 text-sm">
              <span className="font-black">จำนวนเงินรวมทั้งสิ้น (Grand Total):</span>
              <span className="text-lg font-black text-brand-700">{formatCurrency(quotation.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Signatures Section */}
        <div className="grid grid-cols-2 gap-12 mt-12 pt-12 border-t border-slate-200 text-xs">
          <div className="text-center space-y-8">
            <p className="font-bold text-slate-700">ในนาม ลูกค้า / ผู้สั่งซื้อ</p>
            <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
            <p className="text-slate-500">(........................................................)</p>
            <p className="text-[11px] text-slate-400">วันที่ ......../......../............</p>
          </div>

          <div className="text-center space-y-8">
            <p className="font-bold text-slate-700">ในนาม บริษัท ชิไค เซลส์ โซลูชั่น จำกัด</p>
            <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
            <p className="font-semibold text-slate-800">{quotation.salesPerson}</p>
            <p className="text-[11px] text-slate-400">ผู้มีอำนาจลงนาม / พนักงานขาย</p>
          </div>
        </div>
      </div>
    </div>
  );
}
