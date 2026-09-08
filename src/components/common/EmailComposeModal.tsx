'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import {
  X,
  Mail,
  Send,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface EmailComposeModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
}

interface EmailTemplate {
  id: string;
  title: string;
  icon: string;
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'intro',
    title: 'แนะนำโซลูชัน & สินค้า',
    icon: '✨',
    subject: 'เรียน คุณ{contact_person} / ขอแนะนำโซลูชันลดต้นทุนน้ำมันและน้ำยาหล่อเย็น - Chicai Sales',
    body: `เรียน คุณ{contact_person} (หรือ ฝ่ายซ่อมบำรุง / จัดซื้อ)
บริษัท {customer_name}

กระผมจาก Chicai Sales ขออนุญาตแนะนำโซลูชันสำหรับโรงงานอุตสาหกรรม:
• {target_product}

ประโยชน์ที่โรงงานจะได้รับ:
1. ช่วยยืดอายุการใช้งานน้ำมันไฮดรอลิกและน้ำยาหล่อเย็น (Coolant) ได้มากกว่า 2-3 เท่า
2. ลดค่าใช้จ่ายในการเปลี่ยนถ่ายทิ้งและซื้อน้ำมันใหม่
3. ลดการสึกหรอของเครื่องจักร เพิ่มประสิทธิภาพและเสถียรภาพการผลิต

หากทางบริษัท {customer_name} สนใจรับเอกสารแคตตาล็อกเพิ่มเติม หรือต้องการให้นำเครื่องไปทดสอบ Demo On-site หน้างาน สามารถติดต่อผมได้โดยตรงครับ

ขอแสดงความนับถือ,
ทีมงาน Chicai Sales
ติดต่อ: 02-xxx-xxxx / sales@chicai.com
`,
  },
  {
    id: 'demo',
    title: 'ขอนัดหมายตรวจเช็ค & Demo',
    icon: '🤝',
    subject: 'ขออนุญาตเข้าพบนัดหมายตรวจเช็คคุณภาพน้ำมันและสาธิตเครื่องฟรี - {customer_name}',
    body: `เรียน คุณ{contact_person}
บริษัท {customer_name}

สืบเนื่องจากที่ทาง Chicai Sales ได้ให้บริการโซลูชันด้าน {target_product}
ทางทีมงานขออนุญาตสอบถามความสะดวก เพื่อขอนัดหมายเข้าพบในการ:
1. นำเครื่องมือตรวจวัดคุณภาพน้ำมันไฮดรอลิก / น้ำยาหล่อเย็น เข้าตรวจเช็คหน้างาน (ไม่มีค่าใช้จ่าย)
2. นำเครื่องสาธิตจริง (Demo) ไปทดสอบประสิทธิภาพให้เห็นผลลัพธ์ที่หน้างานจริง

หากทางคุณ{contact_person} สะดวกเป็นช่วงวันและเวลาใด สามารถตอบกลับอีเมลนี้หรือแจ้งวันนัดหมายได้เลยครับ

ขอแสดงความนับถือ,
ทีมงาน Chicai Sales
`,
  },
  {
    id: 'catalog',
    title: 'ส่งแคตตาล็อก & สเปก',
    icon: '📄',
    subject: 'ส่งเอกสารข้อมูลสินค้าและแคตตาล็อก {target_product} - Chicai Sales',
    body: `เรียน คุณ{contact_person}
บริษัท {customer_name}

ตามที่ได้มีการติดต่อประสานงานเรื่อง {target_product} ทาง Chicai Sales ขอส่งข้อมูลรายละเอียดสเปกสินค้าและเอกสารแนะนำมาให้ท่านพิจารณาเบื้องต้นครับ

หากต้องการสอบถามข้อมูลเชิงเทคนิคเพิ่มเติม หรือต้องการให้ออกใบเสนอราคา (Quotation) ยินดีบริการอย่างยิ่งครับ

ขอแสดงความนับถือ,
ทีมงาน Chicai Sales
`,
  },
  {
    id: 'followup',
    title: 'ติดตามผลงานขาย',
    icon: '⏳',
    subject: 'ติดตามความคืบหน้าเรื่อง {target_product} - บริษัท {customer_name}',
    body: `เรียน คุณ{contact_person}
บริษัท {customer_name}

ทาง Chicai Sales ขออนุญาตสอบถามความคืบหน้าเกี่ยวกับการพิจารณา {target_product} ครับ
ไม่ทราบว่าทางบริษัท {customer_name} มีข้อสงสัยหรือต้องการข้อมูลเอกสารเพิ่มเติมในส่วนใดหรือไม่ครับ

ยินดีให้คำปรึกษาและพร้อมบริการครับ

ขอแสดงความนับถือ,
ทีมงาน Chicai Sales
`,
  },
  {
    id: 'custom',
    title: 'เขียนเอง (กำหนดเอง)',
    icon: '✏️',
    subject: 'ติดต่อจาก Chicai Sales - {customer_name}',
    body: `เรียน คุณ{contact_person}
บริษัท {customer_name}



ขอแสดงความนับถือ,
ทีมงาน Chicai Sales
`,
  },
];

