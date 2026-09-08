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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center space-x-2">
                <span>ส่งอีเมลนำเสนอสินค้า</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/30">
                  1-Click Auto
                </span>
              </h3>
              <p className="text-xs text-teal-100 truncate max-w-xs sm:max-w-md flex items-center space-x-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5 opacity-80" />
                <span>ผู้รับ: <b>{customer.name}</b></span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setShowWebhookSettings(!showWebhookSettings)}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="ตั้งค่า Webhook URL"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Webhook Configuration Drawer */}
        {showWebhookSettings && (
          <div className="bg-slate-900 text-slate-100 p-4 border-b border-slate-700 text-xs space-y-2 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1 text-emerald-400">
                <Settings className="w-3.5 h-3.5" />
                <span>ตั้งค่า Google Apps Script Webhook URL</span>
              </span>
              <button
                type="button"
                onClick={() => setShowWebhookSettings(false)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                ปิด
              </button>
            </div>
            <div className="flex space-x-2">
              <input
                type="url"
                value={tempWebhookUrl}
                onChange={(e) => setTempWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveWebhookUrl}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shrink-0"
              >
                บันทึก
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs sm:text-sm">
          {/* Direct Send Success Notification Banner */}
          {directSendSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start space-x-3 animate-in zoom-in-95 duration-200 shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-extrabold text-sm block text-emerald-800">
                  🎉 ส่งอีเมล E-Catalog ถึง {customer.name} สำเร็จเรียบร้อยแล้ว!
                </span>
                อีเมลพร้อมรูปภาพประกอบครบชุดได้ถูกส่งออกจาก Gmail (<code>akachai.chicai@gmail.com</code>) ของคุณแม็กแล้ว และระบบได้บันทึกประวัติการติดต่อลงใน Timeline ของโรงงานนี้ให้อัตโนมัติครับ
              </div>
            </div>
          )}

          {/* Direct Send Error Notification Banner */}
          {directSendError && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start space-x-3 animate-in zoom-in-95 duration-200 shadow-sm">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                <span className="font-extrabold text-sm block text-rose-800">เกิดข้อผิดพลาดในการส่ง:</span>
                {directSendError}
              </div>
            </div>
          )}

          {/* Active Template Card */}
          <div className="p-3.5 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">🌟</span>
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-teal-950">
                  CHICAI Official (ลดต้นทุน 70% + On-site Demo)
                </h4>
                <p className="text-[11px] text-teal-700 mt-0.5">
                  อีเมลทางการพร้อมรูปแบนเนอร์ E-Catalog, ตารางราคา และลายเซ็นจาก Google Drive
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-1 bg-teal-600 text-white rounded-lg text-[10px] font-bold shadow-xs">
              ส่งผ่าน Gmail ทันที
            </span>
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
                placeholder="กรอกอีเมล เช่น purchasing@company.com หรือ admin@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm font-medium"
              />
              {!toEmail && (
                <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-amber-600">
                  ⚠️ ยังไม่มีอีเมลลูกค้า (กรอกเพิ่มได้ที่นี่)
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm font-bold text-slate-900"
            />
          </div>

          {/* Email Body Preview */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              เนื้อหาที่จะส่ง (Message Preview)
            </label>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm font-sans leading-relaxed text-slate-800"
            />
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors touch-press"
          >
            ปิด
          </button>

          {/* 1-Click Direct Send Button via Google Apps Script Webhook */}
          <button
            type="button"
            disabled={isSendingDirect}
            onClick={handleDirectSendEmail}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-700/25 transition-all touch-press active:scale-95 disabled:opacity-60 cursor-pointer"
            title="ยิงอีเมล E-Catalog พร้อมรูปภาพอัตโนมัติ 1-Click ผ่าน Google Apps Script"
          >
            {isSendingDirect ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังส่งอีเมลผ่าน Gmail...</span>
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                <span>🚀 ส่งอัตโนมัติ (1-Click)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
