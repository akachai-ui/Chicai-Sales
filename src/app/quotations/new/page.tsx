'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calculator, 
  Check, 
  FileText, 
  Building2, 
  User, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { useSalesStore } from '@/lib/store';
import { QuotationItem } from '@/lib/types';
import { formatCurrency, generateId } from '@/lib/utils';
import Link from 'next/link';

export default function NewQuotationPage() {
  const router = useRouter();
  const { isLoaded, customers, products, deals, addQuotation } = useSalesStore();

  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [dealId, setDealId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const defaultValid = new Date();
  defaultValid.setDate(defaultValid.getDate() + 30);
  const [validUntil, setValidUntil] = useState(defaultValid.toISOString().split('T')[0]);

  const [salesPerson, setSalesPerson] = useState('อัครชัย (ฝ่ายขาย)');
  const [notes, setNotes] = useState('ใบเสนอราคานี้มีผล 30 วันนับจากวันที่ออกเอกสาร');
  const [terms, setTerms] = useState('1. ชำระเงินมัดจำ 50% เมื่องวดแรก\n2. ชำระส่วนที่เหลือ 50% ภายใน 15 วันหลังส่งมอบงาน');
  const [vatRate, setVatRate] = useState(7);

  // Items
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: generateId('qti'),
      name: 'แพ็กเกจระบบ CRM & Sales Pro (รายปี)',
      description: 'ระบบบริหารงานขายและทีมเซลส์ พร้อมแดชบอร์ดและการออกใบเสนอราคา',
      quantity: 1,
      unit: 'ปี',
      unitPrice: 39000,
      discount: 0,
      amount: 39000,
    }
  ]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: generateId('qti'),
        name: '',
        description: '',
        quantity: 1,
        unit: 'รายการ',
        unitPrice: 0,
        discount: 0,
        amount: 0,
      }
    ]);
  };

  const handleSelectProduct = (itemId: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setItems(items.map(item => {
      if (item.id === itemId) {
        const amount = (1 * prod.price) - item.discount;
        return {
          ...item,
          productId: prod.id,
          name: prod.name,
          description: prod.description || '',
          unit: prod.unit,
          unitPrice: prod.price,
          quantity: 1,
          amount: amount > 0 ? amount : 0,
        };
      }
      return item;
    }));
  };

  const handleItemChange = (
    itemId: string, 
    field: keyof QuotationItem, 
    val: string | number
  ) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: val };
        const qty = field === 'quantity' ? Number(val) : updated.quantity;
        const price = field === 'unitPrice' ? Number(val) : updated.unitPrice;
        const discount = field === 'discount' ? Number(val) : updated.discount;
        const amount = Math.max(0, (qty * price) - discount);
        return { ...updated, amount };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) {
      alert('ใบเสนอราคาต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }
    setItems(items.filter(item => item.id !== itemId));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const vatAmount = (taxableAmount * vatRate) / 100;
  const grandTotal = taxableAmount + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('กรุณาเลือกลูกค้า');
      return;
    }
    if (items.length === 0 || !items[0].name.trim()) {
      alert('กรุณากรอกรายการสินค้า/บริการอย่างน้อย 1 รายการ');
      return;
    }

    const created = addQuotation({
      date,
      validUntil,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerCompany: selectedCustomer.company,
      customerAddress: selectedCustomer.address,
      customerTaxId: selectedCustomer.taxId,
      customerPhone: selectedCustomer.phone,
      customerEmail: selectedCustomer.email,
      dealId: dealId || undefined,
      items,
      subtotal,
      discountTotal,
      vatRate,
      vatAmount,
      grandTotal,
      status: 'sent',
      notes,
      terms,
      salesPerson,
    });

    router.push(`/quotations/${created.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/quotations"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้ารายการใบเสนอราคา</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Check className="w-4 h-4" />
            <span>สร้างและพิมพ์ใบเสนอราคา</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-8">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">ออกใบเสนอราคา (New Quotation)</h1>
            <p className="text-xs text-slate-500">กรอกข้อมูลและเลือกรายการสินค้า/บริการเพื่อคำนวณราคาอัตโนมัติ</p>
          </div>
          <div className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl border border-brand-200">
            ระบบจะสร้างเลขที่เอกสารอัตโนมัติ
          </div>
        </div>

        {/* Section 1: Customer & Quotation Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Selection Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              <span>ข้อมูลลูกค้า (Customer Details)</span>
            </h2>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                เลือกลูกค้าในระบบ <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/60">
                <p><span className="font-semibold">ผู้ติดต่อ:</span> {selectedCustomer.name}</p>
                {selectedCustomer.company && (
                  <p><span className="font-semibold">บริษัท:</span> {selectedCustomer.company}</p>
                )}
                <p><span className="font-semibold">โทร:</span> {selectedCustomer.phone}</p>
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  <span className="font-semibold">ที่อยู่:</span> {selectedCustomer.address || '-'}
                </p>
                {selectedCustomer.taxId && (
                  <p className="text-[11px] font-mono"><span className="font-semibold">เลขผู้เสียภาษี:</span> {selectedCustomer.taxId}</p>
                )}
              </div>
            )}
          </div>

          {/* Quotation Document Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>เงื่อนไขเอกสาร (Document Info)</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">วันที่ออกเอกสาร</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ยืนราคาถึงวันที่</label>
                <input
                  type="date"
                  required
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">ผู้จัดทำเอกสาร (พนักงานขาย)</label>
              <input
                type="text"
                value={salesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">เชื่อมโยงกับดีล (ถ้ามี)</label>
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">-- ไม่ระบุดีล --</option>
                {deals
                  .filter(d => !selectedCustomer || d.customerId === selectedCustomer.id)
                  .map(d => (
                    <option key={d.id} value={d.id}>{d.title} ({formatCurrency(d.value)})</option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Product / Service Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-slate-900">รายการสินค้าและบริการ (Items)</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มแถวรายการ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-bold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left w-10">#</th>
                  <th className="py-2.5 px-3 text-left min-w-[280px]">สินค้า/บริการ</th>
                  <th className="py-2.5 px-3 text-center w-24">จำนวน</th>
                  <th className="py-2.5 px-3 text-center w-20">หน่วย</th>
                  <th className="py-2.5 px-3 text-right w-32">ราคา/หน่วย</th>
                  <th className="py-2.5 px-3 text-right w-28">ส่วนลด (บาท)</th>
                  <th className="py-2.5 px-3 text-right w-36">จำนวนเงิน</th>
                  <th className="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                    
                    {/* Item Name, Catalog Picker, Description */}
                    <td className="py-3 px-3 space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="ชื่อสินค้าหรือบริการ..."
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <select
                          onChange={(e) => handleSelectProduct(item.id, e.target.value)}
                          defaultValue=""
                          className="w-36 px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600 focus:outline-none"
                        >
                          <option value="" disabled>เลือกจากแคตตาล็อก</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)..."
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-500 focus:outline-none"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-600 focus:outline-none"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </td>

                    {/* Discount */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={item.discount}
                        onChange={(e) => handleItemChange(item.id, 'discount', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right text-rose-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </td>

                    {/* Amount Total */}
                    <td className="py-3 px-3 text-right font-extrabold text-slate-900 pt-4">
                      {formatCurrency(item.amount)}
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 px-2 text-center pt-3.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-300 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
          {/* Terms & Notes */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">เงื่อนไขการชำระเงิน (Payment Terms)</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม (Notes)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Price Calculation Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>รวมเป็นเงิน (Subtotal):</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            {discountTotal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>ส่วนลดรวม (Discount):</span>
                <span className="font-semibold">- {formatCurrency(discountTotal)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600 items-center">
              <span className="flex items-center gap-2">
                <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs"
                >
                  <option value={0}>0% (ไม่มี VAT)</option>
                  <option value={7}>7% (ตามมาตรฐาน)</option>
                </select>
              </span>
              <span className="font-semibold">{formatCurrency(vatAmount)}</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-slate-900">
              <span className="text-sm font-extrabold">จำนวนเงินรวมทั้งสิ้น (Grand Total):</span>
              <span className="text-xl font-black text-brand-700">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