export default function EmailComposeModal({
  isOpen,
  customer,
  onClose,
}: EmailComposeModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('intro');
  const [toEmail, setToEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Apply template with replaced variables
  const applyTemplate = (templateId: string, cust: Customer | null) => {
    setSelectedTemplateId(templateId);
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0];
    if (!cust) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
      return;
    }

    const customerName = cust.name || 'ลูกค้า';
    const contactPerson = cust.contact_person || 'ผู้จัดการฝ่ายซ่อมบำรุง / จัดซื้อ';
    const targetProduct = cust.target_product || 'เครื่องกรองน้ำมันไฮดรอลิก / เครื่องฟื้นฟูน้ำยาหล่อเย็น';

    const sub = tmpl.subject
      .replace(/{customer_name}/g, customerName)
      .replace(/{contact_person}/g, contactPerson)
      .replace(/{target_product}/g, targetProduct);

    const bdy = tmpl.body
      .replace(/{customer_name}/g, customerName)
      .replace(/{contact_person}/g, contactPerson)
      .replace(/{target_product}/g, targetProduct);

    setSubject(sub);
    setBody(bdy);
  };

  useEffect(() => {
    if (isOpen && customer) {
      setToEmail(customer.email || '');
      applyTemplate('intro', customer);
      setCopied(false);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  // Gmail Web & Mobile App Direct Compose URL
  const getGmailUrl = () => {
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: toEmail.trim(),
      su: subject,
      body: body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  // Standard Mailto URL (Apple Mail / Outlook / Default Email Client)
  const getMailtoUrl = () => {
    return `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleOpenGmail = () => {
    window.open(getGmailUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleOpenMailto = () => {
    window.location.href = getMailtoUrl();
  };

  const handleCopyText = async () => {
    const fullText = `หัวข้อ: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center space-x-2">
                <span>ส่งอีเมล / Gmail</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  เทมเพลตพร้อมส่ง
                </span>
              </h3>
              <p className="text-xs text-red-100 truncate max-w-xs sm:max-w-md">
                {customer.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs sm:text-sm">
          
          {/* Template Selector Pills */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              เลือกแม่แบบข้อความ (Templates)
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {EMAIL_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => applyTemplate(tmpl.id, customer)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-102'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Recipient (To) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              ถึง (To Email)
            </label>
            <div className="relative">
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="กรอกอีเมลปลายทาง เช่น purchase@factory.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-xs sm:text-sm font-medium"
              />
              {!toEmail && (
                <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-amber-600">
                  ⚠️ ยังไม่มีอีเมลลูกค้า
                </span>
              )}
            </div>
          </div>

          {/* Email Subject */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              หัวข้ออีเมล (Subject)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-xs sm:text-sm font-bold text-slate-900"
            />
          </div>

          {/* Email Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600">
                เนื้อหาอีเมล (Body)
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center space-x-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกข้อความ</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-xs sm:text-sm font-sans leading-relaxed text-slate-800"
            />
          </div>

        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors touch-press"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copied ? 'คัดลอกเรียบร้อย' : 'คัดลอกข้อความ'}</span>
          </button>

          <div className="flex items-center space-x-2">
            {/* Default Mail App Link */}
            <button
              type="button"
              onClick={handleOpenMailto}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors touch-press"
              title="เปิดในแอปเมลเริ่มต้น (Apple Mail / Outlook)"
            >
              <Mail className="w-4 h-4 text-slate-600" />
              <span>แอปเมลทั่วไป</span>
            </button>

            {/* Direct Gmail Button */}
            <button
              type="button"
              onClick={handleOpenGmail}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all touch-press active:scale-95"
              title="เปิดหน้าเขียนอีเมลใน Gmail ทันที"
            >
              <Send className="w-4 h-4" />
              <span>เปิดใน Gmail</span>
              <ExternalLink className="w-3 h-3 text-red-200" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
