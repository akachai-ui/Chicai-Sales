"use client";

import React, { useState, useEffect } from "react";
import { Customer } from "@/types/customer";
import {
  X,
  Mail,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Rocket,
  Building2,
  Check
} from "lucide-react";

interface EmailComposeModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onEmailSent?: () => void;
}

const DEFAULT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbw8Av-WvIll9-5zyeyUS8spsFVGZdFqVHf-Arkxa6nCwTk_GJA3xQeHNCv2BL-rfdYT/exec";

export default function EmailComposeModal({
  isOpen,
  customer,
  onClose,
  onEmailSent,
}: EmailComposeModalProps) {
  const [toEmail, setToEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");

  // Direct Send State via Google Apps Script Webhook
  const [gasWebhookUrl, setGasWebhookUrl] = useState<string>("");
  const [isSendingDirect, setIsSendingDirect] = useState<boolean>(false);
  const [directSendSuccess, setDirectSendSuccess] = useState<boolean>(false);
  const [directSendError, setDirectSendError] = useState<string | null>(null);
  const [showWebhookSettings, setShowWebhookSettings] = useState<boolean>(false);
  const [tempWebhookUrl, setTempWebhookUrl] = useState<string>("");

  // Load saved Webhook URL from localStorage or env
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("CHICAI_GAS_WEBHOOK_URL") ||
        process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_WEBHOOK_URL ||
        DEFAULT_WEBHOOK_URL;
      setGasWebhookUrl(saved);
      setTempWebhookUrl(saved);
    }
  }, []);

  const handleSaveWebhookUrl = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("CHICAI_GAS_WEBHOOK_URL", tempWebhookUrl.trim());
      setGasWebhookUrl(tempWebhookUrl.trim());
      setShowWebhookSettings(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      const customerName = customer.name || "ลูกค้า";
      setToEmail(customer.email || "");
      setSubject(`[รบกวนส่งต่อ ฝ่ายจัดซื้อ / ซ่อมบำรุง] เครื่องกรองน้ำมันและฟื้นฟูน้ำยาหล่อเย็น ลดต้นทุน 70% - ${customerName}`);
      setBody(`เรียน แอดมิน / ผู้ดูแลอีเมลกลางของบริษัท (Dear Admin)
รบกวนส่งต่ออีเมลฉบับนี้ให้กับ ฝ่ายจัดซื้อ (Purchasing) หรือ ฝ่ายซ่อมบำรุง (Maintenance) ของ ${customerName} เพื่อพิจารณาโซลูชันลดต้นทุนการผลิตและยืดอายุเครื่องจักรครับ ขอขอบพระคุณล่วงหน้าครับ

--------------------------------------------------

เรียน ฝ่ายจัดซื้อ และ ฝ่ายซ่อมบำรุง ${customerName}

CHICAI ELECTRIC ขอแนะนำ "ซีรีส์เครื่องจักรอัจฉริยะสำหรับฟื้นฟูคุณภาพน้ำมันและน้ำยาหล่อเย็น" ลดต้นทุนการซื้อน้ำมันใหม่ได้ถึง 70%
1. เครื่องกรองน้ำมัน (กระบอกคู่) รุ่น LYJ-001-D: กรองละเอียด 1 ไมครอน เสียบไฟ 220V ใช้ได้ทันที (82,000 บาท)
2. เครื่องกรองน้ำมัน (กระบอกเดี่ยว) รุ่น LYJ-001-S: กรองละเอียด 1 ไมครอน ขนาดกะทัดรัด (65,000 บาท)
3. เครื่องกำจัดตะกรัน รุ่น NXC-QZJ-116A: ดูดตะกรันและเศษโลหะด้วยแรงดันระบบลม (82,000 บาท)
4. เครื่องฟื้นฟูน้ำยาหล่อเย็น รุ่น NXC-ZSJ-100: โอโซนฆ่าเชื้อ ลดกลิ่นเหม็น และแยกน้ำมันลอย (เริ่มต้น 175,000 บาท)

[ สิทธิพิเศษสำหรับ ${customerName} ]
ยินดีนำเครื่องจักรเข้าไป "สาธิต (Demo On-site) ให้ทดลองใช้งานฟรีถึงหน้างานจริง"
📖 แคตตาล็อกออนไลน์: https://catalog-chicai-lilac.vercel.app/

ขอแสดงความนับถือ / Best Regards,
เอกชัย หาบ้านแท่น (แม็ก) 092-479-7666
CHICAI ELECTRIC (THAILAND) CO., LTD.`);
      setDirectSendSuccess(false);
      setDirectSendError(null);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  // Format clean comma-separated emails
  const cleanToEmail = toEmail
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean)
    .join(",");

  // 1-Click Direct Send via Google Apps Script
  const handleDirectSendEmail = async () => {
    if (!cleanToEmail) {
      alert("กรุณาระบุอีเมลผู้รับก่อนส่ง");
      return;
    }

    setIsSendingDirect(true);
    setDirectSendError(null);
    setDirectSendSuccess(false);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          companyName: customer.name,
          email: cleanToEmail,
          webhookUrl: (gasWebhookUrl || DEFAULT_WEBHOOK_URL).trim(),
          contactPerson: customer.contact_person,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ส่งอีเมลไม่สำเร็จ");
      }

      setDirectSendSuccess(true);
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (err: any) {
      console.error("Error sending direct email:", err);
      setDirectSendError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ Google Apps Script");
    } finally {
      setIsSendingDirect(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Modal Header */}
        <div className="pt-3 pb-3.5 px-4 sm:px-5 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white shrink-0 shadow-sm">
          {/* Mobile Pull Indicator */}
          <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-2.5 sm:hidden" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <h3 className="font-black text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
                    ส่งอีเมลนำเสนอสินค้า
                  </h3>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-400/25 text-emerald-100 border border-emerald-300/30">
                    1-Click
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-teal-100 truncate flex items-center space-x-1 mt-0.5">
                  <Building2 className="w-3 h-3 opacity-75 shrink-0" />
                  <span className="truncate"><b>{customer.name}</b></span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowWebhookSettings(!showWebhookSettings)}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/15 active:scale-95 transition-all"
                title="ตั้งค่า Webhook URL"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/15 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Webhook Configuration Drawer */}
        {showWebhookSettings && (
          <div className="bg-slate-900 text-slate-100 p-3 sm:p-4 border-b border-slate-700 text-xs space-y-2 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1 text-emerald-400 text-[11px]">
                <Settings className="w-3 h-3" />
                <span>ตั้งค่า Google Apps Script Webhook URL</span>
              </span>
              <button
                type="button"
                onClick={() => setShowWebhookSettings(false)}
                className="text-slate-400 hover:text-white text-[10px]"
              >
                ปิด
              </button>
            </div>
            <div className="flex space-x-1.5">
              <input
                type="url"
                value={tempWebhookUrl}
                onChange={(e) => setTempWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveWebhookUrl}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shrink-0"
              >
                บันทึก
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 flex-1 text-slate-800 text-xs sm:text-sm">
          
          {/* Direct Send Success Notification Banner */}
          {directSendSuccess && (
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-300 rounded-2xl flex items-start space-x-3 animate-in zoom-in-95 duration-200 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="text-xs text-emerald-950 leading-relaxed">
                <span className="font-black text-xs sm:text-sm block text-emerald-900">
                  🎉 ส่งอีเมล E-Catalog สำเร็จเรียบร้อยแล้ว!
                </span>
                อีเมลพร้อมรูปภาพประกอบครบชุดได้ถูกส่งออกจาก Gmail (<code>akachai.chicai@gmail.com</code>) แล้ว และระบบได้บันทึกประวัติการติดต่อลงใน Timeline ของโรงงานนี้ให้อัตโนมัติครับ
              </div>
            </div>
          )}

          {/* Direct Send Error Notification Banner */}
          {directSendError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 animate-in zoom-in-95 duration-200 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="text-xs text-rose-950 leading-relaxed">
                <span className="font-black text-xs sm:text-sm block text-rose-900">เกิดข้อผิดพลาดในการส่ง:</span>
                {directSendError}
              </div>
            </div>
          )}

          {/* Active Template Card */}
          <div className="p-3 bg-gradient-to-r from-teal-50/90 via-emerald-50/60 to-teal-50/90 border border-teal-200/70 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-base shadow-xs shrink-0">
                🌟
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                  CHICAI Official (ลดต้นทุน 70% + Demo)
                </h4>
                <p className="text-[10.5px] text-teal-800 mt-0.5">
                  E-Catalog • ตารางราคาพิเศษ • รูปภาพจาก Google Drive
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-teal-700 text-white rounded-md text-[9.5px] font-extrabold tracking-wider shrink-0 shadow-xs ml-2">
              Gmail Direct
            </span>
          </div>

          {/* Email Recipient (To) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                <Mail className="w-3 h-3 text-teal-700" />
                <span>ถึง (To Email)</span>
              </label>
              {!toEmail && (
                <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                  ⚠️ ยังไม่มีอีเมล (กรอกเพิ่มได้)
                </span>
              )}
            </div>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="กรอกอีเมล เช่น purchasing@company.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-xs sm:text-sm font-medium transition-all"
            />
          </div>

          {/* Email Subject */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
              หัวข้ออีเมล (Subject)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-xs sm:text-sm font-bold text-slate-900 transition-all"
            />
          </div>

          {/* Email Body Preview */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
              เนื้อหาที่จะส่ง (Message Preview)
            </label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-xs sm:text-sm font-sans leading-relaxed text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-3 sm:p-3.5 pb-[max(0.85rem,env(safe-area-inset-bottom,12px))] bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-95 touch-press"
          >
            ปิด
          </button>

          {/* 1-Click Direct Send Button via Google Apps Script Webhook */}
          <button
            type="button"
            disabled={isSendingDirect}
            onClick={handleDirectSendEmail}
            className="h-11 flex-1 flex items-center justify-center space-x-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-black shadow-md shadow-teal-700/20 transition-all active:scale-[0.98] touch-press disabled:opacity-60 cursor-pointer"
            title="ยิงอีเมล E-Catalog พร้อมรูปภาพอัตโนมัติ 1-Click ผ่าน Google Apps Script"
          >
            {isSendingDirect ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังส่งอีเมล...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>🚀 ส่งอัตโนมัติ (1-Click)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
